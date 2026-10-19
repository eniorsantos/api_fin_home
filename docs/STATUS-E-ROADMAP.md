# Status e Roadmap

Legenda: ✅ feito e verificado · 🟡 feito, não verificado · ❌ não feito

## 1. Verificação realizada (2026-10-14, atualizada 2026-10-18)

- ✅ 72 testes passam no back-end: 31 unitários (cliente brapi, analytics, risco, carteira, CSV, scheduler, sync) e 41 de integração das rotas (CRUD, posição, paginação, 404/409/400, sync com brapi simulada incl. syncAll, compare, benchmarks, screener, OpenAPI, CSV/PDF/XLSX) contra Postgres de teste (`finance_test`, `migrate deploy` automático no `globalSetup`).
- ✅ 3 testes de front passam (Vitest + React Testing Library: Dashboard, Relatórios, Avaliação).
- ✅ Back-end: `typecheck` limpo com o Prisma client gerado; `prisma validate` OK.
- ✅ Front-end: `typecheck` e `lint` limpos.
- ✅ Migrations executadas contra PostgreSQL 16 (Docker Compose) e versionadas em `backend/prisma/migrations/`.
- ✅ Smoke real da brapi (PETR4/VALE3 via `brapi:smoke` + API viva): `sync/quotes` (2 atualizadas), `sync/history` (44 barras), `compare` (PETR4 +14,83%, VALE3 −10,90% no mês), CSV de performance.
- ✅ Erros ao vivo verificados: 409 símbolo duplicado, 409 exclusão com transação, 400 volume fracionário (com `issues`), 404 com `message`.
- ✅ Front: `tsc -b && vite build` compila (aviso de chunk > 500 kB, apenas cosmético).
- ✅ Testes E2E (Playwright): Dashboard, Ativos, Carteira, Relatórios, Scorecard, Gráficos Avançados, Relatórios Avançados, Navegação.
- **Causa raiz do bloqueio anterior do Prisma:** o `schema.prisma` usava blocos em linha única (`model X { ... }`), que o parser atual rejeita (P1012). Reescrito em multilinha — `prisma generate`/`migrate` funcionam de novo.
- **Porta do banco:** compose publica `5433:5432` porque há um Postgres 18 local ocupando a 5432 (ver `docker-compose.yml` e `DATABASE_URL`).

## 2. Implementado

| Área       | Item                                                                                                                             | Estado |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Integração | Cliente `stocks/quote`, `stocks/historical`, `stocks/dividends`, `fii/dividends`, `fii/indicators`, `funds/nav/history`, `funds/indicators`, `funds/dividends`, `treasury/indicators/history`, `treasury/list`, `macro`, retry 429, erros tipados, null-safe | ✅     |
| Dados      | Schema Prisma (ativos, preços, cotações, dividendos, carteiras, transações, sync log, macro, FII indicators, fund snapshot) + unique de dividendos para o sync                                     | ✅     |
| CRUD       | Ativos, preços (POST upsert/GET/DELETE), portfólios, transações, dividendos                                                      | ✅     |
| Entrada    | Manual (`POST /assets/:id/prices`) e automática (`/sync/*`, inclui dividendos, indicadores FII, snapshot fundos, macro, Tesouro)                                                   | ✅     |
| Análise    | Retorno, volatilidade, drawdown, melhor/pior dia, ranking, base 100                                                              | ✅     |
| Carteira   | Posição por preço médio, P&L não realizado, alocação (`GET /portfolios/:id/position`)                                            | ✅     |
| Relatórios | Performance por período/classe/fonte em JSON, CSV e PDF/XLSX (benchmark, risk-free, beta, retorno real IPCA)                     | ✅     |
| Relatórios Extras | Evolução patrimonial (`/reports/equity-evolution`), Proventos agregados (`/reports/dividends`), Rentabilidade por classe (`/reports/class-returns`) — todos em JSON/CSV/PDF/XLSX | ✅     |
| Avaliação  | Scorecard fundamentalista (`/fundamental/scorecard`) — 5 categorias (Valuation, Rentabilidade, Crescimento, Saúde Financeira, Dividendos), score 0-100, recomendação STRONG_BUY a STRONG_SELL | ✅     |
| Front      | Dashboard, Ativos, Carteira, Relatórios, Scorecard, Gráficos Avançados, Relatórios Avançados                                     | ✅     |
| Gráficos   | Base 100, Drawdown, Candle/OHLC + Volume, Histograma de retornos                                                                  | ✅     |
| Segurança  | Token só no servidor, header redigido nos logs, autenticação JWT + multiusuário (dados com dono via userId)                    | ✅     |
| Observabilidade | Health checks (`/health`, `/health/live`, `/health/ready`), Métricas Prometheus (`/metrics`), Rate limiting, Logging estruturado, Redis client | ✅     |
| Filas      | BullMQ/Redis para sync assíncrono (`POST /sync/queue`, `GET /sync/queue/:jobId`), worker com concorrência 2, retry exponencial | ✅     |
| Testes E2E | Playwright (Chromium/Firefox/WebKit) com CI GitHub Actions                                                                        | ✅     |
| Backup     | Script automatizado (bash + PowerShell), Docker service, retention configurável, volume persistido                                | ✅     |
| CI/CD      | GitHub Actions (lint, typecheck, testes backend+frontend+E2E, build)                                                             | ✅     |
| Docker     | Multi-stage frontend (nginx), backend (prisma migrate deploy), compose com db/backend/frontend/redis/backup                      | ✅     |

