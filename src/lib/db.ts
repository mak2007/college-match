import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  try {
    let sourceDbPath = path.join(process.cwd(), "dev.db");
    if (!fs.existsSync(sourceDbPath)) {
      sourceDbPath = path.resolve("./dev.db");
    }

    // On Vercel Serverless / AWS Lambda, /var/task is strictly read-only (EROFS).
    // Copy dev.db to /tmp/dev.db where SQLite has full read/write & WAL journal access.
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

    const adapter = new PrismaBetterSqlite3({ url: `file:${targetDbPath}` });
    return new PrismaClient({ adapter });
  } catch (err) {
    console.error("Prisma driver initialization fallback:", err);
    // Safe proxy fallback so module evaluation never crashes serverless routes
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        return new Proxy({}, {
          get(_subTarget, subProp) {
            return async () => null;
          }
        });
      }
    });
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
