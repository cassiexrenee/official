import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";

export const mobilizationRouter = Router();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const prompt = `You are an expert game telemetry scanner for alliance mobilization screenshots (from games like Call of Dragons / Rise of Kingdoms).
The screenshots display player leaderboard rows.
Note: The rows include a rank number and a player avatar/photo. DISCARD and IGNORE both the player rank number and the player profile avatar/photo.

Extract each player's actual data:
- playerName: string (exact name including special characters, Cyrillic, Japanese, Chinese, symbols, spaces, etc.)
- personalScore: number (the numeric score, e.g. 2472 from "2,472" or "2472")
- tasksCompleted: number (the left number in task ratio e.g. 11 from "11/11")
- tasksMax: number (the right number in task ratio e.g. 11 from "11/11", default to 11 if not specified)

Return all recognized players from the image in top-to-bottom order.`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          playerName: { type: Type.STRING },
          personalScore: { type: Type.INTEGER },
          tasksCompleted: { type: Type.INTEGER },
          tasksMax: { type: Type.INTEGER },
        },
        required: ["playerName", "personalScore", "tasksCompleted", "tasksMax"],
      },
    },
  },
  required: ["rows"],
};

// Single image scan
mobilizationRouter.post("/scan-image", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 field" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mediaType = mimeType || "image/jpeg";

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: "GEMINI_API_KEY is not set on the server.", 
        fallbackRequired: true 
      });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mediaType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const parsedJson = JSON.parse(response.text || "{\"rows\":[]}");
    const rawRows = parsedJson.rows || [];
    const finalRows = rawRows
      .sort((a: any, b: any) => (b.personalScore || 0) - (a.personalScore || 0))
      .map((row: any, idx: number) => ({ ...row, rank: idx + 1 }));

    return res.json({
      success: true,
      rows: finalRows,
    });
  } catch (error: any) {
    console.error("Gemini scan error:", error);
    return res.status(500).json({
      error: error.message || "Failed to scan image with AI Vision",
      fallbackRequired: true,
    });
  }
});

// Batch multiple images scan
mobilizationRouter.post("/scan-batch", async (req, res) => {
  try {
    const { images } = req.body; // Array of { imageBase64, mimeType, filename?: string }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Missing or invalid images array" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: "GEMINI_API_KEY is not set on the server.", 
        fallbackRequired: true 
      });
    }

    const ai = getAI();
    const allExtractedRows: any[] = [];
    const imageResults: { filename?: string; rowCount: number; success: boolean; error?: string }[] = [];

    // Process images sequentially or with controlled concurrency
    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      const cleanBase64 = item.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const mediaType = item.mimeType || "image/jpeg";

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mediaType,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });

        const parsedJson = JSON.parse(response.text || "{\"rows\":[]}");
        const rows = parsedJson.rows || [];
        allExtractedRows.push(...rows);
        imageResults.push({
          filename: item.filename || `Image ${i + 1}`,
          rowCount: rows.length,
          success: true,
        });
      } catch (imgError: any) {
        console.error(`Batch scan error on image ${i}:`, imgError);
        imageResults.push({
          filename: item.filename || `Image ${i + 1}`,
          rowCount: 0,
          success: false,
          error: imgError.message,
        });
      }
    }

    // Deduplicate or merge entries by player name if repeated across screenshots
    const mergedMap = new Map<string, any>();
    allExtractedRows.forEach(row => {
      const key = (row.playerName || "").trim().toLowerCase();
      if (!key) return;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...row });
      } else {
        const existing = mergedMap.get(key);
        // Keep highest score or best recorded rank
        if ((row.personalScore || 0) > (existing.personalScore || 0)) {
          mergedMap.set(key, { ...row });
        }
      }
    });

    const finalRows = Array.from(mergedMap.values())
      .sort((a, b) => (b.personalScore || 0) - (a.personalScore || 0))
      .map((row, idx) => ({ ...row, rank: idx + 1 }));

    return res.json({
      success: true,
      totalImagesProcessed: images.length,
      imageResults,
      rows: finalRows,
    });
  } catch (error: any) {
    console.error("Batch scan overall error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process batch images",
      fallbackRequired: true,
    });
  }
});
