import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type ScorecardResult } from "../lib/api";

const RECOMMENDATION_COLORS: Record<string, string> = {
  STRONG_BUY: "#16a34a",
  BUY: "#22c55e",
  HOLD: "#eab308",
  SELL: "#f97316",
  STRONG_SELL: "#dc2626",
  INSUFFICIENT_DATA: "#6b7280",
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  STRONG_BUY: "Compra Forte",
  BUY: "Compra",
  HOLD: "Manter",
  SELL: "Venda",
  STRONG_SELL: "Venda Forte",
  INSUFFICIENT_DATA: "Dados Insuficientes",
};

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#eab308" : "#dc2626";
  return (
    <div style={{ textAlign: "center", padding: 8, borderRadius: 8, background: "#f9fafb" }}>
      <div style={{ fontSize: 24, fontWeight: "bold", color }}>{score}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function MetricRow({ metric }: { metric: ScorecardResult["details"]["valuation"][0] }) {
  const scoreColor = metric.score >= 70 ? "#16a34a" : metric.score >= 40 ? "#eab308" : "#dc2626";
  const value = metric.value === null ? "—" : metric.value.toFixed(2);
  const benchmark = metric.benchmark === null ? "—" : metric.benchmark.toFixed(2);
  return (
    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
      <td style={{ padding: 8 }}>{metric.name}</td>
      <td style={{ padding: 8, textAlign: "right" }}>{value}</td>
      <td style={{ padding: 8, textAlign: "right", color: "#6b7280" }}>{benchmark}</td>
      <td style={{ padding: 8, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 4,
            background: scoreColor,
            color: "white",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {metric.score}
        </span>
      </td>
      <td style={{ padding: 8, fontSize: 12, color: "#6b7280" }}>{metric.interpretation}</td>
    </tr>
  );
}

function ScorecardCard({ result }: { result: ScorecardResult }) {
  const recColor = RECOMMENDATION_COLORS[result.recommendation] ?? "#6b7280";
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{result.symbol}</h2>
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {result.name} {result.sector && `· ${result.sector}`}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 20,
              background: recColor,
              color: "white",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {RECOMMENDATION_LABELS[result.recommendation]}
          </div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: "bold", color: recColor }}>
            {result.overallScore}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Score Geral</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <ScoreBadge score={result.valuationScore} label="Valuation" />
        <ScoreBadge score={result.profitabilityScore} label="Rentabilidade" />
        <ScoreBadge score={result.growthScore} label="Crescimento" />
        <ScoreBadge score={result.financialHealthScore} label="Saúde Financeira" />
        <ScoreBadge score={result.dividendScore} label="Dividendos" />
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "#374151" }}>
          Ver detalhes dos indicadores
        </summary>
        <div style={{ marginTop: 12 }}>
          {[
            { label: "Valuation", metrics: result.details.valuation },
            { label: "Rentabilidade", metrics: result.details.profitability },
            { label: "Crescimento", metrics: result.details.growth },
            { label: "Saúde Financeira", metrics: result.details.financialHealth },
            { label: "Dividendos", metrics: result.details.dividend },
          ].map(({ label, metrics }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>{label}</h4>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th align="left" style={{ padding: 6 }}>Indicador</th>
                    <th align="right" style={{ padding: 6 }}>Valor</th>
                    <th align="right" style={{ padding: 6 }}>Benchmark</th>
                    <th align="center" style={{ padding: 6 }}>Score</th>
                    <th align="left" style={{ padding: 6 }}>Interpretação</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <MetricRow key={m.name} metric={m} />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export default function Scorecard() {
  const [symbolsInput, setSymbolsInput] = useState("PETR4,VALE3,ITUB4,MGLU3,WEGE3");
  const [submitted, setSubmitted] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const syms = symbolsInput
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (syms.length > 0) setSubmitted(syms);
  };

  const query = useQuery({
    queryKey: ["scorecard", submitted],
    enabled: submitted.length > 0,
    queryFn: () => api.scorecard(submitted),
  });

  return (
    <div>
      <h1>Scorecard Fundamentalista</h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        Análise fundamentalista baseada em múltiplos da brapi (P/L, P/VP, EV/EBITDA, ROE, DY, Margens, Endividamento, Crescimento).
        O score varia de 0 a 100 por categoria. Métricas do plano Pro podem vir vazias.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={symbolsInput}
          onChange={(e) => setSymbolsInput(e.target.value)}
          placeholder="PETR4, VALE3, ITUB4..."
          style={{ flex: 1, padding: 8, marginRight: 8, minWidth: 300 }}
        />
        <button type="submit" style={{ padding: "8px 16px" }}>
          Analisar
        </button>
      </form>

      {query.isError && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {(query.error as Error).message}
        </p>
      )}

      {query.isLoading && <p>Carregando scorecards...</p>}

      {query.data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", gap: 16 }}>
          {query.data.results.map((r: ScorecardResult) => (
            <ScorecardCard key={r.symbol} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}