import WebSocket from "ws";
import type { PythonStreamService } from "../interfaces/python-service.js";
import type { StatusMessage, TranscriptResponse } from "../types.js";

/**
 * Adapter: HTTP + WebSocket client to the Python FastAPI service.
 * Encapsulates all Python service communication details.
 */
export class PythonBridge implements PythonStreamService {
  private wsBaseUrl: string;

  constructor(private baseUrl: string) {
    // Derive WS URL from HTTP URL (http://... → ws://...)
    this.wsBaseUrl = baseUrl.replace(/^http/, "ws");
  }

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

  /**
   * Opens a WebSocket connection to Python's streaming transcription endpoint.
   * Returns the raw WS so the caller can pipe messages through it.
   */
  connectTranscribeWs(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsBaseUrl}/ws/transcribe`);

      ws.on("open", () => resolve(ws));
      ws.on("error", (err) => reject(err));
    });
  }
}

// Re-export the type for client-handler
export type PythonStreamBridge = PythonBridge;
