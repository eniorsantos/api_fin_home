import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface EquityPoint {
  date: string;
  totalValue: number;
  invested: number;
  pnl: number;
  pnlPct: number;
}

export interface DividendSummary {
  assetId: string;
  symbol: string;
  assetClass: string;
  totalReceived: number;
  dividendCount: number;
  byKind: Record<string, { amount: number; count: number }>;
  firstPayment: string | null;
  lastPayment: string | null;
  yieldOnCost: number | null;
}

export interface ClassReturn {
  assetClass: string;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  allocationPct: number;
  assets: Array<{
    symbol: string;
    invested: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
  }>;
}

export async function getPortfolioEquityEvolution(
  portfolioId: string,
  from: Date,
  to: Date
): Promise<EquityPoint[]> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      txs: {
        where: { tradedAt: { lte: to } },
        orderBy: { tradedAt: "asc" },
        include: { asset: { include: { prices: { where: { date: { gte: from, lte: to } }, orderBy: { date: "asc" } } } } },
      },
    },
  });

  if (!portfolio) throw new Error("Portfolio not found");

  const allDates = new Set<string>();
  for (const tx of portfolio.txs) {
    for (const price of tx.asset.prices) {
      allDates.add(price.date.toISOString().slice(0, 10));
    }
  }
  allDates.add(from.toISOString().slice(0, 10));
  allDates.add(to.toISOString().slice(0, 10));

  const sortedDates = [...allDates].sort();

  const points: EquityPoint[] = [];
  const runningQty: Record<string, number> = {};
  const runningInvested: Record<string, number> = {};

  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);

    for (const tx of portfolio.txs) {
      if (tx.tradedAt <= date) {
        const sym = tx.asset.symbol;
        const qty = Number(tx.quantity);
        const price = Number(tx.unitPrice);
        const fees = Number(tx.fees || 0);

        if (tx.type === "BUY") {
          runningQty[sym] = (runningQty[sym] || 0) + qty;
          runningInvested[sym] = (runningInvested[sym] || 0) + qty * price + fees;
        } else {
          runningQty[sym] = (runningQty[sym] || 0) - qty;
          const invested = runningInvested[sym] || 0;
          const avgPrice = invested / (runningQty[sym] + qty);
          runningInvested[sym] = invested - qty * avgPrice;
        }
      }
    }

    let totalValue = 0;
    let totalInvested = 0;

    for (const [sym, qty] of Object.entries(runningQty)) {
      if (qty > 0) {
        const tx = portfolio.txs.find((t) => t.asset.symbol === sym);
        if (tx) {
          const prices = tx.asset.prices.filter((p) => p.date <= date);
          const latestPrice = prices[prices.length - 1];
          const price = latestPrice ? Number(latestPrice.adjustedClose ?? latestPrice.close) : 0;
          totalValue += qty * price;
        }
        totalInvested += runningInvested[sym] || 0;
      }
    }

    const pnl = totalValue - totalInvested;
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    points.push({
      date: dateStr,
      totalValue,
      invested: totalInvested,
      pnl,
      pnlPct,
    });
  }

  return points;
}

