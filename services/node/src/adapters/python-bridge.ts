import type { PythonService } from "../interfaces/python-service.js";
import type { StatusMessage, TranscriptResponse } from "../types.js";

/**
 * Adapter: HTTP client to the Python FastAPI service.
 * Encapsulates all Python service communication details.
 */
export class PythonBridge implements PythonService {
  constructor(private baseUrl: string) {}

  async healthCheck(): Promise<StatusMessage> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`Python health check failed: ${res.status}`);
    }
    return res.json() as Promise<StatusMessage>;
  }

  async transcribeFile(
    file: Buffer,
    filename: string,
  ): Promise<TranscriptResponse> {
    const form = new FormData();
    const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    form.append("file", new Blob([arrayBuffer]), filename);

    const res = await fetch(`${this.baseUrl}/transcribe`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Transcription failed: ${res.status} — ${text}`);
    }

    return res.json() as Promise<TranscriptResponse>;
  }
}
