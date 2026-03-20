import type { TranscriptSegment } from "../../types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SegmentItemProps {
  segment: TranscriptSegment;
}

export default function SegmentItem({ segment }: SegmentItemProps) {
  return (
    <div className={`segment-item${segment.is_partial ? " segment-partial" : ""}`}>
      <span className="segment-time">
        {formatTime(segment.start)} — {formatTime(segment.end)}
      </span>
      <span className="segment-text">{segment.text}</span>
    </div>
  );
}
