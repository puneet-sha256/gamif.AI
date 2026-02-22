# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gamif.AI is a full-stack gamification app inspired by Solo Leveling. Users set goals, get AI-generated tasks, earn XP/shards, level up attributes (Strength, Intelligence, Charisma), and spend shards in a reward shop. Built with React 19 + TypeScript frontend and Express 5 backend, with Azure OpenAI for AI features.

## Commands

- `npm run dev` — Start Vite dev server (port 5173)
- `npm run server` — Start Express API server (port 3001)
- `npm run dev:full` — Run both frontend and backend concurrently
- `npm run build` — Full production build (server TSC + copy prompts + Vite client)
- `npm run lint` — ESLint on all files

## Architecture

### Two TypeScript configs

The project uses split TypeScript compilation:
- `tsconfig.app.json` — Frontend: ESNext modules, JSX, bundler resolution, `noEmit` (Vite handles bundling)
- `tsconfig.node.json` — Backend: CommonJS, Node resolution, emits to `build/` directory

Shared code lives in `src/shared/types/` and `src/utils/logger.ts` (included by both configs). Browser-only utils like `soundEffects.ts` are excluded from the server config.

### Frontend (`src/`)

- **Components** (`src/components/`) — React components (AuthScreen, Dashboard, ProfileSetup, GoalsSetup, Shop, TaskCard, etc.)
- **Contexts** (`src/contexts/`) — AuthContext, AlertContext, ConfirmContext, ThemeContext. App wraps in ThemeProvider → AuthProvider → AlertProvider → ConfirmProvider
- **Client services** (`src/client/services/`) — API layer. `apiClient.ts` is the base HTTP client; other services (aiService, taskService, userService, shopService) build on it
- **Types** (`src/types/`, `src/shared/types/`) — TypeScript interfaces shared between frontend and backend

Onboarding flow is step-based: `auth → profile → goals → dashboard` (controlled by state in `App.tsx`, not routes). React Router is only used for test routes (`/test-alerts`, `/test-confirm`).

### Backend (`server.ts`, `src/server/`)

- **Entry point**: `server.ts` — Express app with CORS, JSON parsing, request logging middleware
- **Routes** (`src/server/routes/`) — authRoutes, userRoutes, healthRoutes, aiRoutes. All mounted under `/api/`
- **Services** (`src/server/services/`) — azureAIService (OpenAI agent integration), emailService (Azure Communication Services for OTP), promptManager
- **Data storage** (`src/server/db/`) — Repository pattern with pluggable backends:
  - `interfaces.ts` — `IUserRepository`, `ISessionRepository` contracts
  - `fileUserRepository.ts` / `fileSessionRepository.ts` — File-based JSON storage (original behavior)
  - `cosmosUserRepository.ts` / `cosmosSessionRepository.ts` — Azure Cosmos DB (NoSQL, split sub-document schema)
  - `migrationRepository.ts` — Lazy migration: reads Cosmos first, falls back to file, migrates on access
  - `index.ts` — Factory that reads `STORAGE_MODE` env var (`file` | `cosmos` | `migration`) and returns the correct repositories
  - `dataOperations.ts` is a thin facade that delegates to the active repository — **routes import from here and need zero changes**
  - `types.ts` — Cosmos sub-document type definitions and `FIELD_TO_SUBDOC` dispatch mapping

#### Cosmos DB sub-document schema

Each user is stored as up to 5 sub-documents in a single partition (partition key: `/userId`):

| Sub-doc `id` | Fields |
|---|---|
| `profile` | username, email, passwordHash, createdAt, lastLogin, profileData, goalsData, stats |
| `tasks` | generatedTasks |
| `shop` | shopItems, inventory |
| `history` | activityHistory, taskHistory |
| `rewards` | unclaimedRewards |

Only `profile` is required; others are lazily created on first write via upsert. `updateUser()` groups fields by `FIELD_TO_SUBDOC` mapping and upserts only the affected sub-docs. `buyShopItem()` uses a transactional batch across profile+shop for atomicity.

Sessions live in a separate `sessions` container with partition key `/sessionId` and TTL auto-expiry (24h).

#### Storage modes

- `file` — Original file-based JSON storage (`data/users.json`, `data/sessions.json`)
- `cosmos` — Azure Cosmos DB only (for production after migration completes)
- `migration` — Lazy migration: reads Cosmos first, falls back to file, migrates user on first access with atomic batch writes

### AI Integration

Uses Azure OpenAI agents (gpt-4o-mini for task generation, gpt-4o for daily analysis). Prompt templates live in `src/server/prompts/`. The build step copies these to the output directory.

### Key Domain Logic

- **Leveling**: Dynamic calculation from total XP — `xp_for_level(n) = 100 + Math.floor((n - 1) / 10) * 50`. Level is never stored, always computed (`src/utils/levelCalculation.ts`)
- **Streaks**: Tracked with soft decay (0.65 multiplier). Streak-based shard multipliers apply to rewards (`src/utils/streakCalculation.ts`)
- **Attributes**: Strength, Intelligence, Charisma — XP distributed by task category
- **Activity analysis reward flow**: User logs daily activities → AI classifies each against planned tasks/goals → `rewardCalculation.ts` computes XP/shards per activity → backend (`aiRoutes.ts`) saves `unclaimedRewards` and `taskHistory` to user record → frontend claims rewards via Dashboard

## Environment Variables

Configured via `.env` (not committed). Templates in `.env.example`, `.env.development`, `.env.production`.

- `VITE_API_BASE_URL` — Frontend API base (dev: `http://localhost:3001/api`, prod: `/api`)
- `AZURE_OPENAI_API_KEY` — Required for AI features
- `ACS_CONNECTION_STRING` / `ACS_SENDER_ADDRESS` — Azure Communication Services for OTP emails
- `ALLOWED_ORIGINS` — Comma-separated CORS origins
- `COSMOS_ENDPOINT` / `COSMOS_KEY` / `COSMOS_DATABASE` — Azure Cosmos DB connection (required when `STORAGE_MODE` is `cosmos` or `migration`)
- `STORAGE_MODE` — Data backend: `file` (default, local JSON), `cosmos` (Azure Cosmos DB), `migration` (lazy file→cosmos)

## API Routes

All routes are under `/api/`. Key groups:
- Auth: `/api/register`, `/api/login`, `/api/logout`, `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/forgot-password/*`
- User: `/api/user/session/:sessionId`, `/api/user/:userId`, `/api/user/tasks/*`
- Shop: `/api/user/shop/*`, `/api/user/inventory/use`
- Game: `/api/user/experience`, `/api/user/shards`
- AI: `/api/ai/generate-tasks`, `/api/ai/analyze-activity`

## Deployment

CI/CD deploys to Azure Web App (`app-gamif-ai`) on push to the `deployment` branch. Pipeline: Node 22.x → install → build → deploy. The built Express server serves the Vite dist as static files with a catch-all for client-side routing.
