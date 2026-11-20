import type { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Micro Finance API",
        description:
          "Microfinance backend for authentication and member registration. Member registration requests use a flat payload whose fields are organized and stored by section.",
        version: "1.0.0",
      },
      tags: [
        {
          name: "Branch management",
          description:
            "Admin-managed branch records and default branch configuration.",
        },
        {
          name: "Employee management",
          description:
            "Admin-managed employee accounts and individual permission assignments.",
        },
        {
          name: "Member management",
          description:
            "Member registration and private member file operations.",
        },
      ],
      servers: [
        {
          url: `http://localhost:${process.env.PORT ?? 3000}`,
          description: "Development server",
        },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });
}
