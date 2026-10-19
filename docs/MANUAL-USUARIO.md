# Manual do Usuário — Painel de Análise Financeira

**Versão 1.0** | Atualizado em 2026-10-18

---

## Sumário

1. [Introdução](#1-introdução)
2. [Primeiros Passos](#2-primeiros-passos)
3. [Dashboard](#3-dashboard)
4. [Ativos](#4-ativos)
5. [Carteira](#5-carteira)
6. [Relatórios](#6-relatórios)
7. [Relatórios Avançados](#7-relatórios-avançados)
8. [Gráficos Avançados](#8-gráficos-avançados)
9. [Avaliação (Screener)](#9-avaliação-screener)
10. [Scorecard Fundamentalista](#10-scorecard-fundamentalista)
11. [Sincronização com brapi](#11-sincronização-com-brapi)
12. [Dicas e Boas Práticas](#12-dicas-e-boas-práticas)
13. [Solução de Problemas](#13-solução-de-problemas)

---

## 1. Introdução

### O que é este sistema?

O **Painel de Análise Financeira** é uma aplicação web para investidores brasileiros analisarem, compararem e acompanharem seus investimentos em:

- **Ações** (STOCK)
- **Fundos Imobiliários** (FII)
- **Fundos de Investimento** (FUND — FIAGRO, FI-Infra, FIF, etc.)
- **Tesouro Direto** (TREASURY)

### Principais Capacidades

| Área | O que faz |
|------|-----------|
| **Dashboard** | Comparação visual de ativos, métricas de risco/retorno, gráficos base 100 e drawdown |
| **Ativos** | Cadastro manual ou via brapi, preços manuais (CSV), indicadores FII/Fundos |
| **Carteira** | Transações (compra/venda), posição consolidada, preço médio, P&L, alocação |
| **Relatórios** | Performance, evolução patrimonial, proventos, rentabilidade por classe (PDF/Excel/CSV) |
| **Scorecard** | Análise fundamentalista automatizada (valuation, rentabilidade, crescimento, saúde financeira, dividendos) |
| **Gráficos** | Candle/OHLC, volume, histograma de retornos, drawdown |
| **Sincronização** | Dados automáticos da brapi (cotações, histórico, dividendos, indicadores, macro) |

### Fontes de Dados

- **Manual**: Você insere preços, transações, dividendos
- **Automática (brapi)**: Cotações, histórico OHLCV, dividendos, indicadores FII, NAV de fundos, PU Tesouro, séries macro (Selic, CDI, IPCA)

> **Importante**: O token da brapi fica **apenas no servidor**. Suas credenciais nunca vão para o navegador.

---

## 2. Primeiros Passos

### 2.1 Acesso

1. Acesse a URL do sistema (ex: `https://app.seudominio.com`)
2. Clique em **"Registrar"** se for o primeiro acesso
3. Preencha: e-mail, senha (mín. 6 caracteres), nome (opcional)
4. Faça login com e-mail e senha

### 2.2 Navegação

O menu superior dá acesso a todas as páginas:

| Página | Descrição |
|--------|-----------|
| **Dashboard** | Visão geral, comparação, métricas, sync |
| **Ativos** | Cadastro, preços, indicadores |
| **Carteira** | Transações, posição, proventos |
| **Relatórios** | Performance (PDF/Excel/CSV) |
| **Relatórios Avançados** | Evolução patrimonial, proventos, rentabilidade por classe |
| **Gráficos Avançados** | Candle, volume, histograma, drawdown |
| **Avaliação** | Screener com filtros fundamentalistas |
| **Scorecard** | Análise fundamentalista completa |

---

## 3. Dashboard

### 3.1 Visão Geral

O Dashboard é sua página inicial. Mostra:

- **Cards de métricas** por ativo selecionado: Retorno %, Volatilidade a.a. %, Drawdown Máx %
- **Gráfico Base 100**: Normaliza todos os ativos para 100 na data inicial — facilita comparar performance relativa
- **Gráfico de Drawdown**: Área vermelha mostra a queda máxima desde o pico (running maximum)
- **Ranking**: Ativos ordenados por retorno no período
- **Benchmark** (opcional): Linha de referência (CDI, Selic, IPCA)

### 3.2 Selecionando Ativos

1. Marque os **checkboxes** dos ativos que deseja analisar
2. O gráfico e métricas atualizam automaticamente
3. Mínimo 1 ativo, sem limite máximo (performance depende da quantidade)

### 3.3 Período de Análise

- **De / Até**: Selecione datas no calendário
- Padrão: últimos 12 meses
- Datas futuras não são permitidas

### 3.4 Fonte dos Preços

Seletor **"Fonte dos preços"**:

| Opção | Comportamento |
|-------|---------------|
| **Preferencial** (padrão) | Usa brapi se houver dados no período; senão, manual |
| **Automático (brapi)** | Força apenas dados da brapi |
| **Manual** | Força apenas dados inseridos manualmente |

> Útil para comparar fontes ou quando a brapi não tem dados do período.

### 3.5 Benchmark

Adicione linha de referência no gráfico:

| Benchmark | Fonte |
|-----------|-------|
| **CDI** | Taxa DI acumulada (brapi macro) |
| **Selic** | Taxa Selic acumulada (brapi macro) |
| **IPCA** | Inflação acumulada (brapi macro) |

### 3.6 Sincronização Rápida

Dois botões no topo:

| Botão | Ação |
|-------|------|
| **Sincronizar brapi** | Baixa cotações + histórico + dividendos dos ativos marcados (por classe: ações/FIIs, fundos, tesouro) |
| **Sincronizar macro** | Atualiza séries CDI, Selic, IPCA para benchmarks |

> A sincronização usa a **fila assíncrona** para operações longas. O status aparece em mensagem verde/vermelha abaixo dos botões.

### 3.7 Exportar CSV

Link **"Exportar CSV"** gera relatório de performance dos ativos selecionados no período.

---

## 4. Ativos

### 4.1 Listagem

Tabela com todos os seus ativos:

| Coluna | Descrição |
|--------|-----------|
| **Símbolo** | Ticker (ex: PETR4, MXRF11) |
| **Nome** | Nome completo |
| **Classe** | STOCK, FII, FUND, TREASURY, OTHER |
| **Fonte** | MANUAL ou BRAPI |
| **Ações** | Editar, Preços, Excluir |

**Filtros**: Busca por símbolo/nome, paginação (padrão 20 por página).

### 4.2 Cadastrar Ativo

1. Clique em **"Novo Ativo"** ou **"Adicionar"**
2. Preencha:
   - **Símbolo**: Ex: PETR4, MXRF11, TESOURO-SELIC-2029 (maiúsculas automáticas)
   - **Nome**: Nome completo (ex: "Petrobras PN")
   - **Classe**: STOCK, FII, FUND, TREASURY, OTHER
   - **Fonte**: MANUAL (padrão) ou BRAPI
   - **Moeda**: BRL (padrão)
3. Clique em **Salvar**

> **Dica**: Para ativos BRAPI, use o símbolo exato da B3. O sistema valida na brapi ao sincronizar.

### 4.3 Editar Ativo

- Clique no ícone de **edição** na linha do ativo
- Altere nome, classe, fonte, moeda
- **Símbolo não pode ser alterado** (chave primária)

### 4.4 Preços Manuais

Para ativos **MANUAL** ou complementar dados BRAPI:

1. Na linha do ativo, clique em **"Preços"** ou acesse a aba
2. **Adicionar preço**: Data, Fechamento, Abertura, Máxima, Mínima, Fechamento Ajustado, Volume
3. **Importar CSV**: Botão "Importar CSV" — veja formato abaixo
4. **Excluir**: Ícone lixeira na linha do preço

#### Formato CSV para Importação

```csv
# Cabeçalho opcional (EN ou PT)
date,close,open,high,low,adjustedClose,volume
# ou
data,fechamento,abertura,maxima,minima,fechamentoAjustado,volume

# Dados (datas ISO ou DD/MM/AAAA)
2026-01-15,35.50,35.20,35.80,35.10,35.40,1000000
15/01/2026,35.60,35.30,35.90,35.20,35.50,950000
```

**Regras:**
- `date`/`data` obrigatório (ISO `YYYY-MM-DD` ou `DD/MM/AAAA`)
- `close`/`fechamento` obrigatório
- Demais campos opcionais
- `volume` deve ser inteiro ≥ 0
- `adjustedClose` padrão = `close` se omitido

### 4.5 Indicadores (FII e Fundos)

Para ativos **FII** (fonte BRAPI):
- Aba **"Indicadores"**: Série mensal P/VP, DY 12m, DY 1m, Patrimônio, Cotistas
- **Snapshot**: Preço atual, VP, P/VP, DY mensal

Para ativos **FUND** (fonte BRAPI):
- **Indicadores do Fundo**: Preço, cota patrimonial, ágio/deságio (P/VP), DY mensal, retorno mensal

---

## 5. Carteira

### 5.1 Criar Carteira

1. Acesse **Carteira**
2. Clique **"Nova Carteira"**
3. Nome (ex: "Minha Carteira", "Previdência", "Swing Trade")
3. Salvar

### 5.2 Transações

Registre compras e vendas:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| **Carteira** | Sim | Selecione a carteira |
| **Ativo** | Sim | Selecione ativo cadastrado |
| **Tipo** | Sim | COMPRA ou VENDA |
| **Quantidade** | Sim | Número positivo (ex: 100) |
| **Preço Unitário** | Sim | Preço por unidade (ex: 35.50) |
| **Taxas** | Não | Corretagem, emolumentos (padrão 0) |
| **Data** | Sim | Data da operação |
| **Observações** | Não | Livre |

**Regras:**
- Venda não pode exceder quantidade disponível (validação automática)
- Preço médio calculado automaticamente (ponderado por quantidade)
- Taxas de compra entram no custo de aquisição; taxas de venda reduzem o ganho

### 5.3 Posição Consolidada

Aba **"Posição"** mostra:

| Coluna | Descrição |
|--------|-----------|
| **Ativo** | Símbolo + Nome |
| **Quantidade** | Saldo atual |
| **Preço Médio** | Custo de aquisição ponderado |
| **Investido** | Total investido (quantidade × preço médio + taxas de compra) |
| **Preço Atual** | Último fechamento (fonte preferencial) |
| **Data Preço** | Data da cotação usada |
| **Valor de Mercado** | Quantidade × Preço Atual |
| **P&L** | Valor de Mercado - Investido |
| **P&L %** | Percentual de ganho/perda |
| **Alocação %** | Peso na carteira (só posições com preço) |

**Totais no rodapé:**
- **Total Investido**: Soma de todo capital alocado
- **Valor de Mercado Total**: Valor atual da carteira
- **P&L Total**: Ganho/perda não realizado
- **P&L % Total**: Rentabilidade global

> **Nota**: Posições sem preço atual (ativo sem cotação no período) ficam com P&L vazio e não entram na alocação.

### 5.4 Dividendos (Proventos)

Registre proventos recebidos:

| Campo | Descrição |
|-------|-----------|
| **Ativo** | Selecione ativo da carteira |
| **Tipo** | DIVIDEND, JCP, RENDIMENTO, AMORTIZACAO, OTHER |
| **Valor por Unidade** | Valor por ação/cota (ex: 0.50) |
| **Data Ex** | Data ex-direito (opcional) |
| **Data Pagamento** | Data do crédito na conta |

**Tipos:**
| Tipo | Uso |
|------|-----|
| DIVIDEND | Dividendos de ações |
| JCP | Juros sobre Capital Próprio |
| RENDIMENTO | Rendimentos de FIIs/Fundos |
| AMORTIZACAO | Amortização de principal (Tesouro, CRIs) |
| OTHER | Outros |

---

## 6. Relatórios

### 6.1 Relatório de Performance

Gera análise de risco/retorno dos ativos no período.

**Parâmetros:**
| Parâmetro | Descrição |
|-----------|-----------|
| **De / Até** | Período da análise |
| **Classe** | Filtrar por STOCK, FII, FUND, TREASURY, OTHER |
| **Formato** | JSON, CSV, XLSX, PDF |
| **Fonte** | BRAPI, MANUAL, ou Preferencial |
| **Retorno Real** | Marque para descontar IPCA (requer dados macro) |
| **Risk-Free** | Número (%) ou CDI/Selic para Sharpe |
| **Beta vs** | CDI, Selic ou IPCA para calcular Beta |

**Métricas no relatório:**
| Métrica | Descrição |
|---------|-----------|
| **Retorno %** | (Preço final - Preço inicial) / Preço inicial |
| **Volatilidade a.a. %** | Desvio-padrão dos retornos diários × √252 |
| **Drawdown Máx %** | Maior queda desde pico (base 100) |
| **Melhor/Pior Dia** | Maior/menor retorno diário no período |
| **Sharpe** | (Retorno - Risk-Free) / Volatilidade (anualizado) |
| **Beta** | Sensibilidade vs benchmark (CDI/Selic/IPCA) |
| **Retorno Real %** | Retorno nominal descontado pelo IPCA |

**Formatos de saída:**
- **JSON**: Para integração/API
- **CSV**: Planilhas (Excel, Google Sheets)
- **XLSX**: Excel nativo com formatação
- **PDF**: Documento formatado para impressão/arquivo

### 6.2 Correlação

Matriz de Pearson entre ativos selecionados:
- Retornos diários alinhados por data
- Diagonal = 1 (autocorrelação)
- `null` se < 2 retornos em comum

---

## 7. Relatórios Avançados

Acesse **"Relatórios Avançados"** no menu.

### 7.1 Evolução Patrimonial

Gráfico de linhas mostrando evolução diária da carteira:
- **Valor Total** (linha azul): Valor de mercado da carteira ao longo do tempo
- **Investido** (linha verde): Capital total alocado
- **P&L** (linha vermelha): Diferença entre Valor Total e Investido

**Cards de resumo** (valor final):
- Valor Atual
- Total Investido
- P&L (valor e %)

**Exporta**: CSV com colunas `date,totalValue,invested,pnl,pnlPct`

### 7.2 Proventos Agregados

Tabela + gráfico de barras horizontais (Top 10):

| Coluna | Descrição |
|--------|-----------|
| **Ativo** | Símbolo |
| **Classe** | STOCK, FII, FUND, etc. |
| **Total Recebido** | Soma de todos os proventos no período |
| **Eventos** | Quantidade de pagamentos |
| **Yield on Cost %** | Total Recebido / Preço Médio de Compra × 100 |
| **Primeiro Pagamento** | Data do primeiro provento no período |
| **Último Pagamento** | Data do último provento no período |

**Detalhamento por tipo** (DIVIDEND, JCP, RENDIMENTO, etc.) na tabela.

### 7.3 Rentabilidade por Classe

Dois gráficos de barras + tabela:

1. **P&L % por Classe** — Rentabilidade percentual
2. **Alocação % por Classe** — Peso atual na carteira

**Tabela detalhada** expansível por classe:
- Cada ativo da classe com Investido, Atual, P&L, P&L %

---

## 8. Gráficos Avançados

Acesse **"Gráficos Avançados"** no menu.

### 8.1 Controles

| Controle | Função |
|----------|--------|
| **Ativo** | Dropdown com seus ativos |
| **De / Até** | Período do gráfico |
| **Fonte** | Preferencial / BRAPI / MANUAL |
| **Tipo** | Botões: OHLC, Volume, Histograma, Drawdown |

### 8.2 Tipos de Gráfico

| Tipo | Descrição |
|------|-----------|
| **OHLC** | Candle/OHLC + Volume (ComposedChart). Verde = alta, Vermelho = baixa |
| **Volume** | Barras de volume coloridas por direção (verde = fechamento ≥ abertura) |
| **Histograma** | Distribuição de retornos diários (%) com bins automáticos. Mostra Média, Mediana, Desvio Padrão |
| **Drawdown** | Área vermelha = queda desde pico (running maximum da base 100) |

### 8.3 Card de Resumo

Acima do gráfico mostra:
- Símbolo do ativo
- Quantidade de barras no período
- Data inicial / final
- Último preço (fechamento)

---

## 9. Avaliação (Screener)

Ferramenta de triagem fundamentalista usando dados **ao vivo da brapi**.

### 9.1 Filtros Disponíveis

| Filtro | Descrição |
|--------|-----------|
| **P/L máx** | Preço/Lucro máximo |
| **P/VP máx** | Preço/Valor Patrimonial máximo |
| **DY mín %** | Dividend Yield mínimo (em %, ex: 6 = 6%) |
| **ROE mín %** | Return on Equity mínimo (em %) |
| **Ordenar por** | DY, P/L, ROE, P/VP |
| **Limite** | Máximo 50 resultados |

### 9.2 Tabela de Resultados

| Coluna | Descrição |
|--------|-----------|
| **Ativo** | Símbolo + Nome |
| **Setor** | Setor B3 |
| **Preço** | Última cotação |
| **P/L** | Preço/Lucro |
| **P/VP** | Preço/Valor Patrimonial |
| **DY** | Dividend Yield (%) |
| **ROE** | Return on Equity (%) |
| **EV/EBITDA** | Enterprise Value / EBITDA |

> **Nota**: Métricas do plano Pro da brapi podem vir vazias (null) no plano Startup.

---

## 10. Scorecard Fundamentalista

Análise fundamentalista automatizada com **score 0-100** e **recomendação**.

### 10.1 Como Usar

1. Acesse **Scorecard** no menu
2. Digite símbolos separados por vírgula: `PETR4,VALE3,ITUB4,WEGE3`
2. Clique **"Analisar"**

### 10.2 Card do Ativo

Cada ativo recebe um card com:

**Score Geral** (grande, colorido):
- 🟢 **80-100**: COMPRA FORTE
- 🟢 **65-79**: COMPRA
- 🟡 **45-64**: MANTER
- 🟠 **30-44**: VENDA
- 🔴 **0-29**: VENDA FORTE
- ⚪ **Dados Insuficientes**: Sem métricas da brapi

**5 Categorias (badges 0-100):**
| Categoria | Peso | Métricas |
|-----------|------|----------|
| **Valuation** | 25% | P/L, P/VP, EV/EBITDA, PEG, EV/Revenue |
| **Rentabilidade** | 25% | Margem Líquida, ROE, ROA, Margem Bruta, EBITDA |
| **Crescimento** | 20% | Cresc. Receita, Cresc. Lucros, 52-week Change |
| **Saúde Financeira** | 20% | D/E, Dív. Líq./EBITDA, Current Ratio, Quick Ratio |
| **Dividendos** | 10% | DY, Free Cash Flow |

### 10.3 Detalhamento Expansível

Clique em **"Ver detalhes dos indicadores"** para ver tabela por categoria:

| Métrica | Valor | Benchmark | Score | Interpretação |
|---------|-------|-----------|-------|---------------|
| P/L | 8.5 | ≤15 (bom) / ≥30 (ruim) | 85 | Bom |
| ROE | 18% | ≥15% (bom) / ≤8% (ruim) | 90 | Bom |
| D/E | 0.4 | ≤0.5 (bom) / ≥2 (ruim) | 80 | Bom |

**Cores do Score**: 🟢 ≥70 | 🟡 40-69 | 🔴 <40

> **Base de dados**: Métricas vêm do endpoint `stocks/screener` da brapi. Plano Pro tem mais métricas.

---

## 11. Sincronização com brapi

### 11.1 Sincronização Síncrona (Dashboard)

Botões no Dashboard fazem sync imediato dos ativos **marcados**:

| Operação | O que faz |
|----------|-----------|
| **Cotações** | Atualiza preço atual + logo de todos ativos BRAPI ativos |
| **Histórico** | Baixa OHLCV + adjustedClose (range padrão 1 ano) |
| **Dividendos** | Importa proventos (ações + FIIs) |
| **Macro** | Atualiza CDI, Selic, IPCA |
| **Indicadores FII** | P/VP, DY, patrimônio, cotistas (mensal) |
| **Fundos** | NAV (cota patrimonial) + Snapshot |
| **Tesouro** | PU diário (taxa + preço unitário) |

### 11.2 Sincronização Assíncrona (Fila)

Para operações longas ou agendadas:

1. **POST** `/api/sync/queue` com:
   ```json
   {
     "operation": "history",
     "symbols": ["PETR4", "VALE3"],
     "range": "1y",
     "interval": "1d"
   }
   ```
2. Retorna `jobId`
3. **GET** `/api/sync/queue/:jobId` para consultar status:
   ```json
   { "status": "completed", "progress": 100, "result": {...} }
   ```

**Operações suportadas**: `quotes`, `history`, `dividends`, `macro`, `indicators`, `funds`, `treasury`, `fundIndicators`

### 11.3 Agendador Automático

Configure no `.env` do backend:
```env
SYNC_ENABLED=1
SYNC_INTERVAL_MIN=60
SYNC_HISTORY_RANGE=1mo
```
Roda a cada 60 minutos: cotações + histórico (1mo) + dividendos de todos ativos BRAPI.

### 11.4 Regras Importantes

| Regra | Descrição |
|-------|-----------|
| **Só ativos BRAPI** | Sync ignora ativos MANUAL |
| **Idempotente** | Reenviar mesma data = atualiza (upsert) |
| **Sem quota** | Se não há ativos BRAPI, retorna zeros sem chamar brapi |
| **Logs** | Todo sync grava em `SyncLog` (status, HTTP, mensagem) |
| **Rate Limit** | Respeita `Retry-After` da brapi (max 2 retries, espera ≤ 60s) |

---

## 12. Dicas e Boas Práticas

### Organização
- **Uma carteira por objetivo**: "Longa Prazo", "Swing Trade", "Dividendos", "Previdência"
- **Nomeie ativos consistentemente**: Use símbolos B3 (PETR4, não PETROBRAS)
- **Classe correta**: FII ≠ STOCK ≠ FUND — afeta sincronização e relatórios

### Dados
- **Sincronize semanalmente** para manter preços atualizados
- **Importe CSV mensal** para ativos sem cobertura brapi (ex: small caps, OTC)
- **Valide preços manuais**: `adjustedClose` deve considerar proventos/desdobramentos

### Relatórios
- **Performance mensal**: Compare com CDI/Selic/IPCA
- **Retorno Real**: Sempre use `real=1` para decisões de longo prazo
- **Classe de ativo**: Veja se está concentrado demais em uma classe

### Scorecard
- **Não use isolado**: Combine com análise qualitativa (governança, setor, moat)
- **Dados insuficientes** = brapi não tem métricas (comum em small caps)
- **Reavalie trimestralmente**: Métricas mudam com resultados

### Segurança
- **Não compartilhe JWT**: Token expira em 7 dias
- **Logout** em dispositivos compartilhados
- **Backup**: Exporte relatórios mensais (CSV/PDF)

---

## 13. Solução de Problemas

### Problemas Comuns

| Sintoma | Causa Provável | Solução |
|---------|----------------|---------|
| **Gráfico vazio** | Ativo sem `PriceBar` no período | Rode `/sync/history` ou insira preços manuais |
| **Erro 502 `brapi_auth`** | Token inválido/ausente | Configure `BRAPI_TOKEN` no backend |
| **Erro 502 `brapi_plan`** | Recurso fora do plano | Upgrade na brapi ou use apenas tickers livres |
| **Erro 429** | Quota excedida | Aguarde `Retry-After` segundos |
| **Erro 401** | JWT expirado | Faça login novamente |
| **Erro 409 símbolo duplicado** | Símbolo já existe | Use símbolo diferente ou edite o existente |
| **Erro 409 exclusão** | Ativo tem transações | Exclua transações primeiro |
| **Erro 400 volume fracionário** | Volume não é inteiro | Use número inteiro ≥ 0 |
| **Scorecard "Dados Insuficientes"** | Brapi sem métricas | Comum em small caps; use screener manual |
| **Sync retorna 0 rows** | Nenhum ativo BRAPI selecionado | Marque ativos com fonte BRAPI |
| **`Redis connection error`** | Redis não configurado | Configure `REDIS_URL` ou desative fila |
| **`/health/ready` 503** | DB/Redis down ou RAM > 500MB | Verifique containers / reinicie |

### Logs Úteis

**Backend:**
```bash
docker compose logs -f backend
# ou
journalctl -u finance-backend -f
```

**Frontend:**
```bash
docker compose logs -f frontend
```

### Contatos

- **Issues técnicos**: Abra issue no GitHub do projeto
- **Dúvidas brapi**: https://brapi.dev/docs / suporte@brapi.dev
- **Documentação técnica**: Veja `docs/ARQUITETURA.md`, `docs/API.md`, `docs/MODULOS.md`

---

## Anexos

### A. Atalhos de Teclado (Dashboard)

| Tecla | Ação |
|-------|------|
| `Espaço` | Marca/desmarca ativo focado |
| `Setas` | Navega entre ativos |
| `Enter` | Confirma seleção |

### B. Formatos de Data Aceitos

| Formato | Exemplo |
|---------|---------|
| ISO | `2026-01-15` |
| BR | `15/01/2026` |
| BR curto | `15/01/26` |

### C. Limites do Sistema

| Limite | Valor |
|--------|-------|
| Ativos por usuário | Ilimitado |
| Transações por carteira | Ilimitado |
| Símbolos por sync | 100 (brapi) / Ilimitado (manual) |
| Período histórico | 1d a 10y (brapi) |
| Arquivo CSV import | 10 MB / 10.000 linhas |
| Tamanho PDF/XLSX | ~50 MB |

---

**Fim do Manual**

*Para documentação técnica (API, arquitetura, módulos), consulte a pasta `docs/` do projeto.*