## 3. NÃO desenvolvido (lacunas em relação ao pedido)

**Requisitos do pedido — TODOS COBERTOS**

- ✅ **Avaliação de ativos** (scorecard, P/L, P/VP, DY, comparação fundamentalista profunda) — `/fundamental/scorecard` + frontend Scorecard
- ✅ **Relatórios diversos:** evolução patrimonial, proventos agregados, rentabilidade por classe — `/reports/equity-evolution`, `/reports/dividends`, `/reports/class-returns`
- ✅ **Exportação PDF/XLSX:** `/reports/performance?format=pdf|xlsx` + todos relatórios extras
- ✅ **Dividendos via API:** `stocks/dividends`, `fii/dividends`, `funds/dividends` integrados (sync idempotente)
- ✅ **Fundos de investimento, FIIs (indicadores) e Tesouro Direto via API:** todos integrados (sync idempotente)
- ✅ **Métricas de carteira:** preço médio, posição, lucro/prejuízo, alocação + rentabilidade por classe
- ✅ **Autenticação/autorização e multiusuário:** JWT, login, registro, dados com dono (`userId`), rotas protegidas

**Front-end**

- ✅ Telas/formulários de CRUD (ativos, transações, dividendos, preços manuais, importação CSV)
- ✅ Roteamento (react-router) com páginas Dashboard, Ativos, Carteira, Relatórios, Scorecard, Gráficos Avançados, Relatórios Avançados + layout
- ✅ Gráficos de candle/OHLC, volume, histograma de retornos, drawdown
- ✅ Testes de front (Vitest + React Testing Library: Dashboard, Relatórios, Avaliação)
- ✅ Testes E2E (Playwright: todas as páginas principais)

**Back-end e dados**

- ✅ Migrations versionadas em `backend/prisma/migrations/`
- ✅ Agendador de sincronização in-process (`services/scheduler.ts`, `SYNC_ENABLED=1`, sem sobreposição) + fila distribuída BullMQ/Redis
- ✅ Paginação opt-in em listagens (`/assets`, `/portfolios`, `/transactions`, `/dividends` com `?page&pageSize`)
- ✅ Testes de integração de rotas com Postgres de teste (`finance_test`) e brapi simulada
- ✅ OpenAPI/Swagger em `/api/docs` (esqueleto: paths/métodos; sem schemas detalhados por rota)
- ✅ Dockerização do app: `Dockerfile` para backend e frontend, `docker-compose.yml` com db/backend/frontend/redis/backup
- ✅ CI/CD: GitHub Actions (lint, typecheck, testes backend+frontend+E2E, build)
- ✅ Observabilidade: Métricas Prometheus, Health checks, Rate limiting, Logging estruturado, Redis client
- ✅ Cache em memória no `BrapiClient` (TTL por operação; `BRAPI_CACHE=0` desliga) + Redis para filas

## 4. Problemas e limitações conhecidos

1. ~~**Exclusão de ativo com transações** falha com 500~~ — **corrigido:** P2002/P2003 → 409 `conflict` (e `POST`/`PUT` com símbolo duplicado também).
2. ~~**Misturar fontes**~~ — **corrigido:** `compare`/`performance` aceitam `?source=BRAPI|MANUAL`; omitido, usam a fonte preferencial por ativo (BRAPI quando houver barras no período, senão MANUAL). `sync/history` só chama a brapi com símbolos de ativos BRAPI (sem quota para manuais) e retorna `{rows: 0}` quando não há nada a sincronizar.
3. ~~**`upsert` em laço** no sync de histórico~~ — **corrigido:** upserts em lotes de 100 dentro de `$transaction` (sync e `POST /prices`).
4. **Ticker renomeado:** o sync casa por `requestedSymbol`; o `symbol` atual retornado não é persistido nem sugerido ao usuário.
5. **Fuso/horário:** `date` Unix → `Date` UTC → coluna `DATE`; pregões podem cair em dia adjacente dependendo do horário de origem. Validar com dados reais.
6. **Respostas `quote` sem `regularMarketPrice`** são descartadas silenciosamente (só o log de sync conta `ok`).
7. **`Retry-After` > 60 s** não é aguardado; o erro sobe imediatamente.
8. **Unidades:** `volatilityAnnPct` assume 252 pregões; Tesouro/fundos com marcação mensal exigem outra frequência.
9. **Nomenclatura do token:** requisito pede `BRAPI_TOKEN`; a doc da brapi usa `BRAPI_API_KEY`.
10. **Estimativa em `number`:** métricas usam ponto flutuante; não adequadas para fins contábeis/fiscais.
11. **Aviso:** o painel não é recomendação de investimento.
12. **`volume` em preços manuais** agora exige inteiro não negativo (400 em fração) — decisão de sanidade, não do requisito.
13. **Resposta brapi fora do schema** vira 502 `brapi_invalid_response` (nunca 400, que indicaria erro do cliente).

