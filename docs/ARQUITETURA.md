# Arquitetura

## Objetivo

Painel web para analisar e comparar ativos brasileiros (ações, FIIs, fundos, Tesouro Direto) pela oscilação em um período, com dashboard interativo, histórico, relatórios, entrada manual de dados e sincronização automática via API brapi. Tudo persistido em banco, com CRUD.

Inclui: scorecard fundamentalista, relatórios avançados (evolução patrimonial, proventos, rentabilidade por classe), gráficos avançados (candle/OHLC, volume, histograma, drawdown), observabilidade (health, métricas, logging), fila assíncrona (BullMQ/Redis), testes E2E (Playwright), backup automatizado.

## Stack

| Camada | Tecnologia | Motivo |
|--------|------------|--------|
| Front-end | React 18, Vite, TanStack Query, Recharts, react-router-dom | SPA interativa, cache/refetch declarativo, gráficos |
| Validação | Zod (back e front) | Tipos inferidos do schema; valida entradas e respostas externas em runtime |
| Back-end | Node 22, Fastify 5, TypeScript estrito, @fastify/jwt, bcryptjs, @fastify/rate-limit | Rápido, tipado, simples de testar, autenticação JWT, rate limiting |
| Banco | PostgreSQL 16 + Prisma 6 | Tipos gerados do schema; `Decimal` para dinheiro |
| Cache/Fila | Redis 7 + ioredis + BullMQ | Cache distribuído, filas assíncronas, rate limiting distribuído |
| Integração | Cliente próprio da brapi (`backend/src/brapi`) | Retry de 429, erros tipados, tolerância a `null` |
| Métricas | Prometheus client (`prom-client`) | Métricas padrão + custom (HTTP, brapi, sync, DB, cache) |
| Testes | Vitest (back + front), Playwright (E2E) | Unit/integração + E2E multi-browser |
| Infra local | Docker Compose (Postgres + Redis + backend + frontend + backup) | Stack completo com um comando |
| CI/CD | GitHub Actions (lint, typecheck, testes backend+frontend+E2E, build) | Validação contínua |

TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

## Diagrama

```mermaid
flowchart LR
  U[Navegador<br/>React + Recharts] -->|/api (proxy Vite / nginx)| B[Fastify API + JWT + Rate Limit]
  B --> S[Services<br/>sync · analytics · portfolio · reports · fundamental · queue]
  S --> P[(PostgreSQL<br/>via Prisma)]
  S --> R[(Redis<br/>Cache + BullMQ)]
  S --> C[BrapiClient]
  C -->|Authorization: Bearer BRAPI_TOKEN| X[brapi.dev /api/v2]
  U -->|Authorization: Bearer JWT| B
  B --> M[Observability<br/>Health / Metrics / Logging]
  Bk[Backup Container] -->|pg_dump| P
```

## Camadas do back-end (`backend/src`)

