import { useCallback, useRef, useState } from "react";
import type { AudioSourceStrategy } from "../strategies/audio-sources";
import type { AudioChunkMessage, StatusMessage, WSMessage } from "../types";

interface UseAudioSourceReturn {
  streaming: boolean;
  startStreaming: (source: AudioSourceStrategy) => void;
  stopStreaming: () => void;
}

/**
 * Hook that connects an AudioSourceStrategy to a WebSocket send function.
 * When streaming starts, the source emits chunks which are sent as audio_chunk messages.
 */
export function useAudioSource(
  send: (msg: WSMessage) => void,
): UseAudioSourceReturn {
  const [streaming, setStreaming] = useState(false);
  const sourceRef = useRef<AudioSourceStrategy | null>(null);

  const startStreaming = useCallback(
    (source: AudioSourceStrategy) => {
      sourceRef.current = source;
      setStreaming(true);

      source.start(
        // onChunk
        (b64Pcm, sequence) => {
          const msg: AudioChunkMessage = {
            type: "audio_chunk",
            data: b64Pcm,
            sequence,
          };
          send(msg);
        },
        // onDone
        () => {
          const msg: StatusMessage = {
            type: "status",
            message: "stream_complete",
            ready: true,
          };
          send(msg);
          setStreaming(false);
          sourceRef.current = null;
        },
      );
    },
    [send],
  );

  const stopStreaming = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setStreaming(false);
  }, []);

  return { streaming, startStreaming, stopStreaming };
}
