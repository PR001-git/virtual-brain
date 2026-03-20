import json
import time
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import config
from dto.messages import (
    ErrorMessage,
    LLMResponseMessage,
    StatusMessage,
    TranscriptMessage,
    TranscriptResponse,
    TranscriptSegment,
)
from interfaces.transcription import TranscriptionStrategy
from interfaces.memory import MemoryRepository
from interfaces.llm import LLMAdapter
from service_factory import create_transcriber, create_memory_repo, create_llm_client
from adapters.audio_processor import convert_to_wav
from pipeline import EventBus, TranscriptionPipeline

app = FastAPI(title="VirtualBrain Python Service", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:3000",
        f"http://localhost:{config.PORT}",
        config.NODE_SERVICE_URL,
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency state (populated by factory on startup) ---
transcriber: TranscriptionStrategy | None = None
memory: MemoryRepository | None = None
llm: LLMAdapter | None = None


@app.on_event("startup")
async def startup():
    """Wire dependencies via factory on startup."""
    global transcriber, memory, llm
    transcriber = create_transcriber(config)
    memory = create_memory_repo(config)
    llm = create_llm_client(config)


@app.get("/health")
async def health() -> StatusMessage:
    ready = transcriber is not None and transcriber.is_ready()
    return StatusMessage(
        message="Python service running",
        ready=ready,
    )


@app.post("/transcribe")
async def transcribe(file: UploadFile) -> TranscriptResponse:
    if transcriber is None or not transcriber.is_ready():
        raise RuntimeError("Transcriber not ready")

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    tmp_input = Path(tempfile.mktemp(suffix=suffix))
    wav_path: Path | None = None

    try:
        content = await file.read()
        tmp_input.write_bytes(content)

        wav_path = convert_to_wav(tmp_input)
        segments = transcriber.transcribe(wav_path)

        return TranscriptResponse(
            segments=[
                TranscriptSegment(start=s.start, end=s.end, text=s.text)
                for s in segments
            ]
        )
    finally:
        tmp_input.unlink(missing_ok=True)
        if wav_path:
            wav_path.unlink(missing_ok=True)


@app.websocket("/ws/transcribe")
async def ws_transcribe(ws: WebSocket):
    """WebSocket endpoint for streaming audio transcription and AI prompting.

    Receives:
      { "type": "audio_chunk", "data": "<base64 PCM>", "sequence": N }
      { "type": "prompt", "question": "...", "context_window": 50 }

    Sends:
      { "type": "transcript", "text": "...", "is_partial": false, "sequence": N }
      { "type": "llm_response", "text": "...", "is_complete": false }
      { "type": "llm_response", "text": "", "is_complete": true }
    """
    await ws.accept()

    if transcriber is None or not transcriber.is_ready():
        await ws.send_json(
            ErrorMessage(message="Transcriber not ready").model_dump()
        )
        await ws.close()
        return

    bus = EventBus()
    pipeline = TranscriptionPipeline(transcriber, bus)

    async def on_segment_ready(data: dict):
        text = data["text"]
        is_partial = data.get("is_partial", False)
        # Only store finalized segments — partials would create duplicates
        if not is_partial and text.strip() and memory is not None:
            memory.add_segment(text, time.time())

        msg = TranscriptMessage(
            text=text,
            is_partial=data["is_partial"],
            sequence=data["sequence"],
        )
        await ws.send_json(msg.model_dump())

    bus.on("transcript.segment_ready", on_segment_ready)

    await ws.send_json(
        StatusMessage(message="Streaming transcription ready", ready=True).model_dump()
    )

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                print("[WS] Malformed JSON, skipping")
                continue

            msg_type = msg.get("type")

            if msg_type == "audio_chunk":
                try:
                    await pipeline.process_chunk(
                        b64_audio=msg["data"],
                        sequence=msg.get("sequence", 0),
                    )
                except Exception as e:
                    print(f"[WS] Error processing chunk {msg.get('sequence', '?')}: {e}")
                    await ws.send_json(
                        ErrorMessage(message=f"Chunk processing error: {e}").model_dump()
                    )

            elif msg_type == "prompt":
                await handle_prompt(ws, msg)

            elif msg_type == "status" and msg.get("message") == "stream_complete":
                await ws.send_json(
                    StatusMessage(message="Transcription complete", ready=True).model_dump()
                )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
    finally:
        bus.off("transcript.segment_ready", on_segment_ready)


async def handle_prompt(ws: WebSocket, msg: dict) -> None:
    """Fetch memory context and stream an LLM response for the given prompt."""
    if llm is None:
        await ws.send_json(
            ErrorMessage(message="LLM not available").model_dump()
        )
        return

    if not llm.is_available():
        await ws.send_json(
            ErrorMessage(message="Ollama is not running. Start it with: ollama serve").model_dump()
        )
        return

    question = msg.get("question", "").strip()
    if not question:
        await ws.send_json(ErrorMessage(message="Empty question").model_dump())
        return

    context_window = int(msg.get("context_window", 50))
    context = memory.get_context(context_window) if memory else ""

    if not context:
        await ws.send_json(
            ErrorMessage(
                message="No transcript in memory yet. Start transcribing first."
            ).model_dump()
        )
        return

    try:
        async for token in llm.stream_query(question, context):
            await ws.send_json(
                LLMResponseMessage(text=token, is_complete=False).model_dump()
            )
        # Signal completion
        await ws.send_json(
            LLMResponseMessage(text="", is_complete=True).model_dump()
        )
    except Exception as e:
        print(f"[WS] LLM error: {e}")
        await ws.send_json(
            ErrorMessage(message=f"LLM error: {e}").model_dump()
        )
