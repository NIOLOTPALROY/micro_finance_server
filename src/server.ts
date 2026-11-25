import "dotenv/config";
import { buildApp } from "./app";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    // eslint-disable-next-line no-console
    console.log(`🚀 Micro Finance API listening on http://${HOST}:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`📚 Swagger UI available at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

void start();
