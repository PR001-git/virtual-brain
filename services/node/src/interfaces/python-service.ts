import type { WebSocket } from "ws";
import type { StatusMessage, TranscriptResponse } from "../types.js";

/**
 * Interface for communicating with the Python service.
 * Adapter pattern — Node code never knows about Python URLs or protocols directly.
 */
export interface PythonService {
  healthCheck(): Promise<StatusMessage>;
  transcribeFile(file: Buffer, filename: string): Promise<TranscriptResponse>;
}

/**
 * Extended interface for streaming communication with Python.
 */
export interface PythonStreamService extends PythonService {
  connectTranscribeWs(): Promise<WebSocket>;
}
