import boto3
import json
import re
import faiss
import numpy as np
from datetime import datetime
import traceback


s3_client = boto3.client("s3")
bucket_name = "sageon-mungchi-service"
key = "case_data"
save_key = "vector_db/faiss"

br_client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")


def get_s3_file_keys():
    """S3에 저장된 판례 파일 목록을 가져옵니다.

    Returns:
        list[str] -- S3에 저장된 파일 목록
    """
    list_response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=key)
    file_keys = [
        content["Key"] for content in list_response.get("Contents", [])
    ]
    return file_keys


def load_content(file_key):
    """s3 파일을 읽어 정리된 컨텐츠를 반환합니다.

    Arguments:
        file_key {str} -- s3 파일 키
    Returns:
        dict -- 정리된 컨텐츠
    """
    content_response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
    text_data = content_response["Body"].read().decode("utf-8")
    case_data = json.loads(text_data)

    case_data["case_issue"] = clean_text(case_data["case_issue"])
    case_data["case_summary"] = clean_text(case_data["case_summary"])
    case_data["case_detail"] = clean_text(case_data["case_detail"])

    return case_data


def clean_text(text):
    """판례 텍스트를 전처리해 관련 문단으로 분리합니다.

    Arguments:
        text {str} -- 전처리할 텍스트
    Returns:
        list[str] -- 전처리된 텍스트 리스트
    """
    if len(text) <= 2048:
        text = text.replace("\n", "")
        text = re.sub(r"\s+", " ", text)
        return [text]

    text = text.replace("\n", "")
    text = re.sub(r"\s+", " ", text)

    part_list = []

    try:
        split1 = text.split("【주 문】")

        split2 = split1[1].split("【이 유】")
        part_list.append(split1[0] + " 【주 문】 " + split2[0])

        split3 = re.split(r"(?<=다\.\s\d\.\s)", split2[1])
        for part in split3:
            if len(part) < 150:
                continue

            if len(part) <= 2048:
                part_list.append(
                    "【주 문】 " + split2[0] + " 【이 유】 " + part[:-4]
                )
            else:
                chunk_size = 2048 - len(
                    "【주 문】 " + split2[0] + " 【이 유】 "
                )
                slide_step = 1024
                part_list += [
                    "【주 문】 "
                    + split2[0]
                    + " 【이 유】 "
                    + part[i : i + chunk_size]
                    for i in range(0, len(part), slide_step)
                ]

    except IndexError:  # 【주 문】, 【이 유】가 없는 경우 exception 발생
        chunk_size = 2048
        slide_step = 1024
        part_list += [
            text[i : i + chunk_size] for i in range(0, len(text), slide_step)
        ]

    return part_list


def get_cohere_embedding(text):
    """Cohere API를 통해 텍스트의 임베딩을 가져옵니다.

    Arguments:
        text {str} -- 텍스트
    Returns:
        list[float] -- 텍스트 임베딩
    """
    model_id = "cohere.embed-multilingual-v3"
    native_request = {"texts": [text[0:2048]], "input_type": "search_query"}
    request = json.dumps(native_request)
    response = br_client.invoke_model(modelId=model_id, body=request)
    model_response = json.loads(response["body"].read())
    embedding = model_response["embeddings"][0]
    return embedding


def get_titan_embedding(text):
    """Amazon Titan API를 통해 텍스트의 임베딩을 가져옵니다.

    Arguments:
        text {str} -- 텍스트
    Returns:
        list[float] -- 텍스트 임베딩
    """
    model_id = "amazon.titan-embed-text-v1"
    native_request = {"inputText": text[0:2048]}
    request = json.dumps(native_request)
    response = br_client.invoke_model(modelId=model_id, body=request)
    model_response = json.loads(response["body"].read())
    embedding = model_response["embedding"]
    return embedding


def get_embeddings(documents, embedding_type="cohere"):
    """정리된 document의 문장들로부터 임베딩을 가져와 반환합니다.

    Arguments:
        documents {list[dict]} -- 정리된 document 리스트
        embedding_type {str} -- 임베딩 타입 (cohere, titan)
    Returns:
        list[list[float]], dict -- 임베딩 리스트, 메타데이터
    """
    embeddings = []
    metadata = {}

    for i, doc in enumerate(documents):
        text = doc["text"]

        if embedding_type == "titan":
            embedding = get_titan_embedding(text)
        elif embedding_type == "cohere":
            embedding = get_cohere_embedding(text)
        else:
            print("Embedding type must be titan or cohere.")
            raise Exception()

        embeddings.append(embedding)
        metadata[i] = doc["metadata"]
        metadata[i]["text"] = doc["text"]

    return embeddings, metadata


def get_documents(file_keys):
    """s3 파일을 읽어 임베딩과 메타데이터를 생성할 수 있는 데이터를 반환합니다.

    Arguments:
        file_keys {list[str]} -- s3 파일 키 리스트
    Returns:
        list[dict] -- 정리된 텍스트와 메타데이터가 포함된 리스트
    """
    documents = []

    for file_key in file_keys:
        case_data = load_content(file_key)

        for key in ["case_issue", "case_summary", "case_detail"]:
            texts = case_data[key]

            for text in texts:
                if text == "" or text is None or len(text) <= 0:
                    continue

                documents.append(
                    {
                        "text": text,
                        "metadata": {
                            "case_no": case_data["case_no"],
                            "case_name": case_data["case_name"],
                            "case_date": case_data["case_date"],
                            "case_court": case_data["case_court"],
                        },
                    }
                )

    return documents


def save_faiss_db(index, metadata):
    """생성한 faiss index와 메타데이터를 s3에 저장합니다.

    Arguments:
        index {faiss.Index} -- faiss index
        metadata {dict} -- 메타데이터
    Returns:
        None
    """
    faiss.write_index(index, "faiss_index.index")

    dstring = datetime.now().strftime("%Y%m%d")
    index_key = f"{save_key}/{dstring}/faiss_index.index"
    metadata_key = f"{save_key}/{dstring}/metadata.json"

    s3_client.upload_file("faiss_index.index", bucket_name, index_key)
    s3_client.put_object(
        Bucket=bucket_name, Key=metadata_key, Body=json.dumps(metadata)
    )


try:
    print("======= Load Documents ======")
    s3_file_keys = get_s3_file_keys()
    documents = get_documents(s3_file_keys)

    print("======= Loading Vector Database ======")
    embeddings, metadata = get_embeddings(documents, "cohere")
    index = faiss.IndexFlat(len(embeddings[0]))
    index.add(np.array(embeddings))

    print("======= Run Test Query ======")
    query = "사무실을 같은 동네에서 이전했는데 새로운 건물에 가격이 더 비싸다고 더 세금을 많이 내야 해?"
    query_embedding = get_cohere_embedding(query)
    distances, indices = index.search(np.array([query_embedding]), 3)
    print("검색 결과:")
    for i, idx in enumerate(indices[0]):
        print(f"Rank {i+1}:")
        print(f"Metadata: {metadata[i]}")
        print(f"Text: {documents[idx]['text']}")
        print(f"Distance: {distances[0][i]}")

    print("======= Save to S3 ======")
    save_faiss_db(index, metadata)

except Exception as e:
    print(traceback.format_exc())
    raise e
