import { createServer } from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { PythonBridge } from "./adapters/python-bridge.js";
import { createHealthRouter } from "./routes/health.js";
import { createUploadRouter } from "./routes/upload.js";
import { ClientHandler } from "./ws/client-handler.js";

const app = express();
const server = createServer(app);

// --- Middleware ---
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

// --- Dependency injection via factory ---
const pythonService = new PythonBridge(config.pythonServiceUrl);

// --- REST Routes ---
app.use("/api", createHealthRouter(pythonService));
app.use("/api", createUploadRouter(pythonService));

// --- WebSocket Server ---
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", async (ws) => {
  console.log("[Node WS] Browser client connected");

  const handler = new ClientHandler(ws, pythonService);

  try {
    await handler.connectToPython();
    console.log("[Node WS] Bridged to Python WS");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect to Python";
    console.error("[Node WS] Python bridge failed:", message);
    ws.send(JSON.stringify({ type: "error", message }));
    ws.close();
    return;
  }

  handler.on("disconnected", () => {
    console.log("[Node WS] Browser client disconnected");
  });
});

// --- Start (use server.listen instead of app.listen for WS support) ---
server.listen(config.port, () => {
  console.log(`[Node] Service running on http://localhost:${config.port}`);
  console.log(`[Node] WebSocket available at ws://localhost:${config.port}/ws`);
});
