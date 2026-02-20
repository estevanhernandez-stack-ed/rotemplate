import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import sharp from "sharp";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const TEMPLATE_WIDTH = 585;
const TEMPLATE_HEIGHT = 559;

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SHIRT_REGIONS: Region[] = [
  { id: "torso_up", x: 168, y: 0, width: 128, height: 8 },
  { id: "torso_right", x: 160, y: 8, width: 8, height: 128 },
  { id: "torso_front", x: 168, y: 8, width: 128, height: 128 },
  { id: "torso_left", x: 296, y: 8, width: 8, height: 128 },
  { id: "torso_back", x: 304, y: 8, width: 128, height: 128 },
  { id: "torso_down", x: 168, y: 136, width: 128, height: 8 },
  { id: "rarm_up", x: 48, y: 264, width: 64, height: 8 },
  { id: "rarm_left", x: 0, y: 272, width: 48, height: 128 },
  { id: "rarm_back", x: 48, y: 272, width: 64, height: 128 },
  { id: "rarm_right", x: 112, y: 272, width: 48, height: 128 },
  { id: "rarm_front", x: 160, y: 272, width: 64, height: 128 },
  { id: "rarm_down", x: 48, y: 400, width: 64, height: 8 },
  { id: "larm_up", x: 296, y: 264, width: 64, height: 8 },
  { id: "larm_front", x: 296, y: 272, width: 64, height: 128 },
  { id: "larm_left", x: 360, y: 272, width: 48, height: 128 },
  { id: "larm_back", x: 408, y: 272, width: 64, height: 128 },
  { id: "larm_right", x: 472, y: 272, width: 48, height: 128 },
  { id: "larm_down", x: 296, y: 400, width: 64, height: 8 },
];

const PANTS_REGIONS: Region[] = [
  { id: "torso_up", x: 168, y: 0, width: 128, height: 8 },
  { id: "torso_right", x: 160, y: 8, width: 8, height: 128 },
  { id: "torso_front", x: 168, y: 8, width: 128, height: 128 },
  { id: "torso_left", x: 296, y: 8, width: 8, height: 128 },
  { id: "torso_back", x: 304, y: 8, width: 128, height: 128 },
  { id: "torso_down", x: 168, y: 136, width: 128, height: 8 },
  { id: "rleg_up", x: 48, y: 264, width: 64, height: 8 },
  { id: "rleg_left", x: 0, y: 272, width: 48, height: 128 },
  { id: "rleg_back", x: 48, y: 272, width: 64, height: 128 },
  { id: "rleg_right", x: 112, y: 272, width: 48, height: 128 },
  { id: "rleg_front", x: 160, y: 272, width: 64, height: 128 },
  { id: "rleg_down", x: 48, y: 400, width: 64, height: 8 },
  { id: "lleg_up", x: 296, y: 264, width: 64, height: 8 },
  { id: "lleg_front", x: 296, y: 272, width: 64, height: 128 },
  { id: "lleg_left", x: 360, y: 272, width: 48, height: 128 },
  { id: "lleg_back", x: 408, y: 272, width: 64, height: 128 },
  { id: "lleg_right", x: 472, y: 272, width: 48, height: 128 },
  { id: "lleg_down", x: 296, y: 400, width: 64, height: 8 },
];

async function compositeToTemplate(
  imageBase64: string,
  templateType: "shirt" | "pants"
): Promise<string> {
  const regions = templateType === "pants" ? PANTS_REGIONS : SHIRT_REGIONS;
  const imageBuffer = Buffer.from(imageBase64, "base64");

  const resizedBuffer = await sharp(imageBuffer)
    .resize(TEMPLATE_WIDTH, TEMPLATE_HEIGHT, { fit: "cover", position: "center" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const composites: sharp.OverlayOptions[] = [];
  for (const region of regions) {
    const regionImage = await sharp(resizedBuffer)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      })
      .toBuffer();

    composites.push({
      input: regionImage,
      left: region.x,
      top: region.y,
    });
  }

  const result = await sharp({
    create: {
      width: TEMPLATE_WIDTH,
      height: TEMPLATE_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return result.toString("base64");
}

interface StrokeData {
  path: string;
  color: string;
  width: number;
}

async function compositeColorMap(
  colorMap: Record<string, string>,
  strokes: StrokeData[],
  templateType: "shirt" | "pants"
): Promise<string> {
  const regions = templateType === "pants" ? PANTS_REGIONS : SHIRT_REGIONS;

  const regionRects = regions
    .filter((r) => colorMap[r.id] && colorMap[r.id] !== "transparent")
    .map((r) => {
      const color = colorMap[r.id];
      return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${color}"/>`;
    })
    .join("\n");

  const clipPathRects = regions
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`
    )
    .join("\n");

  const strokePaths = (strokes || [])
    .map(
      (s) =>
        `<path d="${s.path}" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    )
    .join("\n");

  const svg = `<svg width="${TEMPLATE_WIDTH}" height="${TEMPLATE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="regionClip">
    ${clipPathRects}
  </clipPath>
</defs>
${regionRects}
<g clip-path="url(#regionClip)">
  ${strokePaths}
</g>
</svg>`;

  const result = await sharp(Buffer.from(svg))
    .resize(TEMPLATE_WIDTH, TEMPLATE_HEIGHT)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return result.toString("base64");
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-template", async (req: Request, res: Response) => {
    try {
      const { prompt, templateType } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const type = templateType === "pants" ? "pants" : "shirt";
      const limbLabel =
        type === "shirt"
          ? "arms (right arm and left arm)"
          : "legs (right leg and left leg)";

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

      const compositedImage = await compositeToTemplate(b64, type);

      res.json({ image: compositedImage });
    } catch (error: any) {
      console.error("Error generating template:", error);
      const message = error?.message || "Failed to generate image";
      res.status(500).json({ error: message });
    }
  });

  app.post(
    "/api/composite-fill",
    async (req: Request, res: Response) => {
      try {
        const { colorMap, strokes, templateType } = req.body;
        const type = templateType === "pants" ? "pants" : "shirt";

        const result = await compositeColorMap(
          colorMap || {},
          strokes || [],
          type
        );

        res.json({ image: result });
      } catch (error: any) {
        console.error("Error compositing fill template:", error);
        res.status(500).json({ error: error?.message || "Compositing failed" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
