import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createHash } from "crypto";
import { AuthUserRepository } from "./auth.repository";
import type { LoginBody } from "./auth.types";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post<{ Body: LoginBody }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  name: { type: "string" },
                  role: { type: "string" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await AuthUserRepository.findByEmail(email);

      if (!user) {
        return reply
          .status(401)
          .send({ error: "Invalid email or password" });
      }

      const passwordHash = createHash("sha256")
        .update(password)
        .digest("hex");

      if (passwordHash !== user.password_hash) {
        return reply
          .status(401)
          .send({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.name = user.name;
      req.session.role = user.role;

      return reply.send({
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }
  );

  app.get("/auth/me", async (req, reply) => {
    if (!req.session.userId) {
      return reply.status(401).send({ error: "Not authenticated" });
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

  app.post("/auth/logout", async (req, reply) => {
    req.session.destroy((error) => {
      if (error) {
        req.log.error(error, "Failed to destroy session");
      }
    });

    return reply.send({ message: "Logged out successfully" });
  });
}
