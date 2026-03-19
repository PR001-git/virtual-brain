import type { StatusMessage, TranscriptResponse } from "../types.js";

/**
 * Interface for communicating with the Python service.
 * Adapter pattern — Node code never knows about Python URLs or protocols directly.
 */
export interface PythonService {
  healthCheck(): Promise<StatusMessage>;
  transcribeFile(file: Buffer, filename: string): Promise<TranscriptResponse>;
}