- `server.ts` — bootstrap Fastify, rate limit, CORS, scheduler de sync, worker BullMQ, escuta em `PORT`, graceful shutdown.
- `app.ts` — montagem (`buildApp()`), plugin auth JWT, request logging, health checks, métricas Prometheus, Redis init, error handler global, rotas `/api`, Swagger UI.
- `auth.ts` — plugin JWT (`@fastify/jwt`), `requireAuth()`, `hashPassword/comparePassword` (bcryptjs custo 10), `signToken()` (exp 7 dias).
- `routes/api.ts` — rotas REST (CRUD + sync síncrono/assíncrono + analytics + relatórios + scorecard + auth), validação Zod, dados filtrados por `userId`.
- `services/sync.ts` — orquestra brapi → banco (cotações, histórico, dividendos, indicadores FII, snapshot fundos, macro, Tesouro), grava `SyncLog`.
- `services/analytics.ts` — funções puras: retorno (adjustedClose), volatilidade (σ·√252), drawdown, base 100, ranking, Sharpe, beta, correlação (Pearson).
- `services/portfolio.ts` — posição por preço médio ponderado (vendas consomem média), P&L não realizado, alocação % (só posições com preço).
- `services/reports.ts` — relatórios extras: equity evolution (evolução diária patrimônio), dividends (proventos agregados por ativo, yield on cost), class-returns (rentabilidade por assetClass com detalhe por ativo).
- `services/fundamental.ts` — scorecard fundamentalista: 5 categorias ponderadas (Valuation 25%, Rentabilidade 25%, Crescimento 20%, Saúde Financeira 20%, Dividendos 10%), benchmarks por métrica, score 0-100, recomendação.
- `services/csv.ts` — importação CSV de preços (parser próprio, EN/PT, ISO/DD-MM-AAAA, validação Zod).
- `services/scheduler.ts` — `startScheduler()` com guarda anti-sobreposição, `unref()`, primeira rodada imediata.
- `brapi/` — `client.ts` (retry 429, cache TTL por operação, erros tipados), `schemas.ts` (Zod null-safe), `errors.ts` (hierarquia).
- `observability/redis.ts` — singleton `ioredis`, lazy connect, health check.
- `observability/metrics.ts` — Prometheus registry, contadores, histogramas, gauges custom.
- `observability/health.ts` — health checks (DB, Redis, memória), rotas `/health`, `/health/live`, `/health/ready`.
- `observability/logging.ts` — hooks `onRequest`/`onResponse`/`onError`, log estruturado com duração/status/userId.
- `queue/index.ts` — BullMQ queue + worker (concorrência 2, limiter 10/min, retry exponencial), processa sync jobs.
- `db.ts` — instância única do `PrismaClient`.
- `scripts/smoke.ts` — teste manual contra a brapi real.

## Decisões

1. **Token da brapi só no servidor.** Front nunca chama a brapi; proxy expõe só `/api`.
2. **JWT para autenticação.** Login/registro em `/auth/*`; token em `Authorization: Bearer <jwt>`; dados filtrados por `userId`.
3. **Zod nas respostas da brapi.** Campos numéricos/texto aceitam `null` e são normalizados para `null`.
4. **Dados persistidos antes de exibir.** Dashboard lê do banco, não da brapi; poupa quota e permite histórico próprio.
4. **`adjustedClose` para retorno.** Considera proventos, desdobramentos, grupamentos.
5. **`Decimal` no banco**, `number` nos cálculos (aceitável para métricas; não contabilidade).
6. **Fonte por ativo** (`MANUAL`/`BRAPI`) e por barra, permitindo conviver dado manual e automático.
7. **Sync assíncrono via fila** para operações longas — não bloqueia HTTP; status via polling.
8. **Observabilidade nativa** — health checks k8s, métricas Prometheus Grafana, logging JSON, rate limiting.
9. **Backup automatizado** — container dedicado `pg_dump` diário, retention configurável, volume persistido.

## Relatórios

- `GET /reports/performance` — `format=json|csv|pdf|xlsx`; CSV/XLSX (`exceljs`), PDF (`pdfkit`); benchmark, risk-free, beta, retorno real (IPCA).
- `GET /reports/equity-evolution` — evolução patrimonial da carteira (valor total, investido, P&L diário).
- `GET /reports/dividends` — proventos agregados por ativo (total, contagem, por tipo, yield on cost).
- `GET /reports/class-returns` — rentabilidade por classe (STOCK/FII/FUND/TREASURY/OTHER) com detalhe por ativo.
- Todos relatórios extras suportam `format=json|csv|pdf|xlsx`.
- Gráfico de drawdown no Dashboard (running máximo da base 100).
- Gráficos avançados (`/graficos`): Candle/OHLC + Volume, Histograma de retornos, Drawdown área.

## Scorecard Fundamentalista

- `GET /fundamental/scorecard?symbols=A,B` — usa métricas do `stocks/screener` da brapi.
- 5 categorias ponderadas: Valuation (25%), Rentabilidade (25%), Crescimento (20%), Saúde Financeira (20%), Dividendos (10%).
- Score 0-100 por categoria + overall; recomendação: STRONG_BUY (≥80) | BUY (≥65) | HOLD (≥45) | SELL (≥30) | STRONG_SELL (<30) | INSUFFICIENT_DATA.
- Frontend (`/scorecard`): cards visuais, badges coloridos, detalhes expansíveis por métrica.