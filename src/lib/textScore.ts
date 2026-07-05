/**
 * Lokal (ikkje-AI) tekstanalyse for sanntids-score i artikkel-editoren.
 * Alt er rein tekstmatematikk – gratis, umiddelbar, og lett å einheitsteste.
 *
 * Lesbarheit byggjer på LIX (Läsbarhetsindex), standardformelen for
 * skandinaviske språk: LIX = (ord/setningar) + (lange ord × 100 / ord),
 * der lange ord har meir enn 6 bokstavar. Låg LIX = lettlest.
 */

export interface ScoreResult {
  score: number;        // 0–100
  tips: string[];       // handlingsretta forbetringar (tom = bra)
  details: Record<string, number | string>;
}

/** Fjern markdown-syntaks slik at analysen måler prosaen, ikkje markeringa. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')            // kodeblokker
    .replace(/<script[\s\S]*?<\/script>/gi, ' ') // JSON-LD frå artikkelgeneratoren
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')     // lenker → lenketekst
    .replace(/^#{1,6}\s+/gm, '')                 // overskrifts-markørar
    .replace(/[*_`>|-]{1,3}/g, ' ')              // utheving, sitat, tabell-teikn
    .replace(/https?:\/\/\S+/g, ' ')             // rå URL-ar
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(prose: string): string[] {
  return prose
    .split(/[.!?]+[\s$]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function splitWords(prose: string): string[] {
  return prose.split(/\s+/).filter(w => /[a-zA-ZæøåÆØÅ]/.test(w));
}

export function analyzeReadability(text: string): ScoreResult {
  const prose = stripMarkdown(text);
  const words = splitWords(prose);
  const sentences = splitSentences(prose);

  if (words.length < 30) {
    return {
      score: 0,
      tips: ['Skriv litt meir tekst før lesbarheita kan målast (minst ~30 ord).'],
      details: { words: words.length }
    };
  }

  const avgSentenceLength = words.length / Math.max(1, sentences.length);
  const longWords = words.filter(w => w.replace(/[^a-zA-ZæøåÆØÅ]/g, '').length > 6).length;
  const longWordShare = (longWords / words.length) * 100;
  const lix = avgSentenceLength + longWordShare;

  // LIX ~25 = svært lettlest (100p), ~65 = svært tung (≈10p). Nettartiklar bør ligge 30–40.
  const score = Math.max(0, Math.min(100, Math.round(150 - 2.2 * lix)));

  const tips: string[] = [];
  if (avgSentenceLength > 22) {
    tips.push(`Setningane er lange (snitt ${Math.round(avgSentenceLength)} ord). Del opp dei lengste for betre flyt.`);
  }
  if (longWordShare > 30) {
    tips.push(`Mange lange ord (${Math.round(longWordShare)} %). Byt ut nokre fagord med enklare alternativ.`);
  }
  // Avsnittssjekk på råteksten (markdown har avsnitt skilde med blanke linjer).
  const paragraphs = text.split(/\n\s*\n/).map(p => stripMarkdown(p)).filter(p => splitWords(p).length > 0);
  const longestParagraph = Math.max(0, ...paragraphs.map(p => splitWords(p).length));
  if (longestParagraph > 90) {
    tips.push(`Det lengste avsnittet er ${longestParagraph} ord. Bryt det opp – korte avsnitt les betre på skjerm.`);
  }
  if (tips.length === 0) {
    tips.push('God flyt! Teksten er lettlest.');
  }

  return {
    score,
    tips,
    details: { lix: Math.round(lix), avgSentenceLength: Math.round(avgSentenceLength * 10) / 10, longWordShare: Math.round(longWordShare) }
  };
}

export function analyzeSeo(text: string, keyword: string): ScoreResult {
  const kw = keyword.trim().toLowerCase();
  const prose = stripMarkdown(text);
  const words = splitWords(prose);

  if (!kw) {
    return { score: 0, tips: ['Skriv inn eit fokus-nøkkelord for å måle SEO.'], details: {} };
  }
  if (words.length < 30) {
    return { score: 0, tips: ['Skriv litt meir tekst før SEO kan målast.'], details: {} };
  }

  const lowerProse = prose.toLowerCase();
  const lowerText = text.toLowerCase();
  const occurrences = lowerProse.split(kw).length - 1;
  const kwWordCount = Math.max(1, kw.split(/\s+/).length);
  const density = (occurrences * kwWordCount / words.length) * 100;

  const headings = (text.match(/^#{2,3}\s+.+$/gm) || []);
  const kwInHeading = headings.some(h => h.toLowerCase().includes(kw));
  const first100 = splitWords(lowerProse).slice(0, 100).join(' ');
  const kwEarly = first100.includes(kw) || (lowerText.match(/^#\s+.+$/m)?.[0] || '').includes(kw);

  let score = 0;
  const tips: string[] = [];

  // 1. Nøkkelord tidleg (tittel/første avsnitt) – 25p
  if (kwEarly) score += 25;
  else tips.push('Nemn nøkkelordet i tittelen eller det første avsnittet.');

  // 2. Nøkkelord i minst éi mellomtittel – 20p
  if (kwInHeading) score += 20;
  else tips.push('Legg nøkkelordet inn i minst éi mellomtittel (##).');

  // 3. Tettleik 0,3–2,5 % – 20p
  if (occurrences === 0) {
    tips.push('Nøkkelordet finst ikkje i teksten enno.');
  } else if (density > 2.5) {
    score += 8;
    tips.push(`Nøkkelordet er brukt vel ofte (${density.toFixed(1)} %). Varier språket for å unngå «keyword stuffing».`);
  } else if (density < 0.3) {
    score += 10;
    tips.push('Nøkkelordet kan gjerne brukast eit par gonger til.');
  } else {
    score += 20;
  }

  // 4. Tekstlengd – 20p
  if (words.length >= 600) score += 20;
  else if (words.length >= 300) {
    score += 10;
    tips.push(`Teksten er ${words.length} ord – sikt mot 600+ for betre sjanse i søk.`);
  } else {
    tips.push(`Teksten er kort (${words.length} ord). Søkemotorar føretrekk grundigare innhald (600+ ord).`);
  }

  // 5. Struktur: minst to mellomtitlar – 15p
  if (headings.length >= 2) score += 15;
  else if (headings.length === 1) {
    score += 8;
    tips.push('Legg til fleire mellomtitlar (##) for betre struktur.');
  } else {
    tips.push('Teksten manglar mellomtitlar (##) – viktig for både lesarar og søkemotorar.');
  }

  if (tips.length === 0) tips.push('Godt optimalisert!');

  return {
    score: Math.max(0, Math.min(100, score)),
    tips,
    details: { occurrences, density: Math.round(density * 10) / 10, words: words.length, headings: headings.length }
  };
}
