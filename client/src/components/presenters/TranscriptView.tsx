import type { TranscriptSegment } from "../../types";
import SegmentItem from "./SegmentItem";

interface TranscriptViewProps {
  segments: TranscriptSegment[];
}

export default function TranscriptView({ segments }: TranscriptViewProps) {
  if (segments.length === 0) {
    return (
      <p className="placeholder">Upload an audio file to begin transcription.</p>
    );
  }

  return (
    <div className="transcript-list">
      {segments.map((seg, i) => (
        <SegmentItem key={i} segment={seg} />
      ))}
    </div>
  );
}
