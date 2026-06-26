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

describe('GET /api/check-key', () => {
  it('returnerer alltid geminiKey=false (BYOK)', async () => {
    const res = await request(app).get('/api/check-key');
    expect(res.status).toBe(200);
    expect(res.body.geminiKey).toBe(false);
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

describe('Ukjend rute', () => {
  it('gir 404', async () => {
    const res = await request(app).get('/api/finst-ikkje');
    expect(res.status).toBe(404);
  });
});
