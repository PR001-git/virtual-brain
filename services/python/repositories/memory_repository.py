import time

from interfaces.memory import MemoryRepository


class InMemoryRepository(MemoryRepository):
    """Rolling buffer of transcript segments with FIFO pruning.

    Stores segments in memory up to max_segments. When the cap is
    reached, the oldest prune_count entries are discarded.
    """

    def __init__(self, max_segments: int = 200, prune_count: int = 100) -> None:
        self._max_segments = max_segments
        self._prune_count = prune_count
        self._segments: list[dict] = []  # {"text": str, "timestamp": float}

    def add_segment(self, text: str, timestamp: float) -> None:
        self._segments.append({"text": text.strip(), "timestamp": timestamp})
        if len(self._segments) > self._max_segments:
            self._segments = self._segments[self._prune_count:]

    def get_context(self, window: int = 50) -> str:
        recent = self._segments[-window:]
        return "\n".join(s["text"] for s in recent if s["text"])

    def get_full_transcript(self) -> str:
        return "\n".join(s["text"] for s in self._segments if s["text"])

    def search(self, keyword: str) -> list[dict]:
        kw = keyword.lower()
        return [s for s in self._segments if kw in s["text"].lower()]

    def segment_count(self) -> int:
        return len(self._segments)
