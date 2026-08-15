import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { requireSession } from "../db";

export const aiRouter = Router();

// Check if Gemini is configured
aiRouter.get("/status", (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  res.json({ configured: isConfigured });
});

// Generate Intelligence Brief
aiRouter.post("/brief", async (req, res) => {
  // Ensure the user is an authenticated officer
  const session = await requireSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized. Officer authentication required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Gemini API key is not configured on the server." });
  }

  const { players, snapshots, evaluations, settings } = req.body;
  if (!players || !snapshots || !evaluations || !settings) {
    return res.status(400).json({ error: "Missing players, snapshots, evaluations, or settings data." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct the context-aware prompt
    const systemInstruction = `You are a strategic advisor for a Call of Dragons alliance named 'Dragon Council'. 
    Analyze the provided player telemetry and metrics. Provide actionable, concise, and tactical advice. 
    Focus on compliance targets, role misalignments, and overall war readiness.`;

    const fullPrompt = `
      ${systemInstruction}
      
      Alliance Settings:
      ${JSON.stringify(settings, null, 2)}
      
      Player Roster (${players.length} players):
      ${JSON.stringify(players, null, 2)}
      
      Current Snapshots:
      ${JSON.stringify(snapshots, null, 2)}
      
      Performance Evaluations:
      ${JSON.stringify(evaluations, null, 2)}
      
      Provide a concise strategic intelligence brief for alliance leadership based on this data.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    res.json({ brief: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to generate intelligence brief." });
  }
});