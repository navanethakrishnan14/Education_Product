import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function start() {
  try {
    await prisma.$connect();
    const server = app.listen(env.PORT, () => {
      console.log(`EduSphere Platform API listening on http://localhost:${env.PORT}`);
      console.log(`Health: http://localhost:${env.PORT}/health`);
      console.log(`API base: http://localhost:${env.PORT}/api/v1`);
    });
    const shutdown = async (signal: string) => {
      console.log(`${signal} received; shutting down gracefully.`);
      server.close(async () => { await prisma.$disconnect(); process.exit(0); });
    };
    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.error("Unable to start Platform API. Check DATABASE_URL and PostgreSQL availability.", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
void start();
