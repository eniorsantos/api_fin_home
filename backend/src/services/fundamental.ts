import { z } from "zod";

export interface FundamentalMetrics {
  trailingPE: number | null;
  priceToBook: number | null;
  enterpriseToEbitda: number | null;
  enterpriseToRevenue: number | null;
  pegRatio: number | null;
  earningsPerShare: number | null;
  bookValuePerShare: number | null;
  netMargin: number | null;
  enterpriseValue: number | null;
  fiftyTwoWeekChange: number | null;
  dividendYield: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  grossMargin: number | null;
  ebitdaMargin: number | null;
  operatingMargin: number | null;
  debtToEquity: number | null;
  netDebtToEbitda: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  totalRevenue: number | null;
  ebitda: number | null;
  freeCashflow: number | null;
  totalDebt: number | null;
  totalCash: number | null;
}

export interface ScorecardResult {
  symbol: string;
  name: string | null;
  sector: string | null;
  overallScore: number;
  valuationScore: number;
  profitabilityScore: number;
  growthScore: number;
  financialHealthScore: number;
  dividendScore: number;
  details: {
    valuation: MetricScore[];
    profitability: MetricScore[];
    growth: MetricScore[];
    financialHealth: MetricScore[];
    dividend: MetricScore[];
  };
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL" | "INSUFFICIENT_DATA";
}

export interface MetricScore {
  name: string;
  value: number | null;
  score: number;
  weight: number;
  benchmark: number | null;
  interpretation: string;
}

function scoreMetric(
  value: number | null,
  benchmarks: { good: number; bad: number },
  higherIsBetter: boolean,
  weight: number
): MetricScore {
  if (value === null) {
    return {
      name: "",
      value: null,
      score: 50,
      weight,
      benchmark: higherIsBetter ? benchmarks.good : benchmarks.bad,
      interpretation: "Dados indisponíveis",
    };
  }

  let score: number;
  if (higherIsBetter) {
    if (value >= benchmarks.good) score = 100;
    else if (value <= benchmarks.bad) score = 0;
    else score = ((value - benchmarks.bad) / (benchmarks.good - benchmarks.bad)) * 100;
  } else {
    if (value <= benchmarks.good) score = 100;
    else if (value >= benchmarks.bad) score = 0;
    else score = ((benchmarks.bad - value) / (benchmarks.bad - benchmarks.good)) * 100;
  }

  return {
    name: "",
    value,
    score: Math.round(Math.max(0, Math.min(100, score))),
    weight,
    benchmark: higherIsBetter ? benchmarks.good : benchmarks.bad,
    interpretation: score >= 70 ? "Bom" : score >= 40 ? "Regular" : "Ruim",
  };
}

const VALUATION_BENCHMARKS = {
  trailingPE: { good: 15, bad: 30, higherIsBetter: false, weight: 0.3 },
  priceToBook: { good: 1.5, bad: 3, higherIsBetter: false, weight: 0.2 },
  enterpriseToEbitda: { good: 10, bad: 20, higherIsBetter: false, weight: 0.25 },
  pegRatio: { good: 1, bad: 2, higherIsBetter: false, weight: 0.15 },
  enterpriseToRevenue: { good: 2, bad: 5, higherIsBetter: false, weight: 0.1 },
};

const PROFITABILITY_BENCHMARKS = {
  netMargin: { good: 15, bad: 5, higherIsBetter: true, weight: 0.25 },
  returnOnEquity: { good: 15, bad: 8, higherIsBetter: true, weight: 0.3 },
  returnOnAssets: { good: 7, bad: 3, higherIsBetter: true, weight: 0.2 },
  grossMargin: { good: 40, bad: 20, higherIsBetter: true, weight: 0.15 },
  ebitdaMargin: { good: 20, bad: 10, higherIsBetter: true, weight: 0.1 },
};

const GROWTH_BENCHMARKS = {
  revenueGrowth: { good: 10, bad: 0, higherIsBetter: true, weight: 0.4 },
  earningsGrowth: { good: 15, bad: 0, higherIsBetter: true, weight: 0.4 },
  fiftyTwoWeekChange: { good: 10, bad: -10, higherIsBetter: true, weight: 0.2 },
};

const FINANCIAL_HEALTH_BENCHMARKS = {
  debtToEquity: { good: 0.5, bad: 2, higherIsBetter: false, weight: 0.3 },
  netDebtToEbitda: { good: 2, bad: 4, higherIsBetter: false, weight: 0.25 },
  currentRatio: { good: 2, bad: 1, higherIsBetter: true, weight: 0.25 },
  quickRatio: { good: 1.5, bad: 0.5, higherIsBetter: true, weight: 0.2 },
};

