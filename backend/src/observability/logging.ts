import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const startTimeSymbol = Symbol("startTime");

interface RequestWithStartTime {
  [startTimeSymbol]?: number;
  user?: { id: string; email: string };
}

export function registerRequestLogging(app: FastifyInstance) {
  app.addHook("onRequest", async (request: FastifyRequest) => {
    (request as RequestWithStartTime)[startTimeSymbol] = Date.now();
    request.log.info({
      type: "request_start",
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
  });

  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as RequestWithStartTime;
    const startTime = req[startTimeSymbol] ?? Date.now();
    const duration = Date.now() - startTime;
    const logLevel = reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info";

    request.log[logLevel]({
      type: "request_complete",
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
      userId: (request as RequestWithStartTime).user?.id,
    });
  });

  app.addHook("onError", async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const req = request as RequestWithStartTime;
    const startTime = req[startTimeSymbol] ?? Date.now();
    const duration = Date.now() - startTime;
    request.log.error({
      type: "request_error",
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
      error: error.message,
      stack: error.stack,
      userId: (request as RequestWithStartTime).user?.id,
    });
  });
}

export function createChildLogger(app: FastifyInstance, context: Record<string, unknown>) {
  return app.log.child(context);
}