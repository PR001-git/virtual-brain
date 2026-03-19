import { Router } from "express";
import multer from "multer";
import type { PythonService } from "../interfaces/python-service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "audio/wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/x-wav",
      "audio/flac",
      "video/webm",
      "application/octet-stream",
    ];
    const allowedExts = [".wav", ".mp3", ".ogg", ".webm", ".flac", ".mp4", ".m4a"];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${ext})`));
    }
  },
});

export function createUploadRouter(pythonService: PythonService): Router {
  const router = Router();

  router.post("/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const result = await pythonService.transcribeFile(
        req.file.buffer,
        req.file.originalname,
      );

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
