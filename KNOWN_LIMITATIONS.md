# Kjende Begrensingar (Known Limitations)

Dette er ein oversikt over kva appen *ikkje* gjer enno, og kva som bør prioriterast for framtidige versjonar (etter MVP-lansering).

## 1. MVP-status (Ikkje Enterprise-klart)
- **Brukarkontoar og database finst**: Appen har Google-innlogging (Firebase Auth) og lagrar merkevarer, analysar, planar og innlegg i Firestore. I tillegg vert arbeidsutkast mellomlagra i nettlesaren (`localStorage`), så du mister ikkje alt ved ei oppdatering.
- **Bring-your-own-key**: Appen har ikkje ein delt server-nøkkel. Kvar brukar må leggje inn sin eigen Gemini API-nøkkel, som vert lagra i `localStorage` og send med kvar førespurnad. Det avgrensar kostnadsmisbruk, men nøkkelen er lesbar for JavaScript i nettlesaren (XSS-risiko).
- **Rate limiting er minne-basert**: `/api/*` har rate limiting (30 førespurnader/min per IP på POST-rutene, justerbart via `RATE_LIMIT_MAX`), men teljaren ligg i minne per instans. På serverlause plattformer (Vercel) er grensa difor ikkje delt globalt — ho stoppar enkle burst-angrep, men ei hard global grense krev delt lagring (t.d. Upstash/Redis). Alle rutene deler dessutan same kvote, sjølv om nokre (gjenbruk, nettsideanalyse) er langt dyrare enn andre.
- **Enkel nettsideskraping**: `cheerio`-skrapinga er veldig enkel. Den handterer ikkje Single Page Applications (SPA) som krev JavaScript for å laste innhald, og den kan feile på nettsider med mykje støy eller uvanleg struktur.

## 2. AI og Generering
- **Hallusinasjonar**: Gemini kan framleis finne på ting (hallusinere), sjølv med strukturerte prompts. Brukaren må alltid lese over før publisering.
- **Avgrensa kontekst**: Vi sender berre opptil 20 000 teikn frå nettsida. Viss den viktigaste informasjonen ligg lenger nede eller på undersider, får ikkje AI-en det med seg.
- **JSON-parsing**: Sjølv om vi ber om JSON, kan modellen i sjeldne tilfelle returnere ugyldig JSON. Appen prøver å fange dette, men det kan føre til ein feilmelding for brukaren.

## 3. Prioritering framover
*(Gjennomført sidan førre versjon: rate limiting, samanslåtte backendar, eksport av plan til CSV/PDF/kalender, brand voice-ekstraksjon, fidelity-score med auto-fiks, gjenbruk av innhald på tvers av kanalar, rollebasert admin, CI.)*

1. **Streaming av generering**: La artiklar «skrivast fram» token for token i staden for spinner — størst attverande premium-kjensle.
2. **Delt rate limiting**: Flytt teljaren til delt lagring (Upstash/Redis) og differensier kvoten per rute-kostnad, før brei marknadsføring.
3. **Betre skraping**: Puppeteer/Playwright for SPA-nettsider, eller la brukaren lime inn fleire URL-ar.
4. **Demo utan innlogging**: La eksempelflyten køyre heilt utan konto/nøkkel for lågare terskel.
