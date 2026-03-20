import asyncio
import base64
import threading
from collections import defaultdict
from collections.abc import Callable
from typing import Any


class EventBus:
    """Simple observer / event emitter for decoupling pipeline stages.

    Components publish events and subscribe to others without
    direct references, keeping each stage independent.
    Supports both sync and async handlers.
    """

    def __init__(self) -> None:
        self._listeners: dict[str, list[Callable]] = defaultdict(list)

    def on(self, event: str, handler: Callable) -> None:
        """Subscribe a handler to an event."""
        self._listeners[event].append(handler)

    def off(self, event: str, handler: Callable) -> None:
        """Unsubscribe a handler from an event."""
        self._listeners[event] = [
            h for h in self._listeners[event] if h is not handler
        ]

    async def emit(self, event: str, data: Any = None) -> None:
        """Publish an event to all subscribed handlers (async-aware)."""
        for handler in self._listeners.get(event, []):
            result = handler(data)
            if asyncio.iscoroutine(result):
                await result


class TranscriptionPipeline:
    """Orchestrates the audio chunk → transcription flow.

    Receives base64 audio chunks, decodes them, transcribes via
    the injected strategy, and emits results through the event bus.
    """

    def __init__(self, transcriber: Any, bus: EventBus) -> None:
        self._transcriber = transcriber
        self._bus = bus
        self._sequence = 0

    async def process_chunk(self, b64_audio: str, sequence: int) -> None:
        """Process a single base64-encoded PCM chunk through the pipeline.

        Runs transcription in a background thread and streams results back via
        an async queue, emitting partial events as faster-whisper decodes each
        segment and a final event once the chunk is fully transcribed.
        """
        pcm_bytes = base64.b64decode(b64_audio)
        await self._bus.emit("audio.chunk_ready", {
            "pcm_bytes": pcm_bytes,
            "sequence": sequence,
        })

        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def _run_in_thread() -> None:
            try:
                for text, is_partial in self._transcriber.transcribe_chunk_streaming(pcm_bytes):
                    loop.call_soon_threadsafe(queue.put_nowait, (text, is_partial))
            except Exception as exc:
                loop.call_soon_threadsafe(queue.put_nowait, exc)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        threading.Thread(target=_run_in_thread, daemon=True).start()

        emitted_final = False
        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            text, is_partial = item
            if not is_partial:
                emitted_final = True
            await self._bus.emit("transcript.segment_ready", {
                "text": text,
                "sequence": sequence,
                "is_partial": is_partial,
            })

        # Guard: if transcriber emitted nothing (e.g. silence), send empty final
        if not emitted_final:
            await self._bus.emit("transcript.segment_ready", {
                "text": "",
                "sequence": sequence,
                "is_partial": False,
            })

        self._sequence += 1
