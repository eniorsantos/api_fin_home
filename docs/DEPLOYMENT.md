# Guia de Deploy — Local e Nuvem

## Visão Geral

Este documento descreve como rodar o Painel de Análise Financeira em ambiente local (desenvolvimento) e em produção (nuvem/servidor).

---

## 1. Deploy Local (Desenvolvimento)

### Pré-requisitos

| Ferramenta | Versão Mínima | Notas |
|------------|---------------|-------|
| Node.js | 22+ | LTS recomendado |
| Docker | 24+ | Para Postgres + Redis |
| Docker Compose | 2.20+ | Incluído no Docker Desktop |
| Git | 2.30+ | Clone do repositório |
| pnpm/npm | 9+ | Gerenciador de pacotes |

### Setup Rápido (Docker Compose)

```bash
# 1. Clone e entre no diretório
git clone <repo-url>
cd api_financeira-main

# 2. Configure variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env e preencha BRAPI_TOKEN (obrigatório para dados completos)

# 3. Suba a stack completa
docker compose up -d

# 4. Aguarde health checks (Postgres, Redis, Backend)
docker compose ps
# Todos devem mostrar "healthy"

# 5. Acesse
# Frontend: http://localhost:5173
# Backend API: http://localhost:3333
# Swagger: http://localhost:3333/api/docs
# Health: http://localhost:3333/health
```

### Desenvolvimento com Hot Reload

```bash
# Terminal 1: Backend
cd backend
npm run dev          # tsx watch src/server.ts (porta 3333)

# Terminal 2: Frontend
cd frontend
npm run dev          # Vite dev server (porta 5173)

# Terminal 3 (opcional): Banco via Docker
docker compose up -d db redis
```

**Variáveis mínimas (`backend/.env`):**
```env
DATABASE_URL=postgresql://finance:finance@localhost:5433/finance
BRAPI_TOKEN=seu_token_aqui           # Obrigatório para dados além dos 4 tickers livres
JWT_SECRET=dev-secret-change-in-production
PORT=3333
WEB_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

### Testes Locais

```bash
# Backend
cd backend
npm run test          # 72 testes (unit + integração)
npm run lint
npm run typecheck

# Frontend
cd frontend
npm run test          # 3 testes componentes (Vitest + RTL)
npm run test:e2e      # 57 testes E2E (Playwright - requer backend rodando)
npm run lint
npm run typecheck
```

---

## 2. Deploy em Produção (Nuvem/Servidor)

### Arquitetura de Referência

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Load      │────▶│  Frontend   │────▶│   Backend   │
│  Balancer   │     │  (Nginx)    │     │  (Fastify)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            │
                    │   Redis     │◀───────────┘
                    │  (Cache/    │
                    │   Queue)    │
                    └─────────────┘
                    ┌─────────────┐
                    │  Postgres   │
                    │  (Primary)  │
                    └─────────────┘
```

### Opção A: Docker Compose em VM (Simples)

**Requisitos do Servidor:**
- 2 vCPU, 4 GB RAM mínimo (recomendado 4 vCPU, 8 GB)
- 50 GB disco (20 GB app + 30 GB backups/DB)
- Ubuntu 22.04+ / Debian 12+ / Amazon Linux 2023
- Docker 24+, Docker Compose 2.20+

**Deploy:**

```bash
# 1. No servidor
git clone <repo-url> /opt/finance-panel
cd /opt/finance-panel

# 2. Configure .env de produção
cp backend/.env.example backend/.env
# Edite com valores reais (ver seção Variáveis de Produção)

# 3. Build e deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Verifique
docker compose ps
curl -f http://localhost:3333/health/live
```

**`docker-compose.prod.yml` (criar este arquivo):**
```yaml
services:
  backend:
    environment:
      - NODE_ENV=production
      - SYNC_ENABLED=1
      - SYNC_INTERVAL_MIN=60
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    restart: unless-stopped

  frontend:
    deploy:
      resources:
        limits:
          memory: 256M
    restart: unless-stopped

  db:
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 2G
    restart: unless-stopped

  redis:
    volumes:
      - redisdata:/data
    deploy:
      resources:
        limits:
          memory: 256M
    restart: unless-stopped

  backup:
    environment:
      RETENTION_DAYS: 30
    deploy:
      resources:
        limits:
          memory: 512M
    restart: unless-stopped
```

### Opção B: Kubernetes (Escalável)

