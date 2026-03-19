import subprocess
import tempfile
from pathlib import Path


def convert_to_wav(input_path: Path) -> Path:
    """Convert any audio file to 16kHz mono PCM WAV using ffmpeg.

    Returns path to the converted WAV file (in a temp directory).
    Caller is responsible for cleanup.
    """
    output_path = Path(tempfile.mktemp(suffix=".wav"))

    cmd = [
        "ffmpeg",
        "-i", str(input_path),
        "-ar", "16000",
        "-ac", "1",
        "-sample_fmt", "s16",
        "-y",
        str(output_path),
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr}")

    return output_path
