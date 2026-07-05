// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { analyzeReadability, analyzeSeo, stripMarkdown } from './textScore';

const lettlest = `Vi lagar gode sko. Dei er laga i Noreg. Kvar sko blir sydd for hand.
Du merkar skilnaden med ein gong. Foten sit godt. Du går lenger utan vondt.

Prøv eit par i dag. Du angrar ikkje.`;

const tung = `Implementeringsstrategien for organisasjonsutviklingsprosessen forutsetter kontinuerlig
kompetanseutviklingsorientering, ettersom virksomhetstransformasjonen nødvendiggjør systematiserte
kvalitetssikringsmekanismer kombinert med resultatorienterte evalueringsparametere som understøtter
langsiktige verdiskapningsperspektiver gjennom tverrfaglige samhandlingskonstellasjoner og dessuten
forutsigbare rammebetingelser for interessentinvolvering i beslutningsprosessene fremover`;

describe('stripMarkdown', () => {
  it('fjernar overskrifter, lenker og kodeblokker', () => {
    const md = '## Tittel\n\nLes [meir her](https://x.no) om **saka**.\n\n```js\nkode();\n```';
    const out = stripMarkdown(md);
    expect(out).not.toContain('#');
    expect(out).not.toContain('https://');
    expect(out).not.toContain('kode()');
    expect(out).toContain('meir her');
  });
});

describe('analyzeReadability (LIX)', () => {
  it('gir høg score for kort og konsis tekst', () => {
    const r = analyzeReadability(lettlest);
    expect(r.score).toBeGreaterThan(70);
  });

  it('gir låg score for lang og tung tekst', () => {
    const r = analyzeReadability(tung);
    expect(r.score).toBeLessThan(40);
    expect(r.tips.join(' ')).toMatch(/lange/i);
  });

  it('ber om meir tekst når input er for kort', () => {
    const r = analyzeReadability('Kort tekst.');
    expect(r.score).toBe(0);
    expect(r.tips[0]).toMatch(/meir tekst/i);
  });
});

describe('analyzeSeo', () => {
  const artikkel = `# Leggbeskyttarar til fotball

Leggbeskyttarar er viktig utstyr for alle som spelar fotball. I denne guiden går vi gjennom alt du treng å vite.

## Kvifor leggbeskyttarar er påbode

Reglane krev at alle spelarar brukar dei. ${'Vanleg tekst her som fyller ut artikkelen med relevant innhald. '.repeat(20)}

## Slik vel du riktige leggbeskyttarar

Storleik og passform er viktigast. ${'Meir utfyllande tekst om val av utstyr og kva du bør tenkje på. '.repeat(20)}`;

  it('gir høg score når nøkkelordet er tidleg, i mellomtittel og teksten er lang', () => {
    const r = analyzeSeo(artikkel, 'leggbeskyttarar');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('gir 0 og tips utan nøkkelord', () => {
    const r = analyzeSeo(artikkel, '');
    expect(r.score).toBe(0);
    expect(r.tips[0]).toMatch(/nøkkelord/i);
  });

  it('varslar når nøkkelordet ikkje finst i teksten', () => {
    const r = analyzeSeo(artikkel, 'sykkelhjelm');
    expect(r.tips.join(' ')).toMatch(/finst ikkje/i);
  });

  it('varslar om keyword stuffing ved svært høg tettleik', () => {
    const stuffed = ('leggbeskyttarar er bra og leggbeskyttarar er trygt. ').repeat(15);
    const r = analyzeSeo(stuffed, 'leggbeskyttarar');
    expect(r.tips.join(' ')).toMatch(/ofte|stuffing/i);
  });
});
