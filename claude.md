# Project: VirtualBrain
Keep the plan practical and focused — this is a learning project, not production software. Prefer simplicity.

## Overview
VirtualBrain is a local-first, open-source system that acts as a real-time cognitive layer on top of live conversations.

It listens, transcribes, understands context, and allows interactive querying of the conversation as it unfolds.

The system is designed as a "second brain" that processes audio streams into structured, queryable knowledge in real time.

This is a proof of concept built for learning: all components should be implemented from scratch where possible, with zero reliance on paid services.

---

## Core Philosophy

VirtualBrain is not just transcription.

It is:
- A live memory system
- A contextual reasoning layer
- A real-time assistant grounded in conversation

Guiding principles:
- Local-first and private
- Real-time over perfect accuracy
- Transparent pipelines over black boxes
- Build to understand, not just to ship

---

## System Architecture

### 1. Sensory Layer (Audio Input)
Responsible for capturing raw audio signals.

Sources:
- Browser extension (primary: meeting capture)
- Optional microphone input

Responsibilities:
- Capture system/tab audio
- Stream audio in small chunks (1–3 seconds)
- Forward data to processing pipeline

---

### 2. Preprocessing Layer
Transforms raw audio into a consistent format.

Responsibilities:
- Convert to PCM/WAV
- Normalize sample rate
- Optional:
  - noise reduction
  - silence detection

Output:
- Clean audio chunks ready for transcription

---

### 3. Language Layer (Transcription Engine)
Converts audio into text in near real time.

Requirements:
- Local model (e.g., Whisper or equivalent)
- Incremental transcription support
- Emit:
  - partial transcripts (low latency)
  - finalized segments

Key constraint:
- Optimize for responsiveness over perfect accuracy

---

### 4. Memory Layer (Context Engine)
This is the "brain core".

Responsibilities:
- Maintain rolling transcript buffer
- Segment conversation into meaningful chunks
- Track short-term memory (recent context)
- Optionally compress older context via summarization

Concepts:
- Sliding window context
- Semantic grouping
- Memory pruning

---

### 5. Cognition Layer (AI Interaction)
Enables reasoning over the live conversation.

Capabilities:
- Answer questions based on current transcript
- Generate summaries
- Extract action items
- Clarify decisions

Input:
- User prompts
- Current memory state

Output:
- Context-aware responses grounded in transcript

Rules:
- Do not hallucinate beyond transcript
- Prefer uncertainty over fabrication
- Reference "based on current conversation"

---

### 6. Interface Layer (UI)
The observable surface of VirtualBrain.

Features:
- Live transcript stream
- Highlight evolving text (partial → final)
- Prompt input box
- Streaming AI responses

Optional:
- Timeline view
- Highlight key moments

---

## MVP Features

- Real-time transcription pipeline
- Incremental transcript updates
- Prompt-based interaction with live context
- Fully local execution
- Simple web interface

---

## Non-Goals

- Perfect transcription accuracy
- Speaker diarization (initially)
- Cloud sync or persistence
- Production-grade scaling

---

## Suggested Tech Stack

### Core Backend
- Python (preferred for ML integration)
- FastAPI or lightweight server
- WebSockets for real-time streaming

### Transcription
- Whisper (local)
- Faster-Whisper for performance

### Frontend
- Minimal React or vanilla JS app
- WebSocket client

### Browser Extension
- Chrome extension (tabCapture API)
- Stream audio via WebSocket/WebRTC

---

## Data Flow

Audio Input → Chunking → Preprocessing → Transcription → Memory Buffer → AI Interaction → UI

Everything flows continuously.

No batch jobs.
No blocking steps.

---

## Implementation Phases

### Phase 1 — Static Brain
- Upload audio file
- Transcribe بالكامل
- Display result

### Phase 2 — Streaming Brain
- Chunk audio
- Process sequentially
- Append transcript live

### Phase 3 — Listening Brain
- Capture browser audio
- Stream in real time

### Phase 4 — Thinking Brain
- Add memory layer
- Enable prompt-based Q&A

### Phase 5 — Reactive Brain
- Improve latency
- Add partial transcripts
- Enhance UI responsiveness

---

## Key Challenges

- Simulating real-time with batch transcription models
- Managing latency vs accuracy trade-offs
- Efficient context window management
- Avoiding memory bloat

---

## Design Constraints

- Must run on CPU-only environments (GPU optional)
- Must degrade gracefully on low-performance machines
- Avoid heavy dependencies unless necessary

---

## AI Behavior Guidelines

- Be concise and grounded
- Use only available transcript context
- Prefer structured outputs:
  - bullet points
  - summaries
  - extracted decisions

Avoid:
- Guessing missing information
- Over-interpreting unclear speech

---

## Future Extensions

- Speaker identification (diarization)
- Keyword triggers (e.g., "deadline", "decision")
- Auto-generated meeting summaries
- Export to markdown or knowledge bases
- Local vector search over past conversations

---

## Development Mindset

VirtualBrain is a system you explore, not just build.

Priorities:
- Understand each layer deeply
- Keep components modular
- Make the data flow visible

If something feels like magic, break it open.

This is a brain you are assembling piece by piece.