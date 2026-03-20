import json
from collections.abc import AsyncGenerator

import httpx

from interfaces.llm import LLMAdapter


_SYSTEM_TEMPLATE = (
    "You are VirtualBrain, a real-time AI assistant grounded in the current conversation.\n"
    "Answer questions strictly based on the transcript context provided below.\n"
    "If the answer is not in the transcript, say so clearly — do not guess.\n"
    "Be concise. Use bullet points where appropriate.\n\n"
    "--- Transcript Context ---\n"
    "{context}\n"
    "--- End of Context ---"
)


class OllamaAdapter(LLMAdapter):
    """LLM adapter for a locally-running Ollama instance."""

    def __init__(self, base_url: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model

    def _system_prompt(self, context: str) -> str:
        return _SYSTEM_TEMPLATE.format(context=context or "(no transcript yet)")

    async def query(self, prompt: str, context: str) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self._base_url}/api/generate",
                json={
                    "model": self._model,
                    "system": self._system_prompt(context),
                    "prompt": prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            return response.json()["response"]

    async def stream_query(self, prompt: str, context: str) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/api/generate",
                json={
                    "model": self._model,
                    "system": self._system_prompt(context),
                    "prompt": prompt,
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    if token := data.get("response"):
                        yield token
                    if data.get("done"):
                        break

    def is_available(self) -> bool:
        try:
            resp = httpx.get(f"{self._base_url}/api/tags", timeout=3)
            return resp.status_code == 200
        except Exception:
            return False
