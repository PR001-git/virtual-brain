# Health Check

Verify that all three VirtualBrain services are running and responding correctly.

## Checks to perform (run all, then report)

### 1. Python service — localhost:8100

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8100/health
```

- `200` → ✓ Python service healthy
- `000` (connection refused) → ✗ Python service not running
- Any other code → ✗ Python service error

If healthy, also print the response body so the user can see model/config info.

### 2. Node service — localhost:8200

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8200/api/health
```

- `200` → ✓ Node service healthy (this also confirms Node can reach Python)
- `000` → ✗ Node service not running
- `502` / `503` → ✓ Node is up but ✗ Python unreachable (bridge error)
- Any other code → ✗ Node service error

If healthy, also print the response body.

### 3. WebSocket readiness — ws://localhost:8200

Run a quick Python one-liner to test WS connectivity:

```bash
python -c "
import asyncio, websockets, sys
async def test():
    try:
        async with websockets.connect('ws://localhost:8200', open_timeout=3) as ws:
            print('WS_OK')
    except Exception as e:
        print(f'WS_FAIL: {e}')
asyncio.run(test())
"
```

- `WS_OK` → ✓ WebSocket endpoint reachable
- `WS_FAIL` → ✗ WebSocket not available

## Output format

Print a clean summary after all checks:

```
## VirtualBrain — Health Check

  ✓ Python  (localhost:8100)  — 200 OK
  ✓ Node    (localhost:8200)  — 200 OK
  ✓ WebSocket (ws://localhost:8200) — connected

All services healthy. Ready to run /test-pipeline.
```

Or if something is wrong:

```
## VirtualBrain — Health Check

  ✗ Python  (localhost:8100)  — connection refused
  ✗ Node    (localhost:8200)  — connection refused
  ✗ WebSocket                 — not checked (Node is down)

Fix hints:
  • Python not running → cd services/python && python -m uvicorn main:app --port 8100 --reload
  • Node not running   → cd services/node && npm run dev
  • Both not running   → from project root: npm run dev
```

## Fix hints reference

| Symptom | Fix hint |
|---------|----------|
| Python not running | `cd services/python && python -m uvicorn main:app --port 8100 --reload` |
| Node not running | `cd services/node && npm run dev` |
| Both down | `npm run dev` from project root (uses concurrently) |
| Node up, Python unreachable | Python crashed — check its terminal for errors |
| WS fail, Node healthy | WebSocket endpoint not registered in `index.ts` — check `ws/client-handler.ts` is wired |
| Python 500 | Whisper model not downloaded or faster-whisper not installed — `pip install faster-whisper` |

Always print the relevant fix hint(s) for any failed check.
