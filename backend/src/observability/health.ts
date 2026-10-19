import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { healthCheckRedis } from "./redis.js";

export interface HealthCheckResult {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: { status: "ok" | "error"; latencyMs?: number; error?: string };
    redis: { status: "ok" | "error"; latencyMs?: number; error?: string };
    memory: { status: "ok" | "warning"; heapUsedMb: number; heapTotalMb: number; rssMb: number };
  };
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const dbCheck = await checkDatabase();
  const redisCheck = await healthCheckRedis();
  const memoryCheck = checkMemory();

  const overallStatus = determineOverallStatus(dbCheck.status, redisCheck.status, memoryCheck.status);

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: dbCheck,
      redis: redisCheck,
      memory: memoryCheck,
    },
  };
}

async function checkDatabase(): Promise<{ status: "ok" | "error"; latencyMs?: number; error?: string }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

function checkMemory(): { status: "ok" | "warning"; heapUsedMb: number; heapTotalMb: number; rssMb: number } {
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMb = Math.round(mem.rss / 1024 / 1024);

  const status = heapUsedMb > 500 ? "warning" : "ok";

  return { status, heapUsedMb, heapTotalMb, rssMb };
}

function determineOverallStatus(
  db: "ok" | "error",
  redis: "ok" | "error",
  memory: "ok" | "warning"
): "ok" | "degraded" | "down" {
  if (db === "error") return "down";
  if (redis === "error" || memory === "warning") return "degraded";
  return "ok";
}

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const result = await performHealthCheck();
    return result;
  });

  app.get("/health/live", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/health/ready", async (_req, rep) => {
    const result = await performHealthCheck();
    if (result.status === "down") {
      return rep.code(503).send({ status: "not ready", timestamp: result.timestamp, uptimeSeconds: result.uptimeSeconds, checks: result.checks });
    }
    return { status: "ready", timestamp: result.timestamp, uptimeSeconds: result.uptimeSeconds, checks: result.checks };
  });
}