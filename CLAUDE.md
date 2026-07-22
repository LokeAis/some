# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**SoMe-assistenten** (`some-assistenten`) is an AI-powered content-marketing web app
for Norwegian businesses. It analyses websites, extracts a brand-voice profile,
generates 30-day social-media plans, writes channel-specific posts, and produces
full articles with streaming generation. AI generation runs on the **Google Gemini
API** via a **bring-your-own-key (BYOK)** model — each user pastes their own key.

**The UI, comments, and commit messages are written in Norwegian (Nynorsk).** Match
that language when editing user-facing strings, error messages, and comments.

## Tech stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite 6, `motion` for animation,
  `lucide-react` icons.
- **Backend**: Node.js + Express 4. Route logic lives in `api/routes.ts` and is shared
  between the local/standalone server (`server.ts`) and the Vercel serverless entry
  (`api/index.ts`).
- **AI**: Google Gemini via `@google/genai`. Models in use: `gemini-3.6-flash` (text),
  `gemini-2.5-flash-image` (image generation).
- **Database & Auth**: Firebase — Firestore + Google Authentication.
- **Testing**: Vitest + Supertest (API route tests).
- **Deploy**: Vercel (primary); standalone Express server is an alternative.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server (tsx server.ts) → http://localhost:3000, Vite in middleware mode
npm run lint       # type-check only: tsc --noEmit  (there is no separate eslint step for TS)
npm test           # vitest run — API route tests + unit tests
npm run build      # vite build (frontend) + esbuild bundle of server → dist/server.cjs
npm start          # run the built standalone server (node dist/server.cjs), requires build first
npm run preview    # vite preview of the built frontend
```

CI (`.github/workflows/ci.yml`) runs on push to `main` and on every PR: `npm ci` →
`tsc --noEmit` → `npm test` → `npm run build`. **Keep all four green.** Before pushing,
run `npm run lint && npm test` locally.

Note: `eslint.config.mjs` only lints `firestore.rules` (via the Firebase security-rules
plugin), not the TypeScript source. TypeScript type-checking is the source-code gate.

## Architecture

### Shared backend, two entry points
`api/routes.ts` exports `registerApiRoutes(app)`. Both entry points call it, so **all
API changes go in `api/routes.ts`** — never duplicate a route in one entry point only.
- `server.ts` — local dev + standalone production (Express, Vite middleware in dev,
  static `dist/` in prod).
- `api/index.ts` — Vercel serverless function (`vercel.json` rewrites `/api/*` here).

A test in `api/routes.test.ts` explicitly guards against routes being registered in one
place but not the other.

### BYOK key handling (important security invariant)
There is **no server-side `GEMINI_API_KEY`**. The key travels from the browser in the
`x-api-key` request header on every AI request and is used server-side per-request
(`getApiKey(req)` in `api/routes.ts`). The key is stored in the browser's `localStorage`.

- **Never** bake `GEMINI_API_KEY` into the frontend bundle (see the warning in
  `vite.config.ts`).
- **Never** add a `process.env.GEMINI_API_KEY` fallback in `getApiKey` — it was
  deliberately removed to avoid leaking a server key.
- Missing/empty key → routes return **401**; the frontend validates the key against
  `POST /api/validate-key` (debounced) as the user types.

### API routes (all under `/api`, POST unless noted)
`health` (GET), `validate-key`, `analyze-site`, `competitor-analysis`,
`analyze-brand-voice`, `score-fidelity`, `month-plan`, `generate-post`, `repurpose`,
`image-to-post`, `generate-image`, `trends`, `trend-post`, `generate-outline`,
`generate-article`, `generate-article-stream` (streamed), `edit-text`,
`generate-article-image-prompt`.

Conventions in these handlers:
- Rate limiting: `express-rate-limit`, 30 req/min per IP on POST routes (config via
  `RATE_LIMIT_MAX`). In-memory per instance — not shared across Vercel instances (known
  limitation).
- Website scraping: `fetchAndParse()` uses `cheerio`, blocks internal/loopback IPs
  (SSRF guard), 15s timeout, caps extracted text at 20 000 chars. `normalizeUrl()`
  (exported, tested) fixes common URL typos.
- Gemini errors go through `handleGeminiError()` which maps them to user-facing
  Norwegian messages with appropriate status codes.
- Most routes request structured JSON output via Gemini response schemas (`Type` from
  `@google/genai`).

### Frontend structure (`src/`)
- `App.tsx` — the shell: tab state, brand selection, API-key modal, auth wiring. Heavy
  tab components are lazy-loaded (`lazy`/`Suspense`) so each tab is its own chunk.
  Working state (active tab, current analysis, selected plan item, etc.) is persisted to
  `localStorage` under `some_*` keys.
- `components/` — one component per tab/feature (SiteAnalysis, CompetitorAnalysis,
  MonthPlan, SinglePost, TrendAnalyzer, Repurpose, ImageToPost, MyProjects, …) plus
  shared UI (ConfirmModal, ErrorBoundary, ApiKeyModal, AccountMenu, …).
- `features/` — newer, self-contained feature modules with their own
  `components/` + `services/` + `types.ts` (+ sometimes `hooks/`):
  `features/articles`, `features/brandVoice`, `features/quality`. Prefer this module
  layout for new features.
- `contexts/AuthContext.tsx` — Google sign-in, user doc bootstrap, `isAdmin` role,
  and GDPR account deletion (`deleteAccount`).
- `lib/` — `firebase.ts` (app init), `db.ts` (Firestore access + error handling),
  `textScore.ts` (SEO/readability scoring), `imageUtils.ts`, `useRepurpose.ts`.
- `types.ts` (root) + per-feature `types.ts` — shared domain types.

### Data model (Firestore)
Two storage conventions coexist — **check which one a collection uses before writing**:
- **User-scoped subcollections**: `users/{uid}/brands/{brandId}/{analyses|plans|posts}`.
  Accessed via `src/lib/db.ts`.
- **Top-level collections keyed by `brandId`**: `voiceProfiles`, `articles`. Accessed
  via `features/*/services/*Db.ts`.

Firestore access rules live in `firestore.rules` (owner/admin checks, per-collection
field validation, `uid` immutability). The data model is documented in comments at the
top of that file and mirrored in `firebase-blueprint.json`. When you add or change a
stored field, update **both** the TypeScript types and the matching validator in
`firestore.rules`. Rules deploy separately:
`npx firebase-tools deploy --only firestore:rules`.

## Conventions

- **Language**: Norwegian (Nynorsk) for all user-facing text, error messages, and code
  comments. Keep AI prompt text in Norwegian too.
- **Strict TypeScript**: `strict: true`, `noEmit`. Import alias `@/*` maps to repo root.
  `allowImportingTsExtensions` is on.
- **Error handling**: Firestore errors → `handleFirestoreError()` (`lib/db.ts`); Gemini
  errors → `handleGeminiError()` (`api/routes.ts`). Reuse these rather than inventing new
  error shapes.
- **New routes**: add to `api/routes.ts`, guard the API key, validate input (return 400
  on bad input), and add a Supertest case to `api/routes.test.ts` (auth 401 + input
  validation are the standard checks).
- **Tests**: colocated `*.test.ts` next to the code. API tests build an Express app with
  `registerApiRoutes` — rate limiting is auto-skipped in test mode (`NODE_ENV=test`).

## Security notes

- BYOK invariants above (no server key, key never in bundle).
- SSRF protection in `fetchAndParse` — keep the internal-IP blocklist when touching
  scraping.
- Security headers + CSP are set in `vercel.json` (CSP currently Report-Only).
- Account deletion (`AuthContext.deleteAccount`) implements GDPR art. 17: it removes all
  Firestore user data before deleting the auth account.

## Deploy

- **Vercel (primary)**: push to `main` auto-deploys. Frontend served statically; API runs
  as the serverless function `api/index.ts` (`maxDuration` 60s).
- **Firestore rules**: deploy separately with `firebase-tools` (see above).
- **Standalone**: `npm run build && npm start` gives a self-contained Express server
  (`dist/server.cjs`) hostable anywhere.

See `README.md` (feature overview), `KNOWN_LIMITATIONS.md` (MVP gaps + roadmap), and
`GO_LIVE_CHECKLIST.md` for more context.
