# Go-Live Sjekkliste

Før appen lanserast til ekte brukarar, må følgjande punkt verifiserast:

## 1. Sikkerheit og Secrets
- [ ] BYOK er verifisert: det finst INGEN server-side `GEMINI_API_KEY`, og nøkkelen vert aldri baka inn i frontend-bundelen (`getApiKey` les berre `x-api-key`-headeren).
- [ ] Ingen API-nøklar er committa til versjonskontroll.
- [ ] Sikkerheitsheadere + CSP i `vercel.json` er på plass (CSP er førebels Report-Only — vurder å slå på handheving).
- [ ] CORS er konfigurert riktig (viss API og frontend skal køyre på ulike domene seinare).

## 2. Infrastruktur og Deploy
- [ ] Appen byggjer grønt (`npm run build` fungerer utan feil).
- [ ] Vercel-deploy (primær): push til `main` deployer automatisk; API køyrer som serverless-funksjon (`api/index.ts`, `maxDuration` 60s).
- [ ] Alternativ standalone: `npm run build && npm start` gir ein fungerande Express-server (`dist/server.cjs`).
- [ ] Domene er peika til tenesta, og HTTPS fungerer.

## 3. Applikasjon og API
- [ ] Health endpoint (`/api/health`) svarer med 200 OK.
- [ ] Request logging fungerer, og loggar ikkje sensitive data (som heile nettsidetekstar eller API-nøklar).
- [ ] Feilhåndtering er verifisert: Ugyldige URL-ar krasjar ikkje serveren, men gir ei fornuftig feilmelding til brukaren.
- [ ] Timeout på nettsideskraping fungerer (15 sekund), og SSRF-vernet blokkerer interne IP-ar.
- [ ] Rate limiting er aktiv på `/api/*`-POST-rutene (`RATE_LIMIT_MAX`, standard 30/min per IP).

## 4. Testing (Smoke Tests)
- [ ] Køyr ein analyse av ei ekte nettside og verifiser at JSON-parsinga fungerer.
- [ ] Generer ein månadsplan basert på analysen.
- [ ] Generer ein enkeltpost basert på planen.
- [ ] Sjekk at UI-et handterer "laster..."-tilstandar riktig.

## 5. Drift og Vedlikehald
- [ ] Sett opp varsling (alerting) dersom serveren returnerer mange 500-feil.
- [ ] Sjekk Gemini API-kvotar i Google Cloud Console for å sikre at du ikkje treff taket umiddelbart.
