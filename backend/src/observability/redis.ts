import type { RedisOptions } from "ioredis";

type RedisClient = {
  on(event: string, listener: (...args: unknown[]) => void): RedisClient;
  connect(): Promise<RedisClient>;
  quit(): void;
  ping(): Promise<string>;
  [key: string]: unknown;
};

let redis: RedisClient | null = null;

async function getRedisModule(): Promise<{ new (url: string, options?: RedisOptions): RedisClient }> {
  const module = await import("ioredis");
  const RedisClass = module.default || module;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return RedisClass as any;
}

export async function getRedis(): Promise<RedisClient | null> {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL não configurado, Redis desabilitado");
    return null;
  }

  try {
    const RedisClass = await getRedisModule();
    const options: RedisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 3000)),
      lazyConnect: true,
    };
    const client = new RedisClass(url, options);
    redis = client;

    redis.on("error", (err: unknown) => {
      console.error("Redis connection error:", err instanceof Error ? err.message : String(err));
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });

    redis.connect().catch((err: Error) => {
      console.error("Failed to connect to Redis:", err.message);
      redis = null;
    });

    return redis;
  } catch (err) {
    console.error("Failed to initialize Redis:", err);
    return null;
  }
}

export function closeRedis() {
  if (redis) {
    redis.quit();
    redis = null;
  }
}

export async function healthCheckRedis(): Promise<{ status: "ok" | "error"; latencyMs?: number; error?: string }> {
  const client = await getRedis();
  if (!client) return { status: "error", error: "Redis not configured" };

  try {
    const start = Date.now();
    await client.ping();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}