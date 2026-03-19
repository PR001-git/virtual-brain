from config import Config
from interfaces.transcription import TranscriptionStrategy


def create_transcriber(cfg: Config) -> TranscriptionStrategy:
    """Factory: create a configured transcription engine."""
    from adapters.whisper_adapter import WhisperAdapter

    adapter = WhisperAdapter(
        model_size=cfg.WHISPER_MODEL,
        device=cfg.WHISPER_DEVICE,
        compute_type=cfg.WHISPER_COMPUTE_TYPE,
    )
    adapter.load_model()
    return adapter


# Phase 4 stubs — uncomment when implementing

# def create_memory_repo(cfg: Config) -> MemoryRepository:
#     from repositories.memory_repository import InMemoryRepository
#     return InMemoryRepository(
#         max_segments=cfg.MEMORY_MAX_SEGMENTS,
#         prune_count=cfg.MEMORY_PRUNE_COUNT,
#     )

# def create_llm_client(cfg: Config) -> LLMAdapter:
#     from adapters.ollama_adapter import OllamaAdapter
#     return OllamaAdapter(
#         base_url=cfg.OLLAMA_BASE_URL,
#         model=cfg.OLLAMA_MODEL,
#     )
