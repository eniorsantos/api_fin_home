import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { api } from "../lib/api";

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function RelatoriosAvancados() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 365 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [portfolioId, setPortfolioId] = useState("");

  const portfolios = useQuery({ queryKey: ["portfolios"], queryFn: api.portfolios });
  const equity = useQuery({
    queryKey: ["equity", portfolioId, from, to],
    enabled: !!portfolioId,
    queryFn: () => api.equityEvolution(portfolioId, from, to),
  });
  const dividends = useQuery({
    queryKey: ["dividendsReport", from, to],
    queryFn: () => api.dividendsReport(from, to),
  });
  const classReturns = useQuery({
    queryKey: ["classReturns", from, to],
    queryFn: () => api.classReturns(from, to),
  });

  const equityChartData = useMemo(() => {
    return equity.data?.points.map((p) => ({
      date: p.date,
      totalValue: p.totalValue,
      invested: p.invested,
      pnl: p.pnl,
    })) ?? [];
  }, [equity.data]);

  const classChartData = useMemo(() => {
    return classReturns.data?.classReturns.map((c) => ({
      class: c.assetClass,
      pnlPct: c.pnlPct,
      allocationPct: c.allocationPct,
      currentValue: c.currentValue,
    })) ?? [];
  }, [classReturns.data]);

  const dividendChartData = useMemo(() => {
    return dividends.data?.summaries
      .slice(0, 10)
      .map((s) => ({
        symbol: s.symbol,
        totalReceived: s.totalReceived,
        yieldOnCost: s.yieldOnCost ?? 0,
      })) ?? [];
  }, [dividends.data]);

  return (
    <div>
      <h1>Relatórios Avançados</h1>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Selecione a carteira (evolução patrimonial)</option>
          {portfolios.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <a href={`/api/reports/equity-evolution?portfolioId=${portfolioId}&from=${from}&to=${to}&format=csv`} style={{ marginLeft: "auto" }}>
          Exportar CSV (Evolução)
        </a>
        <a href={`/api/reports/dividends?from=${from}&to=${to}&format=csv`}>Exportar CSV (Proventos)</a>
        <a href={`/api/reports/class-returns?from=${from}&to=${to}&format=csv`}>Exportar CSV (Por Classe)</a>
      </section>

      {/* Evolução Patrimonial */}
      {portfolioId && (
        <section style={{ marginBottom: 32 }}>
          <h2>Evolução Patrimonial da Carteira</h2>
          {equity.isError && <p style={{ color: "#b91c1c" }}>{(equity.error as Error).message}</p>}
          {equity.data && (
            <>
              <div style={{ height: 350 }}>
                <ResponsiveContainer>
                  <LineChart data={equityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={40} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="totalValue" stroke="#2563eb" dot={false} name="Valor Total" connectNulls />
                    <Line dataKey="invested" stroke="#16a34a" dot={false} name="Investido" connectNulls />
                    <Line dataKey="pnl" stroke="#dc2626" dot={false} name="P&L" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p style={{ marginTop: 8 }}>
                <strong>Valor atual:</strong> {money(equity.data.points[equity.data.points.length - 1]?.totalValue ?? 0)} |{" "}
                <strong>Investido:</strong> {money(equity.data.points[equity.data.points.length - 1]?.invested ?? 0)} |{" "}
                <strong>P&L:</strong> {pct(equity.data.points[equity.data.points.length - 1]?.pnlPct ?? 0)}
              </p>
            </>
          )}
        </section>
      )}

      {/* Proventos Agregados */}
      <section style={{ marginBottom: 32 }}>
        <h2>Proventos Agregados</h2>
        {dividends.isError && <p style={{ color: "#b91c1c" }}>{(dividends.error as Error).message}</p>}
        {dividends.data && (
          <>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={dividendChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="symbol" type="category" width={60} />
                  <Tooltip />
                  <Bar dataKey="totalReceived" fill="#2563eb" name="Total Recebido" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th align="left" style={{ padding: 8 }}>Ativo</th>
                  <th align="left" style={{ padding: 8 }}>Classe</th>
                  <th align="right" style={{ padding: 8 }}>Total Recebido</th>
                  <th align="right" style={{ padding: 8 }}>Eventos</th>
                  <th align="right" style={{ padding: 8 }}>Yield on Cost</th>
                  <th align="left" style={{ padding: 8 }}>Primeiro</th>
                  <th align="left" style={{ padding: 8 }}>Último</th>
                </tr>
              </thead>
              <tbody>
                {dividends.data.summaries.map((s) => (
                  <tr key={s.assetId} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}><strong>{s.symbol}</strong></td>
                    <td style={{ padding: 8 }}>{s.assetClass}</td>
                    <td align="right" style={{ padding: 8 }}>{money(s.totalReceived)}</td>
                    <td align="right" style={{ padding: 8 }}>{s.dividendCount}</td>
                    <td align="right" style={{ padding: 8 }}>{s.yieldOnCost ? pct(s.yieldOnCost) : "—"}</td>
                    <td style={{ padding: 8 }}>{s.firstPayment ?? "—"}</td>
                    <td style={{ padding: 8 }}>{s.lastPayment ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Rentabilidade por Classe */}
      <section>
        <h2>Rentabilidade por Classe de Ativo</h2>
        {classReturns.isError && <p style={{ color: "#b91c1c" }}>{(classReturns.error as Error).message}</p>}
        {classReturns.data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={classChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="class" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="pnlPct" fill="#2563eb" name="P&L %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={classChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="class" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="allocationPct" fill="#16a34a" name="Alocação %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th align="left" style={{ padding: 8 }}>Classe</th>
                  <th align="right" style={{ padding: 8 }}>Investido</th>
                  <th align="right" style={{ padding: 8 }}>Valor Atual</th>
                  <th align="right" style={{ padding: 8 }}>P&L</th>
                  <th align="right" style={{ padding: 8 }}>P&L %</th>
                  <th align="right" style={{ padding: 8 }}>Alocação %</th>
                </tr>
              </thead>
              <tbody>
                {classReturns.data.classReturns.map((c) => (
                  <tr key={c.assetClass} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}><strong>{c.assetClass}</strong></td>
                    <td align="right" style={{ padding: 8 }}>{money(c.invested)}</td>
                    <td align="right" style={{ padding: 8 }}>{money(c.currentValue)}</td>
                    <td align="right" style={{ padding: 8, color: c.pnl >= 0 ? "#16a34a" : "#dc2626" }}>
                      {money(c.pnl)}
                    </td>
                    <td align="right" style={{ padding: 8, color: c.pnlPct >= 0 ? "#16a34a" : "#dc2626" }}>
                      {pct(c.pnlPct)}
                    </td>
                    <td align="right" style={{ padding: 8 }}>{pct(c.allocationPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {classReturns.data.classReturns.length > 0 && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>Detalhar ativos por classe</summary>
                {classReturns.data.classReturns.map((c) => (
                  <div key={c.assetClass} style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
                    <h4 style={{ margin: "0 0 8px" }}>{c.assetClass} — {c.assets.length} ativos</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#e5e7eb" }}>
                          <th align="left" style={{ padding: 6 }}>Ativo</th>
                          <th align="right" style={{ padding: 6 }}>Investido</th>
                          <th align="right" style={{ padding: 6 }}>Atual</th>
                          <th align="right" style={{ padding: 6 }}>P&L</th>
                          <th align="right" style={{ padding: 6 }}>P&L %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.assets.map((a) => (
                          <tr key={a.symbol} style={{ borderTop: "1px solid #e5e7eb" }}>
                            <td style={{ padding: 6 }}>{a.symbol}</td>
                            <td align="right" style={{ padding: 6 }}>{money(a.invested)}</td>
                            <td align="right" style={{ padding: 6 }}>{money(a.currentValue)}</td>
                            <td align="right" style={{ padding: 6, color: a.pnl >= 0 ? "#16a34a" : "#dc2626" }}>
                              {money(a.pnl)}
                            </td>
                            <td align="right" style={{ padding: 6, color: a.pnlPct >= 0 ? "#16a34a" : "#dc2626" }}>
                              {pct(a.pnlPct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}