import express from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.js";

dotenv.config();

// Initialize Firebase for logging
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const SCHEMA_VERSIONS = {
  BRAND_DNA: "1.0.0",
  CONTENT_PLANNER: "1.0.0",
  DRAFT_FACT_SAVE: "1.0.0"
};

async function logAIInteraction(data: {
  flow: string;
  version: string;
  model: string;
  input: any;
  output: any;
  latency: number;
  groundingUsed: boolean;
  status: string;
}) {
  try {
    await addDoc(collection(db, "aiLogs"), {
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error logging AI interaction:", error);
  }
}

function getApiKey(req?: express.Request) {
  if (req && req.headers['x-api-key']) {
    const headerKey = req.headers['x-api-key'] as string;
    if (headerKey.trim() !== '') {
      return headerKey.trim();
    }
  }

  // Fjerna fallback til process.env.GEMINI_API_KEY for å unngå lekkasje av server-nøkkel
  console.log("Ingen API-nøkkel sendt frå klienten.");
  return null;
}

function handleGeminiError(error: any, defaultMessage: string) {
  console.error("Gemini API Error:", error);
  const errorMessage = (error?.message || '').toLowerCase();
  
  if (errorMessage.includes('api key not valid') || errorMessage.includes('api_key_invalid')) {
    return { status: 401, error: 'Ugyldig Gemini API-nøkkel. Sjekk at du har limt inn rett nøkkel i menyen til venstre.' };
  }
  if (errorMessage.includes('insufficient authentication scopes') || errorMessage.includes('403')) {
    return { status: 403, error: 'API-nøkkelen manglar nødvendige rettar. Sjekk at nøkkelen har tilgang til Generative Language API i Google Cloud Console.' };
  }
  if (errorMessage.includes('quota') || errorMessage.includes('429')) {
    return { status: 429, error: 'Du har brukt opp kvoten din for Gemini API-et. Prøv igjen seinare eller sjekk faktureringa di.' };
  }
  if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
    return { status: 503, error: 'Nettverksfeil ved kontakt med AI-tenesta. Prøv igjen.' };
  }
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return { status: 404, error: 'Fann ikkje AI-modellen. Sjekk at API-nøkkelen din har tilgang til Gemini 3.1 Flash Lite.' };
  }
  if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
    return { status: 400, error: 'Svaret vart blokkert av tryggleiksfilteret til AI-en. Prøv å endre temaet eller vinklinga.' };
  }
  
  return { status: 500, error: `${defaultMessage}: ${error?.message || 'Ukjend feil'}` };
}

async function fetchAndParse(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error("Only HTTP and HTTPS protocols are allowed");
    }
    const hostname = parsedUrl.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) || hostname === '169.254.169.254') {
      throw new Error("Internal IP addresses are not allowed");
    }
  } catch (e: any) {
    const error: any = new Error(`Ugyldig URL: ${e.message}`);
    error.status = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  const res = await fetch(url, { 
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  clearTimeout(timeoutId);
  
  if (!res.ok) {
    const error: any = new Error(`Status ${res.status}`);
    error.status = res.status;
    throw error;
  }
  
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, img, svg, nav, footer').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 20000);
  
  if (!text || text.length < 50) {
    const error: any = new Error("Klarte ikkje å hente nok meiningsfull tekst frå nettsida.");
    error.status = 422;
    throw error;
  }
  
  return text;
}

function slimBrandProfile(brandProfile: any) {
  if (!brandProfile) return null;
  return {
    name: brandProfile.name,
    industry: brandProfile.industry,
    target_audience: brandProfile.target_audience,
    tone_of_voice: brandProfile.tone_of_voice,
    website_url: brandProfile.website_url
  };
}

export function registerApiRoutes(app: express.Express) {

  app.use(express.json({ limit: '5mb' }));

  // Rate limiting: vern dei dyre AI- og skrape-endepunkta mot misbruk.
  // Berre POST-rutene vert avgrensa (helse-/check-key er GET og slepp gjennom).
  // NB: tellaren ligg i minne per instans. På serverlause plattformar (Vercel)
  // eller med fleire instansar er ikkje grensa delt globalt, men det stoppar
  // enkle burst-/skrape-angrep. For ei hard global grense trengst Redis/Upstash.
  app.set('trust proxy', 1);
  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX) || 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test' || req.method === 'GET',
    message: { error: 'For mange førespurnader. Vent eit minutt og prøv igjen.' },
  }));

  // Request logging middleware
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test' && req.url.startsWith('/api/')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      console.log(`Headers:`, {
        'x-api-key': req.headers['x-api-key'] ? 'Present' : 'Missing',
        'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
      });
    }
    next();
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/check-key", (req, res) => {
    // Returnerer alltid false her sidan vi krev at brukaren legg inn sin eigen nøkkel
    res.json({ 
      geminiKey: false
    });
  });

