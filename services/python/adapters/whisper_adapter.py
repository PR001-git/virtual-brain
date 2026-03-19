from pathlib import Path

from faster_whisper import WhisperModel

from interfaces.transcription import Segment, TranscriptionStrategy


class WhisperAdapter(TranscriptionStrategy):
    """Concrete transcription strategy using Faster-Whisper."""

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._model: WhisperModel | None = None

    def load_model(self) -> None:
        print(f"[Whisper] Loading model '{self._model_size}' on {self._device} ({self._compute_type})...")
        self._model = WhisperModel(
            self._model_size,
            device=self._device,
            compute_type=self._compute_type,
        )
        print("[Whisper] Model loaded.")

    def transcribe(self, wav_path: Path) -> list[Segment]:
        if self._model is None:
            raise RuntimeError("Model not loaded — call load_model() first")

        segments_iter, _info = self._model.transcribe(
            str(wav_path),
            beam_size=5,
            language=None,  # auto-detect
        )

        return [
            Segment(start=seg.start, end=seg.end, text=seg.text.strip())
            for seg in segments_iter
            if seg.text.strip()
        ]

    def transcribe_chunk(self, pcm_bytes: bytes) -> str:
        """Transcribe raw PCM bytes — used in streaming (Phase 2)."""
        if self._model is None:
            raise RuntimeError("Model not loaded — call load_model() first")

        import tempfile

        tmp = Path(tempfile.mktemp(suffix=".wav"))
        try:
            # Write raw PCM as a minimal WAV
            import wave
            with wave.open(str(tmp), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(16000)
                wf.writeframes(pcm_bytes)

            segments, _ = self._model.transcribe(str(tmp), beam_size=1)
            return " ".join(seg.text.strip() for seg in segments if seg.text.strip())
        finally:
            tmp.unlink(missing_ok=True)

    def is_ready(self) -> bool:
        return self._model is not None
