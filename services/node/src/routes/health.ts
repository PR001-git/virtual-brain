import { Router } from "express";
import type { PythonService } from "../interfaces/python-service.js";

export function createHealthRouter(pythonService: PythonService): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    try {
      const pythonStatus = await pythonService.healthCheck();
      res.json({
        node: { status: "ok" },
        python: pythonStatus,
      });
    } catch {
      res.json({
        node: { status: "ok" },
        python: { status: "unreachable" },
      });
    }
  });

  return router;
}
