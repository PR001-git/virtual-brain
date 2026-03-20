"""
VirtualBrain — Service Diagnostic Script
Standalone: no project imports. Run from any working directory.
"""

import importlib.util
import shutil
import socket
import urllib.request
import urllib.error


def check_port(port: int) -> str:
    """Return OPEN if something is listening on the port, CLOSED otherwise."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1)
    result = s.connect_ex(("localhost", port))
    s.close()
    return "OPEN" if result == 0 else "CLOSED"


def check_dep(module: str) -> str:
    """Return OK if the Python module is importable, MISSING otherwise."""
    return "OK" if importlib.util.find_spec(module) is not None else "MISSING"


def check_ffmpeg() -> str:
    """Return OK if ffmpeg is on PATH, MISSING otherwise."""
    return "OK" if shutil.which("ffmpeg") is not None else "MISSING"


def check_ollama() -> str:
    """Return OK if Ollama is reachable at localhost:11434, UNREACHABLE otherwise."""
    try:
        urllib.request.urlopen("http://localhost:11434", timeout=2)
        return "OK"
    except Exception:
        return "UNREACHABLE"


def main() -> None:
    results = [
        ("PORT_8100", check_port(8100)),
        ("PORT_8200", check_port(8200)),
        ("DEP_faster_whisper", check_dep("faster_whisper")),
        ("DEP_uvicorn", check_dep("uvicorn")),
        ("DEP_pydub", check_dep("pydub")),
        ("DEP_websockets", check_dep("websockets")),
        ("FFMPEG", check_ffmpeg()),
        ("OLLAMA", check_ollama()),
    ]

    for key, value in results:
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