**Componentes necessários:**
- Cluster K8s 1.28+ (EKS, GKE, AKS, ou self-managed)
- Ingress Controller (nginx-ingress, Traefik)
- Cert-Manager (TLS automático)
- External-DNS (opcional)
- Postgres Operator (CloudNativePG, CrunchyData) ou RDS/CloudSQL
- Redis Operator ou ElastiCache/Memorystore

**Manifestos principais:**

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: finance-panel

---
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: finance-panel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: finance-panel/backend:latest
        ports:
        - containerPort: 3333
        envFrom:
        - secretRef:
            name: backend-secrets
        - configMapRef:
            name: backend-config
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3333
          initialDelaySeconds: 10
          periodSeconds: 30
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3333
          initialDelaySeconds: 15
          periodSeconds: 30
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

---
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: finance-panel
spec:
  selector:
    app: backend
  ports:
  - port: 3333
    targetPort: 3333

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: finance-panel
  namespace: finance-panel
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.seudominio.com
    - app.seudominio.com
    secretName: finance-panel-tls
  rules:
  - host: api.seudominio.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3333
  - host: app.seudominio.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

**Secrets (kubectl):**
```bash
kubectl create secret generic backend-secrets \
  -n finance-panel \
  --from-literal=BRAPI_TOKEN="seu_token" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=DATABASE_URL="postgresql://user:pass@postgres:5432/finance" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=WEB_ORIGIN="https://app.seudominio.com"

kubectl create configmap backend-config \
  -n finance-panel \
  --from-literal=PORT="3333" \
  --from-literal=SYNC_ENABLED="1" \
  --from-literal=SYNC_INTERVAL_MIN="60" \
  --from-literal=RATE_LIMIT_MAX="200" \
  --from-literal=RATE_LIMIT_WINDOW_MS="60000"
```

### Opção C: Serverless/Containers Gerenciados

**AWS (Exemplo):**
- **Backend:** ECS Fargate / App Runner / Lambda (com adapter)
- **Frontend:** S3 + CloudFront / Amplify
- **DB:** RDS PostgreSQL 16 (Multi-AZ)
- **Cache:** ElastiCache Redis 7
- **Queue:** SQS + Lambda consumers (ou mantenha BullMQ no ECS)
- **Backup:** RDS Snapshots + S3 Lifecycle

**GCP:**
- **Backend:** Cloud Run
- **Frontend:** Cloud Run / Firebase Hosting
- **DB:** Cloud SQL PostgreSQL
- **Cache:** Memorystore Redis
- **Queue:** Cloud Tasks + Cloud Run

**Azure:**
- **Backend:** Container Apps
- **Frontend:** Static Web Apps
- **DB:** Azure Database for PostgreSQL
- **Cache:** Azure Cache for Redis

---

## 3. Variáveis de Ambiente — Produção

### Backend (Obrigatórias)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host:5432/finance?sslmode=require` |
| `BRAPI_TOKEN` | Token da brapi.dev | `abc123...` |
| `JWT_SECRET` | Chave assinatura JWT (256 bits) | `openssl rand -base64 32` |
| `PORT` | Porta HTTP | `3333` |
| `WEB_ORIGIN` | Origin do frontend (CORS) | `https://app.seudominio.com` |
| `NODE_ENV` | Ambiente | `production` |

### Backend (Opcionais / Tuning)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `REDIS_URL` | - | `redis://host:6379` (habilita cache + fila) |
| `SYNC_ENABLED` | `0` | `1` = agendador ativo |
| `SYNC_INTERVAL_MIN` | `60` | Minutos entre syncs agendados |
| `SYNC_HISTORY_RANGE` | `1mo` | Janela histórico (`1d` a `1y`) |
| `BRAPI_CACHE` | `1` | `0` desliga cache em memória |
| `RATE_LIMIT_MAX` | `100` | Reqs/janela por IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Janela rate limit (ms) |

### Frontend (Build)

```bash
cd frontend
# .env.production
VITE_API_URL=https://api.seudominio.com/api
# ou deixe vazio para usar proxy relativo /api
```

Build:
```bash
npm run build
# Gera dist/ para servir via Nginx / S3 / CDN
```

---

## 4. Banco de Dados — Produção

### PostgreSQL 16 — Configuração Recomendada

```sql
-- postgresql.conf (tuning básico)
shared_buffers = 256MB              # 25% RAM
effective_cache_size = 1GB          # 50-75% RAM
work_mem = 16MB                     # Por operação
maintenance_work_mem = 256MB
max_connections = 100               # Ajuste para pool
wal_buffers = 16MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1              # SSD
```

