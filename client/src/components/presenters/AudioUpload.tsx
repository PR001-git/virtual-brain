interface AudioUploadProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED = ".wav,.mp3,.ogg,.webm,.flac,.mp4,.m4a";

export default function AudioUpload({ onUpload, disabled }: AudioUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = ""; // reset so same file can be re-uploaded
    }
  };

  return (
    <div className="audio-upload">
      <label className="upload-btn">
        <input
          type="file"
          accept={ACCEPTED}
          onChange={handleChange}
          disabled={disabled}
          hidden
        />
        {disabled ? "Transcribing..." : "Upload Audio File"}
      </label>
    </div>
  );
}
