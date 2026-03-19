from abc import ABC, abstractmethod


class MemoryRepository(ABC):
    """Interface for transcript memory storage.

    Isolates storage logic so we can swap InMemory for SQLite,
    vector store, or any other backend later.
    """

    @abstractmethod
    def add_segment(self, text: str, timestamp: float) -> None:
        """Store a new transcript segment."""
        ...

    @abstractmethod
    def get_context(self, window: int = 50) -> str:
        """Return the last N segments as formatted text."""
        ...

    @abstractmethod
    def get_full_transcript(self) -> str:
        """Return the entire transcript."""
        ...

    @abstractmethod
    def search(self, keyword: str) -> list[dict]:
        """Search segments containing the keyword."""
        ...

    @abstractmethod
    def segment_count(self) -> int:
        """Return the total number of stored segments."""
        ...
