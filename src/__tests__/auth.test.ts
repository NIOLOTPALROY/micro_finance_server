import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../utils/test/setup';
import { cleanupDatabase, seedDatabase } from '../utils/test/db';

function getSessionCookie(response: { headers: Record<string, string | string[] | undefined> }): string {
  const cookie = response.headers['set-cookie'];
  if (Array.isArray(cookie)) {
    return cookie[0] ?? '';
  }
  return cookie ?? '';
}

describe('Auth Functionality', () => {
  let app: Awaited<ReturnType<typeof getTestApp>>;

  beforeAll(async () => {
    app = await getTestApp();
    await seedDatabase(); // Seed database with admin users before tests
  });

  afterAll(async () => {
    await cleanupDatabase(); // Clean up database after tests
  });

  it('should allow an admin to log in', async () => {
    const adminUsers = [
      { email: 'admin1@example.com', password: 'password123' },
      { email: 'admin2@example.com', password: 'password123' },
      { email: 'admin3@example.com', password: 'password123' },
      { email: 'admin4@example.com', password: 'password123' },
    ];

    for (const admin of adminUsers) {
      const res = await request(app.server).post('/auth/login').send(admin);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logged in successfully');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', admin.email);
      expect(res.body.user).toHaveProperty('role', 'admin');
    }
  });

  it('should prevent login with invalid credentials', async () => {
    const res = await request(app.server)
      .post('/auth/login')
      .send({
        email: 'admin1@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('should prevent login for non-existent user', async () => {
    const res = await request(app.server)
      .post('/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('should get current authenticated user', async () => {
    const admin = { email: 'admin1@example.com', password: 'password123' };

    const loginRes = await request(app.server).post('/auth/login').send(admin);
    const cookie = getSessionCookie(loginRes);

    const meRes = await request(app.server)
      .get('/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty('user');
    expect(meRes.body.user).toHaveProperty('email', admin.email);
    expect(meRes.body.user).toHaveProperty('role', 'admin');
  });

  it('should logout an authenticated user', async () => {
    const admin = { email: 'admin1@example.com', password: 'password123' };

    const loginRes = await request(app.server).post('/auth/login').send(admin);
    const cookie = getSessionCookie(loginRes);

    const logoutRes = await request(app.server).post('/auth/logout').set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toHaveProperty('message', 'Logged out successfully');

    const meRes = await request(app.server)
      .get('/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(401);
    expect(meRes.body).toHaveProperty('error', 'Not authenticated');
  });
});