### Migrações

```bash
# Primeira vez (cria schema)
npx prisma migrate deploy

# Atualizações
npx prisma migrate deploy

# Ver status
npx prisma migrate status
```

### Backup & Restore

**Automático (Container `backup`):**
- Roda diário via `pg_dump | gzip`
- Retention: 7 dias (config `RETENTION_DAYS`)
- Volume `backupdata` persistido
- Symlink `finance_latest.sql.gz` → último backup

**Manual:**
```bash
# Backup
pg_dump -h host -U user -d finance | gzip > backup_$(date +%F).sql.gz

# Restore
gunzip -c backup_2026-01-15.sql.gz | psql -h host -U user -d finance
```

### RDS / CloudSQL / Managed PG

- Habilite **Multi-AZ** (HA)
- **Backup automático**: retenção 7-30 dias
- **Point-in-time recovery** (PITR) habilitado
- **SSL/TLS** obrigatório (`sslmode=require`)
- **Parameter group** com tuning acima

---

## 5. Redis — Produção

### Configuração

```redis
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
```

### ElastiCache / Memorystore / Azure Cache

- **Cluster Mode** desabilitado (BullMQ usa standalone)
- **TLS** habilitado
- **Auth** (AUTH ou IAM)
- **Backup** diário (RDB/AOF)

---

## 6. SSL/TLS & Domínio

### Certificados (Let's Encrypt via Cert-Manager)

```yaml
# Ingress com TLS automático
annotations:
  cert-manager.io/cluster-issuer: letsencrypt-prod
tls:
- hosts:
  - api.seudominio.com
  - app.seudominio.com
  secretName: finance-panel-tls
```

### Headers de Segurança (Nginx / Cloudflare / ALB)

```nginx
# Security headers
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.seudominio.com;";
```

---

## 7. Monitoramento & Alertas

### Prometheus + Grafana

**Métricas expostas (`/metrics`):**
- `finance_http_requests_total` — reqs por método/rota/status
- `finance_http_request_duration_seconds` — latência (histogram)
- `finance_brapi_requests_total` — chamadas brapi por endpoint/status
- `finance_brapi_request_duration_seconds` — latência brapi
- `finance_sync_jobs_total` — jobs de sync por operação/status
- `finance_sync_duration_seconds` — duração sync
- `finance_active_users` — gauge
- `finance_portfolio_value` — gauge por usuário/portfolio
- `finance_db_query_duration_seconds` — latência DB
- `finance_cache_hits_total` / `finance_cache_misses_total`

**Dashboards sugeridos:**
- **API Health:** req/s, latência p50/p95/p99, error rate
- **Sync Jobs:** filas, duração, taxa sucesso/falha
- **Brapi:** quota usage, latência, erros por endpoint
- **Business:** usuários ativos, valor portfólio, syncs executados

### Alertas Recomendados (PrometheusRule)

```yaml
- alert: HighErrorRate
  expr: rate(finance_http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Taxa de erro > 5%"

- alert: BrapiQuotaExhausted
  expr: increase(finance_brapi_requests_total{status="429"}[1h]) > 10
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "Quota brapi próxima do limite"

- alert: SyncJobFailures
  expr: increase(finance_sync_jobs_total{status="failed"}[15m]) > 3
  for: 1m
  labels:
    severity: warning

- alert: DatabaseDown
  expr: finance_http_requests_total{status="500"} > 10
  for: 2m

- alert: HighMemoryUsage
  expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.85
  for: 5m
```

### Logs Estruturados

```json
{
  "level": "info",
  "time": "2026-01-15T10:30:00.123Z",
  "reqId": "req-abc123",
  "method": "POST",
  "url": "/api/sync/history",
  "statusCode": 200,
  "durationMs": 1250,
  "userId": "user_123",
  "msg": "request completed"
}
```

**Agregação:** Loki / Elasticsearch / Datadog / CloudWatch Logs

---

