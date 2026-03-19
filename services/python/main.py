import json
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import config
from dto.messages import (
    ErrorMessage,
    StatusMessage,
    TranscriptMessage,
    TranscriptResponse,
    TranscriptSegment,
)
from interfaces.transcription import TranscriptionStrategy
from service_factory import create_transcriber
from adapters.audio_processor import convert_to_wav
from pipeline import EventBus, TranscriptionPipeline

app = FastAPI(title="VirtualBrain Python Service", version="0.2.0")

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


@app.on_event("startup")
async def startup():
    """Wire dependencies via factory on startup."""
    global transcriber
    transcriber = create_transcriber(config)


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

    # Save uploaded file to a temp location
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    tmp_input = Path(tempfile.mktemp(suffix=suffix))
    wav_path: Path | None = None

    try:
        content = await file.read()
        tmp_input.write_bytes(content)

        # Convert to 16kHz mono WAV
        wav_path = convert_to_wav(tmp_input)

        # Transcribe
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
    """WebSocket endpoint for streaming audio transcription.

    Receives: { "type": "audio_chunk", "data": "<base64 PCM>", "sequence": N }
    Sends:    { "type": "transcript", "text": "...", "is_partial": false, "sequence": N }
    """
    await ws.accept()

    if transcriber is None or not transcriber.is_ready():
        await ws.send_json(
            ErrorMessage(message="Transcriber not ready").model_dump()
        )
        await ws.close()
        return

    # Create a pipeline with an event bus for this connection
    bus = EventBus()
    pipeline = TranscriptionPipeline(transcriber, bus)

    # Wire: when a segment is ready, send it back over WebSocket
    async def on_segment_ready(data: dict):
        msg = TranscriptMessage(
            text=data["text"],
            is_partial=data["is_partial"],
            sequence=data["sequence"],
        )
        await ws.send_json(msg.model_dump())

    bus.on("transcript.segment_ready", on_segment_ready)

    # Send ready status
    await ws.send_json(
        StatusMessage(message="Streaming transcription ready", ready=True).model_dump()
    )

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                print(f"[WS] Malformed JSON, skipping")
                continue

            if msg.get("type") == "audio_chunk":
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
            elif msg.get("type") == "status" and msg.get("message") == "stream_complete":
                # Client signals all chunks sent
                await ws.send_json(
                    StatusMessage(message="Transcription complete", ready=True).model_dump()
                )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
    finally:
        bus.off("transcript.segment_ready", on_segment_ready)
