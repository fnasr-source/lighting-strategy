import { getAdminDb } from '@/lib/firebase-admin';

const DEFAULT_RATE = 1;

const hardcodedUsdRates: Record<string, number> = {
  AED: 0.2723,
  EGP: 0.0202,
  SAR: 0.2666,
  USD: 1,
};

function toUsd(amount: number, currency: string): number {
  const rate = hardcodedUsdRates[currency.toUpperCase()] ?? DEFAULT_RATE;
  return amount * rate;
}

function fromUsd(amount: number, currency: string): number {
  const rate = hardcodedUsdRates[currency.toUpperCase()] ?? DEFAULT_RATE;
  if (rate === 0) return amount;
  return amount / rate;
}

export async function getDailyFxRate(fromCurrency: string, toCurrency: string, date: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const db = getAdminDb();
  const key = `${date}_${fromCurrency}_${toCurrency}`;

  const doc = await db.collection('fxRates').doc(key).get();
  if (doc.exists) {
    const data = doc.data();
    if (typeof data?.rate === 'number' && data.rate > 0) return data.rate;
  }

  // Fallback deterministic converter using static USD map.
  const usdAmount = toUsd(1, fromCurrency);
  return fromUsd(usdAmount, toCurrency);
}

export async function normalizeCurrencyAmount(params: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  date: string;
}): Promise<{ rate: number; normalized: number }> {
  const rate = await getDailyFxRate(params.fromCurrency, params.toCurrency, params.date);
  return {
    rate,
    normalized: params.amount * rate,
  };
}