## 8. CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: finance
          POSTGRES_PASSWORD: finance
          POSTGRES_DB: finance_test
        ports: ["5433:5432"]
        options: --health-cmd="pg_isready -U finance -d finance_test"
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: cd backend && npm ci
      - run: cd frontend && npm ci
      - run: cd backend && npm run typecheck && npm run lint
      - run: cd frontend && npm run typecheck && npm run lint
      - run: |
          cd backend
          npx prisma migrate deploy
          npm test
        env:
          DATABASE_URL: postgresql://finance:finance@localhost:5433/finance_test
          TEST_DATABASE_URL: postgresql://finance:finance@localhost:5433/finance_test
          BRAPI_TOKEN: test-token
          JWT_SECRET: test-secret
          REDIS_URL: redis://localhost:6379

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: cd backend && npm ci && npm run build
      - run: cd frontend && npm ci && npm run build
      # Build & push Docker images
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/usuario/finance-backend:${{ github.sha }}
      - uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ghcr.io/usuario/finance-frontend:${{ github.sha }}

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Deploy para staging (kubectl, helm, ou ssh)
```

---

## 9. Checklist de Go-Live

| Item | Status |
|------|--------|
| [ ] `BRAPI_TOKEN` válido e com plano adequado | |
| [ ] `JWT_SECRET` forte (256 bits, único) | |
| [ ] `DATABASE_URL` com SSL (`sslmode=require`) | |
| [ ] `REDIS_URL` com TLS + Auth | |
| [ ] `WEB_ORIGIN` = domínio do frontend | |
| [ ] `NODE_ENV=production` | |
| [ ] Rate limiting configurado | |
| [ ] Health checks respondendo (`/health/live`, `/health/ready`) | |
| [ ] Métricas `/metrics` acessíveis pelo Prometheus | |
| [ ] Certificados TLS válidos (A+ no SSL Labs) | |
| [ ] Headers de segurança (CSP, HSTS, etc.) | |
| [ ] Backup automático testado (restore ok) | |
| [ ] Alertas Prometheus configurados | |
| [ ] Logs estruturados indo para agregador | |
| [ ] Domínio + DNS configurados (A/AAAA + CNAME) | |
| [ ] Rate limit brapi respeitado (monitorar quota) | |
| [ ] Rollback plan documentado | |

---

## 10. Rollback & Disaster Recovery

### Rollback de Deploy

```bash
# Docker Compose
docker compose pull backend:tag-anterior
docker compose up -d backend

# Kubernetes
kubectl rollout undo deployment/backend -n finance-panel
# Ou imagem específica
kubectl set image deployment/backend backend=ghcr.io/usuario/finance-backend:tag-anterior -n finance-panel
```

### Restore de Banco

```bash
# 1. Pare backend
docker compose stop backend  # ou kubectl scale deployment/backend --replicas=0

# 2. Restore
gunzip -c backup_2026-01-15.sql.gz | psql -h host -U user -d finance

# 3. Suba backend
docker compose start backend
```

### RTO / RPO

| Métrica | Target |
|---------|--------|
| RPO (Perda de dados) | < 24h (backup diário) |
| RTO (Recuperação) | < 30 min (restore + deploy) |
| Disponibilidade | 99.9% (exclui manutenção planejada) |

---

## 11. Custos Estimados (AWS us-east-1, mensal)

| Componente | Config | Custo Estimado |
|------------|--------|----------------|
| ECS Fargate (2 tasks) | 1 vCPU, 2 GB | ~$45 |
| RDS PostgreSQL (db.t3.medium, Multi-AZ) | 2 vCPU, 4 GB, 100 GB | ~$120 |
| ElastiCache Redis (cache.t3.micro) | 1 vCPU, 0.5 GB | ~$15 |
| ALB | 1 LCUs | ~$20 |
| S3 (backups + assets) | 50 GB | ~$1.50 |
| CloudWatch Logs/Metrics | 10 GB | ~$5 |
| Data Transfer | 50 GB | ~$4.50 |
| **Total** | | **~$210/mês** |

*Otimizações: Reserved Instances (-30-40%), Savings Plans, Spot para batch jobs.*

---

## 12. Referências Rápidas

| Comando | Descrição |
|---------|-----------|
| `docker compose up -d` | Sobe stack local |
| `docker compose logs -f backend` | Logs backend |
| `npx prisma migrate deploy` | Aplica migrações |
| `npx prisma studio` | UI do banco |
| `npm run brapi:smoke` | Teste brapi real |
| `kubectl get pods -n finance-panel` | Pods K8s |
| `kubectl logs -f deployment/backend -n finance-panel` | Logs K8s |
| `curl -f http://localhost:3333/health/live` | Health check |
| `curl -f http://localhost:3333/metrics` | Métricas Prometheus |

---

**Última atualização:** 2026-10-18  
**Versão:** 1.0.0