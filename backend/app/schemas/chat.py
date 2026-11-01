from typing import List, Optional
from pydantic import BaseModel, Field

class ChatSource(BaseModel):
    document_id: str
    title: str
    snippet: Optional[str] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User question or query")
    session_id: Optional[str] = None
    model_provider: Optional[str] = Field("lora", description="Inference engine: 'lora' (local fine-tuned Qwen) or 'groq' (cloud)")

class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource] = Field(default_factory=list)
    requires_clarification: bool = False
    intent: Optional[str] = None
    retries: int = 0
    fallback: bool = False
