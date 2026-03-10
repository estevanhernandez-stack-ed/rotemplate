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
- AI image generators are BAD at spelling long text. If the user wants text on the clothing, SHORTEN it to a maximum of 2 words or a single number. Pick the most impactful 1-2 words that capture the vibe.
- Examples: "saying something crazy" → just describe the graphic style, skip the text. "jersey number 23" → keep "23". "Supreme style box logo" → keep "DRIP" or "HYPE" as the word.
- Numbers on jerseys should be compact, not giant — about 40-60% of the chest area
- Any text must use a font size that leaves padding/margins around it
- If the user's request is mainly about a phrase or quote, convert it into a VISUAL design concept instead (graphic, illustration, pattern) and skip the text entirely

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
    return `Create a flat 2D unwrapped texture map for a Roblox R15 SHIRT at exactly 585x559 pixels. The design is: ${userPrompt}

This is an unwrapped clothing texture. It has rectangular regions that map onto a blocky 3D character.

LAYOUT:

TORSO — in the upper area of the image:
- TOP face: a wide short rectangle at the very top (top 13% of image) — THIS FOLDS UNDER THE HEAD. Fill with base color only. NEVER place any part of the main graphic here.
- RIGHT side: a tall narrow rectangle to the left of the front face
- FRONT face: a large square that spans from about 13% to 36% down from the top, horizontally centered — THIS IS THE MAIN VISIBLE AREA. Place the main chest design CENTERED WITHIN THIS ZONE — between 13% and 36% from the top of the image, centered horizontally. The graphic must NOT extend above 13% (that's the fold) or below 36% (that's the hem). Think of it as the upper-middle band of the image.
- LEFT side: a tall narrow rectangle to the right of the front face
- BACK face: a large square to the far right, same vertical zone as the front face (13%-36% from top) — Center the back design here
- BOTTOM face: a wide short rectangle just below the front face — bottom hem, fill with base color

ARMS — the LOWER portion of the image (roughly y=289 to y=549). These are JUST SLEEVES:
- Right arm sleeve (bottom-left): several tall narrow rectangles. Fill with the same fabric color/pattern as the torso. These are sleeves — NO main graphics, NO logos, NO character art here. Just matching fabric.
- Left arm sleeve (bottom-right): mirrors the right arm. Just matching fabric.

CRITICAL RULES:
- The main graphic/design must be placed between 13% and 36% from the top of the image, centered horizontally. This is where the torso FRONT face is. Do NOT place it in the top 13% (that folds under the head) or below 36% (that's the arms). If you center the graphic on the whole canvas, it will end up on the arms instead of the chest.
- Fill the ENTIRE 585x559 canvas with the shirt's base color/fabric — EVERY SINGLE PIXEL from top to bottom. The bottom half contains the sleeves — fill them with matching fabric color/pattern, NOT with the main graphic.
- NO white space, NO transparency, NO gaps between regions, NO visible borders or grid lines
- The FRONT and BACK torso squares in the upper quarter are the most important — center any logos, graphics, or key design elements within them
- The sleeve areas (bottom half) MUST have the same base COLOR and PATTERN as the torso but NO main graphic — they are part of the same shirt
- TEXT LIMITED TO 2 WORDS MAX or a single number — AI cannot render longer text legibly
- Use flat colors — no 3D shading, no shadows, no perspective
- Do NOT draw outlines around regions — paint the design seamlessly across the whole canvas`;
  }

  return `Create a flat 2D unwrapped texture map for a Roblox R15 PANTS at exactly 585x559 pixels. The design is: ${userPrompt}

This is an unwrapped clothing texture. It has rectangular regions that map onto a blocky 3D character's lower body.

LAYOUT:

WAIST/HIP — in the upper area of the image:
- TOP face: a wide short rectangle at the very top (top 13% of image) — THIS FOLDS UNDER THE UPPER BODY. Fill with base color only. NEVER place any part of the main graphic here.
- RIGHT side: a tall narrow rectangle to the left of the front face — right hip
- FRONT face: a large square that spans from about 13% to 36% down from the top, horizontally centered — THIS IS THE MAIN VISIBLE AREA. Place the main design CENTERED WITHIN THIS ZONE — between 13% and 36% from the top of the image, centered horizontally. The graphic must NOT extend above 13% (that's the fold) or below 36%. Think of it as the upper-middle band of the image.
- LEFT side: a tall narrow rectangle to the right of the front face — left hip
- BACK face: a large square to the far right, same vertical zone as the front face (13%-36% from top) — Center back design here (back pockets, pattern)
- BOTTOM face: a wide short rectangle just below the front face — seat area, fill with base color

LEGS — the LOWER portion of the image (roughly y=289 to y=549). These are JUST PANT LEGS:
- Right leg (bottom-left): several tall narrow rectangles. Fill with the same fabric color/pattern as the waist. These are pant legs — NO main graphics, NO logos here. Just matching fabric with seam/stitch details.
- Left leg (bottom-right): mirrors the right leg. Just matching fabric.

CRITICAL RULES:
- The main design must be placed between 13% and 36% from the top of the image, centered horizontally. This is where the waist FRONT face is. Do NOT place it in the top 13% (that folds under the body) or below 36% (that's the legs). If you center the graphic on the whole canvas, it will end up on the legs instead of the waist.
- Fill the ENTIRE 585x559 canvas with the pants' base color/fabric — EVERY SINGLE PIXEL from top to bottom. The bottom half contains the pant legs — fill them with matching fabric color/pattern, NOT with the main graphic.
- NO white space, NO transparency, NO gaps between regions, NO visible borders or grid lines
- The FRONT and BACK squares in the upper quarter are the most important — center any belt, pockets, or key design elements within them
- The leg areas (bottom half) MUST have the same base COLOR and PATTERN as the waist but NO main graphic — they are part of the same pants
- TEXT LIMITED TO 2 WORDS MAX or a single number — AI cannot render longer text legibly
- Use flat colors — no 3D shading, no shadows, no perspective
- Do NOT draw outlines around regions — paint the design seamlessly across the whole canvas`;
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
