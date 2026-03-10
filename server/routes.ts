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
  { id: "torso_up", x: 231, y: 8, width: 128, height: 64 },
  { id: "torso_right", x: 165, y: 74, width: 64, height: 128 },
  { id: "torso_front", x: 231, y: 74, width: 128, height: 128 },
  { id: "torso_left", x: 361, y: 74, width: 64, height: 128 },
  { id: "torso_back", x: 427, y: 74, width: 128, height: 128 },
  { id: "torso_down", x: 231, y: 204, width: 128, height: 64 },
  { id: "rarm_up", x: 217, y: 289, width: 64, height: 64 },
  { id: "rarm_left", x: 19, y: 355, width: 64, height: 128 },
  { id: "rarm_back", x: 85, y: 355, width: 64, height: 128 },
  { id: "rarm_right", x: 151, y: 355, width: 64, height: 128 },
  { id: "rarm_front", x: 217, y: 355, width: 64, height: 128 },
  { id: "rarm_down", x: 217, y: 485, width: 64, height: 64 },
  { id: "larm_up", x: 308, y: 289, width: 64, height: 64 },
  { id: "larm_front", x: 308, y: 355, width: 64, height: 128 },
  { id: "larm_left", x: 374, y: 355, width: 64, height: 128 },
  { id: "larm_back", x: 440, y: 355, width: 64, height: 128 },
  { id: "larm_right", x: 506, y: 355, width: 64, height: 128 },
  { id: "larm_down", x: 308, y: 485, width: 64, height: 64 },
];