export async function getAggregatedDividends(
  userId: string,
  from: Date,
  to: Date
): Promise<DividendSummary[]> {
  const dividends = await prisma.dividend.findMany({
    where: {
      userId,
      paymentDate: { gte: from, lte: to },
    },
    include: { asset: true },
    orderBy: { paymentDate: "asc" },
  });

  const byAsset = new Map<string, typeof dividends>();

  for (const d of dividends) {
    const key = d.assetId;
    if (!byAsset.has(key)) byAsset.set(key, []);
    byAsset.get(key)!.push(d);
  }

  const summaries: DividendSummary[] = [];

  for (const [assetId, divs] of byAsset) {
    const asset = divs[0]!.asset;
    const totalReceived = divs.reduce((sum, d) => sum + Number(d.amountPerUnit), 0);
    const byKind: Record<string, { amount: number; count: number }> = {};

    for (const d of divs) {
      const kind = d.kind;
      if (!byKind[kind]) byKind[kind] = { amount: 0, count: 0 };
      byKind[kind].amount += Number(d.amountPerUnit);
      byKind[kind].count += 1;
    }

    const firstPayment = divs[0]!.paymentDate.toISOString().slice(0, 10) ?? null;
    const lastPayment = divs[divs.length - 1]!.paymentDate.toISOString().slice(0, 10) ?? null;

    const avgPrice = await getAverageBuyPrice(assetId, firstPayment ? new Date(firstPayment) : undefined);
    const yieldOnCost = avgPrice && avgPrice > 0 ? (totalReceived / avgPrice) * 100 : null;

    summaries.push({
      assetId,
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      totalReceived,
      dividendCount: divs.length,
      byKind,
      firstPayment,
      lastPayment,
      yieldOnCost,
    });
  }

  return summaries.sort((a, b) => b.totalReceived - a.totalReceived);
}

async function getAverageBuyPrice(assetId: string, until?: Date): Promise<number | null> {
  const txs = await prisma.transaction.findMany({
    where: {
      assetId,
      type: "BUY",
      ...(until ? { tradedAt: { lte: until } } : {}),
    },
    orderBy: { tradedAt: "asc" },
  });

  if (!txs.length) return null;

  let totalQty = 0;
  let totalCost = 0;

  for (const tx of txs) {
    const qty = Number(tx.quantity);
    const price = Number(tx.unitPrice);
    const fees = Number(tx.fees || 0);
    totalQty += qty;
    totalCost += qty * price + fees;
  }

  return totalQty > 0 ? totalCost / totalQty : null;
}

export async function getReturnsByClass(
  userId: string,
  from: Date,
  to: Date
): Promise<ClassReturn[]> {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: {
      txs: {
        where: { tradedAt: { lte: to } },
        include: { asset: { include: { prices: { where: { date: { gte: from, lte: to } }, orderBy: { date: "asc" } } } } },
      },
    },
  });

  const classData = new Map<string, ClassReturn["assets"]>();

  for (const pf of portfolios) {
    for (const tx of pf.txs) {
      const asset = tx.asset;
      const sym = asset.symbol;
      const cls = asset.assetClass;

      if (!classData.has(cls)) classData.set(cls, []);

      const prices = asset.prices;
      const latestPrice = prices[prices.length - 1];
      const currentPrice = latestPrice ? Number(latestPrice.adjustedClose ?? latestPrice.close) : 0;

      if (currentPrice === 0) continue;

      let qty = 0;
      let invested = 0;
      for (const t of pf.txs.filter((t) => t.assetId === asset.id && t.tradedAt <= to)) {
        const q = Number(t.quantity);
        const p = Number(t.unitPrice);
        const f = Number(t.fees || 0);
        if (t.type === "BUY") {
          qty += q;
          invested += q * p + f;
        } else {
          const avg = invested / (qty + q);
          qty -= q;
          invested -= q * avg;
        }
      }

      if (qty > 0) {
        const currentValue = qty * currentPrice;
        const pnl = currentValue - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

        classData.get(cls)!.push({
          symbol: sym,
          invested,
          currentValue,
          pnl,
          pnlPct,
        });
      }
    }
  }

  const results: ClassReturn[] = [];

  for (const [assetClass, assets] of classData) {
    const totalInvested = assets.reduce((sum, a) => sum + a.invested, 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    results.push({
      assetClass,
      invested: totalInvested,
      currentValue: totalCurrentValue,
      pnl: totalPnl,
      pnlPct: totalPnlPct,
      allocationPct: 0,
      assets: assets.sort((a, b) => b.currentValue - a.currentValue),
    });
  }

  const grandTotal = results.reduce((sum, r) => sum + r.currentValue, 0);
  for (const r of results) {
    r.allocationPct = grandTotal > 0 ? (r.currentValue / grandTotal) * 100 : 0;
  }

  return results.sort((a, b) => b.currentValue - a.currentValue);
}