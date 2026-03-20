import { useState, useRef, useEffect } from "react";

export interface LLMMessage {
  question: string;
  answer: string;
  pending: boolean;
}

interface BrainPanelProps {
  onPrompt: (question: string, contextWindow: number) => void;
  messages: LLMMessage[];
  disabled?: boolean;
}

export default function BrainPanel({ onPrompt, messages, disabled }: BrainPanelProps) {
  const [question, setQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || disabled) return;
    onPrompt(q, 50);
    setQuestion("");
  };

  return (
    <div className="brain-panel">
      <div className="brain-header">
        <h2>Ask the Brain</h2>
        <span className="brain-hint">Queries are grounded in the live transcript</span>
      </div>

      <div className="brain-messages">
        {messages.length === 0 && (
          <p className="placeholder">
            Start transcribing, then ask questions about the conversation.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="brain-exchange">
            <p className="brain-question">{m.question}</p>
            <p className={`brain-answer${m.pending ? " brain-answer--pending" : ""}`}>
              {m.answer || (m.pending ? "Thinking…" : "")}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="brain-form" onSubmit={handleSubmit}>
        <input
          className="brain-input"
          type="text"
          placeholder="Ask something about the conversation…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled}
        />
        <button
          className="brain-submit"
          type="submit"
          disabled={disabled || !question.trim()}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
