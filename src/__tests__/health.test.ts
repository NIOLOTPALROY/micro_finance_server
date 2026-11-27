import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getTestApp, closeTestApp } from '../utils/test/setup';

describe('Health Check', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should return health status', async () => {
    const unprefixed = await request(app.server).get('/health');
    expect(unprefixed.status).toBe(404);

    const res = await request(app.server).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
