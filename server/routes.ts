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
    return `Create a flat 2D unwrapped texture map for a Roblox R15 classic SHIRT template at exactly 585x559 pixels. The design is: ${userPrompt}

This is an UNWRAPPED TEXTURE MAP — a flat image where different rectangular regions represent different faces of a blocky 3D character. The image has a TRANSPARENT background with colored regions placed at specific positions.

EXACT LAYOUT — draw the design ONLY in these rectangular regions:

TORSO (upper half of image):
- TORSO TOP face: centered near top, a wide short rectangle — THIS FOLDS UNDER THE CHARACTER'S HEAD AND IS BARELY VISIBLE. Only fill with the base fabric color/pattern, NEVER place logos, numbers, text, or important design elements here.
- TORSO RIGHT side: left of center, a tall rectangle (right side of the torso as seen from front)
- TORSO FRONT: center, a large 128x128 square — THIS IS THE MAIN VISIBLE AREA. Center the primary shirt design ENTIRELY within this square only (chest, buttons, logo, main pattern). Do NOT let the design extend upward into the top face rectangle above.
- TORSO LEFT side: right of center, a tall rectangle (left side of torso)  
- TORSO BACK: far right area, a large 128x128 square same size as front — Center the back design ENTIRELY within this square (back pattern, number, etc.). Do NOT let it extend into the top rectangle.
- TORSO BOTTOM face: below center, a wide short rectangle (bottom hem of shirt)

RIGHT ARM (bottom-left area):
- Four tall rectangles side by side: Left face, Back face, Right face, Front face of the right arm
- Small squares above and below the front face for arm top and bottom
- Design should show a sleeve — consistent with the torso pattern

LEFT ARM (bottom-right area):
- Four tall rectangles side by side: Front face, Left face, Back face, Right face of the left arm
- Small squares above and below the front face for arm top and bottom
- Design should show a sleeve — mirror of the right arm

CRITICAL RULES:
- This is a FLAT TEXTURE MAP, not a 3D rendering
- ALL regions must have the shirt design/pattern applied consistently
- The FRONT and BACK torso squares are the most prominent — center logos, numbers, and key design elements WITHIN those squares only
- The TOP face rectangle folds under the head — ONLY put base color/fabric there, never logos or text
- Arm regions should have matching sleeves
- TEXT/NUMBERS SIZING: Any text, numbers, or lettering must be SMALL enough to fit entirely within a single 128x128 square with padding around it. Jersey numbers should take up about 40-60% of the square, not fill it edge-to-edge. Text must NEVER overflow or span across multiple regions.
- No 3D shading, no perspective, no shadows
- Transparent/empty background outside the clothing regions
- Make the design vivid, clean, and game-ready`;
  }

  return `Create a flat 2D unwrapped texture map for a Roblox R15 classic PANTS template at exactly 585x559 pixels. The design is: ${userPrompt}

This is an UNWRAPPED TEXTURE MAP — a flat image where different rectangular regions represent different faces of a blocky 3D character's lower body. The image has a TRANSPARENT background with colored regions placed at specific positions.

EXACT LAYOUT — draw the design ONLY in these rectangular regions:

TORSO/WAIST (upper half of image):
- TORSO TOP face: centered near top, a wide short rectangle — THIS FOLDS UNDER THE CHARACTER'S UPPER BODY AND IS BARELY VISIBLE. Only fill with the base fabric color/pattern (e.g. waistband color), NEVER place important design elements here.
- TORSO RIGHT side: left of center, a tall rectangle (right hip)
- TORSO FRONT: center, a large 128x128 square — THIS IS THE MAIN VISIBLE AREA. Center the main pants front design ENTIRELY within this square only (fly, belt, pockets, main pattern). Do NOT let the design extend upward into the top face rectangle above.
- TORSO LEFT side: right of center, a tall rectangle (left hip)
- TORSO BACK: far right area, a large 128x128 square same size as front — Center the back design ENTIRELY within this square (back pockets, pattern). Do NOT let it extend into the top rectangle.
- TORSO BOTTOM face: below center, a wide short rectangle (crotch/seat area)

RIGHT LEG (bottom-left area):
- Four tall rectangles side by side: Left face, Back face, Right face, Front face of the right leg
- Small squares above and below the front face for leg top and bottom
- Design should show a pant leg — consistent with the waist pattern, showing the leg portion of jeans/pants/etc.

LEFT LEG (bottom-right area):
- Four tall rectangles side by side: Front face, Left face, Back face, Right face of the left leg
- Small squares above and below the front face for leg top and bottom
- Design should show a pant leg — mirror of the right leg

CRITICAL RULES:
- This is a FLAT TEXTURE MAP, not a 3D rendering
- ALL regions must have the pants design/pattern applied consistently
- The FRONT and BACK torso squares are the most prominent — center belt, pockets, and key design elements WITHIN those squares only
- The TOP face rectangle folds under the upper body — ONLY put base color/fabric there, never important details
- Leg regions should show matching pant legs (jeans seams, fabric texture, etc.)
- The waist/torso area connects visually to the leg areas
- TEXT/NUMBERS SIZING: Any text or branding must be SMALL enough to fit entirely within a single 128x128 square with padding around it. Text must NEVER overflow or span across multiple regions.
- No 3D shading, no perspective, no shadows
- Transparent/empty background outside the clothing regions
- Make the design vivid, clean, and game-ready`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-template", async (req: Request, res: Response) => {
    try {
      const { prompt, templateType } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const type = templateType === "pants" ? "pants" : "shirt";

      const enhancedPrompt = await enhancePrompt(prompt, type);
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
