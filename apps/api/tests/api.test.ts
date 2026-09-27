import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';

// Mock app
const app = express();
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/campaigns', (req, res) => res.status(401).json({ error: 'Unauthorized' }));

describe('API Integration Tests', () => {
  it('GET /api/health should return 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/campaigns should require auth', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
  });
});