const DIVIDEND_BENCHMARKS = {
  dividendYield: { good: 4, bad: 1, higherIsBetter: true, weight: 0.6 },
  freeCashflow: { good: 0, bad: -1000000000, higherIsBetter: true, weight: 0.4 },
};

function computeCategoryScore(
  metrics: FundamentalMetrics,
  benchmarks: Record<string, { good: number; bad: number; higherIsBetter: boolean; weight: number }>
): MetricScore[] {
  const results: MetricScore[] = [];

  for (const [key, config] of Object.entries(benchmarks)) {
    const value = metrics[key as keyof FundamentalMetrics];
    const scored = scoreMetric(value, { good: config.good, bad: config.bad }, config.higherIsBetter, config.weight);
    scored.name = key;
    results.push(scored);
  }

  return results;
}

function weightedAverage(scores: MetricScore[]): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 50;
  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function getRecommendation(overallScore: number, hasData: boolean): ScorecardResult["recommendation"] {
  if (!hasData) return "INSUFFICIENT_DATA";
  if (overallScore >= 80) return "STRONG_BUY";
  if (overallScore >= 65) return "BUY";
  if (overallScore >= 45) return "HOLD";
  if (overallScore >= 30) return "SELL";
  return "STRONG_SELL";
}

export function computeScorecard(
  symbol: string,
  name: string | null,
  sector: string | null,
  metrics: FundamentalMetrics
): ScorecardResult {
  const hasAnyData = Object.values(metrics).some((v) => v !== null);

  const valuation = computeCategoryScore(metrics, VALUATION_BENCHMARKS);
  const profitability = computeCategoryScore(metrics, PROFITABILITY_BENCHMARKS);
  const growth = computeCategoryScore(metrics, GROWTH_BENCHMARKS);
  const financialHealth = computeCategoryScore(metrics, FINANCIAL_HEALTH_BENCHMARKS);
  const dividend = computeCategoryScore(metrics, DIVIDEND_BENCHMARKS);

  const valuationScore = weightedAverage(valuation);
  const profitabilityScore = weightedAverage(profitability);
  const growthScore = weightedAverage(growth);
  const financialHealthScore = weightedAverage(financialHealth);
  const dividendScore = weightedAverage(dividend);

  const overallScore = Math.round(
    valuationScore * 0.25 +
    profitabilityScore * 0.25 +
    growthScore * 0.2 +
    financialHealthScore * 0.2 +
    dividendScore * 0.1
  );

  return {
    symbol,
    name,
    sector,
    overallScore,
    valuationScore,
    profitabilityScore,
    growthScore,
    financialHealthScore,
    dividendScore,
    details: { valuation, profitability, growth, financialHealth, dividend },
    recommendation: getRecommendation(overallScore, hasAnyData),
  };
}

export const ScorecardResultSchema = z.object({
  symbol: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  overallScore: z.number().int().min(0).max(100),
  valuationScore: z.number().int().min(0).max(100),
  profitabilityScore: z.number().int().min(0).max(100),
  growthScore: z.number().int().min(0).max(100),
  financialHealthScore: z.number().int().min(0).max(100),
  dividendScore: z.number().int().min(0).max(100),
  details: z.object({
    valuation: z.array(z.object({ name: z.string(), value: z.number().nullable(), score: z.number().int().min(0).max(100), weight: z.number(), benchmark: z.number().nullable(), interpretation: z.string() })),
    profitability: z.array(z.object({ name: z.string(), value: z.number().nullable(), score: z.number().int().min(0).max(100), weight: z.number(), benchmark: z.number().nullable(), interpretation: z.string() })),
    growth: z.array(z.object({ name: z.string(), value: z.number().nullable(), score: z.number().int().min(0).max(100), weight: z.number(), benchmark: z.number().nullable(), interpretation: z.string() })),
    financialHealth: z.array(z.object({ name: z.string(), value: z.number().nullable(), score: z.number().int().min(0).max(100), weight: z.number(), benchmark: z.number().nullable(), interpretation: z.string() })),
    dividend: z.array(z.object({ name: z.string(), value: z.number().nullable(), score: z.number().int().min(0).max(100), weight: z.number(), benchmark: z.number().nullable(), interpretation: z.string() })),
  }),
  recommendation: z.enum(["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL", "INSUFFICIENT_DATA"]),
});
export type ScorecardResultSchema = z.infer<typeof ScorecardResultSchema>;

export const ScorecardResponseSchema = z.object({
  results: z.array(ScorecardResultSchema),
});
export type ScorecardResponse = z.infer<typeof ScorecardResponseSchema>;