import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptSegment } from "../../types";
import { useWebSocket, type WSStatus } from "../../hooks/useWebSocket";
import { useAudioSource } from "../../hooks/useAudioSource";
import {
  FileAudioSource,
  MicAudioSource,
  type AudioSourceStrategy,
} from "../../strategies/audio-sources";
import AudioUpload from "../presenters/AudioUpload";
import MicCapture from "../presenters/MicCapture";
import TranscriptView from "../presenters/TranscriptView";
import BrainPanel, { type LLMMessage } from "../presenters/BrainPanel";

type Mode = "upload" | "stream" | "mic";

export default function TranscriptContainer() {
  const [mode, setMode] = useState<Mode>("stream");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunksSent, setChunksSent] = useState(0);
  const [chunksTranscribed, setChunksTranscribed] = useState(0);
  const [llmMessages, setLlmMessages] = useState<LLMMessage[]>([]);

  const { status, messages, send, connect, disconnect, clearMessages } =
    useWebSocket();
  const { streaming, startStreaming, stopStreaming } = useAudioSource(send);

  const statusRef = useRef<WSStatus>(status);
  statusRef.current = status;

  const pendingSourceRef = useRef<AudioSourceStrategy | null>(null);

  useEffect(() => {
    if (status === "connected" && pendingSourceRef.current) {
      const source = pendingSourceRef.current;
      pendingSourceRef.current = null;
      startStreaming(source);
    }
  }, [status, startStreaming]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (messages.length === 0) return;

    const latest = messages[messages.length - 1];

    if (latest.type === "transcript" && latest.text.trim()) {
      setChunksTranscribed((n) => n + 1);
      setSegments((prev) => [
        ...prev,
        {
          start: latest.sequence * 3,
          end: (latest.sequence + 1) * 3,
          text: latest.text,
        },
      ]);
    }

    if (latest.type === "llm_response") {
      if (latest.is_complete) {
        // Mark the last pending message as complete
        setLlmMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, pending: false } : m,
          ),
        );
      } else {
        // Append token to the last pending message
        setLlmMessages((prev) => {
          if (prev.length === 0) return prev;
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, answer: m.answer + latest.text }
              : m,
          );
        });
      }
    }

    if (latest.type === "error") {
      setError(latest.message);
      // If there's a pending LLM message, mark it as failed
      setLlmMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.pending
            ? { ...m, answer: `Error: ${latest.message}`, pending: false }
            : m,
        ),
      );
    }

    if (
      latest.type === "status" &&
      latest.message === "Transcription complete"
    ) {
      setLoading(false);
    }
  }, [messages]);

  const handleStreamUpload = (file: File) => {
    setSegments([]);
    setError(null);
    setLoading(true);
    setChunksSent(0);
    setChunksTranscribed(0);
    clearMessages();

    const source = new FileAudioSource(file);

    const originalStart = source.start.bind(source);
    source.start = (onChunk, onDone) => {
      originalStart(
        (b64, seq) => {
          setChunksSent((n) => n + 1);
          onChunk(b64, seq);
        },
        onDone,
      );
    };

    if (statusRef.current === "connected") {
      startStreaming(source);
    } else {
      pendingSourceRef.current = source;
      connect();
    }
  };

  const handleDirectUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSegments([]);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("http://localhost:8200/api/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }

      const data = await res.json();
      setSegments(data.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setLoading(false);
    }
  };

  const micSourceRef = useRef<MicAudioSource | null>(null);

  const handleMicStart = () => {
    setSegments([]);
    setError(null);
    setLoading(true);
    setChunksSent(0);
    setChunksTranscribed(0);
    clearMessages();

    const source = new MicAudioSource();
    micSourceRef.current = source;

    const originalStart = source.start.bind(source);
    source.start = (onChunk, onDone) => {
      originalStart(
        (b64, seq) => {
          setChunksSent((n) => n + 1);
          onChunk(b64, seq);
        },
        onDone,
      );
    };

    if (statusRef.current === "connected") {
      startStreaming(source);
    } else {
      pendingSourceRef.current = source;
      connect();
    }
  };

  const handleMicStop = () => {
    micSourceRef.current?.stop();
    micSourceRef.current = null;
    stopStreaming();
    setLoading(false);

    send({
      type: "status",
      message: "stream_complete",
      ready: true,
    });
  };

  const handlePrompt = (question: string, contextWindow: number) => {
    // Ensure WS is connected before sending prompt
    if (statusRef.current !== "connected") {
      connect();
    }
    setLlmMessages((prev) => [
      ...prev,
      { question, answer: "", pending: true },
    ]);
    send({ type: "prompt", question, context_window: contextWindow });
  };

  const handleUpload = mode === "stream" ? handleStreamUpload : handleDirectUpload;

  const statusLabel = useMemo(() => {
    if (!loading) return null;
    if (mode === "stream" || mode === "mic") {
      const label = mode === "mic" ? "Recording" : "Streaming";
      return `${label}: ${chunksTranscribed}/${chunksSent} chunks transcribed (WS: ${status})`;
    }
    return "Transcribing...";
  }, [loading, mode, chunksSent, chunksTranscribed, status]);

  return (
    <>
      <section className="transcript-panel">
        <div className="transcript-header">
          <h2>Transcript</h2>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === "upload" ? "active" : ""}`}
              onClick={() => setMode("upload")}
              disabled={loading}
            >
              Upload
            </button>
            <button
              className={`mode-btn ${mode === "stream" ? "active" : ""}`}
              onClick={() => setMode("stream")}
              disabled={loading}
            >
              Stream
            </button>
            <button
              className={`mode-btn ${mode === "mic" ? "active" : ""}`}
              onClick={() => setMode("mic")}
              disabled={loading}
            >
              Mic
            </button>
          </div>
        </div>

        {mode === "mic" ? (
          <MicCapture
            recording={streaming}
            onStart={handleMicStart}
            onStop={handleMicStop}
            disabled={loading && !streaming}
          />
        ) : (
          <AudioUpload onUpload={handleUpload} disabled={loading} />
        )}

        {statusLabel && <p className="status-msg">{statusLabel}</p>}
        {error && <p className="error-msg">{error}</p>}

        <TranscriptView segments={segments} />
      </section>

      <BrainPanel
        onPrompt={handlePrompt}
        messages={llmMessages}
        disabled={status !== "connected"}
      />
    </>
  );
}
