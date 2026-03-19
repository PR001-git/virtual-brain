from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator


class LLMAdapter(ABC):
    """Interface for LLM interaction.

    Swap between Ollama, llama.cpp, or any other local LLM
    runtime by implementing this interface.
    """

    @abstractmethod
    async def query(self, prompt: str, context: str) -> str:
        """Send a prompt with transcript context, return full response."""
        ...

    @abstractmethod
    async def stream_query(self, prompt: str, context: str) -> AsyncGenerator[str, None]:
        """Stream response tokens one at a time."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the LLM service is reachable."""
        ...
