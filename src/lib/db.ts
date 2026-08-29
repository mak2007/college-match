import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  let sourceDbPath = path.join(process.cwd(), "dev.db");
  if (!fs.existsSync(sourceDbPath)) {
    sourceDbPath = path.resolve("./dev.db");
  }

  let targetDbPath = sourceDbPath;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production") {
    const tmpDbPath = path.join(process.platform === "win32" ? process.cwd() : "/tmp", "dev.db");
    if (tmpDbPath !== sourceDbPath) {
      try {
        if (fs.existsSync(sourceDbPath) && !fs.existsSync(tmpDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
        }
        if (fs.existsSync(tmpDbPath)) {
          targetDbPath = tmpDbPath;
        }
      } catch (e) {
        console.warn("Could not copy dev.db to /tmp:", e);
      }
    }
  }

  return `file:${targetDbPath}`;
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
