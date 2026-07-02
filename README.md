# AI SoMe Strategi App

Dette er ein AI-basert webapp for norske bedrifter som treng hjelp med innhaldsmarknadsføring i sosiale medium. Appen analyserer nettsider, genererer 30-dagars innhaldsplanar og skriv konkrete innlegg tilpassa ulike kanalar.

## Funksjonalitet
1. **Nettsideanalyse**: Hentar tekst frå ei nettside og brukar AI for å finne målgruppe, tone-of-voice, USP-ar og innhaldspilarar.
2. **Konkurrentanalyse**: Analyserer eiga nettside opp mot konkurrentar for å finne styrkar, svakheiter og innhaldsgap.
3. **Månadsplan**: Genererer ein strategisk 30-dagars innhaldsplan basert på analysen.
4. **Enkeltpost**: Skriv eit konkret innlegg for vald kanal basert på planen og analysen, inkludert bildegenerering.
5. **Prosjektstyring**: Lagre og administrer ulike merkevarer, analysar, planar og innlegg med Firebase.

## Lokal oppstart

### 1. Klon prosjektet og installer avhengnader
```bash
npm install
```

### 2. API-nøkkel (BYOK)
Appen brukar «bring your own key»: kvar brukar limer inn sin eigen Gemini API-nøkkel i menyen etter innlogging (lagra i nettlesaren, send per førespurnad). Det trengst difor **ingen** server-side `GEMINI_API_KEY`. `.env` er valfri (t.d. `PORT`, `RATE_LIMIT_MAX`).

Firebase-konfigurasjonen (offentleg web-config) ligg i `api/firebaseConfig.ts` og er delt av frontend og server.

### 3. Køyr i dev-modus
```bash
npm run dev
```
Appen køyrer no på `http://localhost:3000`.

## Testar og bygging
```bash
npm test        # vitest + supertest mot API-rutene
npm run build   # vite build + esbuild av serveren
```

## Deploy

**Vercel (primær):** Repoet er kopla til Vercel — push til `main` deployer automatisk. Frontend blir servert statisk, API-et køyrer som serverless-funksjon (`api/index.ts`). GitHub Actions (`.github/workflows/ci.yml`) køyrer typesjekk, testar og bygg ved kvar push.

**Firestore-reglar** deployast separat: `npx firebase-tools deploy --only firestore:rules`.

**Node-server (alternativ):** `npm run build && npm run start` gir ein frittståande Express-server (`dist/server.cjs`) som kan hostast kvar som helst (krev eigen Dockerfile for container-deploy).

## Teknologiar
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite
- **Backend**: Node.js, Express (delt rutelogikk i `api/routes.ts` for både lokal server og Vercel)
- **AI**: Google Gemini API (gemini-3.5-flash, gemini-3.1-pro-preview, gemini-2.5-flash-image)
- **Database & Auth**: Firebase (Firestore, Authentication)
