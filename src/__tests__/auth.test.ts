import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createHash } from 'crypto';
import { getTestApp } from '../utils/test/setup';
import { seedDatabase } from '../utils/test/db';
import { AuthUserRepository } from '../modules/auth/auth.repository';

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

  it('should allow an admin to log in', async () => {
    const adminUsers = [
      { email: 'admin1@example.com', password: 'password123' },
      { email: 'admin2@example.com', password: 'password123' },
      { email: 'admin3@example.com', password: 'password123' },
      { email: 'admin4@example.com', password: 'password123' },
    ];

    for (const admin of adminUsers) {
      const res = await request(app.server).post('/api/auth/login').send(admin);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logged in successfully');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', admin.email);
      expect(res.body.user).toHaveProperty('role', 'admin');
    }
  });

  it('should prevent login with invalid credentials', async () => {
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({
        email: 'admin1@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('should prevent login for non-existent user', async () => {
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('should prevent an inactive member from logging in', async () => {
    const email = 'inactive-member@example.com';
    const findByEmail = vi
      .spyOn(AuthUserRepository, 'findByEmail')
      .mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000003',
        email,
        name: 'Inactive Member',
        password_hash: createHash('sha256').update('password123').digest('hex'),
        role: 'member',
        member_status: 'inactive',
        created_at: new Date(),
        updated_at: new Date(),
      });

    try {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

      expect(findByEmail).toHaveBeenCalledWith(email);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid email or password');
    } finally {
      findByEmail.mockRestore();
    }
  });

  it('should return current permissions for an active employee', async () => {
    const email = 'employee@example.com';
    const user = {
      id: '00000000-0000-4000-8000-000000000003',
      email,
      name: 'Employee User',
      password_hash: createHash('sha256').update('password123').digest('hex'),
      role: 'employee' as const,
      employee_status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const findByEmail = vi
      .spyOn(AuthUserRepository, 'findByEmail')
      .mockResolvedValue(user);
    const findById = vi
      .spyOn(AuthUserRepository, 'findById')
      .mockResolvedValue(user);
    const findPermissions = vi
      .spyOn(AuthUserRepository, 'findEmployeePermissions')
      .mockResolvedValue(['members.read', 'members.update']);

    try {
      const login = await request(app.server)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

      expect(login.status).toBe(200);
      expect(login.body.user.permissions).toEqual([
        'members.read',
        'members.update',
      ]);

      const me = await request(app.server)
        .get('/api/auth/me')
        .set('Cookie', getSessionCookie(login));
      expect(me.status).toBe(200);
      expect(me.body.user.permissions).toEqual([
        'members.read',
        'members.update',
      ]);
      expect(findPermissions).toHaveBeenCalledTimes(2);
    } finally {
      findByEmail.mockRestore();
      findById.mockRestore();
      findPermissions.mockRestore();
    }
  });

  it('should get current authenticated user', async () => {
    const admin = { email: 'admin1@example.com', password: 'password123' };

    const loginRes = await request(app.server).post('/api/auth/login').send(admin);
    const cookie = getSessionCookie(loginRes);

    const meRes = await request(app.server)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty('user');
    expect(meRes.body.user).toHaveProperty('email', admin.email);
    expect(meRes.body.user).toHaveProperty('role', 'admin');
  });

  it('should logout an authenticated user', async () => {
    const admin = { email: 'admin1@example.com', password: 'password123' };

    const loginRes = await request(app.server).post('/api/auth/login').send(admin);
    const cookie = getSessionCookie(loginRes);

    const logoutRes = await request(app.server).post('/api/auth/logout').set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toHaveProperty('message', 'Logged out successfully');

    const meRes = await request(app.server)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(401);
    expect(meRes.body).toHaveProperty('error', 'Not authenticated');
  });
});