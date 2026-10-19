import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register, prefix: "finance_" });

export const httpRequestsTotal = new Counter({
  name: "finance_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "finance_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const brapiRequestsTotal = new Counter({
  name: "finance_brapi_requests_total",
  help: "Total number of brapi requests",
  labelNames: ["endpoint", "status"],
  registers: [register],
});

export const brapiRequestDuration = new Histogram({
  name: "finance_brapi_request_duration_seconds",
  help: "Brapi request duration in seconds",
  labelNames: ["endpoint"],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const syncJobsTotal = new Counter({
  name: "finance_sync_jobs_total",
  help: "Total number of sync jobs",
  labelNames: ["operation", "status"],
  registers: [register],
});

export const syncDuration = new Histogram({
  name: "finance_sync_duration_seconds",
  help: "Sync job duration in seconds",
  labelNames: ["operation"],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

export const activeUsers = new Gauge({
  name: "finance_active_users",
  help: "Number of active users",
  registers: [register],
});

export const portfolioValue = new Gauge({
  name: "finance_portfolio_value",
  help: "Total portfolio value",
  labelNames: ["user_id", "portfolio_id"],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: "finance_db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const cacheHits = new Counter({
  name: "finance_cache_hits_total",
  help: "Total number of cache hits",
  labelNames: ["cache_type"],
  registers: [register],
});

export const cacheMisses = new Counter({
  name: "finance_cache_misses_total",
  help: "Total number of cache misses",
  labelNames: ["cache_type"],
  registers: [register],
});

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getMetricsContentType(): string {
  return register.contentType;
}

export { register };