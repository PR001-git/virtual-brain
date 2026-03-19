from pydantic import BaseModel


class AudioChunkMessage(BaseModel):
    type: str = "audio_chunk"
    data: str  # base64-encoded PCM
    sequence: int
    timestamp_ms: int = 0


class TranscriptMessage(BaseModel):
    type: str = "transcript"
    text: str
    is_partial: bool = False
    sequence: int = 0
    timestamp_ms: int = 0


class PromptMessage(BaseModel):
    type: str = "prompt"
    question: str
    context_window: int = 50


class LLMResponseMessage(BaseModel):
    type: str = "llm_response"
    text: str
    is_complete: bool = False


class StatusMessage(BaseModel):
    type: str = "status"
    message: str
    ready: bool = False


class ErrorMessage(BaseModel):
    type: str = "error"
    message: str


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptResponse(BaseModel):
    segments: list[TranscriptSegment]
