import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  // Register swagger first
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Micro Finance API',
        description: 'Stateful authentication backend with sessions',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT ?? 3000}`,
          description: 'Development server',
        },
      ],
    },
  });

  // Register swagger UI (depends on swagger)
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    url: '/documentation/json', // Explicitly point to the OpenAPI spec JSON
  });
}
