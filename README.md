# VirtualBrain

## Context

VirtualBrain is a local-first, real-time cognitive layer for live conversations. It listens, transcribes, and enables interactive querying of conversations as they unfold. The project currently has only a design document (`claude.md`) — no code exists yet. This plan covers the full implementation from scaffolding through all 5 phases.

## Tech Stack

- **Python service** (FastAPI, port 8100): Transcription (Faster-Whisper) + LLM queries (Ollama)
- **Node.js service** (Express + ws, port 8200): Web server, WebSocket bridge, serves React UI
- **React client** (Vite, port 3000): Minimal UI with WebSocket client
- **Communication**: REST for one-shot ops, WebSocket for streaming
- **External tools**: ffmpeg (installed), Ollama (Phase 4)

```
Browser <--WebSocket--> Node.js (8200) <--HTTP/WS--> Python (8100)
                           |
                    Serves React UI
```

---

## Design Patterns

Patterns applied across the codebase to keep it clean, extensible, and testable:

### Python Service

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Strategy** | `transcriber.py` | `TranscriptionStrategy` interface (ABC) with `WhisperStrategy` impl. Swap transcription engines without touching callers. |
| **Observer / Event Emitter** | `pipeline.py` | `EventBus` — components publish events (`audio.chunk_ready`, `transcript.segment_ready`) and subscribe to others. Decouples the pipeline stages. |
| **Repository** | `memory.py` | `MemoryRepository` interface with `InMemoryRepository` impl. Isolates storage logic; easy to swap for SQLite or vector store later. |
| **Factory** | `service_factory.py` | `create_transcriber()`, `create_llm_client()` — centralizes object creation with config. Keeps `main.py` clean. |
| **Adapter** | `llm_client.py` | `LLMAdapter` interface with `OllamaAdapter` impl. If you switch to a different local LLM runtime, only the adapter changes. |
| **Pipeline (Chain)** | `pipeline.py` | Audio flows through a chain: `AudioProcessor → Transcriber → MemoryBuffer`. Each stage has a uniform `process(input) -> output` interface. |

### Node.js Service

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Adapter** | `ws/python-bridge.ts` | Wraps HTTP/WS communication with Python behind a clean interface. Node code never knows about Python URLs or protocols directly. |
| **Observer** | `ws/client-handler.ts` | Node EventEmitter for internal message routing between WS clients and the Python bridge. |
| **Middleware** | `routes/` | Express middleware chain for validation, error handling, and request transformation. |

### React Client

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Observer** | `hooks/useWebSocket.ts` | Hook subscribes to WS events, components re-render on state changes. Standard React reactive pattern. |
| **Strategy** | `hooks/useAudioSource.ts` | `AudioSourceStrategy` — `FileAudioSource` (Phase 1-2), `MicAudioSource` (Phase 3a), `ExtensionAudioSource` (Phase 3b). Components don't care where audio comes from. |
| **Container/Presenter** | Components | Smart containers (manage state + WS) wrap dumb presenters (just render props). Keeps UI testable. |

### Cross-Cutting

| Pattern | Where | Purpose |
|---------|-------|---------|
| **DTO (Data Transfer Object)** | `types.ts` / `types.py` | Shared message types (see protocol below). Single source of truth for the WS protocol shape. |
| **Dependency Injection** | Everywhere | Constructors receive dependencies (transcriber, memory, llm_client) rather than importing globals. Makes testing and swapping trivial. |

---
