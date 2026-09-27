import { createApp } from "./app";
import { env } from "./env";
import { logger } from "./logger";
import { prisma } from "./prisma";
import { redisConnection } from "./redis";
import { ensureEmailIndex } from "./search/indexing";

async function main() {
  // Best-effort: if Elasticsearch is unavailable at boot, the API still
  // starts (search will error until ES comes back; scheduling/sending are
  // unaffected since they never depend on ES).
  ensureEmailIndex().catch((err) => logger.warn({ err }, "Elasticsearch index init failed at boot"));

  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, "API listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down API");
    server.close();
    await Promise.allSettled([prisma.$disconnect(), redisConnection.quit()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during API startup");
  process.exit(1);
});
