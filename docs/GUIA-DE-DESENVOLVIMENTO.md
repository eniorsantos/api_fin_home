# Guia de desenvolvimento

## Requisitos

Node 22+, Docker, conta brapi (https://brapi.dev/login) com token em https://brapi.dev/dashboard.

## Setup

```bash
docker compose up -d
cd backend
cp .env.example .env          # preencha BRAPI_TOKEN
npm i
npx prisma migrate dev        # cria tabelas e gera o client
npm run dev                   # API em :3333
cd ../frontend && npm i && npm run dev   # app em :5173
```

## Variáveis (`backend/.env`)

| Nome                   | Descrição                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Conexão Postgres                                                                    |
| `BRAPI_TOKEN`          | Token brapi (obrigatório para além dos 4 tickers livres)                            |
| `PORT`                 | Porta da API (3333)                                                                 |
| `WEB_ORIGIN`           | Origem permitida no CORS (padrão http://localhost:5173)                             |
| `JWT_SECRET`           | Segredo para assinar JWT (padrão `dev-secret-change-in-production`)                 |
| `SYNC_ENABLED`         | `1` liga o agendador de sync (`services/scheduler.ts`)                              |
| `SYNC_INTERVAL_MIN`    | Intervalo do agendador em minutos (padrão 60)                                       |
| `SYNC_HISTORY_RANGE`   | Janela do histórico no sync agendado (padrão `1mo`)                                 |
| `BRAPI_CACHE`          | `0` desliga o cache em memória das respostas brapi                                  |
| `REDIS_URL`            | Redis para cache/filas (padrão `redis://localhost:6379`; se ausente, desabilitado)  |
| `RATE_LIMIT_MAX`       | Max requests por janela (padrão 100)                                                |
| `RATE_LIMIT_WINDOW_MS` | Janela do rate limit em ms (padrão 60000)                                           |

## Scripts

Backend: `dev`, `build`, `typecheck`, `test`, `db:migrate`, `brapi:smoke`, `lint`, `format` · Frontend: `dev`, `build`, `typecheck`, `test`, `test:e2e`, `test:e2e:install`, `lint`, `format`.

Lint/format: eslint 9 (tseslint) + prettier (`.prettierrc` na raiz, `printWidth` 110). Swagger UI da API em `/api/docs` (esqueleto: paths/métodos, sem schemas detalhados).

## Testes

`cd backend && npm test` — 72 testes: 31 unitários (cliente brapi, analytics, risco, carteira, CSV, scheduler, sync, fundamental, reports, queue) e 41 de integração das rotas (CRUD, posição, paginação, erros, sync incl. dividendos/macro/indicadores/fundos/Tesouro/syncAll, screener, fundamentals, scorecard, OpenAPI, compare com benchmark/Sharpe/beta, correlação, performance real, relatórios extras, CSV/PDF/XLSX, sync queue).

Os testes de integração usam o banco `finance_test` (mesmo Postgres do compose, porta 5433; sobrescreva com `TEST_DATABASE_URL`). O `globalSetup` cria o banco e aplica `migrate deploy` automaticamente; cada teste limpa as tabelas em `beforeEach`. A brapi é simulada via `fetch` global com PETR4/VALE3 determinísticos (`src/test/setup.ts`).

Smoke contra a API real: `npm run brapi:smoke` (PETR4 e VALE3).

`cd frontend && npm test` — 3 testes de componentes (Dashboard, Relatórios, Avaliação) com Vitest + React Testing Library + jsdom.

`cd frontend && npm run test:e2e` — Testes E2E Playwright (Chromium/Firefox/WebKit): Dashboard, Ativos, Carteira, Relatórios, Scorecard, Gráficos Avançados, Relatórios Avançados, Navegação. Requer `npm run test:e2e:install` na primeira vez.

## Autenticação

A API exige JWT em todas as rotas exceto `/auth/*` e `/api/docs/*`.

- `POST /auth/register` — cria usuário (`email`, `password` ≥ 6 chars, `name?`).
- `POST /auth/login` — retorna `{token, user}`.
- `GET /auth/me` — retorna dados do usuário autenticado.
- O front armazena o token e envia em `Authorization: Bearer <token>`.
- Todos os dados são filtrados por `userId` (isolamento por usuário).

## Novas Funcionalidades

### Scorecard Fundamentalista
- `GET /fundamental/scorecard?symbols=PETR4,VALE3` — análise baseada em métricas do brapi screener.
- Frontend: `/scorecard` — cards com score overall (0-100), 5 categorias (Valuation, Rentabilidade, Crescimento, Saúde Financeira, Dividendos), recomendação (STRONG_BUY a STRONG_SELL), detalhes expansíveis por métrica.

### Relatórios Extras
- `/reports/equity-evolution?portfolioId=&from=&to=` — evolução patrimonial diária da carteira.
- `/reports/dividends?from=&to=` — proventos agregados por ativo (total, eventos, yield on cost).
- `/reports/class-returns?from=&to=` — rentabilidade por classe (STOCK/FII/FUND/TREASURY/OTHER) com detalhe por ativo.
- Todos suportam `format=json|csv|pdf|xlsx` (default: json).

### Gráficos Avançados (`/graficos`)
- Candle/OHLC + Volume (ComposedChart)
- Volume (barras coloridas por direção)
- Histograma de retornos (distribuição com média/mediana/stddev)
- Drawdown (running máximo da base 100)

### Sync Assíncrono (Fila BullMQ/Redis)
- `POST /sync/queue` — enfileira job: `{operation, symbols?, slugs?, range?, interval?, startDate?, endDate?, limit?}`
- `GET /sync/queue/:jobId` — status: `waiting|active|completed|failed`, progress, result, error
- Worker concorrência 2, limiter 10/min, retry exponencial (3 tentativas)
- Requer `REDIS_URL` configurado

### Observabilidade
- `GET /health` — health check completo (DB, Redis, memória)
- `GET /health/live` — liveness probe
- `GET /health/ready` — readiness probe (503 se down)
- `GET /metrics` — métricas Prometheus (`finance_*`)
- Rate limiting: `@fastify/rate-limit` (config via `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`)
- Logging estruturado: hooks `onRequest`/`onResponse`/`onError` com duração, status, userId

### Backup Automatizado
- Container `backup` (docker-compose): roda `pg_dump | gzip` diariamente via sleep loop
- Volume `backupdata` persistido; retention 7 dias (config `RETENTION_DAYS`)
- Scripts: `scripts/backup.sh` (bash), `scripts/backup.ps1` (PowerShell)
- Symlink `finance_latest.sql.gz` sempre aponta para o mais recente

## Convenções

- TypeScript estrito; sem `any` em código de domínio.
- Toda entrada HTTP passa por Zod; toda resposta externa também.
- Cálculos em funções puras (`services/analytics.ts`, `services/fundamental.ts`, `services/reports.ts`) com teste.
- Nunca ler `BRAPI_TOKEN` fora de `brapi/client.ts`.
- Nunca expor `JWT_SECRET` no front.
- Dinheiro persistido como `Decimal`; converter para `number` apenas para análise.
- SyncLog em toda operação de sincronização (síncrona ou assíncrona).

## Segurança

- `.env` está no `.gitignore`; use `.env.example` sem valores.
- Header `authorization` é redigido nos logs do Fastify.
- A API exige autenticação JWT; não exponha em rede aberta antes de revisar configs de produção.
- Rate limiting ativo por IP (padrão 100 req/min).
- Health checks expõem status interno; proteja em produção se necessário.

## Docker

```bash
docker compose up -d
```

Sobe Postgres (5433), Redis (6379), backend (3333), frontend (5173), backup (container dedicado). O front faz proxy `/api` para o backend via nginx.

Health checks: `db`, `redis`, `backend` têm healthchecks no compose; `depends_on` usa `condition: service_healthy`.

## Troubleshooting

| Sintoma                                               | Causa provável                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 502 `brapi_auth`                                      | `BRAPI_TOKEN` ausente/ inválido                                                                          |
| 502 `brapi_plan`                                      | Recurso/range fora do plano (veja https://brapi.dev/pricing)                                             |
| 429                                                   | Quota mensal ou concorrência; aguarde `Retry-After`                                                      |
| 401 `auth_required`                                   | JWT ausente/ inválido/ expirido (faça login em `/auth/login`)                                            |
| 409 `conflict`                                        | Símbolo já cadastrado (P2002) ou ativo em uso por transações (P2003)                                     |
| 502 `brapi_invalid_response`                          | Resposta da brapi fora do schema Zod (mudança de API ou HTML de erro)                                    |
| `PrismaClient` sem tipos                              | Rode `npx prisma generate`                                                                               |
| P1012 "linha inválida" em schema aparentemente válido | O parser atual do Prisma exige **blocos multilinha**; `model X { a Int }` em uma linha única é rejeitado |
| `Authentication failed` / recusa em `localhost:5432`  | Há outro Postgres na máquina; o compose deste projeto publica `5433:5432` (ver `DATABASE_URL` no `.env`) |
| Vitest/PostCSS não lê JSON (`Unexpected token ''`)   | Arquivo salvo com **BOM** (ex.: `Set-Content -Encoding utf8` do PowerShell 5.1); regrave sem BOM |
| Gráfico vazio                                         | Ativo sem `PriceBar` no período; rode `/sync/history` ou insira preços                                   |
| `Redis connection error`                              | `REDIS_URL` não configurado ou Redis indisponível; sync assíncrono desabilitado                          |
| Queue job fica em `waiting`                           | Worker BullMQ não iniciou (verifique logs do backend; requer `REDIS_URL`)                                |
| `/health/ready` retorna 503                           | DB ou Redis down, ou memória > 500MB                                                                    |