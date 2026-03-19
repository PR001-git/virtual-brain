import { useState } from "react";
import type { TranscriptSegment } from "../../types";
import AudioUpload from "../presenters/AudioUpload";
import TranscriptView from "../presenters/TranscriptView";

const API_BASE = "http://localhost:8200/api";

export default function TranscriptContainer() {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSegments([]);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE}/upload`, {
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

  return (
    <section className="transcript-panel">
      <h2>Transcript</h2>
      <AudioUpload onUpload={handleUpload} disabled={loading} />
      {error && <p className="error-msg">{error}</p>}
      <TranscriptView segments={segments} />
    </section>
  );
}
