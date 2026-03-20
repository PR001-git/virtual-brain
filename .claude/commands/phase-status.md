# Phase Status

Scan the VirtualBrain codebase and produce a clear checklist of which MVP phases are implemented vs missing. Then suggest the single next step to take.

## How to run

1. Check for each file/code marker listed below using Glob and Grep.
2. Mark each deliverable ✓ (exists and non-empty) or ✗ (missing or stub).
3. Determine the current phase: the highest phase where ALL deliverables are ✓.
4. Print the full report, then a one-line "Next step" pointing at the first ✗ item in the next phase.

## Phase checklist

### Phase 0 — Scaffolding
- `services/python/config.py`
- `services/python/interfaces/transcription.py` — contains `TranscriptionStrategy`
- `services/python/interfaces/memory.py` — contains `MemoryRepository`
- `services/python/interfaces/llm.py` — contains `LLMAdapter`
- `services/python/dto/messages.py` — contains Pydantic models
- `services/python/service_factory.py`
- `services/python/main.py` — contains `/health` route
- `services/node/src/config.ts`
- `services/node/src/interfaces/python-service.ts`
- `services/node/src/types.ts`
- `services/node/src/index.ts` — contains `/api/health`
- `client/src/App.tsx`
- `client/src/types.ts`

### Phase 1 — Static Brain
- `services/python/adapters/audio_processor.py` — contains `convert_to_wav`
- `services/python/adapters/whisper_adapter.py` — contains `WhisperStrategy` or `WhisperAdapter`
- `services/node/src/adapters/python-bridge.ts`
- `services/node/src/routes/upload.ts`
- `client/src/components/presenters/AudioUpload.tsx`
- `client/src/components/presenters/TranscriptView.tsx`
- `client/src/components/containers/TranscriptContainer.tsx`

### Phase 2 — Streaming Brain
- `services/python/pipeline.py` — contains `EventBus`
- `services/node/src/ws/client-handler.ts`
- `services/node/src/ws/message-router.ts`
- `client/src/hooks/useWebSocket.ts`
- `client/src/strategies/audio-sources.ts` — contains `FileAudioSource`
- `client/src/hooks/useAudioSource.ts`

### Phase 3 — Listening Brain
- `client/src/strategies/audio-sources.ts` — contains `MicAudioSource`
- `client/src/components/presenters/MicCapture.tsx`
- `extension/manifest.json`
- `extension/background.js`

### Phase 4 — Thinking Brain
- `services/python/repositories/memory_repository.py` — contains `InMemoryRepository`
- `services/python/adapters/ollama_adapter.py` — contains `OllamaAdapter`
- `client/src/components/presenters/PromptBox.tsx`
- `client/src/components/containers/PromptContainer.tsx`

### Phase 5 — Reactive Brain
- `services/python/adapters/whisper_adapter.py` — contains `word_timestamps`
- `client/src/components/presenters/StatusBar.tsx`
- `services/python/repositories/memory_repository.py` — contains memory pruning / summarization logic

## Output format

```
## VirtualBrain — Phase Status

### Phase 0 — Scaffolding
  ✓ services/python/config.py
  ✗ services/python/interfaces/transcription.py
  ...

### Phase 1 — Static Brain
  ✗ (not started)

...

**Current phase: 0 (partial)**

**Next step:** Implement `services/python/interfaces/transcription.py` — define the `TranscriptionStrategy` ABC with `transcribe(wav_path) -> list[Segment]`.
```

Keep the report scannable. Do not add extra commentary beyond the checklist and the next-step line.
