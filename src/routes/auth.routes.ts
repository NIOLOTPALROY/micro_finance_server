import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { UserModel } from '../models';
import { createHash } from 'crypto';

interface LoginBody {
    email: string;
    password: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    // Login admin user
    typedApp.post<{ Body: LoginBody }>(
        '/auth/login',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 1 },
                    },
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    email: { type: 'string' },
                                    name: { type: 'string' },
                                    role: { type: 'string' },
                                },
                            },
                        },
                    },
                    401: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
        },
        async (req, reply) => {
            const { email, password } = req.body;

            // Find user by email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return reply.status(401).send({ error: 'Invalid email or password' });
            }

            // Verify password
            const passwordHash = createHash('sha256').update(password).digest('hex');
            if (passwordHash !== user.password_hash) {
                return reply.status(401).send({ error: 'Invalid email or password' });
            }

            // Set session
            req.session.userId = user.id;
            req.session.email = user.email;
            req.session.name = user.name;
            req.session.role = user.role;

            req.log.info({ session: req.session }, 'Session data after login');

            return reply.send({
                message: 'Logged in successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            });
        }
    );

    // Get current user (requires session)
    app.get('/auth/me', async (req, reply) => {
        req.log.info({ session: req.session }, 'Session data in /me route');
        if (!req.session.userId) {
            return reply.status(401).send({ error: 'Not authenticated' });
        }

        return reply.send({
            user: {
                id: req.session.userId,
                email: req.session.email,
                name: req.session.name,
                role: req.session.role,
            },
        });
    });

    // Logout user
    app.post('/auth/logout', async (req, reply) => {
        // Clear session data
        req.session.userId = undefined;
        req.session.email = undefined;
        req.session.name = undefined;
        req.session.role = undefined;

        return reply.send({ message: 'Logged out successfully' });
    });
}