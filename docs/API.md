# API REST Interna

Base: `http://localhost:3333/api` (front usa `/api` via proxy). JSON. **Autenticação JWT** (ver seção Auth). `BigInt` serializado como string. Datas: ISO (`2026-01-31`).

## Auth

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| POST | `/auth/register` | `{email, password, name?}` | 201 `{id, email, name}` |
| POST | `/auth/login` | `{email, password}` | 200 `{token, user{id,email,name}}` |
| GET | `/auth/me` | (requer `Authorization: Bearer <token>`) | `{id, email, name}` |

Todas as demais rotas exigem header `Authorization: Bearer <token>` (exceto `/auth/*` e `/health*`). O usuário só acessa seus próprios dados (`userId`).

## Ativos

| Método | Rota | Query/Body | Descrição |
|--------|------|------------|-----------|
| GET | `/assets` | `?page&pageSize` | Lista ativos do usuário (paginação opt-in) |
| POST | `/assets` | `{symbol, name, assetClass, source?, currency?}` | Cria ativo (symbol normalizado maiúsculo) |
| GET | `/assets/:id` | — | Detalhe do ativo |
| PUT | `/assets/:id` | Parcial dos campos acima | Atualiza ativo |
| DELETE | `/assets/:id` | — | Remove ativo (409 se houver transações) |

`assetClass`: `STOCK` | `FII` | `FUND` | `TREASURY` | `OTHER`. `source`: `MANUAL` | `BRAPI` (padrão `MANUAL`).

## Paginação

`GET /assets`, `/portfolios`, `/transactions`, `/dividends` aceitam `?page=N&pageSize=M` (pageSize ≤ 100). Sem parâmetros devolvem array; com eles: `{data, page, pageSize, total}`.

