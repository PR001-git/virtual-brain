import os


class Config:
    """Centralized configuration — reads from environment with sensible defaults."""

    # Service
    HOST: str = os.getenv("VB_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("VB_PYTHON_PORT", "8100"))

    # Whisper
    WHISPER_MODEL: str = os.getenv("VB_WHISPER_MODEL", "base")
    WHISPER_DEVICE: str = os.getenv("VB_WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("VB_WHISPER_COMPUTE_TYPE", "int8")

    # Audio
    SAMPLE_RATE: int = 16000
    CHUNK_DURATION_S: float = float(os.getenv("VB_CHUNK_DURATION", "3.0"))

    # Ollama (Phase 4)
    OLLAMA_BASE_URL: str = os.getenv("VB_OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("VB_OLLAMA_MODEL", "mistral")

    # Memory (Phase 4)
    MEMORY_MAX_SEGMENTS: int = int(os.getenv("VB_MEMORY_MAX_SEGMENTS", "200"))
    MEMORY_PRUNE_COUNT: int = int(os.getenv("VB_MEMORY_PRUNE_COUNT", "100"))

    # Node service URL (for cross-service communication)
    NODE_SERVICE_URL: str = os.getenv("VB_NODE_URL", "http://localhost:8200")


config = Config()
