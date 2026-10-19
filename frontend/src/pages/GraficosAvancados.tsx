import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  Line,
} from "recharts";
import { api, type PriceBar } from "../lib/api";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OHLCChart({ data, symbol }: { data: PriceBar[]; symbol: string }) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.open !== null && d.high !== null && d.low !== null && d.close !== null)
      .map((d) => ({
        date: d.date,
        open: d.open!,
        high: d.high!,
        low: d.low!,
        close: d.close!,
        volume: d.volume ? Number(d.volume) : 0,
      }));
  }, [data]);

  if (chartData.length === 0) return <p>Sem dados OHLC válidos para {symbol}</p>;

  return (
    <div style={{ height: 400 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={40} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" width={60} />
          <Tooltip />
          <Legend />
          {/* OHLC represented as lines for high/low and bar for open/close */}
          <Line
            dataKey="high"
            stroke="#6b7280"
            strokeWidth={1}
            dot={false}
            yAxisId="left"
            name="High"
            connectNulls
          />
          <Line
            dataKey="low"
            stroke="#6b7280"
            strokeWidth={1}
            dot={false}
            yAxisId="left"
            name="Low"
            connectNulls
          />
          <Bar
            dataKey="open"
            yAxisId="left"
            fill="#6b7280"
            fillOpacity={0.5}
            name="Open"
            maxBarSize={4}
          />
          <Bar
            dataKey="close"
            yAxisId="left"
            fill="#2563eb"
            fillOpacity={0.8}
            name="Close"
            maxBarSize={4}
          />
          <Bar dataKey="volume" yAxisId="right" fill="#6b7280" fillOpacity={0.3} name="Volume" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeChart({ data }: { data: PriceBar[] }) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.volume !== null)
      .map((d, idx) => ({
        date: d.date,
        volume: Number(d.volume),
        close: d.close ?? 0,
        open: d.open ?? 0,
        index: idx,
        color: d.close !== null && d.open !== null && d.close >= d.open ? "#16a34a" : "#dc2626",
      }));
  }, [data]);

  if (chartData.length === 0) return <p>Sem dados de volume</p>;

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={40} />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="volume"
            fill="#6b7280"
            fillOpacity={0.7}
            name="Volume"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReturnsHistogram({ data }: { data: PriceBar[] }) {
  const chartData = useMemo(() => {
    const bars = data
      .filter((d) => d.adjustedClose !== null || d.close !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (bars.length < 2) return [];

    const returns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const prevBar = bars[i - 1];
      const currBar = bars[i];
      if (!prevBar || !currBar) continue;
      const prev = prevBar.adjustedClose ?? prevBar.close;
      const curr = currBar.adjustedClose ?? currBar.close;
      if (prev && prev > 0 && curr !== null) {
        returns.push(((curr - prev) / prev) * 100);
      }
    }
    return returns;
  }, [data]);

  if (chartData.length === 0) return <p>Dados insuficientes para histograma</p>;

  const min = Math.min(...chartData);
  const max = Math.max(...chartData);
  const binCount = Math.min(30, Math.max(10, Math.floor(Math.sqrt(chartData.length))));
  const binWidth = (max - min) / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    range: `${(min + i * binWidth).toFixed(2)}% - ${(min + (i + 1) * binWidth).toFixed(2)}%`,
    count: chartData.filter((r) => r >= min + i * binWidth && r < min + (i + 1) * binWidth).length,
  }));

  const mean = chartData.length > 0 ? chartData.reduce((a, b) => a + b, 0) / chartData.length : 0;
  const sorted = [...chartData].sort((a, b) => a - b);
  const median: number = sorted.length > 0 ? (sorted[Math.floor(sorted.length / 2)] ?? 0) : 0;
  const variance = chartData.length > 0 ? chartData.reduce((sum, r) => sum + (r - mean) ** 2, 0) / chartData.length : 0;
  const stdDev = Math.sqrt(variance);

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={bins}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" tickLine={false} tick={{ textAnchor: "end", dy: 10, dx: -10 }} />
          <YAxis />
          <Tooltip formatter={(v: number) => [`${v} dias`, "Frequência"]} />
          <Bar dataKey="count" fill="#2563eb" name="Frequência" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
        Média: {mean.toFixed(2)}% | Mediana: {median.toFixed(2)}% | Std Dev: {stdDev.toFixed(2)}%
      </p>
    </div>
  );
}

