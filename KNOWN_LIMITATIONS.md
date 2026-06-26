# Kjende Begrensingar (Known Limitations)

Dette er ein oversikt over kva appen *ikkje* gjer enno, og kva som bør prioriterast for framtidige versjonar (etter MVP-lansering).

## 1. MVP-status (Ikkje Enterprise-klart)
- **Brukarkontoar og database finst**: Appen har Google-innlogging (Firebase Auth) og lagrar merkevarer, analysar, planar og innlegg i Firestore. I tillegg vert arbeidsutkast mellomlagra i nettlesaren (`localStorage`), så du mister ikkje alt ved ei oppdatering.
- **Bring-your-own-key**: Appen har ikkje ein delt server-nøkkel. Kvar brukar må leggje inn sin eigen Gemini API-nøkkel, som vert lagra i `localStorage` og send med kvar førespurnad. Det avgrensar kostnadsmisbruk, men nøkkelen er lesbar for JavaScript i nettlesaren (XSS-risiko).
- **Ingen rate limiting**: Det finst framleis inga rate limiting på `/api/*`-rutene. Sidan kvar AI-førespurnad krev ein gyldig nøkkel frå brukaren, råkar misbruk mest den som eig nøkkelen, men scraping-/trend-rutene kan likevel misbrukast. Bør leggjast til før lansering.
- **Enkel nettsideskraping**: `cheerio`-skrapinga er veldig enkel. Den handterer ikkje Single Page Applications (SPA) som krev JavaScript for å laste innhald, og den kan feile på nettsider med mykje støy eller uvanleg struktur.

## 2. AI og Generering
- **Hallusinasjonar**: Gemini kan framleis finne på ting (hallusinere), sjølv med strukturerte prompts. Brukaren må alltid lese over før publisering.
- **Avgrensa kontekst**: Vi sender berre opptil 20 000 teikn frå nettsida. Viss den viktigaste informasjonen ligg lenger nede eller på undersider, får ikkje AI-en det med seg.
- **JSON-parsing**: Sjølv om vi ber om JSON, kan modellen i sjeldne tilfelle returnere ugyldig JSON. Appen prøver å fange dette, men det kan føre til ein feilmelding for brukaren.

## 3. Prioritering for neste versjon (V2)
1. **Rate Limiting**: Beskytt API-et mot misbruk.
2. **Slå saman backendane**: `server.ts` (Cloud Run) og `api/index.mjs` (Vercel) er nesten identiske og må delast for å unngå at dei driv frå kvarandre (m.a. ulike modellnamn).
3. **Betre skraping**: Bruk Puppeteer eller Playwright for å hente innhald frå meir komplekse nettsider, eller la brukaren lime inn fleire URL-ar.
4. **Redigering i UI**: La brukaren redigere innhaldsplanen direkte i tabellen/korta før dei genererer enkeltpostar.
5. **Eksport**: Legg til funksjonalitet for å eksportere planen til CSV eller PDF.