const PANTS_REGIONS: Region[] = [
  { id: "torso_up", x: 231, y: 8, width: 128, height: 64 },
  { id: "torso_right", x: 165, y: 74, width: 64, height: 128 },
  { id: "torso_front", x: 231, y: 74, width: 128, height: 128 },
  { id: "torso_left", x: 361, y: 74, width: 64, height: 128 },
  { id: "torso_back", x: 427, y: 74, width: 128, height: 128 },
  { id: "torso_down", x: 231, y: 204, width: 128, height: 64 },
  { id: "rleg_up", x: 217, y: 289, width: 64, height: 64 },
  { id: "rleg_left", x: 19, y: 355, width: 64, height: 128 },
  { id: "rleg_back", x: 85, y: 355, width: 64, height: 128 },
  { id: "rleg_right", x: 151, y: 355, width: 64, height: 128 },
  { id: "rleg_front", x: 217, y: 355, width: 64, height: 128 },
  { id: "rleg_down", x: 217, y: 485, width: 64, height: 64 },
  { id: "lleg_up", x: 308, y: 289, width: 64, height: 64 },
  { id: "lleg_front", x: 308, y: 355, width: 64, height: 128 },
  { id: "lleg_left", x: 374, y: 355, width: 64, height: 128 },
  { id: "lleg_back", x: 440, y: 355, width: 64, height: 128 },
  { id: "lleg_right", x: 506, y: 355, width: 64, height: 128 },
  { id: "lleg_down", x: 308, y: 485, width: 64, height: 64 },
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

async function enhancePrompt(userPrompt: string, type: "shirt" | "pants"): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a Roblox clothing designer who specializes in trendy Gen Alpha / Gen Z aesthetics. Your job is to take a user's clothing prompt and enhance it into a detailed visual design description for an AI image generator.

TARGET AUDIENCE: Roblox players (mostly ages 8-18). Think current trends, not generic designs.

STYLE DEFAULTS — when the user doesn't specify an exact style, lean toward these popular Roblox/Gen Alpha aesthetics:
- Y2K streetwear (baggy, oversized, layered looks)
- Hypebeast / drip culture (Supreme-style box logos, Off-White arrows, designer-inspired)
- Dark academia / grunge (plaid, chains, layered dark tones)
- Cottagecore / soft aesthetics (pastels, florals, cozy vibes)
- Cyberpunk / techwear (neon accents, utility straps, futuristic)
- Anime-inspired (manga panels, Japanese text, kawaii elements)
- Skater / indie (graphic tees, band-style art, vintage wash)
- Clean minimalist (monochrome, small embroidered logos, subtle branding)
- Preppy / old money (polo collars, crests, navy/cream/green)
- Sports jerseys / athletic wear (bold numbers, team-style stripes)

TEXT RULES (CRITICAL):
- If the design includes text, numbers, or lettering: specify that text must be SMALL and fit ENTIRELY within a 128x128 pixel square
- Numbers on jerseys should be compact, not giant — think actual jersey proportions where the number takes up about 40-60% of the chest area
- Any text must use a font size that leaves padding/margins around it
- NEVER let text or numbers overflow beyond a single face region

DESIGN RULES:
- Keep patterns tileable/repeatable across regions when possible
- Specify exact colors (hex or descriptive) rather than vague color words
- Describe textures and materials (matte, glossy, denim weave, knit, etc.)
- Add small details that make it feel premium (stitching, subtle gradients, embroidery)

OUTPUT: Return ONLY the enhanced design description. No explanations, no preamble. Keep it under 150 words. The description should be purely visual — what the clothing LOOKS like.

GARMENT TYPE: ${type === "shirt" ? "shirt/top" : "pants/bottoms"}`
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const enhanced = response.choices[0]?.message?.content?.trim();
    if (enhanced && enhanced.length > 10) {
      return enhanced;
    }
    return userPrompt;
  } catch (error) {
    console.error("Prompt enhancement failed, using original:", error);
    return userPrompt;
  }
}

function buildTemplatePrompt(userPrompt: string, type: "shirt" | "pants"): string {
  if (type === "shirt") {
    return `Create a flat 2D clothing texture for a Roblox R15 SHIRT at exactly 585x559 pixels. The design is: ${userPrompt}

IMPORTANT: Paint the ENTIRE 585x559 canvas with the clothing design — do NOT leave transparent gaps, empty space, or visible borders between sections. Fill everything edge-to-edge with continuous color and pattern. The system will automatically crop the correct regions.

The canvas represents an unwrapped shirt with these key areas:

TORSO (upper-center area of the canvas):
- The torso FRONT face is a 128x128 square near the center of the upper half. THIS IS THE MOST VISIBLE AREA — center the main design element here (logo, chest graphic, jersey number, buttons). The design element should be vertically and horizontally centered within this area with padding on all sides.
- The torso BACK face is a 128x128 square to the right of the front. Center any back design here (back number, back graphic).
- The TOP strip above the front face folds under the character's head and is barely visible — just continue the base color/pattern here, never put logos or text.
- Side faces flank the front — continue the fabric pattern through them.

ARMS (lower area of the canvas):
- Right arm regions in the bottom-left, left arm regions in the bottom-right
- Sleeves should match the torso's fabric/color

RULES:
- Fill the ENTIRE canvas with the clothing design — solid color, pattern, or fabric texture everywhere. NO transparency, NO gaps, NO empty areas, NO visible grid lines or borders between regions.
- The design should be ONE continuous piece of clothing painted across the full canvas
- Center logos, numbers, and key graphics on the FRONT face area (upper-center 128x128 square), with padding so they don't touch the edges
- TEXT/NUMBERS: Must be compact — jersey numbers should be about 40-60% of the 128x128 area, never edge-to-edge. Keep 15-20px padding around text.
- Use flat colors — no 3D shading, no perspective, no shadows
- Make it vivid, clean, and game-ready`;
  }

  return `Create a flat 2D clothing texture for a Roblox R15 PANTS at exactly 585x559 pixels. The design is: ${userPrompt}

IMPORTANT: Paint the ENTIRE 585x559 canvas with the clothing design — do NOT leave transparent gaps, empty space, or visible borders between sections. Fill everything edge-to-edge with continuous color and pattern. The system will automatically crop the correct regions.

The canvas represents unwrapped pants with these key areas:

WAIST/HIP (upper-center area of the canvas):
- The waist FRONT face is a 128x128 square near the center of the upper half. THIS IS THE MOST VISIBLE AREA — center the main design here (fly, belt, front pockets, pattern). The design element should be vertically and horizontally centered within this area with padding on all sides.
- The waist BACK face is a 128x128 square to the right of the front. Center back design here (back pockets, pattern).
- The TOP strip above the front face folds under the upper body and is barely visible — just continue the base color/pattern here, never put important details.
- Side faces flank the front — continue the fabric pattern through them.

LEGS (lower area of the canvas):
- Right leg regions in the bottom-left, left leg regions in the bottom-right
- Pant legs should match the waist's fabric/color and show appropriate leg details (seams, stitching, etc.)

RULES:
- Fill the ENTIRE canvas with the clothing design — solid color, pattern, or fabric texture everywhere. NO transparency, NO gaps, NO empty areas, NO visible grid lines or borders between regions.
- The design should be ONE continuous piece of clothing painted across the full canvas
- Center belt, pockets, and key details on the FRONT face area (upper-center 128x128 square), with padding so they don't touch the edges
- TEXT/NUMBERS: Must be compact and fit within a 128x128 area with 15-20px padding. Never overflow across areas.
- Use flat colors — no 3D shading, no perspective, no shadows
- Make it vivid, clean, and game-ready`;
}

async function generateDesignQuestions(userPrompt: string, type: "shirt" | "pants"): Promise<{ questions: Array<{ id: string; question: string; options: string[] }> }> {
  const garment = type === "shirt" ? "shirt/top" : "pants/bottoms";
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a Roblox clothing designer helping a young user refine their ${garment} design idea. Based on their initial prompt, generate 3-4 quick multiple-choice questions to fill in any missing design details.

RULES:
- Only ask about details NOT already specified in the prompt
- Each question should have 3-5 short, trendy options
- Keep questions fun and casual — target audience is Gen Alpha (ages 8-18)
- Use Gen Alpha/Gen Z language (fire, bussin, slay, clean, drip, etc.)
- Questions should cover: color palette, style vibe, specific details, and overall mood
- Do NOT ask about technical stuff — keep it about the look and feel

POSSIBLE QUESTION TOPICS (pick what's missing from the prompt):
- Main color vibe (if no colors specified)
- Style era/aesthetic (Y2K, dark academia, cyberpunk, cottagecore, etc.)
- Pattern type (solid, gradient, camo, plaid, stripes, etc.)
- Detail level (minimalist vs. maxed out details)
- Mood/energy (chill, aggressive, cute, mysterious, sporty)
- Specific elements (logos, text, graphics, textures)
${type === "shirt" ? "- Sleeve style (short, long, rolled up)" : "- Fit style (baggy, slim, cargo, jogger)"}

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "color_vibe",
      "question": "What colors are we going with?",
      "options": ["Dark & moody", "Bright & bold", "Pastel vibes", "Earth tones", "Neon"]
    }
  ]
}

Do NOT include questions about things the user already described. If the prompt is very detailed and covers everything, return fewer questions (minimum 2).`
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content?.trim() || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.questions && Array.isArray(parsed.questions)) {
      const validated = parsed.questions
        .filter((q: any) =>
          q && typeof q.id === "string" && typeof q.question === "string" &&
          Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6 &&
          q.options.every((o: any) => typeof o === "string")
        )
        .slice(0, 4)
        .map((q: any, i: number) => ({
          id: q.id || `q_${i}`,
          question: q.question,
          options: q.options.slice(0, 5),
        }));
      if (validated.length > 0) {
        return { questions: validated };
      }
    }
  }
  return { questions: [] };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/design-interview", async (req: Request, res: Response) => {
    try {
      const { prompt, templateType } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      const type = templateType === "pants" ? "pants" : "shirt";
      const result = await generateDesignQuestions(prompt, type);
      res.json(result);
    } catch (error: any) {
      console.error("Error generating design questions:", error);
      res.status(500).json({ error: error?.message || "Failed to generate questions", questions: [] });
    }
  });

  app.post("/api/generate-template", async (req: Request, res: Response) => {
    try {
      const { prompt, templateType, designContext } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const type = templateType === "pants" ? "pants" : "shirt";

      let combinedPrompt = prompt;
      if (designContext && typeof designContext === "string" && designContext.trim()) {
        combinedPrompt = `${prompt}. Additional design details: ${designContext}`;
      }

      const enhancedPrompt = await enhancePrompt(combinedPrompt, type);
      const fullPrompt = buildTemplatePrompt(enhancedPrompt, type);

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
