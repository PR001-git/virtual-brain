# Test Pipeline

Run an end-to-end pipeline test matching the "Verify" step from `initial.mvp.md` for the current implementation phase.

## Step 1 — Detect current phase

Use `/phase-status` logic inline: check for the key phase markers to determine which phase is complete. Run the test for the **highest fully-implemented phase**.

## Step 2 — Run the phase-appropriate test

---

### Phase 1 — Static Brain test

**Goal**: Upload a short audio file → receive a transcript with timestamps.

1. Find or create a short test audio file. Check for any `.wav`, `.mp3`, or `.ogg` in the project first. If none, generate a 3-second silent WAV:
   ```bash
   python -c "
   import wave, struct, math
   with wave.open('/tmp/test_audio.wav', 'w') as f:
       f.setnchannels(1); f.setsampwidth(2); f.setframerate(16000)
       # 3 seconds of a 440Hz tone
       frames = [struct.pack('<h', int(32767 * math.sin(2*math.pi*440*i/16000))) for i in range(48000)]
       f.writeframes(b''.join(frames))
   print('Created /tmp/test_audio.wav')
   "
   ```
2. POST it to the transcription endpoint:
   ```bash
   curl -s -X POST http://localhost:8100/transcribe \
     -F "file=@/tmp/test_audio.wav" | python -m json.tool
   ```
3. **PASS** if response contains a `segments` array with at least one item and `start`/`end` timestamps.
4. **FAIL** if response is an error, empty, or missing timestamps.

---

### Phase 2 — Streaming Brain test

**Goal**: Send chunked audio over WebSocket → receive streaming transcript segments.

```python
# Run this inline as a Python script saved to /tmp/test_ws_stream.py
import asyncio, websockets, json, base64, wave, struct, math

async def test():
    uri = "ws://localhost:8200"
    # Generate a 6-second tone, split into 2 chunks of 3s
    def make_chunk(duration_sec):
        frames = [struct.pack('<h', int(32767 * math.sin(2*math.pi*440*i/16000)))
                  for i in range(16000 * duration_sec)]
        return b''.join(frames)

    segments_received = []
    async with websockets.connect(uri) as ws:
        for seq, chunk in enumerate([make_chunk(3), make_chunk(3)]):
            msg = json.dumps({"type": "audio_chunk", "data": base64.b64encode(chunk).decode(), "sequence": seq})
            await ws.send(msg)
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=30)
                data = json.loads(response)
                if data.get("type") == "transcript":
                    segments_received.append(data)
                    print(f"Segment {seq}: {data.get('text', '')[:80]}")
            except asyncio.TimeoutError:
                print(f"TIMEOUT waiting for segment {seq}")

    return len(segments_received)

count = asyncio.run(test())
print(f"\nResult: {count} segment(s) received")
```

Run with: `python /tmp/test_ws_stream.py`

**PASS** if at least 1 transcript segment is received per chunk sent.
**FAIL** if timeout, connection error, or 0 segments received.

---

### Phase 3 — Listening Brain test

**Goal**: Confirm microphone-capable WS path exists (browser-only feature — test the Node WS endpoint and report instructions).

1. Check WS connectivity: `python -c "import asyncio, websockets; asyncio.run(websockets.connect('ws://localhost:8200'))" && echo PASS || echo FAIL`
2. Check `MicCapture.tsx` exists in client.
3. Print browser instructions:

```
Phase 3 — Manual verification required (mic capture is browser-only):
  1. Open http://localhost:3000 in Chrome
  2. Click "Start Mic" — browser will ask for microphone permission
  3. Speak a sentence — transcript should appear within 3–5 seconds
  4. Click "Stop"
```

**PASS (automated)**: WS endpoint reachable + `MicCapture.tsx` present.
**PASS (full)**: Manual browser test succeeds.

---

### Phase 4 — Thinking Brain test

**Goal**: Send a prompt about the transcript → receive a grounded LLM response.

First, stream a small audio chunk to populate memory (reuse Phase 2 WS test), then:

```bash
curl -s -X POST http://localhost:8100/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What was discussed in this conversation?"}' | python -m json.tool
```

**PASS** if:
- Response contains a non-empty `text` field
- Response does NOT claim information beyond what was in the audio

Also test grounding boundary:
```bash
curl -s -X POST http://localhost:8100/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the CEO name of the company mentioned?"}' | python -m json.tool
```

**PASS** if model declines or expresses uncertainty (not fabricating).

---

## Step 3 — Print result

```
## VirtualBrain — Pipeline Test (Phase N)

  Test: <description>
  Status: PASS ✓  /  FAIL ✗

  Details:
  - <key observation 1>
  - <key observation 2>

Next: <suggestion — e.g. "proceed to Phase N+1" or "fix: <specific issue>">
```

If a test fails, print the raw error output and suggest the most likely fix based on the symptom.
