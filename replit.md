# RoTemplate

## Overview

RoTemplate is a Roblox clothing template editor built with Expo (React Native) and an Express backend. It allows users to design shirts and pants by filling color regions, drawing freehand, or using AI text-to-image generation. The app exports results as correctly-sized PNGs (585x559px) ready for Roblox upload. Targets web, iOS, and Android through Expo.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native, using new architecture and React Compiler
- **Routing**: expo-router file-based routing. Two screens: `index.tsx` (home) and `editor.tsx` (canvas editor)
- **State Management**: Local component state with `useState`/`useRef`; TanStack React Query for server data
- **Fonts**: Inter font family via `@expo-google-fonts/inter`
- **Key Libraries**:
  - `react-native-svg` for template canvas rendering and export
  - `react-native-view-shot` for capturing canvas as PNG
  - `expo-media-library` for saving exported images on mobile
  - `expo-file-system` for writing AI-generated images to cache
  - `expo-haptics` for tactile feedback
  - `expo-linear-gradient` for gradient backgrounds

### Template System

- Templates defined in `constants/templates.ts` with precise pixel coordinates for each body region
- Two template types: `shirt` (torso + arms) and `pants` (torso + legs)
- Canvas dimensions: 585x559 pixels (standard Roblox R15 template size)
- Color presets and group labels in the same constants file

### Editor Features

- **Fill mode**: Tap regions to fill with selected color, group fill (torso, arms/legs), fill all
- **Draw mode**: Freehand drawing with PanResponder, configurable brush sizes, undo, strokes clipped to clothing regions via SVG ClipPath
- **AI mode**: Natural language prompt to generate clothing designs via OpenAI gpt-image-1
  - Prompt suggestion chips for inspiration
  - Preview of generated design
- **Color picker**: 32 preset colors + custom hex input + clear/transparent option
- **Export/Download**: 
  - Web: Creates download link for PNG file
  - Mobile: Saves to photo library via expo-media-library
  - AI-generated images saved as base64 PNG
  - All exports at correct 585x559px Roblox dimensions

### Backend (Express)

- **Runtime**: Express on Node.js with TypeScript (tsx in dev, esbuild for production)
- **Routes** (`server/routes.ts`):
  - `POST /api/generate-template` — Takes `{ prompt, templateType }`, generates image via OpenAI gpt-image-1, returns `{ image: base64_png }`
- **AI Integration**: OpenAI via Replit AI Integrations (no API key needed, billed to credits)
  - Environment vars: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Body parsing**: JSON limit set to 50mb for large base64 image payloads
- **CORS**: Replit domains + localhost origins for Expo web dev

### Database

- Drizzle ORM with PostgreSQL schema defined in `shared/schema.ts`
- Currently the app uses in-memory/local state only — no database-backed features active
- Integration boilerplate files exist in `server/replit_integrations/` and `shared/models/` but are not wired up

### Build & Deploy

- **Dev**: Two workflows — `Start Frontend` (Expo dev server on port 8081) and `Start Backend` (Express on port 5000)
- **Production**: Custom static build script + esbuild server bundle

## Recent Changes

- **Dark mode UI overhaul**: Complete redesign with professional dark theme (#0E1117 background, #161B22 surfaces, #00BCD4 tint)
- **Upload instructions**: Added "How to Upload to Roblox" guide accessible from both home screen and editor (modal with step-by-step instructions referencing Roblox Creator Hub workflow)
- **R15 template coordinates fixed**: All region coordinates now match official Roblox R15 specifications
- **Server-side compositing**: POST /api/composite-fill endpoint uses sharp to produce correct 585x559px PNGs with transparency
- Added AI generation mode using OpenAI gpt-image-1 for natural language clothing design
- **AI design interview flow**: After entering a prompt, GPT-4o-mini generates 3-4 trendy multiple-choice questions to refine the design (colors, vibe, patterns, details). Users can answer or skip. Answers feed into generation as additional context.
- **AI prompt enhancement pipeline**: Three-stage system — design interview (optional) → GPT-4o-mini prompt enhancement with Gen Alpha/Gen Z aesthetics → region-specific R15 image generation
- **Text/number sizing constraints**: AI prompts enforce text/numbers fit within 128x128px with 15-20px padding — prevents overflow across template faces
- **Seamless edges**: Prompts enforce matching colors/patterns at region boundaries to prevent visible seam lines on the 3D model
- **Region-aware prompts**: Torso TOP face explicitly marked as "folds under head" so AI never places important design elements there; main designs vertically and horizontally centered on FRONT and BACK squares only
- Added freehand drawing mode with brush sizes and undo
- Fixed PNG export to work on both web (download link) and mobile (photo library save)
- Updated prompt suggestion chips with Gen Alpha trending styles (Y2K, anime, dark academia, cyberpunk, etc.)
