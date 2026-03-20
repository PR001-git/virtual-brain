import { EventEmitter } from "events";
import type { WebSocket } from "ws";
import { MessageRouter } from "./message-router.js";
import type { PythonStreamBridge } from "../adapters/python-bridge.js";

/**
 * Manages a single browser WebSocket client connection.
 * Bridges messages between the browser client and the Python service.
 *
 * Observer pattern: uses Node EventEmitter for internal routing.
 */
export class ClientHandler extends EventEmitter {
  private router: MessageRouter;
  private pythonWs: WebSocket | null = null;

  constructor(
    private clientWs: WebSocket,
    private pythonBridge: PythonStreamBridge,
  ) {
    super();
    this.router = new MessageRouter();
    this.setup();
  }

  private setup(): void {
    // Route audio_chunk messages to Python
    this.router.on("audio_chunk", (msg) => {
      this.forwardToPython(JSON.stringify(msg));
    });

    // Route status messages (like stream_complete) to Python
    this.router.on("status", (msg) => {
      this.forwardToPython(JSON.stringify(msg));
    });

    // Route prompt messages to Python (Phase 4)
    this.router.on("prompt", (msg) => {
      this.forwardToPython(JSON.stringify(msg));
    });

    // Handle incoming messages from the browser client
    this.clientWs.on("message", (data) => {
      const raw = data.toString();
      this.router.route(raw);
    });

    this.clientWs.on("close", () => {
      this.cleanup();
      this.emit("disconnected");
    });

    this.clientWs.on("error", (err) => {
      console.error("[ClientHandler] Client WS error:", err.message);
      this.cleanup();
    });
  }

  /**
   * Open a streaming transcription session with Python
   * and pipe results back to the browser client.
   */
  async connectToPython(): Promise<void> {
    this.pythonWs = await this.pythonBridge.connectTranscribeWs();

    this.pythonWs.on("message", (data) => {
      // Forward Python responses directly to the browser client
      const raw = data.toString();
      if (this.clientWs.readyState === this.clientWs.OPEN) {
        this.clientWs.send(raw);
      }
    });

    this.pythonWs.on("close", (code, reason) => {
      console.error(`[ClientHandler] Python WS closed: code=${code} reason=${reason}`);
      this.pythonWs = null;
    });

    this.pythonWs.on("error", (err) => {
      console.error("[ClientHandler] Python WS error:", err.message);
      this.sendError("Python connection error");
    });
  }

  private forwardToPython(raw: string): void {
    if (this.pythonWs && this.pythonWs.readyState === this.pythonWs.OPEN) {
      this.pythonWs.send(raw);
    } else {
      this.sendError("Python connection not ready");
    }
  }

  private sendError(message: string): void {
    if (this.clientWs.readyState === this.clientWs.OPEN) {
      this.clientWs.send(JSON.stringify({ type: "error", message }));
    }
  }

  private cleanup(): void {
    if (this.pythonWs) {
      this.pythonWs.close();
      this.pythonWs = null;
    }
  }
}
