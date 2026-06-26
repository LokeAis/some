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

### 2. Miljøvariablar
Kopier `.env.example` til `.env` og legg inn din Gemini API-nøkkel:
```bash
cp .env.example .env
```
Fyll inn:
`GEMINI_API_KEY=din_nøkkel_her`

Du må også sette opp Firebase-konfigurasjon i `firebase-applet-config.json`.

### 3. Køyr i dev-modus
```bash
npm run dev
```
Appen køyrer no på `http://localhost:3000`.

## Bygging for produksjon
```bash
npm run build
```

## Deploy til Google Cloud Run

Appen er klar for å køyrast i Google Cloud Run.

```bash
npm run build
npm run start
```

## Teknologiar
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **AI**: Google Gemini API (gemini-3.1-flash-lite-preview, gemini-2.5-flash-image)
- **Database & Auth**: Firebase (Firestore, Authentication)