const formatBrandVoice = (bv: any) => {
  if (!bv) return '';
  if (typeof bv === 'string') return bv;

  let formatted = `Oppsummering: ${bv.summary}\n`;
  // Strukturerte stemme-attributt (ekstrahert profil). Støttar både camelCase (lagra profil)
  // og snake_case (rå dna-svar) for robustheit.
  const tone = bv.tone;
  const vocabulary = bv.vocabulary;
  const rhythm = bv.rhythm;
  const ctaStyle = bv.ctaStyle ?? bv.cta_style;
  const values = bv.values;
  const forbiddenPhrases = bv.forbiddenPhrases ?? bv.forbidden_phrases;
  if (tone) formatted += `Tone: ${tone}\n`;
  if (rhythm) formatted += `Rytme og setningsbygnad: ${rhythm}\n`;
  if (vocabulary) formatted += `Vokabular og tiltaleform: ${vocabulary}\n`;
  if (ctaStyle) formatted += `CTA-stil: ${ctaStyle}\n`;
  if (values && values.length > 0) formatted += `Verdiar som skin gjennom: ${values.join(', ')}\n`;
  if (forbiddenPhrases && forbiddenPhrases.length > 0) formatted += `Forbodne ord/fraser (BRUK ALDRI): ${forbiddenPhrases.join(', ')}\n`;
  if (bv.dos && bv.dos.length > 0) formatted += `Slik skriv vi (DOs): ${bv.dos.join(', ')}\n`;
  if (bv.donts && bv.donts.length > 0) formatted += `Slik skriv vi IKKJE (DONTs): ${bv.donts.join(', ')}\n`;
  if (bv.referenceTexts && bv.referenceTexts.length > 0) {
    formatted += `Referansetekstar (Slik vil vi det skal høyrast ut):\n`;
    bv.referenceTexts.forEach((text: string, i: number) => {
      formatted += `--- Eksempel ${i+1} ---\n${text}\n`;
    });
  }
  return formatted;
};
  
  app.post("/api/analyze-brand-voice", async (req, res) => {
    const startTime = Date.now();
    const flow = "BRAND_DNA";
    const version = SCHEMA_VERSIONS.BRAND_DNA;
    const model = "gemini-3.5-flash";
    
    try {
      const { samples, url } = req.body;
      const apiKey = getApiKey(req);

      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre." });
      }

      // Stemma kan ekstraherast frå limt inn tekst ELLER frå ein URL (vi skrapar sida).
      let sampleText: string = (samples || '').trim();
      if (!sampleText && url) {
        try {
          sampleText = await fetchAndParse(url);
        } catch (e: any) {
          return res.status(e.status || 502).json({ error: `Klarte ikkje å hente tekst frå URL-en: ${e.message}` });
        }
      }
      if (!sampleText) {
        return res.status(400).json({ error: "Manglar teksteksempel eller URL." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Du er ein ekspert på lingvistisk analyse og merkevarebygging. Din jobb er å analysere teksteksempel frå brukaren og lage eit "Brand DNA". Du skal identifisere:

- Tone: Er den humoristisk, autoritær, kumpan-aktig eller minimalistisk?
- Rytme: Brukar dei korte, kontante setningar eller lange, forklarende?
- Vokabular: Er det spesielle ord eller bransjeuttrykk som går igjen? Brukar dei "eg", "vi" eller ingen av delane?
- Emoji-strategi: Kor mange, kva type og kvar i teksten står dei?
- CTA (Call to action): Korleis inviterer dei til engasjement?

Her er teksteksempla:
${sampleText}`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: "Du er ein norsk merkevareanalytikar. Ekstraher berre mønster som kan dokumenterast i input. Returner strukturert JSON. Ikkje dikt opp personlegdomstrekk eller målgrupper som ikkje er tydelege.",
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tone: { type: Type.STRING },
              vocabulary: { type: Type.STRING },
              rhythm: { type: Type.STRING },
              forbidden_phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
              target_audience: { type: Type.STRING },
              values: { type: Type.ARRAY, items: { type: Type.STRING } },
              cta_style: { type: Type.STRING },
              content_priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING, description: "Ein kort oppsummering av Brand DNA-et." }
            },
            required: ["tone", "vocabulary", "rhythm", "forbidden_phrases", "target_audience", "values", "cta_style", "content_priorities", "summary"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON.");
          }
        } else {
          throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON.");
        }
      }

      const latency = Date.now() - startTime;
      await logAIInteraction({
        flow,
        version,
        model,
        input: { samples: sampleText.substring(0, 500), url },
        output: parsed,
        latency,
        groundingUsed: false,
        status: "success"
      });

      res.json({ dna: parsed });
    } catch (error) {
      const latency = Date.now() - startTime;
      await logAIInteraction({
        flow,
        version,
        model,
        input: { samples: req.body.samples?.substring(0, 500), url: req.body.url },
        output: { error: error instanceof Error ? error.message : String(error) },
        latency,
        groundingUsed: false,
        status: "error"
      });
      const errResponse = handleGeminiError(error, "Feil ved analyse av Brand Voice");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/analyze-site", async (req, res) => {
    try {
      const { url, manualText, useManualText, language, audience, tone } = req.body;
      
      if (!useManualText && !url) {
        return res.status(400).json({ error: "URL er påkrevd når du ikkje brukar manuell tekst." });
      }
      if (!useManualText && url) {
        try {
          new URL(url);
        } catch (e) {
          return res.status(400).json({ error: "Ugyldig URL-format for hovudnettside. Hugs å inkludere https://" });
        }
      }
      if (useManualText && !manualText) {
        return res.status(400).json({ error: "Manuell tekst er påkrevd når du veljer dette." });
      }

      const apiKey = getApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre." });
      }

      let websiteText = "";
      
      if (useManualText) {
        websiteText = manualText;
      } else {
        try {
          websiteText = await fetchAndParse(url);
        } catch (e: any) {
          console.error("Error fetching main website HTML:", e);
          if (e.name === 'AbortError') {
             return res.status(504).json({ error: "Nettsida brukte for lang tid på å svare (timeout). Sida kan vere nede, eller blokkere automatisk trafikk." });
          }
          if (e.status === 403 || e.status === 401) {
             return res.status(403).json({ error: "Nettsida blokkerer automatisk trafikk (403 Forbidden). Prøv å lime inn teksten manuelt i staden." });
          }
          if (e.status === 404) {
             return res.status(404).json({ error: "Fann ikkje nettsida (404 Not Found). Sjekk at URL-en er skrive rett." });
          }
          if (e.status === 422) {
             return res.status(422).json({ error: "Klarte ikkje å hente nok meiningsfull tekst frå nettsida. Den kan vere beskytta mot skraping eller bygd med ein teknologi som krev JavaScript for å vise innhald. Prøv å lime inn teksten manuelt i staden." });
          }
          if (e.message?.includes('fetch failed') || e.message?.includes('ENOTFOUND')) {
             return res.status(502).json({ error: "Fekk ikkje kontakt med nettsida. Sjekk at URL-en er skrive rett og at sida er oppe." });
          }
          return res.status(500).json({ error: `Klarte ikkje å hente innhald frå nettsida: ${e.message}` });
        }
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `<role>
Du er ein strategisk AI-analytikar og konverteringsekspert for norske bedrifter som spesialiserer seg på innhaldsmarknadsføring i sosiale medium. Du ser etter kva som verkeleg sel og engasjerer.
</role>

<task>
Analyser informasjon frå ei verksemd si nettside og returner ein strukturert, praktisk og kommersielt retta analyse. Analysen skal brukast som grunnlag for å generere ein innhaldsplan og skrive konkrete innlegg som driv handling.
</task>

<rules>
1. Skriv alltid på norsk (nynorsk eller bokmål, hald deg konsekvent).
2. Ver konkret, kortfatta og forretningsmessig. Unngå generiske flosklar og "AI-språk" (t.d. "I dagens fartsfylte digitale verd...").
3. Ikkje finn opp fakta. Baser analysen strengt på den oppgitte nettsideteksten.
4. Dersom informasjon manglar, marker det tydeleg som "Uklart" eller "Manglar informasjon".
5. Dersom målgruppe eller tone ikkje er tydeleg frå teksten, gjer eit forsiktig og logisk estimat, men merk det som ei antaking.
6. Formuler innhaldspilarar slik at dei kan brukast direkte som tema i ein innhaldsplan. Kvar pilar bør løyse eit problem for kunden.
7. Trekk ut "Golden Nuggets": Finn sterke sitat, unike verdiforslag (USP), overraskande fakta, emosjonelle triggerar eller sterke påstandar frå teksten som kan brukast direkte som 'hooks' (første setning) i sosiale medium for å stoppe scrollinga. Desse må vere svært spesifikke og seljande.
8. Identifiser potensielle "Brand Risks or Gaps": Kva manglar på nettsida som ein kunde truleg vil lure på? Kva innvendingar kan ein kunde ha som innhaldet må svare på?
9. Definer tydelege CTA-forslag (Call to Action) som er direkte knytt til produkta/tenestene og som skapar ei kjensle av at det hastar (urgency) eller verdi.
</rules>`;

      const prompt = `<input>
${req.body.brandProfile ? `Brand-profil:\n${JSON.stringify(slimBrandProfile(req.body.brandProfile), null, 2)}\n\n` : ''}URL: ${url || 'Ikkje oppgitt'}
Språk: ${language || 'Norsk'}
Ønskt målgruppe: ${audience || 'Ikkje oppgitt'}
Ønskt tone: ${tone || 'Ikkje oppgitt'}

Nettsidetekst (Vår bedrift):
${websiteText || "Ingen tekst funne. Gjer eit best mogleg estimat basert på URL-en og generell kunnskap om bransjen, men ver tydeleg på at dette er antakingar."}
</input>`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company_summary: { type: Type.STRING },
              target_audience: { type: Type.ARRAY, items: { type: Type.STRING } },
              products_services: { type: Type.ARRAY, items: { type: Type.STRING } },
              tone_of_voice: { type: Type.STRING },
              usp: { type: Type.ARRAY, items: { type: Type.STRING } },
              content_pillars: { type: Type.ARRAY, items: { type: Type.STRING } },
              cta_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              brand_risks_or_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              golden_nuggets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sterke sitat, unike verdiforslag eller slåande fakta frå teksten som kan brukast som 'hooks' i sosiale medium." },
              confidence_notes: { type: Type.STRING }
            },
            required: [
              "company_summary", 
              "target_audience", 
              "products_services", 
              "tone_of_voice", 
              "usp", 
              "content_pillars", 
              "cta_suggestions", 
              "brand_risks_or_gaps",
              "golden_nuggets",
              "confidence_notes"
            ]
          }
        }
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON. Prøv igjen.");
      }
      res.json(parsed);
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved analyse av nettside");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/competitor-analysis", async (req, res) => {
    try {
      const { ownUrl, ownManualText, useManualText, competitorUrls, brandProfile } = req.body;
      
      if (!useManualText && !ownUrl) {
        return res.status(400).json({ error: "URL er påkrevd når du ikkje brukar manuell tekst." });
      }
      if (!competitorUrls || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
        return res.status(400).json({ error: "Minst éin konkurrent-URL er påkrevd." });
      }

      const apiKey = getApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre." });
      }

      let ownText = "";
      if (useManualText) {
        ownText = ownManualText;
      } else {
        try {
          ownText = await fetchAndParse(ownUrl);
        } catch (e: any) {
          console.error("Error fetching own website HTML:", e);
          return res.status(e.status || 500).json({ error: `Klarte ikkje å hente eiga nettside: ${e.message}` });
        }
      }

      const compTexts = await Promise.all(
        competitorUrls.filter(Boolean).slice(0, 3).map(async (curl) => {
          try {
            const text = await fetchAndParse(curl);
            return { url: curl, text };
          } catch (e: any) {
            console.warn(`Failed to fetch competitor ${curl}`, e);
            return { url: curl, text: "Klarte ikkje å hente tekst frå denne sida." };
          }
        })
      );

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `Du er ein strategisk marknadsanalytikar som samanliknar ei bedrift med konkurrentar basert på nettsidetekst.

Oppdrag:
- Analyser eigen bedrift si nettside opp mot 1-3 konkurrentar.
- Finn forskjellar i posisjonering, bodskap og innhaldstema.
- Foreslå konkrete innhaldstema der eigen bedrift kan skilje seg ut (content gaps).

Reglar:
- Skriv på norsk.
- Ver konkret og forretningsorientert.
- Ikkje finn opp fakta som ikkje står i tekstane.
- Dersom informasjon manglar, marker det som usikkert.
- Returner berre gyldig JSON etter schemaet.`;

      let prompt = `${brandProfile ? `Brand-profil:\n${JSON.stringify(slimBrandProfile(brandProfile), null, 2)}\n\n` : ''}Her er tekst frå eigen nettstad:\n\n${ownText || 'Ingen tekst funne.'}\n\nHer er tekst frå konkurrentar:\n\n`;
      compTexts.forEach((comp, i) => {
        prompt += `${comp.url}:\n${comp.text}\n\n`;
      });
      prompt += `Analyser likskapar og forskjellar, og foreslå konkrete content gaps der eigen bedrift kan lage innhald som konkurrentane ikkje dekker godt. For kvart gap, gi konkrete forslag til innhald (content_ideas).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              own_summary: { type: Type.STRING },
              competitors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name_or_url: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    positioning: { type: Type.STRING },
                    main_topics: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["name_or_url", "summary", "positioning", "main_topics"]
                }
              },
              similarities: { type: Type.ARRAY, items: { type: Type.STRING } },
              differences: { type: Type.ARRAY, items: { type: Type.STRING } },
              content_gaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING },
                    description: { type: Type.STRING },
                    why_it_matters: { type: Type.STRING },
                    suggested_formats: { type: Type.ARRAY, items: { type: Type.STRING } },
                    content_ideas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Konkrete forslag til innhald basert på dette gapet" }
                  },
                  required: ["theme", "description", "why_it_matters", "content_ideas"]
                }
              }
            },
            required: ["own_summary", "competitors", "content_gaps"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON. Prøv igjen.");
      }
      res.json(parsed);
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved konkurrentanalyse");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/month-plan", async (req, res) => {
    const startTime = Date.now();
    const flow = "CONTENT_PLANNER";
    const version = SCHEMA_VERSIONS.CONTENT_PLANNER;
    const model = "gemini-3.5-flash";

    try {
      const { analysis, channels, postsPerWeek, goal, tone, brandProfile, visualStyle, brandVoice } = req.body;
      const formattedBrandVoice = formatBrandVoice(brandVoice);

      if (!analysis || !channels || !Array.isArray(channels) || channels.length === 0 || !postsPerWeek) {
        return res.status(400).json({ error: "Manglar påkrevde felt (analysis, channels, postsPerWeek)." });
      }

      const apiKey = getApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre." });
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `Du er redaktør for norske SMB-ar. Lag berre innhaldsidéar som er konkrete, moglege å produsere og tydelege for ein travel fagperson. Merk kva som krev faktasjekk eller søk.
${formattedBrandVoice ? `\nSørg for at innhaldsforslaga reflekterer følgjande Brand Voice DNA:\n${formattedBrandVoice}\n` : ''}`;

      let prompt = `<input>
${brandProfile ? `Brand-profil:\n${JSON.stringify(slimBrandProfile(brandProfile), null, 2)}\n\n` : ''}Kanalar: ${channels.join(", ")}
Postar per veke: ${postsPerWeek} (Totalt ${postsPerWeek * 4} postar over 4 veker)
Hovudmål: ${goal || 'Ikkje oppgitt'}
Ønskt tone: ${tone || 'Ikkje oppgitt'}
Visuell stil for bildeidéar: ${visualStyle && visualStyle !== 'Ingen spesifikk stil' ? visualStyle : 'Variert og passande'}

Brand-analyse:
${JSON.stringify(analysis, null, 2)}
</input>`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plan_summary: { type: Type.STRING },
              posts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    channel: { type: Type.STRING },
                    theme: { type: Type.STRING },
                    post_goal: { type: Type.STRING },
                    format: { type: Type.STRING },
                    angle: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    requires_search: { type: Type.BOOLEAN, description: "Om dette innlegget krev faktasjekk eller nettsøk." },
                    notes: { type: Type.STRING }
                  },
                  required: ["day", "channel", "theme", "post_goal", "format", "angle", "cta", "requires_search", "notes"]
                }
              }
            },
            required: ["plan_summary", "posts"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON.");
          }
        } else {
          throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON.");
        }
      }

      const latency = Date.now() - startTime;
      await logAIInteraction({
        flow,
        version,
        model,
        input: { channels, postsPerWeek, goal },
        output: parsed,
        latency,
        groundingUsed: false,
        status: "success"
      });

      res.json({ plan: parsed.posts, plan_summary: parsed.plan_summary });
    } catch (error) {
      const latency = Date.now() - startTime;
      await logAIInteraction({
        flow,
        version,
        model,
        input: { channels: req.body.channels, goal: req.body.goal },
        output: { error: error instanceof Error ? error.message : String(error) },
        latency,
        groundingUsed: false,
        status: "error"
      });
      const errResponse = handleGeminiError(error, "Feil ved laging av innhaldsplan");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/generate-post", async (req, res) => {
    const startTime = Date.now();
    const flow = "DRAFT_FACT_SAVE";
    const version = SCHEMA_VERSIONS.DRAFT_FACT_SAVE;
    const model = "gemini-3.5-flash";

    try {
      const { channel, theme, goal, angle, tone, cta, analysis, modification, contentType, brandProfile, visualStyle, brandVoice, requires_search } = req.body;
      const formattedBrandVoice = formatBrandVoice(brandVoice);

      if (!theme || !goal || !tone) {
        return res.status(400).json({ error: "Manglar påkrevde felt (theme, goal, tone)." });
      }

      const apiKey = getApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre." });
      }

      const ai = new GoogleGenAI({ apiKey });

      let systemInstruction = "";
      let prompt = "";
      let responseSchema: any = {};

      if (contentType === 'article') {
        systemInstruction = `Du skriv naturleg norsk med variert rytme og aktivt språk. Du skal aldri overdrive, aldri skrive AI-klisjear, og du må unngå overdriven bruk av tankestrek (–) for å skyte inn informasjon. Bruk heller komma eller lag ei ny setning. Du må seie frå når inputen er for svak til å lage truverdig innhald.
${formattedBrandVoice ? `\nBruk følgjande Brand Voice DNA for å treffe nøyaktig på tone of voice, rytme og vokabular:\n${formattedBrandVoice}\n` : ''}`;

        prompt = `<input>
Tema/Søkeord: ${theme}
Mål: ${goal}
Vinkel: ${angle || 'Ikkje oppgitt'}
Ønskt tone: ${tone}
CTA: ${cta || 'Ikkje oppgitt'}
Visuell stil for bilde: ${visualStyle && visualStyle !== 'Ingen spesifikk stil' ? visualStyle : 'Passande for artikkelen'}

Brand-analyse:
${analysis ? JSON.stringify(analysis, null, 2) : 'Ikkje oppgitt'}
</input>

${modification ? `<task_modification>\nBrukaren har bedt om følgjande endring på eit tidlegare utkast. Tilpass den nye artikkelen nøyaktig etter denne instruksen:\n"${modification}"\n</task_modification>` : ''}`;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            article_title: { type: Type.STRING, description: "Tittelen på artikkelen (H1)" },
            url_slug: { type: Type.STRING, description: "Ein SEO-vennleg URL-slug basert på hovudsøkeordet" },
            meta_title: { type: Type.STRING, description: "Ein SEO-optimalisert metatittel (maks 60 teikn)" },
            meta_description: { type: Type.STRING, description: "Ein SEO-optimalisert metabeskrivelse (maks 155 teikn)" },
            article_body: { type: Type.STRING, description: "Sjølve artikkelen formatert i Markdown (inkluder innhaldsfortegnelse, H2, H3, lister, tabellar, FAQ, og JSON-LD Schema til slutt)" },
            image_prompt: { type: Type.STRING, description: `Ein detaljert prompt på engelsk for å generere eit hovudbilde.` }
          },
          required: ["article_title", "url_slug", "meta_title", "meta_description", "article_body", "image_prompt"]
        };
      } else {
        systemInstruction = `Du skriv naturleg norsk med variert rytme og aktivt språk. Du skal aldri overdrive, aldri skrive AI-klisjear, og du må unngå overdriven bruk av tankestrek (–) for å skyte inn informasjon. Bruk heller komma eller lag ei ny setning. Du må seie frå når inputen er for svak til å lage truverdig innhald.
${formattedBrandVoice ? `\nBruk følgjande Brand Voice DNA for å treffe nøyaktig på tone of voice, rytme og vokabular:\n${formattedBrandVoice}\n` : ''}`;

        prompt = `<input>
Kanal: ${channel || 'Ikkje oppgitt'}
Tema: ${theme}
Mål: ${goal}
Format: ${req.body.format || 'Ikkje oppgitt'}
Vinkel: ${angle || 'Ikkje oppgitt'}
CTA: ${cta || 'Ikkje oppgitt'}
Ønskt tone: ${tone}
Visuell stil for bilde: ${visualStyle && visualStyle !== 'Ingen spesifikk stil' ? visualStyle : 'Passande for kanalen'}

Brand-analyse:
${analysis ? JSON.stringify(analysis, null, 2) : 'Ikkje oppgitt'}
</input>

${modification ? `<task_modification>\nBrukaren har bedt om følgjande endring på eit tidlegare utkast. Tilpass det nye innlegget nøyaktig etter denne instruksen:\n"${modification}"\n</task_modification>` : ''}`;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            main_caption: { type: Type.STRING },
            short_version: { type: Type.STRING },
            hashtag_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            image_prompt: { type: Type.STRING, description: `Ein detaljert prompt på engelsk for å generere eit bilde.` },
            alternative_variant: { type: Type.STRING }
          },
          required: ["hook", "main_caption", "short_version", "hashtag_suggestions", "image_prompt", "alternative_variant"]
        };
      }

      const config: any = {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      };

      if (requires_search) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(text);
        parsed.content_type = contentType || 'post';
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            parsed.content_type = contentType || 'post';
          } catch (e2) {
            throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON.");
          }
        } else {
          throw new Error("Klarte ikkje å parse AI-svaret som gyldig JSON.");
        }
      }

      const latency = Date.now() - startTime;
      await logAIInteraction({
        flow,
        version,
        model,
        input: { theme, goal, contentType, requires_search },
        output: parsed,
        latency,
        groundingUsed: !!requires_search,
        status: "success"
      });

      res.json(parsed);
    } catch (error) {
      const latency = Date.now() - startTime;
      await logAIInteraction({
        flow,
        version,
        model,
        input: { theme: req.body.theme, goal: req.body.goal, contentType: req.body.contentType },
        output: { error: error instanceof Error ? error.message : String(error) },
        latency,
        groundingUsed: !!req.body.requires_search,
        status: "error"
      });
      const errResponse = handleGeminiError(error, "Feil ved laging av innhald");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt manglar." });
      }

      const apiKey = getApiKey(req);
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
      });

      let base64Image = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!base64Image) {
        throw new Error("Fekk ikkje bilde frå AI-en. Prøv ein annan prompt.");
      }

      res.json({ imageUrl: base64Image });
    } catch (error) {
      const errResponse = handleGeminiError(error, "Klarte ikkje å generere bilde");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/trends", async (req, res) => {
    try {
      const { industry } = req.body;
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar." });
      }
      if (!industry) {
        return res.status(400).json({ error: "Manglar bransje." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const today = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' });
      
      const prompt = `Finn dei 3 viktigaste trendane eller nyheitene innan ${industry} i dag, ${today}. Gje meg ei kort oppsummering av kvar.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "Du er ein Trend-Analytikar. Din jobb er å bruke Google Søk aktivt for å finne dagsaktuelt innhald. Du skal alltid sitere kjeldene dine og fokusere på kva som er mest relevant for sosiale medium akkurat no.",
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trends: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Tittel på trenden/nyheita" },
                    summary: { type: Type.STRING, description: "Kort oppsummering av trenden" }
                  },
                  required: ["title", "summary"]
                }
              }
            },
            required: ["trends"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      const parsed = JSON.parse(response.text);
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const sources = chunks.map(chunk => ({
        url: chunk.web?.uri,
        title: chunk.web?.title
      })).filter(s => s.url);

      res.json({ trends: parsed.trends, sources });
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved henting av trendar");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/trend-post", async (req, res) => {
    try {
      const { trend, brandVoice, brandProfile } = req.body;
      const formattedBrandVoice = formatBrandVoice(brandVoice);
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar." });
      }
      if (!trend) {
        return res.status(400).json({ error: "Manglar trend." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Skriv eit engasjerande innlegg til LinkedIn/Instagram basert på denne nyheita/trenden:
Tittel: ${trend.title}
Oppsummering: ${trend.summary}

Koble nyheita til kvifor dette er viktig for kundane våre. Skap verdi, vis innsikt, og oppfordre til diskusjon i kommentarfeltet.
${brandProfile ? `Vår bedrift:\n${JSON.stringify(slimBrandProfile(brandProfile), null, 2)}` : ''}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `Du er ein dyktig norsk SoMe-copywriter. Du skriv engasjerande, innsiktsfullt og verdidrive innhald.${formattedBrandVoice ? `\nBruk min 'Brand Voice' [${formattedBrandVoice}] for å treffe nøyaktig på tone of voice, rytme og vokabular.\n` : ''}`,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              post: { type: Type.STRING, description: "Sjølve innlegget" },
              image_prompt: { type: Type.STRING, description: "Forslag til bilde-prompt" }
            },
            required: ["post", "image_prompt"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Tom respons frå Gemini API");
      }

      res.json(JSON.parse(response.text));
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved generering av trend-innlegg");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/generate-outline", async (req, res) => {
    try {
      const { topic, brandVoice, useSearch, modelTier } = req.body;
      const formattedBrandVoice = formatBrandVoice(brandVoice);
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar." });
      }
      if (!topic) {
        return res.status(400).json({ error: "Manglar tema." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `<role>
Du er ein ekspert på SEO og innhaldsstrategi. Din jobb er å lage ein skreddarsydd disposisjon for ein artikkel om: "${topic}".
</role>

${formattedBrandVoice ? `<brand_voice_dna>\nBruk følgjande Brand Voice DNA for å treffe riktig tone og målgruppe:\n${formattedBrandVoice}\n</brand_voice_dna>\n\n` : ''}<task>
STEG 1: Klassifiser temaet. Kva slags intensjon ligg bak søket/temaet? Vel éin av desse kategoriane:
- Guide / How-to (Fokus: Steg-for-steg instruksjonar)
- Forklaring / Kva er (Fokus: Definisjon, djupne, døme)
- Samanlikning (Fokus: A vs B, fordelar/ulemper)
- Lokal teneste (Fokus: Problem, løysing, geografisk område, CTA)
- Listeartikkel (Fokus: Topp X, tips, inspirasjon)
- Problemløysing (Fokus: Symptom, årsak, tiltak)
- Kommersiell landingsartikkel (Fokus: Verdi, funksjonar, bevis, konvertering)

STEG 2: Lag disposisjonen basert på den valde kategorien. Ikkje bruk ein standard "robot-mal". Tilpass strukturen til intensjonen!
</task>

<rules>
1. Skriv på nynorsk.
2. Start svaret ditt med å oppgi kva kategori du valde (t.d. "Artikkeltype: Guide / How-to").
3. Formater disposisjonen som ei tydeleg punktliste med H2- og H3-overskrifter.
4. Inkluder ein introduksjon som fangar merksemda og svarar kort på hovudspørsmålet.
5. Tilpass innhaldselementa. Ikkje tving inn ein tabell viss det er ein lokal tenesteartikkel.
6. ALDRI inkluder overskrifter som "Konklusjon", "Oppsummering" eller "Avslutning". Avslutt heller med eit handlingsorientert avsnitt eller ein FAQ (viss relevant).
7. Returner KUN disposisjonen, ikkje skriv sjølve artikkelen.
</rules>`;

      const config: any = { temperature: 0.7 };
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const modelName = modelTier === 'premium' ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config
      });

      res.json({ outline: response.text });
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved laging av disposisjon");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/generate-article", async (req, res) => {
    try {
      const { topic, outline, brandVoice, useSearch, modelTier } = req.body;
      const formattedBrandVoice = formatBrandVoice(brandVoice);
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar." });
      }
      if (!topic || !outline) {
        return res.status(400).json({ error: "Manglar tema eller disposisjon." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `<role>
Du er ein senior SEO-skribent og fagredaktør. Du skriv på naturleg, flytande nynorsk. Tekstane dine er kjende for å vere engasjerande, truverdige og lette å lese.
</role>

<task>
Skriv ein komplett, publiseringsklar artikkel basert på temaet og disposisjonen du får oppgitt. Du MÅ følgje disposisjonen slavisk.

Tema: "${topic}"

Disposisjon:
${outline}
</task>

${formattedBrandVoice ? `<brand_voice_dna>\nBruk følgjande Brand Voice DNA for å treffe nøyaktig på tone of voice, rytme og vokabular:\n${formattedBrandVoice}\n</brand_voice_dna>\n\n` : ''}<anti_ai_rules>
KRITISK: Du har strengt forbod mot å bruke følgjande klisjear og mønster:
- "I dagens fartsfylte/digitale verd/landskap"
- "La oss ta eit dypdykk inn i"
- "Det er viktig å hugse på at"
- "Avslutningsvis", "Til slutt", "Som ein konklusjon"
- "I eit stadig meir konkurranseprega marked"
- Å starte avsnitt med "For det første", "I tillegg", "Vidare".
- Overdriven bruk av tankestrek (–) for å skyte inn tilleggsinformasjon. Bruk heller komma eller lag ei ny setning.

RYTME (BURSTINESS): Varier setningslengda drastisk. Dette er avgjerande for at teksten skal verke menneskeleg. Bland svært korte, kontante setningar (2-4 ord). Bruk dei som effekt. Følg opp med lengre, forklarande setningar.

AVSLUTNING: Ikkje skriv ei tradisjonell oppsummering. Teksten skal slutte brått med verdi, eit oppfølgingsspørsmål eller ein tydeleg Call to Action.
</anti_ai_rules>

<formatting_rules>
1. Bruk Markdown (H1, H2, H3, lister).
2. Skriv aktivt, ikkje passivt (t.d. "Vi anbefaler", ikkje "Det blir anbefalt").
3. Bruk tabellar eller faktaboksar KUN dersom det passar naturleg inn i disposisjonen.
4. Viss (og berre viss) disposisjonen ber om ein FAQ, skal du generere gyldig JSON-LD Schema-kode for denne heilt til slutt i svaret ditt. Koden SKAL vere pakka inn i <script type="application/ld+json"> ... </script> slik at brukaren kan kopiere den direkte inn i WordPress.
5. Viss du har tilgang til søk/kjelder, flett fakta naturleg inn i teksten. Ikkje finn opp statistikk.
</formatting_rules>`;

      const config: any = { temperature: 0.7 };
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const modelName = modelTier === 'premium' ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config
      });

      let articleText = response.text;
      
      if (useSearch) {
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = chunks.map((chunk: any) => ({
          url: chunk.web?.uri,
          title: chunk.web?.title
        })).filter((s: any) => s.url);

        if (sources.length > 0) {
          const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.url, s])).values());
          articleText += `\n\n### Kjelder brukt i denne artikkelen\n`;
          uniqueSources.forEach((s: any) => {
            articleText += `- [${s.title}](${s.url})\n`;
          });
        }
      }

      res.json({ article: articleText });
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved laging av artikkel");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/edit-text", async (req, res) => {
    try {
      const { text, action } = req.body;
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar." });
      }
      if (!text || !action) {
        return res.status(400).json({ error: "Manglar tekst eller handling." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = "";
      switch (action) {
        case 'shorter':
          prompt = `Gjer følgjande tekst kortare og meir konsis, men hald på hovudbodskapen:\n\n"${text}"`;
          break;
        case 'professional':
          prompt = `Skriv om følgjande tekst til ein meir profesjonell og formell tone:\n\n"${text}"`;
          break;
        case 'casual':
          prompt = `Skriv om følgjande tekst til ein meir uformell og avslappa tone:\n\n"${text}"`;
          break;
        case 'emojis':
          prompt = `Legg til passande emojies i følgjande tekst for å gjere den meir engasjerande:\n\n"${text}"`;
          break;
        case 'humanize':
          prompt = `<task>
Skriv om følgjande tekst slik at den høyrest 100 % menneskeleg, naturleg og munnleg ut. Skriv på nynorsk.
</task>

<rules>
1. BEHALD MEININGA: Ikkje legg til nye fakta, argument eller informasjon. Ikkje fjern hovudpoenget.
2. FJERN AI-PREG: Fjern alle typiske klisjear (som "I dagens samfunn", "La oss dykke ned i", "Det er viktig å merke seg").
3. UNNGÅ AI-PUNKTERING: AI-en brukar ofte lange tankestrek (–) for å skyte inn informasjon. Erstatt desse med naturlege komma, punktum eller omformuler setninga slik at flyten blir meir munnleg.
4. VARIER RYTMEN: Bryt opp lange, tunge setningar. Bruk minst éi svært kort setning for å skape dynamikk.
5. AKTIVT SPRÅK: Skriv direkte og aktivt. Fjern stive overgangsord.
6. FORMATERING: Viss originalteksten inneheld Markdown (lenker, feit tekst, lister), MÅ du behalde denne formateringa nøyaktig slik den var.
7. OUTPUT: Returner KUN den omskrivne teksten. Ingen introduksjon, ingen forklaring.
</rules>

Tekst som skal skrivast om:
"${text}"`;
          break;
        default:
          return res.status(400).json({ error: "Ugyldig handling." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { temperature: 0.7 }
      });

      res.json({ editedText: response.text });
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved redigering av tekst");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });

  app.post("/api/generate-article-image-prompt", async (req, res) => {
    try {
      const { text, visualStyle } = req.body;
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({ error: "API-nøkkel manglar." });
      }
      if (!text) {
        return res.status(400).json({ error: "Manglar tekst." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Du er ein ekspert på å lage visuelle konsept for artiklar. 
Basert på følgjande artikkeltekst, lag ein detaljert "image prompt" på engelsk som kan brukast i bildegeneratorar som Midjourney eller DALL-E.

Artikkeltekst:
"${text}"

${visualStyle ? `Ønskt visuell stil: ${visualStyle}` : ''}

Reglar:
1. Skriv prompten på engelsk.
2. Fokuser på atmosfære, komposisjon, lyssetjing og detaljar som fangar essensen i artikkelen.
3. Ikkje bruk tekst i bildet.
4. Returner KUN sjølve prompten, ingen introduksjon eller forklaring.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { temperature: 0.7 }
      });

      res.json({ imagePrompt: response.text });
    } catch (error) {
      const errResponse = handleGeminiError(error, "Feil ved laging av bildeprompt");
      res.status(errResponse.status).json({ error: errResponse.error });
    }
  });
}
