import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { getRedis } from "../observability/redis.js";
import { syncQuotes, syncHistory, syncDividends, syncMacro, syncIndicators, syncFunds, syncTreasury, syncFundIndicators } from "../services/sync.js";
import { prisma } from "../db.js";

type RedisClient = Awaited<ReturnType<typeof getRedis>>;

let redisPromise: Promise<RedisClient | null> | null = null;

async function getRedisInstance(): Promise<RedisClient | null> {
  if (!redisPromise) {
    redisPromise = getRedis();
  }
  return redisPromise;
}

export interface SyncJobData {
  userId: string;
  operation: "quotes" | "history" | "dividends" | "macro" | "indicators" | "funds" | "treasury" | "fundIndicators";
  symbols?: string[];
  slugs?: string[];
  range?: string;
  interval?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const syncQueueName = "sync-jobs";

let syncQueue: Queue<SyncJobData> | null = null;
let syncQueueEvents: QueueEvents | null = null;

export async function getSyncQueue(): Promise<Queue<SyncJobData> | null> {
  if (syncQueue) return syncQueue;
  const redis = await getRedisInstance();
  if (!redis) return null;
  syncQueue = new Queue<SyncJobData>(syncQueueName, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
  return syncQueue;
}

export async function getSyncQueueEvents(): Promise<QueueEvents | null> {
  if (syncQueueEvents) return syncQueueEvents;
  const redis = await getRedisInstance();
  if (!redis) return null;
  syncQueueEvents = new QueueEvents(syncQueueName, { connection: redis });
  return syncQueueEvents;
}

async function processSyncJob(job: Job<SyncJobData>) {
  const { userId, operation, symbols, slugs, range, interval, startDate, endDate, limit } = job.data;

  try {
    let result: unknown;

    switch (operation) {
      case "quotes": {
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, ...(symbols ? { symbol: { in: symbols } } : {}) },
        });
        result = await syncQuotes(assets.map((a) => a.symbol));
        break;
      }
      case "history": {
        if (!symbols?.length) throw new Error("symbols required for history sync");
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, symbol: { in: symbols } },
        });
        result = await syncHistory(assets.map((a) => a.symbol), { range: range ?? "1y", interval: interval ?? "1d" });
        break;
      }
      case "dividends": {
        if (!symbols?.length) throw new Error("symbols required for dividends sync");
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, symbol: { in: symbols } },
        });
        const divParams: { startDate?: string; endDate?: string } = {};
        if (startDate) divParams.startDate = startDate;
        if (endDate) divParams.endDate = endDate;
        result = await syncDividends(assets.map((a) => a.symbol), divParams, userId);
        break;
      }
      case "macro": {
        if (!slugs?.length) throw new Error("slugs required for macro sync");
        const macroParams: { startDate?: string; endDate?: string; limit?: number } = {};
        if (startDate) macroParams.startDate = startDate;
        if (endDate) macroParams.endDate = endDate;
        if (limit !== undefined) macroParams.limit = limit;
        result = await syncMacro(slugs, macroParams);
        break;
      }
      case "indicators": {
        if (!symbols?.length) throw new Error("symbols required for indicators sync");
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, assetClass: "FII", symbol: { in: symbols } },
        });
        const indParams: { startDate?: string; endDate?: string } = {};
        if (startDate) indParams.startDate = startDate;
        if (endDate) indParams.endDate = endDate;
        result = await syncIndicators(assets.map((a) => a.symbol), indParams);
        break;
      }
      case "funds": {
        if (!symbols?.length) throw new Error("symbols required for funds sync");
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, assetClass: "FUND", symbol: { in: symbols } },
        });
        const fundParams: { startDate?: string; endDate?: string } = {};
        if (startDate) fundParams.startDate = startDate;
        if (endDate) fundParams.endDate = endDate;
        result = {
          nav: await syncFunds(assets.map((a) => a.symbol), fundParams),
          indicators: await syncFundIndicators(assets.map((a) => a.symbol)),
        };
        break;
      }
      case "treasury": {
        if (!symbols?.length) throw new Error("symbols required for treasury sync");
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, assetClass: "TREASURY", symbol: { in: symbols } },
        });
        const treasuryParams: { startDate?: string; endDate?: string } = {};
        if (startDate) treasuryParams.startDate = startDate;
        if (endDate) treasuryParams.endDate = endDate;
        result = await syncTreasury(assets.map((a) => a.symbol.toLowerCase()), treasuryParams);
        break;
      }
      case "fundIndicators": {
        if (!symbols?.length) throw new Error("symbols required for fundIndicators sync");
        const assets = await prisma.asset.findMany({
          where: { userId, source: "BRAPI", active: true, assetClass: "FUND", symbol: { in: symbols } },
        });
        result = await syncFundIndicators(assets.map((a) => a.symbol));
        break;
      }
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    await prisma.syncLog.create({
      data: {
        userId,
        operation: `queue_${operation}`,
        symbols: symbols || slugs || [],
        status: "ok",
        httpStatus: 200,
        message: JSON.stringify(result),
      },
    });

    return result;
  } catch (err) {
    const error = err as Error;
    await prisma.syncLog.create({
      data: {
        userId,
        operation: `queue_${operation}`,
        symbols: symbols || slugs || [],
        status: "error",
        httpStatus: 500,
        message: error.message,
      },
    });
    throw error;
  }
}

export async function createSyncWorker(): Promise<Worker<SyncJobData> | null> {
  const redis = await getRedisInstance();
  if (!redis) return null;

  const worker = new Worker<SyncJobData>(syncQueueName, processSyncJob, {
    connection: redis,
    concurrency: 2,
    limiter: { max: 10, duration: 60_000 },
  });

  worker.on("completed", (job) => {
    console.log(`Sync job ${job.id} completed: ${job.data.operation}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Sync job ${job?.id} failed:`, err);
  });

  return worker;
}

export async function addSyncJob(data: SyncJobData): Promise<string | null> {
  const queue = await getSyncQueue();
  if (!queue) return null;

  const job = await queue.add(data.operation, data);
  return job.id ?? null;
}

export async function getSyncJobStatus(jobId: string): Promise<{ status: string; progress: number; result?: unknown; error?: string } | null> {
  const queue = await getSyncQueue();
  if (!queue) return null;

  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    status: state,
    progress: typeof progress === "number" ? progress : 0,
    result: job.returnvalue,
    error: job.failedReason,
  };
}