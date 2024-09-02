import os
import requests


def lambda_handler(event, context):
    # 이벤트 정보
    print(event)

    # metadata까지 있어야 API가 정상 작동하기 때문에 event에 faiss index key가 들어온다면 실행하지 않음
    if "faiss_index.index" in event["detail"]["object"]["key"]:
        print("Passing because of Faiss Index Key")
        return {
            "statusCode": 200,
            "body": "Input is Faiss Index Key, Wait until metadata is updated",
        }

    # ECS API 호출
    ecs_api_url = os.environ["ECS_API_URL"]

    print("Vector Update Lambda Running")
    try:
        response = requests.post(ecs_api_url)
        print(response.raise_for_status())
        print(response.json())
    except Exception as e:
        print(e)
        raise e

    return {"statusCode": 200, "body": "Success"}
