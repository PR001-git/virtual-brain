/** DTO types — mirrors server message protocol */

export interface AudioChunkMessage {
  type: "audio_chunk";
  data: string;
  sequence: number;
  timestamp_ms?: number;
}

export interface TranscriptMessage {
  type: "transcript";
  text: string;
  is_partial: boolean;
  sequence: number;
  timestamp_ms?: number;
}

export interface PromptMessage {
  type: "prompt";
  question: string;
  context_window?: number;
}

export interface LLMResponseMessage {
  type: "llm_response";
  text: string;
  is_complete: boolean;
}

export interface StatusMessage {
  type: "status";
  message: string;
  ready: boolean;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  sequence?: number;
  is_partial?: boolean;
}

export type WSMessage =
  | AudioChunkMessage
  | TranscriptMessage
  | PromptMessage
  | LLMResponseMessage
  | StatusMessage
  | ErrorMessage;
