/**
 * Strategy pattern: audio source implementations.
 * Each source produces base64-encoded PCM chunks via the same callback interface.
 */

export interface AudioSourceStrategy {
  /** Start emitting audio chunks from this source. */
  start(onChunk: (b64Pcm: string, sequence: number) => void, onDone: () => void): void;
  /** Stop/cancel the source. */
  stop(): void;
}

const CHUNK_DURATION_S = 3;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2; // 16-bit PCM
const CHUNK_SIZE_BYTES = CHUNK_DURATION_S * SAMPLE_RATE * BYTES_PER_SAMPLE;

/**
 * FileAudioSource: reads an audio file, decodes it via Web Audio API,
 * splits into 3-second PCM chunks, and emits them sequentially.
 */
export class FileAudioSource implements AudioSourceStrategy {
  private cancelled = false;

  constructor(private file: File) {}

  async start(
    onChunk: (b64Pcm: string, sequence: number) => void,
    onDone: () => void,
  ): Promise<void> {
    this.cancelled = false;

    try {
      // Decode the audio file using Web Audio API
      const arrayBuffer = await this.file.arrayBuffer();
      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Get mono PCM data (use first channel)
      const float32 = audioBuffer.getChannelData(0);

      // Convert Float32 [-1,1] → Int16 PCM bytes
      const pcmBytes = float32ToInt16Bytes(float32);

      // Split into chunks and emit
      const totalBytes = pcmBytes.byteLength;
      let offset = 0;
      let sequence = 0;

      while (offset < totalBytes && !this.cancelled) {
        const end = Math.min(offset + CHUNK_SIZE_BYTES, totalBytes);
        const chunk = new Uint8Array(pcmBytes, offset, end - offset);

        // Base64 encode the chunk
        const b64 = uint8ArrayToBase64(chunk);
        onChunk(b64, sequence);

        offset = end;
        sequence++;

        // Yield to event loop so UI stays responsive
        await new Promise((r) => setTimeout(r, 0));
      }

      await audioCtx.close();

      if (!this.cancelled) {
        onDone();
      }
    } catch (err) {
      console.error("[FileAudioSource] Error processing file:", err);
      onDone();
    }
  }

  stop(): void {
    this.cancelled = true;
  }
}

/**
 * MicAudioSource: captures live microphone audio via getUserMedia + AudioWorkletNode,
 * accumulates 3-second PCM chunks, and emits them through the same callback interface.
 */
export class MicAudioSource implements AudioSourceStrategy {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private cancelled = false;

  async start(
    onChunk: (b64Pcm: string, sequence: number) => void,
    onDone: () => void,
  ): Promise<void> {
    this.cancelled = false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const source = this.audioCtx.createMediaStreamSource(this.stream);

      // Use ScriptProcessorNode (widely supported) to collect PCM samples
      // Buffer size 4096 at 16kHz ≈ 256ms per callback
      const bufferSize = 4096;
      const processor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

      let accumulator = new Float32Array(0);
      let sequence = 0;
      const samplesPerChunk = CHUNK_DURATION_S * SAMPLE_RATE;

      processor.onaudioprocess = (e) => {
        if (this.cancelled) return;

        const input = e.inputBuffer.getChannelData(0);

        // Append to accumulator
        const combined = new Float32Array(accumulator.length + input.length);
        combined.set(accumulator);
        combined.set(input, accumulator.length);
        accumulator = combined;

        // Emit full chunks
        while (accumulator.length >= samplesPerChunk && !this.cancelled) {
          const chunkFloat = accumulator.slice(0, samplesPerChunk);
          accumulator = accumulator.slice(samplesPerChunk);

          const pcmBytes = float32ToInt16Bytes(chunkFloat);
          const b64 = uint8ArrayToBase64(new Uint8Array(pcmBytes));
          onChunk(b64, sequence);
          sequence++;
        }
      };

      source.connect(processor);
      processor.connect(this.audioCtx.destination);
    } catch (err) {
      console.error("[MicAudioSource] Error accessing microphone:", err);
      onDone();
    }
  }

  stop(): void {
    this.cancelled = true;

    // Stop all mic tracks
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}

/** Convert Float32 [-1, 1] samples to Int16 PCM ArrayBuffer. */
function float32ToInt16Bytes(float32: Float32Array): ArrayBuffer {
  const pcmBytes = new ArrayBuffer(float32.length * 2);
  const view = new DataView(pcmBytes);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, clamped * 0x7fff, true);
  }
  return pcmBytes;
}

/** Convert Uint8Array to base64 string. */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
