from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Segment:
    """A single transcription segment with timing info."""
    start: float
    end: float
    text: str


class TranscriptionStrategy(ABC):
    """Interface for transcription engines.

    Implement this to swap between Whisper variants or other
    speech-to-text engines without touching callers.
    """

    @abstractmethod
    def load_model(self) -> None:
        """Load the underlying model into memory."""
        ...

    @abstractmethod
    def transcribe(self, wav_path: Path) -> list[Segment]:
        """Transcribe a WAV file and return timed segments."""
        ...

    @abstractmethod
    def transcribe_chunk(self, pcm_bytes: bytes) -> str:
        """Transcribe a raw PCM audio chunk and return plain text."""
        ...

    @abstractmethod
    def is_ready(self) -> bool:
        """Return True if the model is loaded and ready."""
        ...