## Preços

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/assets/:id/prices?from&to` | Série OHLCV ordenada por data |
| POST | `/assets/:id/prices` | 1 objeto ou array `{date, close, open?, high?, low?, adjustedClose?, volume?}` — upsert por data (fonte `MANUAL`), `adjustedClose` default = `close`, `volume` inteiro ≥ 0 |
| POST | `/assets/:id/prices/import` | CSV (`Content-Type: text/csv`): `date,close[,open,high,low,adjustedClose,volume]`, com/sem cabeçalho (EN/PT), datas ISO ou DD/MM/AAAA → 201 `{saved, errors[]}` (400 se nenhuma linha válida) |
| DELETE | `/prices/:id` | Remove barra de preço |
| GET | `/assets/:id/indicators?from&to` | Indicadores FII mensais (P/VP, DY, patrimônio, cotistas) |
| GET | `/assets/:id/fund-indicators` | Snapshot do fundo (preço, cota, ágio/deságio, DY mensal); 404 sem snapshot |

Não há PUT: reenviar POST para mesma data substitui a barra inteira (omitidos viram `null`).

## Screener / Fundamentals (brapi ao vivo, sem persistência)

| Rota | Parâmetros | Resposta |
|------|------------|----------|
| `GET /screener` | Filtros numéricos (`trailingPEMin/Max`, `priceToBookMin/Max`, `dividendYieldMin/Max`, `returnOnEquityMin`, `enterpriseToEbitdaMax`, `netMarginMin`, `search?`, `sortBy?`, `sortOrder?`, `page?`, `limit?` ≤ 100) | `{results[{symbol, name, sector, quote{lastPrice...}, metrics{P/L, P/VP, DY...}}]}` |
| `GET /fundamentals` | `symbols=A,B&mode=current|history?&period?&startDate?&endDate?` | `{results[{symbol, data}]}` (`data` opaco) |

## Scorecard Fundamentalista

| Rota | Parâmetros | Resposta |
|------|------------|----------|
| `GET /fundamental/scorecard` | `symbols=A,B,C` (mínimo 1) | `{results[{symbol, name, sector, overallScore, valuationScore, profitabilityScore, growthScore, financialHealthScore, dividendScore, details{valuation[], profitability[], growth[], financialHealth[], dividend[]}, recommendation}]}` |

- Score 0-100 por categoria e overall; `recommendation`: `STRONG_BUY` (≥80) | `BUY` (≥65) | `HOLD` (≥45) | `SELL` (≥30) | `STRONG_SELL` (<30) | `INSUFFICIENT_DATA`.
- Baseado em métricas do `stocks/screener` da brapi: P/L, P/VP, EV/EBITDA, PEG, EV/Revenue, Margem Líquida, ROE, ROA, Margem Bruta, EBITDA, Crescimento Receita/Lucro, 52-week change, D/E, Dívida Líquida/EBITDA, Current/Quick Ratio, DY, FCF.
- Cada métrica: score 0-100 vs benchmarks (bom/ruim), peso, interpretação (Bom/Regular/Ruim).

## Portfólios, Transações, Dividendos

CRUD completo (POST/GET/PUT/DELETE):

- `/portfolios` — `{name}`
- `GET /portfolios/:id/position` → `{positions[], totalInvested, totalMarketValue, totalPnl, totalPnlPct}`; cada posição: `quantity, avgPrice, invested, currentPrice, marketValue, pnl, pnlPct, allocationPct`. Preço atual = `close` mais recente (fonte preferencial); P&L não realizado; alocação pondera só posições com preço.
- `/transactions` — `{portfolioId, assetId, type: BUY|SELL, quantity, unitPrice, fees?, tradedAt, notes?}` (GET inclui `asset`)
- `/dividends` — `{assetId, kind?, amountPerUnit, exDate?, paymentDate}` (GET inclui `asset`); `kind`: `DIVIDEND` | `JCP` | `RENDIMENTO` | `AMORTIZACAO` | `OTHER`

## Sincronização (brapi) — Síncrona

| Rota | Body | Resposta |
|------|------|----------|
| `POST /sync/quotes` | `{symbols?: string[]}` (padrão: todos `BRAPI` ativos) | `{updated, missing[]}` |
| `POST /sync/history` | `{symbols: string[], range?="1y", interval?="1d"}` | `{rows}` |
| `POST /sync/dividends` | `{symbols: string[], startDate?, endDate?}` | `{rows, skipped}` |
| `POST /sync/macro` | `{slugs: string[] (≤20), startDate?, endDate?, limit?}` | `{rows, skipped}` |
| `POST /sync/indicators` | `{symbols: string[], startDate?, endDate?}` (só FIIs) | `{rows, skipped}` |
| `POST /sync/funds` | `{symbols: string[], startDate?, endDate?}` (só FUNDs) | `{nav: {rows, skipped}, indicators: {rows, skipped}}` (cota→`PriceBar`, snapshot→`FundIndicator`) |
| `POST /sync/treasury` | `{symbols: string[], startDate?, endDate?}` (só TREASURYs; slugs minúsculos) | `{rows, skipped}` (PU de venda→`close`) |
| `GET /treasury/list` | `?search&indexer?` | Catálogo ao vivo da brapi (sem persistência; para descobrir slugs) |

Só atua em ativos com `source = BRAPI` já cadastrados. Sem ativos BRAPI correspondentes, retorna zeros sem consumir quota.

`sync/dividends` importa `cashDividends` (`DIVIDENDO`→`DIVIDEND`, `JCP`→`JCP`, `RENDIMENTO`→`RENDIMENTO`, `AMORTIZAÇÃO`→`AMORTIZACAO`, demais→`OTHER`) com `source = BRAPI`, idempotente por (ativo, pagamento, tipo, valor). Sem `paymentDate`/valor válido = `skipped`; eventos em ações (desdobramento etc.) não importados.

## Sincronização Assíncrona (Fila BullMQ/Redis)

| Rota | Body | Resposta |
|------|------|----------|
| `POST /sync/queue` | `{operation: "quotes"\|"history"\|"dividends"\|"macro"\|"indicators"\|"funds"\|"treasury"\|"fundIndicators", symbols?: string[], slugs?: string[], range?, interval?, startDate?, endDate?, limit?}` | `{jobId, status: "queued"}` ou `{error: "queue_unavailable"}` se Redis não configurado |
| `GET /sync/queue/:jobId` | — | `{status: "waiting"\|"active"\|"completed"\|"failed", progress: number, result?: any, error?: string}` |

- Worker: concorrência 2, rate limiter 10/min, retry exponencial (3 tentativas, delay 5s).
- Requer `REDIS_URL` configurado; se ausente, retorna `queue_unavailable`.

## Análises e Relatórios de Performance

| Rota | Parâmetros | Resposta |
|------|------------|----------|
| `GET /analytics/compare` | `symbols=A,B&from&to&source?&benchmark=CDI\|SELIC\|IPCA?&riskFree=N\|CDI\|SELIC?&betaVs=CDI\|SELIC\|IPCA?` | `{stats[] (+sharpe, beta), ranking[], rebased{SYM:[{date,value}]}, benchmark\|null}` |
| `GET /analytics/correlation` | `symbols=A,B&from&to&source?` | `{symbols[], matrix[][], commonPoints[][]}` (Pearson sobre retornos diários em datas comuns; `null` com < 2 retornos) |
| `GET /reports/performance` | `from&to&assetClass?&format=json\|csv\|pdf\|xlsx&source?&real=1?&riskFree?&betaVs?` | `{from,to,stats[]}` ou CSV/PDF/XLSX (`realReturnPct` preenchido só com `real=1` e IPCA no período) |

`source` (`BRAPI`|`MANUAL`, opcional): filtra barras. Omitido = fonte preferencial por ativo (BRAPI se houver barras no período, senão MANUAL). Evita duplicatas.

`stats[]`: `symbol, points, startDate, endDate, returnPct, volatilityAnnPct (σ diária·√252), maxDrawdownPct, best, worst`. Valores `null` com < 2 pontos válidos.

## Relatórios Extras

| Rota | Parâmetros | Resposta |
|------|------------|----------|
| `GET /reports/equity-evolution` | `portfolioId&from&to&format=json\|csv\|pdf\|xlsx` | `{portfolioId, from, to, points[{date, totalValue, invested, pnl, pnlPct}]}` |
| `GET /reports/dividends` | `from&to&format=json\|csv\|pdf\|xlsx` | `{from, to, summaries[{assetId, symbol, assetClass, totalReceived, dividendCount, byKind, firstPayment, lastPayment, yieldOnCost}]}` |
| `GET /reports/class-returns` | `from&to&format=json\|csv\|pdf\|xlsx` | `{from, to, classReturns[{assetClass, invested, currentValue, pnl, pnlPct, allocationPct, assets[{symbol, invested, currentValue, pnl, pnlPct}]}]}` |

- Todos suportam `format=json|csv|pdf|xlsx` (default: `json`).
- `equity-evolution`: requer `portfolioId` (valida ownership); evolução diária baseada em transações + preços.
- `dividends`: agrega proventos por ativo no período; `yieldOnCost` = total recebido / preço médio de compra.
- `class-returns`: agrupa por `assetClass` (STOCK/FII/FUND/TREASURY/OTHER); inclui alocação % e detalhe por ativo.

## Observabilidade

| Rota | Descrição |
|------|-----------|
| `GET /health` | Health check completo: `{status: "ok"\|"degraded"\|"down", timestamp, uptimeSeconds, checks: {database, redis, memory}}` |
| `GET /health/live` | Liveness probe: `{status: "ok", timestamp}` |
| `GET /health/ready` | Readiness probe: 503 se `status === "down"`, senão 200 com health check |
| `GET /metrics` | Métricas Prometheus (text/plain): `finance_http_requests_total`, `finance_http_request_duration_seconds`, `finance_brapi_requests_total`, `finance_brapi_request_duration_seconds`, `finance_sync_jobs_total`, `finance_sync_duration_seconds`, `finance_active_users`, `finance_portfolio_value`, `finance_db_query_duration_seconds`, `finance_cache_hits_total`, `finance_cache_misses_total` |

## Erros

Todo corpo de erro tem `error` (código) e `message` (texto legível); validação inclui `issues`.

| HTTP | Corpo | Causa |
|------|-------|-------|
| 400 | `{error:"validation", message, issues}` | Falha no Zod |
| 401 | `{error:"auth_required", message}` | JWT ausente/inválido |
| 404 | `{error:"not_found", message}` | Registro inexistente (Prisma P2025) |
| 404 | `{error:"brapi_not_found", message}` | Brapi sem dados |
| 409 | `{error:"conflict", message}` | Símbolo duplicado (P2002) ou registro em uso (P2003) |
| 429 | `{error:"brapi_rate_limited", message}` + `Retry-After` | Quota brapi ou rate limit API |
| 502 | `brapi_auth` / `brapi_plan` / `brapi` / `brapi_invalid_response` | Token inválido, plano insuficiente, resposta fora do schema, falha upstream |
| 503 | `{error:"service_unavailable", message}` | `/health/ready` retorna `down` |
| 500 | `{error:"internal", message}` | Inesperado |

Obs.: em `POST /assets/:id/prices`, `volume` deve ser inteiro não negativo (senão 400).