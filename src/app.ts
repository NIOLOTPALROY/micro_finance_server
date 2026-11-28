import "dotenv/config";
import fastify from "fastify";
import fastifySession from "@fastify/session";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { registerAuthModule } from "./modules/auth";
import { registerHealthModule } from "./modules/health";
import { registerEmployeeManagementModule } from "./modules/employee-management";
import { registerBranchManagementModule } from "./modules/branch-management/index.js";
import { registerMemberManagementModule } from "./modules/member-management";
import { registerMemberAssessmentModule } from "./modules/member-assessment";
import { registerSwagger } from "./shared/plugins/swagger";

// Extend Fastify session with custom properties
declare module "@fastify/session" {
  interface FastifySessionObject {
    userId?: string;
    email?: string;
    name?: string;
    role?: string;
  }
}

export async function buildApp() {
  const app = fastify({
    logger: true,
    trustProxy: true,
    requestTimeout: 10_000,
    keepAliveTimeout: 5_000,
  });

  // Register CORS plugin
  await app.register(fastifyCors, {
    origin: true, // Allow all origins in development; specify frontend URL in production
    credentials: true, // Crucial for session cookies to be sent cross-origin
  });

  // Register cookie plugin (required for session)
  await app.register(fastifyCookie);

  // Register session plugin with encrypted cookie storage
  // Session data is stored in the cookie (signed/encrypted by Fastify)
  // No external session store needed - scales well for most use cases
  await app.register(fastifySession, {
    secret:
      process.env.SESSION_SECRET ??
      "change-me-in-production-secret-key-min-32-chars",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
      sameSite: "none",
    },
    saveUninitialized: false,
  });

  // Register Swagger (OpenAPI docs)
  await registerSwagger(app);

  await app.register(
    async (api) => {
      await registerAuthModule(api);
      await registerHealthModule(api);
      await registerMemberManagementModule(api);
      await registerMemberAssessmentModule(api);
      await registerEmployeeManagementModule(api);
      await registerBranchManagementModule(api);
    },
    { prefix: "/api" },
  );

  return app;
}
