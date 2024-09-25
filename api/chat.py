import boto3
import json

br_client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")


def generate_prompt(query, search_result, conversation_memory=""):
    context = ""
    for r in search_result:
        context += f"[사건번호: {r['case_no']}, 사건명: {r['case_name']}, 선고일자: {r['case_date']}, 법원종류: {r['case_court']}]\n"
        context += f"{r['text']}\n\n"

    history = ""
    if conversation_memory == "":
        history = ""
    else:
        history = (
            "아래 주어지는 정보들은 이전 대화에 대한 중요 내용 요약 정보야.\n"
            + conversation_memory
        )

    prompt = f"""
    Human: 너는 한국 세법 전문가로 판례를 해석해서 사용자에게 필요한 세무 정보를 제공하는 AI assistant야.

    {history}
    
    아래 주어지는 정보들은 사용자의 질문과 관련된 판례 정보야.
    {context}

    이 판례 정보를 활용해 사용자 질문에 답변하되 없는 정보를 만들어내지 마.
    답변을 생성할 때 참고한 정보의 출처를 반드시 [사건번호: <참고 내용의 사건번호>, 사건명: <참고 내용의 사건명>, 선고일자: <참고 내용의 선고일자>, 법원종류: <참고 내용의 법원>] 형식으로 표기해.
    
    Human: {query}
    Assistant:
    """
    return prompt


def update_memory(conversation_memory, query1, answer):
    prompt = f"""
    Human: 너는 대화 내용을 바탕으로 중요한 내용만 요약하는 요약 전문 AI assistant야.

    기존 대화이 요약된 정보야. 아무 정보도 없을 경우 이 부분은 고려하지 마.
    {conversation_memory}

    가장 최근 대화 내용이야.
    질문: {query1}
    답변: {answer}

    이 정보들을 활용해 짧지만 핵심 내용은 모두 포함하도록, 사용자가 어떤 질문을 했고, AI가 어떤 답변을 했는지를 잘 요약해. 없는 정보를 만들어내지 마.
    """
    return generate_answer(prompt)


def generate_answer(prompt):
    model_id = "anthropic.claude-v2:1"

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100000,
            "messages": [
                {"role": "user", "content": [{"type": "text", "text": prompt}]}
            ],
            "temperature": 0.5,
        }
    )

    response = br_client.invoke_model(
        body=body,
        modelId=model_id,
        accept="application/json",
        contentType="application/json",
    )

    response_body = json.loads(response.get("body").read())
    return response_body["content"][0]["text"]


def generate_stream_answer(prompt):
    model_id = "anthropic.claude-v2:1"

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 10000,
            "messages": [
                {"role": "user", "content": [{"type": "text", "text": prompt}]}
            ],
            "temperature": 0.5,
        }
    )

    response = br_client.invoke_model_with_response_stream(
        body=body,
        modelId=model_id,
    )

    stream = response.get("body")
    if stream:
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_data = json.loads(chunk.get("bytes").decode())
                if chunk_data["type"] == "content_block_delta":
                    yield chunk_data["delta"]["text"]
