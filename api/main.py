from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from vector_db import get_vectordb_and_metadata, get_vectordb_query_result
from chat import generate_prompt, generate_stream_answer

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

index, metadata, _, _ = get_vectordb_and_metadata()


@app.get("/")
async def read_root():
    """Health check endpoint

    Parameters:
        None
    Returns:
        dict: A dictionary with a message key
    """
    return {"message": "Hello World"}


class ConversationHistory(BaseModel):
    human: str = Field(description="사용자의 질문")
    assistant: str = Field(description="AI Assistant의 답변")


class ChatRequest(BaseModel):
    query: str = Field(..., description="사용자의 질문")  # Required
    conversation_history: list[ConversationHistory] = Field(
        default_factory=list, description="이전 대화 내용"
    )


@app.post("/v1/chat/")
async def chat(request: ChatRequest):
    """사용자의 입력(query)에 대한 답변을 생성하는 API

    Parameters:
        query (str): 사용자의 질문
        conversation_history (list): 이전 대화 내용

    Returns:
        StreamingResponse: 생성된 답변
    """
    query = request.query
    conversation_history = request.conversation_history

    search_result = get_vectordb_query_result(query, index, metadata)
    prompt = generate_prompt(query, search_result, conversation_history)

    logger.info(f"Chat Completed.")

    return StreamingResponse(
        generate_stream_answer(prompt), media_type="text/plain"
    )


@app.post("/v1/vectordb/")
async def update_vectordb(request: Request):
    """VectorDB가 업데이트되면 이벤트를 받아 실행되는 API

    Parameters:
        None

    Returns:
        None
    """
    global index, metadata
    index, metadata, index_key, metatdata_key = get_vectordb_and_metadata()
    logger.info(f"VectorDB updated.")
    logger.info(f"Index key: {index_key}")
    logger.info(f"Metadata key: {metatdata_key}")
    return {"index_key": index_key, "metadata_key": metatdata_key}
