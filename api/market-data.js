// /api/market-data.js
// Fetches monthly adjusted prices from Alpha Vantage, computes 5-year annualized return + volatility
// Caches results in-memory (refreshes every 24 hours)

let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// All tickers we need data for (UNIVERSE + ALL_ASSETS)
const TICKERS = [
  'VTI', 'VXUS', 'BND', 'SCHD', 'QQQ', 'VTIP', 'VOO', 'VIG', 'GLD', 'TLT', 'VNQ', 'ARKK',
  'COST', 'V', 'UNH', 'MSFT', 'LLY', 'BRK-B', 'JNJ', 'AAPL', 'NVDA', 'AMZN', 'GOOGL',
  'META', 'TSLA', 'JPM', 'HD', 'ABBV', 'XOM', 'KO', 'WMT', 'O', 'PG', 'DIS',
];

// Fallback estimates if API fails
const FALLBACKS = {
  VTI: { expReturn: 0.13, vol: 0.15 }, VXUS: { expReturn: 0.08, vol: 0.16 },
  BND: { expReturn: 0.045, vol: 0.05 }, SCHD: { expReturn: 0.105, vol: 0.14 },
  QQQ: { expReturn: 0.17, vol: 0.20 }, VTIP: { expReturn: 0.035, vol: 0.03 },
  COST: { expReturn: 0.18, vol: 0.20 }, V: { expReturn: 0.16, vol: 0.20 },
  UNH: { expReturn: 0.16, vol: 0.22 }, MSFT: { expReturn: 0.20, vol: 0.25 },
  LLY: { expReturn: 0.22, vol: 0.30 }, 'BRK-B': { expReturn: 0.13, vol: 0.17 },
  JNJ: { expReturn: 0.08, vol: 0.15 }, AAPL: { expReturn: 0.12, vol: 0.24 },
  NVDA: { expReturn: 0.18, vol: 0.45 }, AMZN: { expReturn: 0.13, vol: 0.28 },
  GOOGL: { expReturn: 0.12, vol: 0.25 }, META: { expReturn: 0.13, vol: 0.32 },
  TSLA: { expReturn: 0.15, vol: 0.55 }, JPM: { expReturn: 0.10, vol: 0.20 },
  VOO: { expReturn: 0.13, vol: 0.15 }, VIG: { expReturn: 0.085, vol: 0.13 },
  GLD: { expReturn: 0.06, vol: 0.15 }, TLT: { expReturn: 0.04, vol: 0.14 },
  VNQ: { expReturn: 0.08, vol: 0.18 }, ARKK: { expReturn: 0.12, vol: 0.40 },
  HD: { expReturn: 0.11, vol: 0.20 }, ABBV: { expReturn: 0.10, vol: 0.20 },
  XOM: { expReturn: 0.09, vol: 0.22 }, KO: { expReturn: 0.07, vol: 0.12 },
  WMT: { expReturn: 0.09, vol: 0.15 }, O: { expReturn: 0.08, vol: 0.16 },
  PG: { expReturn: 0.08, vol: 0.13 }, DIS: { expReturn: 0.08, vol: 0.25 },
};

async function fetchTickerData(ticker, apiKey) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const ts = json['Monthly Adjusted Time Series'];
    if (!ts) return null;

    // Get last 60 months (5 years) of adjusted close prices
    const entries = Object.entries(ts).slice(0, 61); // 61 to get 60 monthly returns
    if (entries.length < 13) return null; // need at least 1 year

    const prices = entries.map(([date, vals]) => parseFloat(vals['5. adjusted close']));

    // Monthly returns
    const returns = [];
    for (let i = 0; i < prices.length - 1; i++) {
      returns.push((prices[i] - prices[i + 1]) / prices[i + 1]);
    }

    // Annualized return from CAGR
    const years = returns.length / 12;
    const totalReturn = prices[0] / prices[prices.length - 1];
    const annReturn = Math.pow(totalReturn, 1 / years) - 1;

    // Annualized volatility from monthly standard deviation
    const avgMonthly = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - avgMonthly, 2), 0) / (returns.length - 1);
    const monthlyVol = Math.sqrt(variance);
    const annVol = monthlyVol * Math.sqrt(12);

    // Current price (most recent close)
    const currentPrice = prices[0];

    return {
      ticker: ticker === 'BRK-B' ? 'BRK.B' : ticker,
      expReturn: Math.round(annReturn * 1000) / 1000,
      vol: Math.round(annVol * 1000) / 1000,
      price: Math.round(currentPrice * 100) / 100,
      dataPoints: returns.length,
      asOf: entries[0][0],
    };
  } catch (e) {
    console.error(`Failed to fetch ${ticker}:`, e.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Return cached data if fresh
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.json({ source: 'cache', ...cache.data });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    // No API key — return fallbacks
    const fallbackData = {};
    for (const [ticker, vals] of Object.entries(FALLBACKS)) {
      const t = ticker === 'BRK-B' ? 'BRK.B' : ticker;
      fallbackData[t] = { ...vals, price: null, source: 'fallback' };
    }
    return res.json({ source: 'fallback', tickers: fallbackData, message: 'No Alpha Vantage API key configured' });
  }

  // Fetch data for all tickers (respecting rate limits — 25/day free tier)
  // We batch in groups of 5 with 15s delay (free tier: 5 req/min)
  const results = {};
  const batches = [];
  for (let i = 0; i < TICKERS.length; i += 5) {
    batches.push(TICKERS.slice(i, i + 5));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const promises = batch.map(t => fetchTickerData(t, apiKey));
    const batchResults = await Promise.all(promises);

    for (const r of batchResults) {
      if (r) {
        results[r.ticker] = r;
      }
    }

    // Rate limit: wait 15s between batches (except last)
    if (b < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  // Fill in any missing tickers with fallbacks
  for (const [ticker, vals] of Object.entries(FALLBACKS)) {
    const t = ticker === 'BRK-B' ? 'BRK.B' : ticker;
    if (!results[t]) {
      results[t] = { ...vals, ticker: t, price: null, source: 'fallback' };
    }
  }

  // Cache the results
  cache = { data: { tickers: results }, timestamp: Date.now() };

  return res.json({ source: 'live', tickers: results });
};
