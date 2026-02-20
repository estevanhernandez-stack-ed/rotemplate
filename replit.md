# RoTemplate

## Overview

RoTemplate is a Roblox clothing template editor built with Expo (React Native) and an Express backend. It allows users to design shirts and pants by filling color regions and drawing on a template canvas, then exporting the result as an image. The app targets web, iOS, and Android platforms through Expo's cross-platform framework.

The core workflow: users select a template type (shirt or pants) on the home screen, enter an editor with a visual canvas showing the UV-mapped clothing regions, apply colors via fill or draw modes, and export/save their designs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`) and React Compiler experiment
- **Routing**: expo-router with file-based routing (`app/` directory). Two main screens: `index.tsx` (home/template selector) and `editor.tsx` (canvas editor)
- **State Management**: Local component state with `useState`/`useRef` for editor state; TanStack React Query (`@tanstack/react-query`) for server data fetching
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter` (Regular, Medium, SemiBold, Bold)
- **Key Libraries**:
  - `react-native-svg` for rendering the template canvas and export canvas
  - `react-native-view-shot` for capturing the canvas as an image for export
  - `expo-media-library` for saving exported images
  - `expo-haptics` for tactile feedback on native platforms
  - `react-native-gesture-handler` + `react-native-reanimated` for gestures/animations
  - `react-native-keyboard-controller` for keyboard-aware scroll views
  - `expo-linear-gradient` for gradient backgrounds

### Template System

- Templates are defined in `constants/templates.ts` with precise pixel coordinates for each body region (UV map regions)
- Two template types: `shirt` (torso + arms) and `pants` (torso + legs)
- Each region has an id, label, group, x, y, width, and height
- Canvas dimensions are fixed at 585×559 pixels (standard Roblox template size)
- Color presets and group labels are defined in the same constants file

### Editor Features

- **Fill mode**: Tap regions to fill with selected color
- **Draw mode**: Freehand drawing with configurable brush sizes (2, 5, 10, 18, 30)
- **Group actions**: Fill entire body part groups (torso, arms, legs) at once
- **Color picker**: Preset colors + custom hex input
- **Export**: Uses `ExportCanvas` component (hidden, rendered at full resolution) captured via `react-native-view-shot`

### Backend (Express)

- **Runtime**: Express 5 running on Node.js with TypeScript (compiled via `tsx` in dev, `esbuild` for production)
- **Entry point**: `server/index.ts`
- **Routes**: Defined in `server/routes.ts` — currently minimal, all routes should be prefixed with `/api`
- **Storage**: `server/storage.ts` defines an `IStorage` interface with in-memory implementation (`MemStorage`). Currently only has basic user CRUD
- **CORS**: Configured to allow Replit domains and localhost origins for Expo web development
- **Static serving**: In production, serves a static landing page from `server/templates/landing-page.html`

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` — currently has a `users` table with id (UUID), username, and password
- **Validation**: Uses `drizzle-zod` to generate Zod schemas from Drizzle table definitions
- **Migrations**: Output to `./migrations` directory via `drizzle-kit`
- **Config**: `drizzle.config.ts` reads `DATABASE_URL` environment variable
- **Note**: The current storage implementation is in-memory (`MemStorage`). The Drizzle schema exists but a database-backed storage implementation would need to be added to use it

### Shared Code

- `shared/` directory contains code shared between frontend and backend (currently just the schema)
- Path aliases configured: `@/*` maps to project root, `@shared/*` maps to `./shared/*`

### Build & Deploy

- **Dev mode**: Two processes — `expo:dev` for the Expo dev server and `server:dev` for the Express API
- **Production build**: `expo:static:build` runs a custom build script (`scripts/build.js`) that starts Metro, fetches the bundle, and saves static assets. `server:build` bundles the server with esbuild
- **Production run**: `server:prod` serves the built application

## External Dependencies

- **PostgreSQL**: Required for database (connection via `DATABASE_URL` environment variable). Used with Drizzle ORM
- **Expo**: Core framework for cross-platform mobile/web development
- **Replit Environment**: Several environment variables are Replit-specific (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN`) used for CORS configuration, proxy setup, and deployment domain resolution
- **No external API integrations**: The app is self-contained — no third-party auth, no external APIs. All functionality is local template editing and export