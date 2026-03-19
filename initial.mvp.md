# VirtualBrain — Full MVP Roadmap

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

## Project Structure

```
virtual-brain/
  claude.md
  package.json                 # Root: concurrently runs all services
  services/
    python/
      requirements.txt
      config.py                # Centralized configuration
      main.py                  # FastAPI entrypoint — thin, delegates to factory
      service_factory.py       # Factory: creates configured service instances
      pipeline.py              # EventBus + Pipeline chain orchestration
      interfaces/
        __init__.py
        transcription.py       # TranscriptionStrategy ABC
        memory.py              # MemoryRepository ABC
        llm.py                 # LLMAdapter ABC
      adapters/
        __init__.py
        whisper_adapter.py     # Strategy impl: Faster-Whisper
        ollama_adapter.py      # Adapter impl: Ollama REST client (Phase 4)
        audio_processor.py     # ffmpeg/pydub audio conversion
      repositories/
        __init__.py
        memory_repository.py   # InMemoryRepository impl (Phase 4)
      dto/
        __init__.py
        messages.py            # Pydantic models for WS message types
    node/
      package.json
      tsconfig.json
      src/
        index.ts               # Express + WS server entrypoint
        config.ts              # Centralized configuration
        interfaces/
          python-service.ts    # Interface for Python service communication
        adapters/
          python-bridge.ts     # Adapter impl: HTTP/WS client to Python
        routes/
          upload.ts            # File upload proxy (middleware chain)
          health.ts
        ws/
          client-handler.ts    # Observer: manages browser WS connections
          message-router.ts    # Routes messages by type
        types.ts               # DTOs: shared message types
  client/
    package.json
    src/
      App.tsx
      types.ts                 # DTOs: mirrors server message types
      components/
        containers/            # Smart components (state + logic)
          TranscriptContainer.tsx
          PromptContainer.tsx   # Phase 4
        presenters/            # Dumb components (just render)
          TranscriptView.tsx
          SegmentItem.tsx
          PromptBox.tsx        # Phase 4
          AudioUpload.tsx
          MicCapture.tsx       # Phase 3
          StatusBar.tsx        # Phase 5
      hooks/
        useWebSocket.ts        # Observer: WS connection hook
        useAudioSource.ts      # Strategy: abstracts audio input source
      strategies/
        audio-sources.ts       # FileAudioSource, MicAudioSource impls
  extension/                   # Phase 3b
    manifest.json
    background.js
    popup.html / popup.js
```

## WebSocket Message Protocol

All messages are JSON:
```
{ "type": "audio_chunk", "data": "<base64 PCM>", "sequence": 1 }
{ "type": "transcript", "text": "...", "is_partial": false, "sequence": 1 }
{ "type": "prompt", "question": "What was discussed?" }
{ "type": "llm_response", "text": "...", "is_complete": false }
{ "type": "status", "message": "...", "ready": true }
{ "type": "error", "message": "..." }
```

---

## Phase 0 — Scaffolding

**Deliverables**: Monorepo structure, interfaces defined, both services running, health check working.

1. Create full directory structure (including `interfaces/`, `adapters/`, `repositories/`, `dto/`)
2. Init root `package.json` with `concurrently` for `npm run dev`
3. **Python**:
   - `config.py` — centralized settings (ports, model name, chunk size) via environment variables with defaults
   - `interfaces/transcription.py` — `TranscriptionStrategy` ABC: `transcribe(wav_path) -> list[Segment]`
   - `interfaces/memory.py` — `MemoryRepository` ABC: `add_segment()`, `get_context()`, `search()` (stubs for Phase 4)
   - `interfaces/llm.py` — `LLMAdapter` ABC: `query()`, `stream_query()` (stubs for Phase 4)
   - `dto/messages.py` — Pydantic models for all WS message types
   - `service_factory.py` — factory functions that read config and return concrete implementations
   - `main.py` — thin FastAPI entrypoint, uses factory to wire dependencies, `/health` endpoint
