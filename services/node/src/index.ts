import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { PythonBridge } from "./adapters/python-bridge.js";
import { createHealthRouter } from "./routes/health.js";
import { createUploadRouter } from "./routes/upload.js";

const app = express();

// --- Middleware ---
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

// --- Dependency injection via factory ---
const pythonService = new PythonBridge(config.pythonServiceUrl);

// --- Routes ---
app.use("/api", createHealthRouter(pythonService));
app.use("/api", createUploadRouter(pythonService));

// --- Start ---
app.listen(config.port, () => {
  console.log(`[Node] Service running on http://localhost:${config.port}`);
});
