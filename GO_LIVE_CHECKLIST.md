# Go-Live Sjekkliste

Før appen lanserast til ekte brukarar, må følgjande punkt verifiserast:

## 1. Sikkerheit og Secrets
- [ ] `GEMINI_API_KEY` er lagt inn som ein hemmelegheit (secret) i produksjonsmiljøet (t.d. Google Cloud Secret Manager), ikkje i klartekst i miljøvariablar viss mogleg.
- [ ] Ingen API-nøklar er committa til versjonskontroll.
- [ ] CORS er konfigurert riktig (viss API og frontend skal køyre på ulike domene seinare).

## 2. Infrastruktur og Deploy
- [ ] Appen byggjer grønt (`npm run build` fungerer utan feil).
- [ ] Dockerfile byggjer eit fungerande image.
- [ ] Cloud Run (eller anna hosting) er konfigurert med riktig minne og CPU (anbefalt: min 512MB RAM).
- [ ] Domene er peika til tenesta, og HTTPS fungerer.

## 3. Applikasjon og API
- [ ] Health endpoint (`/api/health`) svarer med 200 OK.
- [ ] Request logging fungerer, og loggar ikkje sensitive data (som heile nettsidetekstar eller API-nøklar).
- [ ] Feilhåndtering er verifisert: Ugyldige URL-ar krasjar ikkje serveren, men gir ei fornuftig feilmelding til brukaren.
- [ ] Timeout på nettsideskraping fungerer (10 sekund).
- [ ] Fallback/Mock-data er slått av i produksjon (krev at `GEMINI_API_KEY` er sett).

## 4. Testing (Smoke Tests)
- [ ] Køyr ein analyse av ei ekte nettside og verifiser at JSON-parsinga fungerer.
- [ ] Generer ein månadsplan basert på analysen.
- [ ] Generer ein enkeltpost basert på planen.
- [ ] Sjekk at UI-et handterer "laster..."-tilstandar riktig.

## 5. Drift og Vedlikehald
- [ ] Sett opp varsling (alerting) dersom serveren returnerer mange 500-feil.
- [ ] Sjekk Gemini API-kvotar i Google Cloud Console for å sikre at du ikkje treff taket umiddelbart.