## 5. Roadmap sugerido

**Fase 0 — Validar o que existe (concluída em 2026-10-14, atualizada 2026-10-18)**

1. ~~`npx prisma migrate dev`, commitar migrations, `npm run typecheck`~~ ✅
2. ~~`npm run brapi:smoke` com PETR4/VALE3 e registrar a resposta na documentação~~ ✅ (resposta real registrada na seção 1)
3. ~~Corrigir itens 1, 2 e 3 da seção 4~~ ✅ (fonte preferencial incluída).

**Fase 1 — MVP utilizável (CONCLUÍDA)**

- ✅ Telas de CRUD (ativos, preços manuais, transações, dividendos) + importação CSV.
- ✅ Roteamento e páginas: Dashboard, Ativos, Carteira, Relatórios.
- ✅ Cálculos de carteira (posição, preço médio, P&L, alocação).
- ✅ Dividendos via API: `stocks/dividends` e `fii/dividends`.
- ✅ Testes de integração de rotas + paginação opt-in das listagens.

**Fase 2 — Cobertura de classes de ativo (CONCLUÍDA)**

- ✅ FIIs: `fii/indicators/history` + snapshot `fii/indicators` (P/VP, DY, patrimônio, cotistas)
- ✅ Fundos: `funds/nav/history` (cota→`PriceBar`), `funds/indicators` (snapshot) e `funds/dividends` (proventos)
- ✅ Tesouro: `treasury/indicators/history` (PU→`PriceBar`) + `treasury/list` (catálogo para descobrir slugs)
- ✅ Macro: `macro` (Selic, CDI, IPCA) com sync + benchmark no comparativo + retorno real (descontando IPCA)
- ✅ Comparativos entre classes com benchmark e rentabilidade real (descontando IPCA) — `/analytics/compare` e `/reports/performance` com `benchmark`, `riskFree`, `betaVs`, `real`

**Fase 3 — Avaliação e relatórios (CONCLUÍDA)**

- ✅ Screener/avaliação (`stocks/screener` com filtros + `stocks/statistics` como envelope) e endpoints `/screener`, `/fundamentals`.
- ✅ Scorecard fundamentalista (`/fundamental/scorecard`) — 5 categorias, score 0-100, recomendação.
- ✅ Risco: Sharpe (com risk-free número/CDI/Selic), beta vs CDI/Selic/IPCA e matriz de correlação (API + Relatórios).
- ✅ Exportação CSV, PDF e XLSX em `/reports/performance?format=csv|pdf|xlsx` + relatórios extras.
- ✅ Gráfico de drawdown no front (Dashboard).
- ✅ Gráficos avançados: Candle/OHLC + Volume, Histograma de retornos (`/graficos`).
- ✅ Relatórios extras: Evolução patrimonial, Proventos agregados, Rentabilidade por classe (`/relatorios-avancados`).

**Fase 4 — Produção (CONCLUÍDA)**

- ✅ Autenticação (JWT), multiusuário, dados com dono (`userId`).
- ✅ Agendador in-process + cache em memória + fila distribuída BullMQ/Redis.
- ✅ Lint/format e OpenAPI (esqueleto).
- ✅ Docker do app (backend + frontend + postgres + redis + backup via docker-compose).
- ✅ CI/CD (GitHub Actions: lint, typecheck, testes backend+frontend+E2E, build).
- ✅ Observabilidade: Métricas Prometheus (`/metrics`), Health checks (`/health`), Rate limiting, Logging estruturado.
- ✅ Backup automatizado do banco (script + Docker service + volume persistido).
- ✅ Testes E2E (Playwright: Chromium/Firefox/WebKit no CI).

## 6. Critérios de aceite sugeridos para "MVP concluído"

- ✅ Todos os endpoints com teste de integração e sem erros de tipo.
- ✅ Usuário cadastra ativo manual e via API, vê histórico e compara ≥ 3 ativos de classes diferentes.
- ✅ Relatório de carteira exportável (performance, evolução patrimonial, proventos, por classe).
- ✅ 401/403/404/429 da brapi exibidos de forma compreensível na UI.
- ✅ Scorecard fundamentalista funcional com recomendação.
- ✅ Gráficos avançados (candle, volume, histograma, drawdown).
- ✅ Sync assíncrono via fila com status de job.
- ✅ Health checks e métricas Prometheus expostas.
- ✅ Backup automatizado configurado.
- ✅ Testes E2E passando no CI.