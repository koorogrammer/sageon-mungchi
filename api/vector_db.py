import faiss
import boto3
import json
import numpy as np

s3_client = boto3.client("s3")
bucket_name = "sageon-mungchi-service"
key = "vector_db/"

br_client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")


def get_s3_file_keys():
    list_response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=key)
    file_keys = [
        content["Key"] for content in list_response.get("Contents", [])
    ]
    return file_keys


def get_latest_index_and_matadata_key(keys):
    key_dts = [int(key_string.split("/")[2]) for key_string in keys]
    latest_dt = max(key_dts)

    latest_index_key = f"{key}faiss/{latest_dt}/faiss_index.index"
    latest_metadata_key = f"{key}faiss/{latest_dt}/metadata.json"

    return latest_index_key, latest_metadata_key


def get_index(index_key):
    local_filename = "faiss_index.index"
    s3_client.download_file(bucket_name, index_key, local_filename)
    return faiss.read_index(local_filename)


def get_metadata(metadata_key):
    local_filename = "metadata.json"
    s3_client.download_file(bucket_name, metadata_key, local_filename)

    with open(local_filename, "r") as f:
        metadata = json.load(f)

    return metadata


def get_vectordb_and_metadata():
    keys = get_s3_file_keys()
    index_key, metadata_key = get_latest_index_and_matadata_key(keys)
    index = get_index(index_key)
    metadata = get_metadata(metadata_key)
    return index, metadata, index_key, metadata_key


def get_cohere_embedding(text):
    model_id = "cohere.embed-multilingual-v3"
    native_request = {"texts": [text[0:2048]], "input_type": "search_query"}
    request = json.dumps(native_request)
    response = br_client.invoke_model(modelId=model_id, body=request)
    model_response = json.loads(response["body"].read())
    embedding = model_response["embeddings"][0]
    return embedding


def get_vectordb_query_result(query, index, metadata, top_n=5):
    query_embedding = get_cohere_embedding(query)
    _, indices = index.search(np.array([query_embedding]), top_n)

    result = []
    for idx in indices[0]:
        result.append(metadata[str(idx)])

    return result
