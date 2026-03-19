interface MicCaptureProps {
  recording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export default function MicCapture({
  recording,
  onStart,
  onStop,
  disabled,
}: MicCaptureProps) {
  return (
    <div className="mic-capture">
      {recording ? (
        <button className="mic-btn mic-btn--stop" onClick={onStop}>
          <span className="mic-indicator" />
          Stop Recording
        </button>
      ) : (
        <button
          className="mic-btn mic-btn--start"
          onClick={onStart}
          disabled={disabled}
        >
          Start Microphone
        </button>
      )}
    </div>
  );
}
