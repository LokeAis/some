// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerApiRoutes } from './routes';

// Byggjer ein Express-app med dei delte rutene (same som server.ts og api/index.ts brukar).
// Rate limiting hoppar automatisk over i testmodus (NODE_ENV=test).
let app: express.Express;

beforeAll(() => {
  app = express();
  registerApiRoutes(app);
});

describe('GET /api/health', () => {
  it('svarar 200 med status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Autentisering på AI-ruter', () => {
  it('analyze-brand-voice utan nøkkel gir 401', async () => {
    const res = await request(app)
      .post('/api/analyze-brand-voice')
      .send({ samples: 'litt tekst' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/nøkkel/i);
  });

  // Denne ruta mangla heilt på Vercel før samanslåinga – testen sikrar at ho er registrert.
  it('generate-article utan nøkkel gir 401 (ikkje 404)', async () => {
    const res = await request(app).post('/api/generate-article').send({});
    expect(res.status).toBe(401);
  });

  it('generate-outline utan nøkkel gir 401 (ikkje 404)', async () => {
    const res = await request(app).post('/api/generate-outline').send({});
    expect(res.status).toBe(401);
  });
});

describe('Inputvalidering', () => {
  it('analyze-site utan url/manualText gir 400', async () => {
    const res = await request(app).post('/api/analyze-site').send({});
    expect(res.status).toBe(400);
  });

  it('competitor-analysis utan konkurrentar gir 400', async () => {
    const res = await request(app)
      .post('/api/competitor-analysis')
      .send({ ownUrl: 'https://example.com' });
    expect(res.status).toBe(400);
  });
});

describe('analyze-brand-voice input (tekst eller URL)', () => {
  it('aksepterer {url}-body men krev nøkkel (401 utan)', async () => {
    const res = await request(app)
      .post('/api/analyze-brand-voice')
      .send({ url: 'https://example.com' });
    expect(res.status).toBe(401);
  });

  // Med nøkkel (men utan samples/url) skal valideringa gi 400 FØR noko Gemini-kall.
  it('med nøkkel men utan samples/url gir 400', async () => {
    const res = await request(app)
      .post('/api/analyze-brand-voice')
      .set('x-api-key', 'fake-key-for-validation')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tekst|url/i);
  });
});

describe('score-fidelity (stemme-treff)', () => {
  it('utan nøkkel gir 401', async () => {
    const res = await request(app).post('/api/score-fidelity').send({ content: 'tekst', brandVoice: { summary: 'x' } });
    expect(res.status).toBe(401);
  });

  it('med nøkkel men utan content gir 400', async () => {
    const res = await request(app)
      .post('/api/score-fidelity')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ brandVoice: { summary: 'x' } });
    expect(res.status).toBe(400);
  });

  it('med nøkkel og content men utan brand voice gir 400', async () => {
    const res = await request(app)
      .post('/api/score-fidelity')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ content: 'litt tekst', brandVoice: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/brand voice/i);
  });
});

describe('edit-text on_brand (Grep 3)', () => {
  it('utan nøkkel gir 401', async () => {
    const res = await request(app).post('/api/edit-text').send({ text: 'hei', action: 'on_brand' });
    expect(res.status).toBe(401);
  });

  it('on_brand utan brand voice gir 400', async () => {
    const res = await request(app)
      .post('/api/edit-text')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ text: 'hei', action: 'on_brand', brandVoice: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/brand voice/i);
  });
});

describe('validate-key', () => {
  it('utan nøkkel gir 401 med valid=false', async () => {
    const res = await request(app).post('/api/validate-key').send();
    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });
});

describe('repurpose (gjenbruk av innhald)', () => {
  it('utan nøkkel gir 401', async () => {
    const res = await request(app).post('/api/repurpose').send({ text: 'x', channel: 'LinkedIn' });
    expect(res.status).toBe(401);
  });

  it('med nøkkel men utan kanal gir 400', async () => {
    const res = await request(app)
      .post('/api/repurpose')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ text: 'litt innhald' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/kanal/i);
  });

  it('med nøkkel og kanal men utan innhald gir 400', async () => {
    const res = await request(app)
      .post('/api/repurpose')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ channel: 'Facebook' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lenke|tekst/i);
  });
});

describe('generate-article-stream', () => {
  it('utan nøkkel gir 401', async () => {
    const res = await request(app).post('/api/generate-article-stream').send({ topic: 't', outline: 'o' });
    expect(res.status).toBe(401);
  });

  it('med nøkkel men utan tema/disposisjon gir 400', async () => {
    const res = await request(app)
      .post('/api/generate-article-stream')
      .set('x-api-key', 'fake-key-for-validation')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('image-to-post (bilde til innlegg)', () => {
  it('utan nøkkel gir 401', async () => {
    const res = await request(app).post('/api/image-to-post').send({ imageBase64: 'abc', channel: 'LinkedIn' });
    expect(res.status).toBe(401);
  });

  it('med nøkkel men utan bilde gir 400', async () => {
    const res = await request(app)
      .post('/api/image-to-post')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ channel: 'LinkedIn' });
    expect(res.status).toBe(400);
  });

  it('med nøkkel og bilde men utan kanal gir 400', async () => {
    const res = await request(app)
      .post('/api/image-to-post')
      .set('x-api-key', 'fake-key-for-validation')
      .send({ imageBase64: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/kanal/i);
  });
});

describe('Ukjend rute', () => {
  it('gir 404', async () => {
    const res = await request(app).get('/api/finst-ikkje');
    expect(res.status).toBe(404);
  });
});
