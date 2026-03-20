---
name: debug-service
description: >
  Auto-diagnoses VirtualBrain service failures. Use this skill whenever the
  user mentions a crashed service, connection refused error, "something broke",
  "Python is down", "Node is down", "why is X failing", or any variant of a
  service not responding. Also trigger immediately when /health-check reports
  ✗ on any service, or when a curl/WebSocket command returns an error. Runs a
  structured diagnostic — checks port availability, Python deps (faster-whisper,
  uvicorn, pydub, websockets), ffmpeg on PATH, and Ollama reachability — then
  prints ranked root causes with exact copy-paste fix commands. Always prefer
  this skill over manually reading logs when a VirtualBrain service is misbehaving.
---

# debug-service

Diagnose why a VirtualBrain service is down or misbehaving. Follow these steps in order.

## Step 1 — Re-probe health

Run both health probes to confirm what's actually down:

```bash
curl -s -w "\nHTTP %{http_code}" http://localhost:8100/health
```
```bash
curl -s -w "\nHTTP %{http_code}" http://localhost:8200/api/health
```

Note the HTTP code for each:
- `200` → service is up (but something else may be wrong)
- `000` → connection refused — service not running or wrong port
- `5xx` → service started but crashed internally

## Step 2 — Run the diagnostic script

Run the bundled script. It checks ports, Python dependencies, ffmpeg, and Ollama:

```bash
python .claude/skills/debug-service/scripts/diagnose.py
```

The script outputs structured lines. Collect all of them before moving to Step 3.

## Step 3 — Map to root causes

Use this table to translate diagnostic output into ranked root causes. Start from the top — earlier causes often mask later ones.

| Diagnostic output | Root cause | Fix |
|---|---|---|
| `PORT_8100: CLOSED` + Python health `000` | Python service not started | `cd services/python && python -m uvicorn main:app --host 0.0.0.0 --port 8100 --reload` |
| `PORT_8100: OPEN` + Python health `000` | Another process owns port 8100 | Find it: `netstat -ano \| findstr :8100`, then kill the PID or change `VB_PYTHON_PORT` in `services/python/config.py` |
| `PORT_8100: OPEN` + Python health `5xx` | Python started but crashed internally | Re-run with `--reload` and read the terminal stderr for the traceback |
| `PORT_8200: CLOSED` + Node health `000` | Node service not started | `cd services/node && npx tsx src/index.ts` |
| `DEP_faster_whisper: MISSING` | Whisper not installed — transcription will fail | `cd services/python && pip install faster-whisper` |
| `DEP_uvicorn: MISSING` | Uvicorn missing — Python service cannot start | `pip install uvicorn` |
| `DEP_pydub: MISSING` | pydub missing — audio conversion will fail | `pip install pydub` |
| `DEP_websockets: MISSING` | websockets missing — WS pipeline will fail | `pip install websockets` |
| `FFMPEG: MISSING` | ffmpeg not on PATH — `convert_to_wav` will crash on every upload | `winget install ffmpeg` (then restart terminal) |
| `OLLAMA: UNREACHABLE` | Ollama not running (only matters for Phase 4+) | Open the Ollama desktop app or run `ollama serve` in a separate terminal |
| `PORT_8200: OPEN` + Node health `502` | Node is up but can't reach Python | Check `VB_PYTHON_URL` in `services/node/src/config.ts` — should be `http://localhost:8100` |
| All ports open, all deps OK, still failing | Likely a CORS or WS handshake issue | Check `allow_origins` in `services/python/main.py` includes `http://localhost:8200` |

## Step 4 — Print the report

Output a clean summary. Example format:

```
## VirtualBrain — Service Diagnosis

Health probes:
  ✗ Python  (localhost:8100) — 000 connection refused
  ✗ Node    (localhost:8200) — 000 connection refused

Diagnostic findings:
  PORT_8100:          CLOSED
  PORT_8200:          CLOSED
  DEP_faster_whisper: OK
  DEP_uvicorn:        OK
  DEP_pydub:          OK
  DEP_websockets:     OK
  FFMPEG:             OK
  OLLAMA:             UNREACHABLE (not critical until Phase 4)

Root causes (ranked):
  1. Python service not started
     Fix: cd services/python && python -m uvicorn main:app --host 0.0.0.0 --port 8100 --reload

  2. Node service not started
     Fix: cd services/node && npx tsx src/index.ts

  — OR from project root —
     Fix: npm run dev

Next: after starting services, run /health-check to verify.
```

Always end with a "Next:" line pointing to the next action.