4. **Node**:
   - `config.ts` — centralized settings
   - `interfaces/python-service.ts` — TypeScript interface for Python communication
   - `types.ts` — DTO types mirroring Python's `messages.py`
   - `index.ts` — Express server with `/api/health` that pings Python via adapter
5. **Client**: Vite React-TS template, basic App shell, `types.ts` with shared DTOs

**Patterns established**: DI via factory, interfaces before implementations, DTOs as contract.

**Verify**: `npm run dev` starts all 3 services; `GET /api/health` returns OK from both.

---

## Phase 1 — Static Brain

**Goal**: Upload audio file → transcribe fully → display result.

**Build order** (bottom-up — test each layer before moving up):

1. **Python** (Strategy + Factory):
   - `adapters/audio_processor.py`: `convert_to_wav(input_path) -> wav_path` via ffmpeg subprocess (16kHz mono PCM)
   - `adapters/whisper_adapter.py`: Implements `TranscriptionStrategy` — wraps `WhisperModel("base", device="cpu", compute_type="int8")`
   - `service_factory.py`: `create_transcriber(config) -> TranscriptionStrategy` — returns `WhisperAdapter`
   - `main.py`: `POST /transcribe` — uses injected transcriber, returns `TranscriptResponse` DTO
2. **Node** (Adapter + Middleware):
   - `adapters/python-bridge.ts`: Implements `PythonService` interface — HTTP calls to Python
   - `routes/upload.ts`: Express middleware chain: multer → validate → forward via adapter → respond
3. **React** (Container/Presenter):
   - `presenters/AudioUpload.tsx`: Dumb file input, calls `onUpload(file)` prop
   - `presenters/TranscriptView.tsx`: Renders `Segment[]` with timestamps
   - `containers/TranscriptContainer.tsx`: Manages upload state, calls API, passes data to presenter

**Deps**: `faster-whisper`, `python-multipart`, `pydub` (Python); `multer` (Node)

**Verify**: Upload a short audio clip in the browser → transcript with timestamps appears.

---

## Phase 2 — Streaming Brain

**Goal**: Chunk uploaded audio, process sequentially, append transcript live via WebSocket.

**Patterns introduced**: Observer (EventBus), Pipeline chain.

1. **Python** (Pipeline + Observer):
   - `pipeline.py`: `EventBus` class with `emit(event, data)` / `on(event, handler)`. Pipeline chain: `AudioProcessor.process() → emit('chunk_ready') → Transcriber.process() → emit('segment_ready')`
   - `main.py`: Add WS endpoint `ws://localhost:8100/ws/transcribe` — on message, push into pipeline; pipeline emits results back through WS
2. **Node** (Observer + Adapter):
   - `ws/client-handler.ts`: Manages browser WS connections via Node EventEmitter. On client message → emit to bridge. On bridge result → emit to client.
   - `ws/message-router.ts`: Routes messages by `type` field to appropriate handlers
   - `adapters/python-bridge.ts`: Add WS client capability alongside existing HTTP
3. **React** (Observer + Strategy):
   - `hooks/useWebSocket.ts`: Custom hook — connects, reconnects with backoff, exposes `{ messages, send, status }`
   - `strategies/audio-sources.ts`: `FileAudioSource` — reads file, splits into 3-sec chunks, emits chunks via callback
   - `hooks/useAudioSource.ts`: Hook that accepts an `AudioSourceStrategy` and wires it to the WS
   - `containers/TranscriptContainer.tsx`: Subscribes to WS messages, appends segments incrementally

**Verify**: Upload 1-min file → segments appear one-by-one. Full transcript matches Phase 1 output.

---

## Phase 3 — Listening Brain

**Goal**: Capture live audio and stream in real time. Strategy pattern shines here — new audio sources, zero changes to pipeline.

### 3a — Microphone capture (Strategy):
- `strategies/audio-sources.ts`: Add `MicAudioSource` — implements same interface as `FileAudioSource`. Uses `getUserMedia` + `AudioWorkletNode`, accumulates 3-sec chunks, calls same `onChunk` callback.
- `presenters/MicCapture.tsx`: Start/Stop button, recording indicator
- `containers/TranscriptContainer.tsx`: Switch audio source strategy based on user choice — **no other changes needed**

