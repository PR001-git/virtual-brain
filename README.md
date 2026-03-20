<div align="center">

# VirtualBrain

**A real-time cognitive layer for live conversations**



[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-black?logo=ollama)](https://ollama.com)

---

## Design Philosophy

This is a **learning project** — built to understand each layer deeply, not to ship production software. All components are implemented from scratch where possible, with zero reliance on paid services. If something feels like magic, break it open.

VirtualBrain listens to conversations, transcribes them in real time, and lets you **query the live context** using a local LLM. It's a second brain that processes audio streams into structured, queryable knowledge — fully local, fully private.

</div>

## Features

- **Real-time transcription** — streaming partial-to-final updates as words are spoken
- **Live context memory** — rolling transcript buffer with automatic pruning
- **AI-powered Q&A** — ask questions grounded in the conversation via local Ollama
- **Multiple audio sources** — file upload or microphone capture
- **Fully local** — no cloud services, no API keys, complete privacy
- **Streaming everything** — WebSocket-driven from audio capture to UI rendering

## Architecture

```
                    WebSocket              HTTP / WebSocket
  Browser (3000) ◄──────────► Node.js (8200) ◄──────────► Python (8100)
  React UI                    Express Bridge                FastAPI
  ├─ Live transcript          ├─ WS routing                 ├─ Faster-Whisper
  ├─ Audio capture            ├─ File upload                ├─ Ollama adapter
  └─ Brain panel (Q&A)       └─ Health checks              ├─ Memory repository
                                                            └─ Transcription pipeline
```

**Data flow:** Audio Input → Chunking → Preprocessing → Transcription → Memory Buffer → AI Interaction → UI

## Quick Start

### Prerequisites

| Tool | Required | Notes |
|------|----------|-------|
| [Python](https://python.org) | 3.10+ | ML backend |
| [Node.js](https://nodejs.org) | 18+ | Bridge server + UI |
| [ffmpeg](https://ffmpeg.org) | Latest | Audio processing |
| [Ollama](https://ollama.com) | Optional | Local LLM for Q&A features |

### Setup & Run (Windows)

```bash
# First-time setup — checks prerequisites, creates venv, installs deps
setup.bat

# Start all services (Python + Node + React)
start.bat
```

Then open **http://localhost:3000** in your browser.

### Manual Start

```bash
# Install dependencies
pip install -r services/python/requirements.txt
npm install && npm install --prefix services/node && npm install --prefix client

# Start all three services concurrently
npm run dev
```

| Service | Port | Command |
|---------|------|---------|
| Python (FastAPI) | 8100 | `npm run start:python` |
| Node.js (Express) | 8200 | `npm run start:node` |
| React (Vite) | 3000 | `npm run start:client` |

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `VB_WHISPER_MODEL` | `small` | Whisper model size: `tiny`, `base`, `small`, `medium`, `large-v2` |
| `VB_WHISPER_DEVICE` | `cpu` | Compute device: `cpu` or `cuda` |
| `VB_WHISPER_COMPUTE_TYPE` | `int8` | Precision: `int8`, `float16`, `float32` |
| `VB_CHUNK_DURATION` | `3.0` | Seconds per audio chunk |
| `VB_OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `VB_OLLAMA_MODEL` | `mistral` | LLM model for Q&A |
| `VB_MEMORY_MAX_SEGMENTS` | `200` | Max transcript segments in memory |
| `VB_MEMORY_PRUNE_COUNT` | `100` | Segments to drop when buffer is full |

## Project Structure

```
virtual-brain/
├── client/                      # React UI (Vite + TypeScript)
│   └── src/
│       ├── components/
│       │   ├── containers/      # Smart components (state + WS)
│       │   └── presenters/      # Dumb components (render props)
│       ├── hooks/               # useWebSocket, useAudioSource
│       └── strategies/          # Audio source strategies
├── services/
│   ├── python/                  # FastAPI backend
│   │   ├── main.py              # App entry + WS handlers
│   │   ├── pipeline.py          # Transcription pipeline + EventBus
│   │   ├── config.py            # Env-based configuration
│   │   ├── service_factory.py   # Dependency injection
│   │   ├── adapters/            # Whisper, Ollama, AudioProcessor
│   │   ├── interfaces/          # ABCs for transcription, memory, LLM
│   │   ├── repositories/        # InMemoryRepository
│   │   └── dto/                 # Message schemas
│   └── node/                    # Express bridge
│       └── src/
│           ├── adapters/        # Python bridge
│           ├── routes/          # Health, upload endpoints
│           └── ws/              # Client handler, message router
├── docs/                        # Documentation
├── setup.bat                    # Windows first-time setup
├── start.bat                    # Windows service launcher
└── .env.example                 # Configuration template
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Transcription | [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper) (local, CPU/GPU) |
| LLM | [Ollama](https://ollama.com) (Mistral default) |
| Backend | [FastAPI](https://fastapi.tiangolo.com) + [Uvicorn](https://uvicorn.org) |
| Bridge | [Express](https://expressjs.com) + [ws](https://github.com/websockets/ws) |
| Frontend | [React 19](https://react.dev) + [Vite](https://vite.dev) |
| Audio | [pydub](https://github.com/jiaaro/pydub) + ffmpeg |
| Language | Python 3.10+ / TypeScript 5.8+ |

## Implementation Phases

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | Static Brain | Done | Upload audio file, transcribe, display result |
| 2 | Streaming Brain | Done | Chunk audio, process sequentially, append transcript live |
| 3 | Listening Brain | Done | Capture microphone audio, stream in real time |
| 4 | Thinking Brain | Done | Memory repository + Ollama LLM for context-aware Q&A |
| 5 | Reactive Brain | Done | Streaming transcription with partial-to-final updates |

## Roadmap

- [ ] Browser extension for tab audio capture (Chrome tabCapture API)
- [ ] Speaker identification (diarization)
- [ ] Keyword triggers (e.g., "deadline", "decision")
- [ ] Auto-generated meeting summaries
- [ ] Export to markdown / knowledge bases
- [ ] Local vector search over past conversations



## License

[MIT](LICENSE) &copy; 2026 Pedro Reis
