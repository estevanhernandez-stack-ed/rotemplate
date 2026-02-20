import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-template", async (req: Request, res: Response) => {
    try {
      const { prompt, templateType } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const type = templateType === "pants" ? "pants" : "shirt";
      const limbLabel = type === "shirt" ? "arms (right arm and left arm)" : "legs (right leg and left leg)";

      const fullPrompt = `Create a flat 2D texture/pattern design for a Roblox classic ${type} template. The design should be: ${prompt}. 
      
IMPORTANT: This is a flat texture map, NOT a 3D rendering. Create a seamless, clean pattern or design that would look good when wrapped around a blocky character. The design should work as a clothing texture with clear colors and patterns. No text, no 3D effects, no shadows, no background - just the flat clothing design/pattern. Make it colorful and detailed as a game clothing texture.`;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
      });

      const b64 = response.data[0]?.b64_json;
      if (!b64) {
        return res.status(500).json({ error: "No image data returned" });
      }

      res.json({ image: b64 });
    } catch (error: any) {
      console.error("Error generating template:", error);
      const message = error?.message || "Failed to generate image";
      res.status(500).json({ error: message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
