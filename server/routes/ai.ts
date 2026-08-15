import { Router } from "express";

export const aiRouter = Router();

// AI features are currently disabled — Gemini integration not configured.
aiRouter.get("/status", (req, res) => {
  res.json({ configured: false });
});

aiRouter.post("/brief", async (req, res) => {
  res.status(503).json({ error: "AI intelligence briefs are not currently available." });
});