function DrawdownArea({ data }: { data: PriceBar[] }) {
  const chartData = useMemo(() => {
    const bars = data
      .filter((d) => d.adjustedClose !== null || d.close !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (bars.length === 0) return [];

    const prices = bars.map((b) => b.adjustedClose ?? b.close!);
    let peak = prices[0]!;
    return bars.map((b) => {
      const price = b.adjustedClose ?? b.close!;
      peak = Math.max(peak, price);
      const dd = ((price - peak) / peak) * 100;
      return { date: b.date, drawdown: dd, price };
    });
  }, [data]);

  if (chartData.length === 0) return <p>Sem dados para drawdown</p>;

  return (
    <div style={{ height: 250 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={40} />
          <YAxis domain={["auto", 0]} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, "Drawdown"]} />
          <Area dataKey="drawdown" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GraficosAvancados() {
  const [symbol, setSymbol] = useState("");
  const [from, setFrom] = useState(iso(new Date(Date.now() - 365 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [source, setSource] = useState("");
  const [chartType, setChartType] = useState<"candle" | "volume" | "returns" | "drawdown">("candle");

  const setChartTypeSafe = (t: "candle" | "volume" | "returns" | "drawdown") => setChartType(t);

  const assets = useQuery({ queryKey: ["assets"], queryFn: api.assets });
  const prices = useQuery({
    queryKey: ["prices", symbol, from, to],
    enabled: !!symbol,
    queryFn: () => api.prices(symbol, from, to),
  });

  return (
    <div>
      <h1>Gráficos Avançados</h1>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ minWidth: 150 }}>
          <option value="">Selecione ativo</option>
          {assets.data?.map((a) => (
            <option key={a.id} value={a.symbol}>
              {a.symbol} - {a.name}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={source} onChange={(e) => setSource(e.target.value)} title="Fonte dos preços">
          <option value="">Preferencial</option>
          <option value="BRAPI">Automático (brapi)</option>
          <option value="MANUAL">Manual</option>
        </select>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {(["candle", "volume", "returns", "drawdown"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartTypeSafe(t)}
              style={{
                padding: "6px 12px",
                background: chartType === t ? "#2563eb" : "#e5e7eb",
                color: chartType === t ? "white" : "#374151",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {t === "candle" ? "OHLC" : t === "volume" ? "Volume" : t === "returns" ? "Histograma Retornos" : "Drawdown"}
            </button>
          ))}
        </div>
      </section>

      {prices.isError && <p style={{ color: "#b91c1c" }}>{(prices.error as Error).message}</p>}
      {prices.isLoading && <p>Carregando dados...</p>}

      {prices.data && prices.data.length > 0 && (
        <>
          <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
            <strong>{symbol}</strong> — {prices.data.length} barras de {prices.data[0]?.date ?? ""} a {prices.data[prices.data.length - 1]?.date ?? ""}
            <span style={{ marginLeft: 16 }}>Último: {money(prices.data[prices.data.length - 1]?.close ?? 0)}</span>
          </div>

          {chartType === "candle" && <OHLCChart data={prices.data} symbol={symbol} />}
          {chartType === "volume" && <VolumeChart data={prices.data} />}
          {chartType === "returns" && <ReturnsHistogram data={prices.data} />}
          {chartType === "drawdown" && <DrawdownArea data={prices.data} />}
        </>
      )}

      {!symbol && <p style={{ color: "#6b7280" }}>Selecione um ativo para visualizar os gráficos.</p>}
    </div>
  );
}