### 3b — Chrome Extension (Adapter):
- `extension/manifest.json`: Manifest V3, permissions: `tabCapture`, `activeTab`
- `extension/background.js`: `chrome.tabCapture.capture()` → AudioContext → chunk → WS to Node. Acts as another audio source adapter, same WS protocol.
- `extension/popup.html`: "Capture This Tab" button + status

**Windows note**: System audio capture requires either the Chrome extension or a virtual audio cable (VB-Cable).

**Verify**: Speak into mic → transcript within 3-5 seconds. Extension captures YouTube audio correctly.

---

## Phase 4 — Thinking Brain

**Goal**: Memory layer + LLM-based Q&A over transcript via Ollama.

**Patterns introduced**: Repository (memory), Adapter (LLM).

**Prerequisite**: Install Ollama + pull `mistral` (or `phi3:mini` for weaker machines).

1. **Python** (Repository + Adapter + Factory):
   - `repositories/memory_repository.py`: `InMemoryRepository` — implements `MemoryRepository` ABC. Stores segments list, supports `get_context(window)`, `search(keyword)`.
   - `adapters/ollama_adapter.py`: `OllamaAdapter` — implements `LLMAdapter` ABC. Calls Ollama REST API. System prompt constrains answers to transcript only.
   - `service_factory.py`: Add `create_memory_repo()` and `create_llm_client()` — inject via DI
   - `pipeline.py`: Pipeline now emits `segment_ready` → MemoryRepository listens and stores
   - `main.py`: `POST /query` + `WS /ws/query` for streaming LLM responses
2. **Node** (Router):
   - `ws/message-router.ts`: Add `"prompt"` type handling → forward to Python `/ws/query`, stream back
3. **React** (Container/Presenter):
   - `presenters/PromptBox.tsx`: Text input + submit button (dumb component)
   - `containers/PromptContainer.tsx`: Manages prompt state, sends over WS, renders streaming response
   - `App.tsx`: Split layout — transcript left, Q&A right

**Verify**: Ask "What topics were discussed?" → grounded answer. Ask about absent topic → model declines. Streaming tokens appear incrementally.

---

## Phase 5 — Reactive Brain

**Goal**: Polish latency, partial transcripts, UI improvements, memory pruning.

1. **Partial transcripts** (Pipeline enhancement):
   - `adapters/whisper_adapter.py`: Enable `word_timestamps=True`, overlapping chunks (3s with 1s overlap), deduplicate. Emit both `partial` and `final` segment events via pipeline.
2. **Reduced latency**:
   - Shrink chunks to 1.5-2s, `beam_size=1`, `vad_filter=True` to skip silence
3. **UI polish** (Presenter updates):
   - `presenters/TranscriptView.tsx`: Visual distinction — partial (grey/italic) → final (black). Auto-scroll.
   - `presenters/StatusBar.tsx`: Connection status, latency metric, audio level meter.
   - Keyboard shortcuts: `Ctrl+Enter` submit prompt, `Ctrl+M` toggle mic.
4. **Memory pruning** (Repository enhancement):
   - `repositories/memory_repository.py`: When >200 segments, call LLMAdapter to summarize oldest 100 into a single summary segment. Keep summary + recent 100. Context window stays bounded.

**Verify**: End-to-end latency <4s on CPU. 30-min session with stable memory. Partial → final text transitions visible.

---

## Windows-Specific Notes

- Use `python -m pip` and `python -m uvicorn` (not bare commands)
- Faster-Whisper: `compute_type="int8"` for CPU performance
- Use `pathlib.Path` in Python, `path.join` in Node for cross-platform paths
- ffmpeg is installed via WinGet — ensure it's on PATH or reference absolutely

## Build Order Per Phase

Always: **Python endpoint → test with curl → Node proxy → test → React UI → test end-to-end**
