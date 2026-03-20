# Implement Component

Scaffold a single VirtualBrain component from scratch, following the design patterns defined in `initial.mvp.md`.

The argument passed to this command is the component name, e.g.:
- `whisper_adapter`
- `python-bridge`
- `useWebSocket`
- `MicCapture`
- `ollama_adapter`
- `pipeline`

## Step 1 — Identify the component

From the component name, determine:

| Property | How to determine |
|----------|-----------------|
| **Service** | `py` prefix / `.py` extension → Python. `use` prefix or `.tsx` → React. Otherwise Node.js. |
| **Target path** | Look it up in the project structure table below. |
| **Design pattern** | Look it up in the pattern table below. |
| **Phase** | Which MVP phase introduces this component. |

### Project structure lookup

| Component name | Target path | Pattern | Phase |
|---|---|---|---|
| `config` (python) | `services/python/config.py` | — | 0 |
| `transcription` (interface) | `services/python/interfaces/transcription.py` | Strategy (ABC) | 0 |
| `memory` (interface) | `services/python/interfaces/memory.py` | Repository (ABC) | 0 |
| `llm` (interface) | `services/python/interfaces/llm.py` | Adapter (ABC) | 0 |
| `messages` / `dto` | `services/python/dto/messages.py` | DTO (Pydantic) | 0 |
| `service_factory` | `services/python/service_factory.py` | Factory | 0 |
| `main` (python) | `services/python/main.py` | — | 0 |
| `audio_processor` | `services/python/adapters/audio_processor.py` | Adapter | 1 |
| `whisper_adapter` | `services/python/adapters/whisper_adapter.py` | Strategy impl | 1 |
| `pipeline` | `services/python/pipeline.py` | Observer/EventBus + Pipeline chain | 2 |
| `memory_repository` | `services/python/repositories/memory_repository.py` | Repository impl | 4 |
| `ollama_adapter` | `services/python/adapters/ollama_adapter.py` | Adapter impl | 4 |
| `config` (node) | `services/node/src/config.ts` | — | 0 |
| `python-service` (interface) | `services/node/src/interfaces/python-service.ts` | Interface | 0 |
| `types` (node) | `services/node/src/types.ts` | DTO | 0 |
| `index` (node) | `services/node/src/index.ts` | — | 0 |
| `python-bridge` | `services/node/src/adapters/python-bridge.ts` | Adapter impl | 1 |
| `upload` (route) | `services/node/src/routes/upload.ts` | Middleware chain | 1 |
| `client-handler` | `services/node/src/ws/client-handler.ts` | Observer | 2 |
| `message-router` | `services/node/src/ws/message-router.ts` | Router | 2 |
| `AudioUpload` | `client/src/components/presenters/AudioUpload.tsx` | Presenter | 1 |
| `TranscriptView` | `client/src/components/presenters/TranscriptView.tsx` | Presenter | 1 |
| `TranscriptContainer` | `client/src/components/containers/TranscriptContainer.tsx` | Container | 1 |
| `useWebSocket` | `client/src/hooks/useWebSocket.ts` | Observer hook | 2 |
| `audio-sources` | `client/src/strategies/audio-sources.ts` | Strategy impls | 2–3 |
| `useAudioSource` | `client/src/hooks/useAudioSource.ts` | Strategy hook | 2 |
| `MicCapture` | `client/src/components/presenters/MicCapture.tsx` | Presenter | 3 |
| `PromptBox` | `client/src/components/presenters/PromptBox.tsx` | Presenter | 4 |
| `PromptContainer` | `client/src/components/containers/PromptContainer.tsx` | Container | 4 |
| `StatusBar` | `client/src/components/presenters/StatusBar.tsx` | Presenter | 5 |

## Step 2 — Read context

Before writing any code:
1. Read `initial.mvp.md` — find the phase section that describes this component.
2. Read the relevant interface file (if one exists) so the implementation satisfies the contract exactly.
3. Read one or two neighbouring files for import conventions and code style.

## Step 3 — Implement

Write the complete file at the target path. Follow these rules:

**All services:**
- Constructors receive dependencies (never import globals for injected services).
- Use the exact class/function names from `initial.mvp.md`.
- Add a one-line docstring/JSDoc per public method explaining *what* it does (not how).

**Python:**
- Type-annotate all function signatures.
- Use `pathlib.Path` for file paths.
- Raise descriptive exceptions rather than returning `None` on error.

**Node.js / TypeScript:**
- Export a class that implements the relevant TypeScript interface.
- Use `path.join` for file paths.

**React:**
- Presenter components receive everything via props — no state, no API calls.
- Container components manage state and WebSocket calls; pass data down to presenters.

## Step 4 — Wire it in

After writing the component, wire it into its entry point:
- **Python adapters/repositories**: export from `service_factory.py` via the appropriate `create_*()` function.
- **Node adapters**: import and instantiate in `index.ts` or the relevant route.
- **React**: import into the appropriate container or `App.tsx`.

## Step 5 — Report

Print a short summary:
```
✓ Created: <target path>
✓ Pattern: <pattern name>
✓ Wired into: <entry point>

Next: run /health-check to verify the service starts correctly.
```
