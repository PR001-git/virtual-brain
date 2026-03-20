/**
 * VirtualBrain Chrome Extension — Offscreen Document
 *
 * Receives a tab capture stream ID from the background service worker,
 * obtains the actual MediaStream via getUserMedia, processes audio into
 * 16kHz mono PCM chunks, and streams them to the Node WS server.
 */

const WS_URL = "ws://localhost:8200/ws";
const SAMPLE_RATE = 16000;
const CHUNK_DURATION_S = 3;

let ws = null;
let mediaStream = null;
let audioCtx = null;
let capturing = false;

async function startCapture(streamId) {
  // Get the actual MediaStream using the tab capture stream ID
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Connect WebSocket
  ws = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("WebSocket connection failed"));
  });

  // Forward transcript/status/error messages from Python back to popup
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "transcript" || msg.type === "status" || msg.type === "error") {
        chrome.runtime.sendMessage({ target: "popup", ...msg }).catch(() => {});
      }
    } catch {
      // ignore malformed
    }
  };

  // Play the captured audio back so the user can still hear it.
  // tabCapture mutes the tab's original output — this restores it.
  const playback = new Audio();
  playback.srcObject = mediaStream;
  playback.play().catch(() => {});

  // Set up audio processing at 16kHz mono
  audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const source = audioCtx.createMediaStreamSource(mediaStream);

  const bufferSize = 4096;
  const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);

  let accumulator = new Float32Array(0);
  let sequence = 0;
  const samplesPerChunk = CHUNK_DURATION_S * SAMPLE_RATE;

  processor.onaudioprocess = (e) => {
    if (!capturing) return;

    const input = e.inputBuffer.getChannelData(0);
    const combined = new Float32Array(accumulator.length + input.length);
    combined.set(accumulator);
    combined.set(input, accumulator.length);
    accumulator = combined;

    while (accumulator.length >= samplesPerChunk && capturing) {
      const chunkFloat = accumulator.slice(0, samplesPerChunk);
      accumulator = accumulator.slice(samplesPerChunk);

      // Float32 → Int16 PCM
      const pcm = new ArrayBuffer(chunkFloat.length * 2);
      const view = new DataView(pcm);
      for (let i = 0; i < chunkFloat.length; i++) {
        const clamped = Math.max(-1, Math.min(1, chunkFloat[i]));
        view.setInt16(i * 2, clamped * 0x7fff, true);
      }

      // Base64 encode
      const bytes = new Uint8Array(pcm);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "audio_chunk",
          data: b64,
          sequence: sequence++,
        }));
      }
    }
  };

  source.connect(processor);
  processor.connect(audioCtx.destination);

  capturing = true;
  return { ok: true };
}

function stopCapture() {
  capturing = false;

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "status",
      message: "stream_complete",
      ready: true,
    }));
    ws.close();
  }
  ws = null;

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }

  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }

  return { ok: true };
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== "offscreen") return false;

  if (msg.action === "start") {
    startCapture(msg.streamId)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }

  if (msg.action === "stop") {
    sendResponse(stopCapture());
  }
});
