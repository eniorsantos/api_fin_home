import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { ZodError } from "zod";
import {
  BrapiAuthError,
  BrapiError,
  BrapiNotFoundError,
  BrapiPlanError,
  BrapiRateLimitError,
} from "./brapi/errors.js";
import { api } from "./routes/api.js";
import { authPlugin } from "./auth.js";
import { registerHealthRoutes } from "./observability/health.js";
import { registerRequestLogging } from "./observability/logging.js";
import { getMetrics, getMetricsContentType } from "./observability/metrics.js";
import { getRedis } from "./observability/redis.js";

// BigInt -> string em respostas JSON
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

/** Monta a aplicação sem escutar (reaproveitada pelos testes de integração). */
export async function buildApp() {
  const app = Fastify({ logger: { redact: ["req.headers.authorization"] } });

  // Rate limiting (disabled in test environment)
  if (process.env.NODE_ENV !== "test") {
    await app.register(rateLimit, {
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      keyGenerator: (req) => req.ip,
      skipOnError: true,
    });
  }

  await app.register(cors, { origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" });
  // CSV de importação de preços chega como texto (Content-Type: text/csv).
  app.addContentTypeParser("text/csv", { parseAs: "string" }, (_req, body, done) => done(null, body));

  // Request logging
  registerRequestLogging(app);

  // Health checks
  registerHealthRoutes(app);

  // Metrics endpoint
  app.get("/metrics", async (_req, rep) => {
    rep.header("Content-Type", getMetricsContentType());
    return getMetrics();
  });

  app.setErrorHandler((err: unknown, _req, rep) => {
    const e = err as { code?: string; message?: string; statusCode?: number; issues?: unknown };
    if (e.code === "AUTH_REQUIRED")
      return rep.code(401).send({ error: "auth_required", message: e.message ?? "Não autenticado" });
    if (e instanceof ZodError)
      return rep.code(400).send({ error: "validation", message: "Dados inválidos", issues: e.issues });
    if (err instanceof BrapiRateLimitError)
      return rep
        .code(429)
        .header("Retry-After", String(err.retryAfterSeconds ?? 30))
        .send({ error: "brapi_rate_limited", message: "Limite de requisições da brapi atingido" });
    if (err instanceof BrapiAuthError)
      return rep
        .code(502)
        .send({ error: "brapi_auth", message: "BRAPI_TOKEN ausente ou inválido no servidor" });
    if (err instanceof BrapiPlanError)
      return rep.code(502).send({ error: "brapi_plan", message: err.message });
    if (err instanceof BrapiNotFoundError)
      return rep.code(404).send({ error: "brapi_not_found", message: err.message });
    if (err instanceof BrapiError) return rep.code(502).send({ error: "brapi", message: err.message });
    const prismaCode = (err as { code?: string }).code;
    if (prismaCode === "P2025")
      return rep.code(404).send({ error: "not_found", message: "Registro não encontrado" });
    if (prismaCode === "P2002")
      return rep
        .code(409)
        .send({ error: "conflict", message: "Já existe registro com esses dados (violação de unicidade)" });
    if (prismaCode === "P2003")
      return rep
        .code(409)
        .send({ error: "conflict", message: "Registro em uso por outros dados (restrição de integridade)" });
    app.log.error(err);
    return rep.code(500).send({ error: "internal", message: "Erro interno" });
  });

  // OpenAPI: lista paths/métodos automaticamente (schemas detalhados ainda não anotados).
  await app.register(swagger, {
    openapi: {
      info: { title: "Painel Financeiro — API interna", version: "1.0.0" },
      servers: [{ url: "http://localhost:3333" }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/api/docs" });

  // Initialize Redis (non-blocking)
  getRedis().catch((err) => {
    console.error("Failed to initialize Redis:", err);
  });

  await app.register(authPlugin);
  await app.register(api, { prefix: "/api" });
  return app;
}
