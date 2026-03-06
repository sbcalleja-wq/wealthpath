import { useState, useMemo, useCallback, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

/* ═══════════════════════════════════════════
   CONSTANTS & DATA
   ═══════════════════════════════════════════ */
const INFLATION = 0.03;
const RF = 0.043;
const SP500 = { expReturn: 0.10, vol: 0.16, div: 0.013 };

const QUIZ = [
  { q: "If your portfolio dropped 25% in one month, what would you do?", opts: [
    { text: "Sell everything immediately", score: 1 },
    { text: "Sell some to reduce risk", score: 3 },
    { text: "Hold steady and wait", score: 6 },
    { text: "Buy more — stocks are on sale", score: 9 },
  ]},
  { q: "When do you need this money?", opts: [
    { text: "Within 3 years", score: 2 },
    { text: "3–7 years", score: 4 },
    { text: "7–15 years", score: 7 },
    { text: "15+ years — I'm in no rush", score: 9 },
  ]},
  { q: "What matters more to you?", opts: [
    { text: "Never losing money, even if gains are small", score: 1 },
    { text: "Mostly stable with some growth", score: 4 },
    { text: "Growth, even if it's bumpy sometimes", score: 7 },
    { text: "Maximum growth — I can handle big swings", score: 10 },
  ]},
  { q: "How would you describe your investment experience?", opts: [
    { text: "I'm brand new to investing", score: 2 },
    { text: "I have a 401k but don't think about it much", score: 4 },
    { text: "I actively manage some investments", score: 7 },
    { text: "I'm very experienced and follow markets closely", score: 9 },
  ]},
  { q: "If a friend told you about a 'hot stock' that could double or go to zero, you'd:", opts: [
    { text: "Ignore it completely", score: 2 },
    { text: "Research it but probably pass", score: 4 },
    { text: "Put a small amount in", score: 7 },
    { text: "Go big — high risk, high reward", score: 10 },
  ]},
];

const UNIVERSE = {
  conservative: [
    // ETF core — stability + income
    { ticker: "SCHD", name: "Schwab US Dividend Equity", type: "ETF", sector: "Dividend", expReturn: 0.105, vol: 0.14, div: 0.035, er: 0.06, taxEff: "low", color: "#B8A07E",
      inside: { count: "~100 stocks", top: ["Coca-Cola, PepsiCo (staples)", "Pfizer, AbbVie (healthcare)", "Broadcom, TI (tech)"], role: "Cash machine — companies that consistently pay & grow dividends" }},
    { ticker: "BND", name: "Vanguard Total Bond Market", type: "ETF", sector: "Bonds", expReturn: 0.045, vol: 0.05, div: 0.033, er: 0.03, taxEff: "low", color: "#7EB8A2",
      inside: { count: "~10,000 bonds", top: ["US Treasury bonds (~45%)", "Mortgage-backed securities (~25%)", "Corporate investment-grade (~25%)"], role: "Your safety net — steady income, cushions stock drops" }},
    // High-Sharpe low-vol stocks — outperform on risk-adjusted basis
    { ticker: "COST", name: "Costco Wholesale", type: "Stock", sector: "Consumer", expReturn: 0.18, vol: 0.20, div: 0.006, er: 0, taxEff: "hi", color: "#D97EA2",
      inside: { top: ["Membership warehouse retail (~70M households)", "Kirkland private label, gas stations"], role: "93% renewal rate — recession-resistant, best Sharpe ratio of any stock" }},
    { ticker: "BRK.B", name: "Berkshire Hathaway", type: "Stock", sector: "Diversified", expReturn: 0.13, vol: 0.17, div: 0, er: 0, taxEff: "hi", color: "#A2B8D4",
      inside: { top: ["GEICO, BNSF Railway, Berkshire Energy", "Massive stock portfolio: Apple, BofA, Coca-Cola"], role: "Buffett's conglomerate — like a diversified fund with the greatest investor at the helm" }},
    { ticker: "JNJ", name: "Johnson & Johnson", type: "Stock", sector: "Healthcare", expReturn: 0.08, vol: 0.15, div: 0.03, er: 0, taxEff: "low", color: "#D4A2A2",
      inside: { top: ["Pharmaceuticals (~55%), MedTech (~30%)", "Brands: Tylenol, Band-Aid, Neutrogena"], role: "Healthcare defensive — 60+ years of consecutive dividend increases" }},
  ],
  moderate: [
    // ETF core — broad market exposure
    { ticker: "VTI", name: "Vanguard Total Stock Market", type: "ETF", sector: "US Equity", expReturn: 0.13, vol: 0.15, div: 0.015, er: 0.03, taxEff: "hi", color: "#7EB8A2",
      inside: { count: "~3,700 stocks", top: ["Apple, Microsoft, NVIDIA (~15%)", "Amazon, Alphabet, Meta", "Plus thousands of mid & small caps"], role: "The whole US economy in one fund" }},
    { ticker: "VXUS", name: "Vanguard Total International", type: "ETF", sector: "Intl Equity", expReturn: 0.08, vol: 0.16, div: 0.03, er: 0.07, taxEff: "med", color: "#A2C4D9",
      inside: { count: "~8,500 stocks", top: ["Taiwan Semi, Samsung (Asia)", "Nestl\u00e9, LVMH (Europe)", "Emerging markets — India, Brazil, China"], role: "Global diversification — when the US stumbles, the world picks up slack" }},
    { ticker: "BND", name: "Vanguard Total Bond Market", type: "ETF", sector: "Bonds", expReturn: 0.045, vol: 0.05, div: 0.033, er: 0.03, taxEff: "low", color: "#D4A2A2",
      inside: { count: "~10,000 bonds", top: ["US Treasury bonds (~45%)", "Mortgage-backed (~25%)", "Corporate investment-grade (~25%)"], role: "Your stabilizer — barely moves when stocks drop 30%" }},
    // Top Sharpe stocks — add alpha without blowing up risk
    { ticker: "COST", name: "Costco Wholesale", type: "Stock", sector: "Consumer", expReturn: 0.18, vol: 0.20, div: 0.006, er: 0, taxEff: "hi", color: "#D97EA2",
      inside: { top: ["Membership warehouse (~70M households)", "Kirkland brand, 93% renewal rate"], role: "Best risk-adjusted stock we can find — steady growth, moderate volatility" }},
    { ticker: "V", name: "Visa Inc.", type: "Stock", sector: "Financials", expReturn: 0.16, vol: 0.20, div: 0.008, er: 0, taxEff: "hi", color: "#B8B0D9",
      inside: { top: ["Processes ~$15 trillion/year globally", "Takes a small cut of every card transaction"], role: "Toll booth on global spending — grows as the economy grows" }},
    { ticker: "UNH", name: "UnitedHealth Group", type: "Stock", sector: "Healthcare", expReturn: 0.16, vol: 0.22, div: 0.015, er: 0, taxEff: "hi", color: "#D9A2C4",
      inside: { top: ["Health insurance (UnitedHealthcare)", "Optum — data analytics, pharmacy, care delivery"], role: "Largest health insurer — aging population is a multi-decade tailwind" }},
  ],
  aggressive: [
    // ETF core — growth + diversification
    { ticker: "QQQ", name: "Invesco Nasdaq-100", type: "ETF", sector: "Tech Growth", expReturn: 0.17, vol: 0.20, div: 0.006, er: 0.20, taxEff: "hi", color: "#B8A07E",
      inside: { count: "100 stocks", top: ["Apple ~9%, Microsoft ~8%, NVIDIA ~7%", "Amazon, Broadcom, Meta ~5% each", "Zero financials — pure tech & innovation"], role: "Growth turbocharger — 100 largest non-financial Nasdaq companies" }},
    { ticker: "VTI", name: "Vanguard Total Stock Market", type: "ETF", sector: "US Equity", expReturn: 0.13, vol: 0.15, div: 0.015, er: 0.03, taxEff: "hi", color: "#7EB8A2",
      inside: { count: "~3,700 stocks", top: ["Apple, Microsoft, NVIDIA (~15%)", "Amazon, Alphabet, Meta", "Thousands of mid & small caps"], role: "Core US exposure — broad base under the growth bets" }},
    // High-conviction growth stocks — best Sharpe in their vol range
    { ticker: "MSFT", name: "Microsoft", type: "Stock", sector: "Technology", expReturn: 0.20, vol: 0.25, div: 0.008, er: 0, taxEff: "hi", color: "#D9C4A2",
      inside: { top: ["Azure cloud (~25% revenue), Office 365, Windows", "LinkedIn, Xbox, GitHub, AI/OpenAI partnership"], role: "Enterprise software king — cloud growth + AI integration across everything" }},
    { ticker: "LLY", name: "Eli Lilly", type: "Stock", sector: "Healthcare", expReturn: 0.22, vol: 0.30, div: 0.008, er: 0, taxEff: "hi", color: "#D9C48A",
      inside: { top: ["Mounjaro/Zepbound (GLP-1 diabetes/weight loss)", "Alzheimer's treatments, insulin"], role: "GLP-1 drug boom — one of the fastest-growing drugs in history" }},
    { ticker: "COST", name: "Costco Wholesale", type: "Stock", sector: "Consumer", expReturn: 0.18, vol: 0.20, div: 0.006, er: 0, taxEff: "hi", color: "#D97EA2",
      inside: { top: ["Membership warehouse, Kirkland brand", "93% renewal rate, recession-resistant"], role: "Highest Sharpe ratio stock — anchors risk while others swing" }},
    { ticker: "VXUS", name: "Vanguard Total International", type: "ETF", sector: "Intl Equity", expReturn: 0.08, vol: 0.16, div: 0.03, er: 0.07, taxEff: "med", color: "#A2C4D9",
      inside: { count: "~8,500 stocks", top: ["Taiwan Semi, Samsung (Asia)", "Nestl\u00e9, LVMH (Europe)", "Emerging markets — India, Brazil, China"], role: "Global reach — reduces US concentration risk" }},
  ],
};

// Full browsable universe for "Add Holding"
const ALL_ASSETS = [
  { ticker: "BND", name: "Vanguard Total Bond", type: "ETF", sector: "Bonds", expReturn: 0.042, vol: 0.05, div: 0.033, er: 0.03, color: "#7EB8A2" },
  { ticker: "SCHD", name: "Schwab Dividend Equity", type: "ETF", sector: "Dividend", expReturn: 0.09, vol: 0.14, div: 0.035, er: 0.06, color: "#B8A07E" },
  { ticker: "VIG", name: "Vanguard Div Appreciation", type: "ETF", sector: "Dividend", expReturn: 0.085, vol: 0.13, div: 0.02, er: 0.06, color: "#A2C4D9" },
  { ticker: "JNJ", name: "Johnson & Johnson", type: "Stock", sector: "Healthcare", expReturn: 0.08, vol: 0.15, div: 0.03, er: 0, color: "#D4A2A2" },
  { ticker: "PG", name: "Procter & Gamble", type: "Stock", sector: "Consumer", expReturn: 0.08, vol: 0.13, div: 0.025, er: 0, color: "#C4B8D9" },
  { ticker: "KO", name: "Coca-Cola", type: "Stock", sector: "Consumer", expReturn: 0.07, vol: 0.12, div: 0.031, er: 0, color: "#D9C4A2", inside: { top: ["200+ beverage brands in 200+ countries"], role: "Buffett's favorite — 60+ years dividend growth" }},
  { ticker: "VTIP", name: "Vanguard Short TIPS", type: "ETF", sector: "Inflation", expReturn: 0.035, vol: 0.03, div: 0.045, er: 0.04, color: "#A2D9B8" },
  { ticker: "O", name: "Realty Income", type: "Stock", sector: "REIT", expReturn: 0.08, vol: 0.16, div: 0.055, er: 0, color: "#D9A2C4", inside: { top: ["15,000+ commercial properties", "Monthly dividend payer"], role: "Real estate income — monthly dividends" }},
  { ticker: "VTI", name: "Vanguard Total Stock Mkt", type: "ETF", sector: "US Equity", expReturn: 0.10, vol: 0.16, div: 0.015, er: 0.03, color: "#7EB8A2" },
  { ticker: "VXUS", name: "Vanguard Intl Stock", type: "ETF", sector: "Intl Equity", expReturn: 0.08, vol: 0.17, div: 0.03, er: 0.07, color: "#A2C4D9" },
  { ticker: "AAPL", name: "Apple Inc.", type: "Stock", sector: "Technology", expReturn: 0.12, vol: 0.24, div: 0.005, er: 0, color: "#C4B8D9", inside: { top: ["iPhone, Mac, iPad, Services"], role: "World's most valuable company" }},
  { ticker: "MSFT", name: "Microsoft", type: "Stock", sector: "Technology", expReturn: 0.20, vol: 0.25, div: 0.008, er: 0, color: "#D9C4A2", inside: { top: ["Azure cloud, Office 365, Windows, AI"], role: "Enterprise software king + AI integration" }},
  { ticker: "JPM", name: "JPMorgan Chase", type: "Stock", sector: "Financials", expReturn: 0.10, vol: 0.20, div: 0.025, er: 0, color: "#A2D9B8", inside: { top: ["Consumer banking, investment banking, asset mgmt"], role: "Largest US bank — benefits from higher rates" }},
  { ticker: "UNH", name: "UnitedHealth", type: "Stock", sector: "Healthcare", expReturn: 0.11, vol: 0.19, div: 0.015, er: 0, color: "#D9A2C4", inside: { top: ["Health insurance, Optum analytics"], role: "Largest health insurer — aging population tailwind" }},
  { ticker: "QQQ", name: "Invesco Nasdaq-100", type: "ETF", sector: "Tech Growth", expReturn: 0.14, vol: 0.22, div: 0.006, er: 0.20, color: "#B8A07E" },
  { ticker: "NVDA", name: "NVIDIA", type: "Stock", sector: "Technology", expReturn: 0.18, vol: 0.45, div: 0.001, er: 0, color: "#A2C4D9", inside: { top: ["AI training GPUs (~80% revenue)", "Gaming, auto chips"], role: "AI gold rush pick-and-shovel — high growth, high risk" }},
  { ticker: "AMZN", name: "Amazon", type: "Stock", sector: "Consumer", expReturn: 0.13, vol: 0.28, div: 0, er: 0, color: "#D9C4A2", inside: { top: ["AWS cloud (~60% profits)", "E-commerce, Prime, ads"], role: "World's biggest store + biggest cloud" }},
  { ticker: "ARKK", name: "ARK Innovation", type: "ETF", sector: "Disruptive", expReturn: 0.12, vol: 0.40, div: 0, er: 0.75, color: "#D9A2C4", inside: { count: "~30 stocks", top: ["Tesla, Roku, Coinbase, Block"], role: "High-risk innovation bet — speculative growth" }},
  { ticker: "GOOGL", name: "Alphabet (Google)", type: "Stock", sector: "Technology", expReturn: 0.12, vol: 0.25, div: 0.005, er: 0, color: "#8BC4A0", inside: { top: ["Google Search ads, YouTube, Cloud"], role: "Digital ad dominance + growing cloud" }},
  { ticker: "META", name: "Meta Platforms", type: "Stock", sector: "Technology", expReturn: 0.13, vol: 0.32, div: 0.004, er: 0, color: "#7EA8D9", inside: { top: ["Facebook, Instagram, WhatsApp (98% ads)"], role: "Social media monopoly — 3.9B users" }},
  { ticker: "TSLA", name: "Tesla Inc.", type: "Stock", sector: "Auto/Tech", expReturn: 0.15, vol: 0.55, div: 0, er: 0, color: "#D98A8A", inside: { top: ["EVs (~85% revenue)", "Energy, solar, FSD"], role: "High-conviction EV bet — massive growth, extreme volatility" }},
  { ticker: "V", name: "Visa Inc.", type: "Stock", sector: "Financials", expReturn: 0.16, vol: 0.20, div: 0.008, er: 0, color: "#B8B0D9", inside: { top: ["Processes ~$15 trillion/year globally"], role: "Toll booth on global spending" }},
  { ticker: "WMT", name: "Walmart", type: "Stock", sector: "Consumer", expReturn: 0.09, vol: 0.15, div: 0.014, er: 0, color: "#8FBF7E" },
  { ticker: "DIS", name: "Walt Disney", type: "Stock", sector: "Entertainment", expReturn: 0.08, vol: 0.25, div: 0.008, er: 0, color: "#7EADD9" },
  { ticker: "XOM", name: "ExxonMobil", type: "Stock", sector: "Energy", expReturn: 0.09, vol: 0.22, div: 0.035, er: 0, color: "#D9B87E", inside: { top: ["Oil & gas production, refining, chemicals"], role: "Energy income play — high dividend" }},
  { ticker: "VNQ", name: "Vanguard Real Estate ETF", type: "ETF", sector: "REIT", expReturn: 0.08, vol: 0.18, div: 0.04, er: 0.12, color: "#C4A0D9" },
  { ticker: "GLD", name: "SPDR Gold Shares", type: "ETF", sector: "Commodities", expReturn: 0.06, vol: 0.15, div: 0, er: 0.40, color: "#D9D07E", inside: { count: "Physical gold", top: ["Backed by gold bars in London vaults"], role: "Chaos hedge — rises when everything else falls" }},
  { ticker: "VOO", name: "Vanguard S&P 500", type: "ETF", sector: "US Equity", expReturn: 0.10, vol: 0.16, div: 0.014, er: 0.03, color: "#7ED9B8", inside: { count: "500 stocks", top: ["Apple, MSFT, NVDA, AMZN (~25%)"], role: "The index that beats most fund managers" }},
  { ticker: "COST", name: "Costco", type: "Stock", sector: "Consumer", expReturn: 0.12, vol: 0.18, div: 0.006, er: 0, color: "#D97EA2", inside: { top: ["Membership warehouse, Kirkland brand"], role: "93% renewal rate — recession-resistant" }},
  { ticker: "HD", name: "Home Depot", type: "Stock", sector: "Consumer", expReturn: 0.11, vol: 0.20, div: 0.025, er: 0, color: "#D9A27E" },
  { ticker: "ABBV", name: "AbbVie Inc.", type: "Stock", sector: "Healthcare", expReturn: 0.10, vol: 0.20, div: 0.04, er: 0, color: "#8AD4D9" },
  { ticker: "LLY", name: "Eli Lilly", type: "Stock", sector: "Healthcare", expReturn: 0.22, vol: 0.30, div: 0.008, er: 0, color: "#D9C48A", inside: { top: ["Mounjaro/Zepbound (GLP-1)", "Alzheimer's treatments"], role: "GLP-1 drug boom — fastest-growing drugs in history" }},
  { ticker: "BRK.B", name: "Berkshire Hathaway", type: "Stock", sector: "Diversified", expReturn: 0.13, vol: 0.17, div: 0, er: 0, color: "#A2B8D4", inside: { top: ["GEICO, BNSF Railway, massive stock portfolio"], role: "Buffett's conglomerate — like a fund run by the GOAT" }},
  { ticker: "AGG", name: "iShares Core US Agg Bond", type: "ETF", sector: "Bonds", expReturn: 0.04, vol: 0.05, div: 0.032, er: 0.03, color: "#B8C4A2" },
  { ticker: "TLT", name: "iShares 20+ Yr Treasury", type: "ETF", sector: "Bonds", expReturn: 0.04, vol: 0.14, div: 0.035, er: 0.15, color: "#C4D4A2", inside: { count: "~40 bonds", top: ["US Treasury 20+ year maturity"], role: "Long-duration safe haven — gains when rates drop" }},
];

const ACCTS = [
  { key: "taxable", label: "Taxable Brokerage", desc: "Dividends & gains taxed yearly", tr: 0.15 },
  { key: "traditional", label: "Traditional IRA / 401(k)", desc: "Tax-deferred until withdrawal", tr: 0 },
  { key: "roth", label: "Roth IRA / Roth 401(k)", desc: "Tax-free growth", tr: 0 },
];

const RL = ["","Very Conservative","Conservative","Moderately Conservative","Moderate-Low","Moderate","Moderate-Growth","Growth","Aggressive Growth","Very Aggressive","Maximum Growth"];

/* ═══════════════════════════════════════════
   CALCULATIONS
   ═══════════════════════════════════════════ */
function optimize(risk, age, acct) {
  const rk = risk <= 3 ? "conservative" : risk <= 6 ? "moderate" : "aggressive";
  const a = UNIVERSE[rk];
  const sh = a.map(x => (x.expReturn - RF) / x.vol);
  const tS = sh.reduce((s, r) => s + Math.max(0, r), 0);
  let w = a.map((x, i) => {
    let v = Math.max(0, sh[i]) / tS;
    if (risk <= 3 && x.sector === "Bonds") v *= 2.5;
    if (risk <= 3 && x.div > 0.025) v *= 1.5;
    if (risk >= 7 && x.vol > 0.2) v *= 1.4;
    if (risk >= 7 && x.sector === "Bonds") v *= 0.3;
    if (age >= 60 && x.div > 0.02) v *= 1.3;
    if (age >= 60 && x.vol > 0.3) v *= 0.5;
    if (acct === "taxable" && x.taxEff === "hi") v *= 1.2;
    if (acct === "taxable" && x.div > 0.03) v *= 0.85;
    if (acct === "traditional" && x.div > 0.03) v *= 1.2;
    return v;
  });
  const tW = w.reduce((s, v) => s + v, 0);
  w = w.map(v => Math.round((v / tW) * 1000) / 1000);
  w[0] += 1 - w.reduce((s, v) => s + v, 0);
  const pR = w.reduce((s, v, i) => s + v * a[i].expReturn, 0);
  const pV = Math.sqrt(w.reduce((s, v, i) => s + (v * a[i].vol) ** 2, 0)) * 1.15;
  const pD = w.reduce((s, v, i) => s + v * a[i].div, 0);
  const pE = w.reduce((s, v, i) => s + v * a[i].er, 0);
  const tD = acct === "taxable" ? pD * 0.15 : 0;
  return {
    holdings: a.map((x, i) => ({ ...x, weight: w[i], alloc: Math.round(w[i] * 100) })).filter(h => h.alloc >= 1).sort((a, b) => b.weight - a.weight),
    m: { ret: pR, aTax: pR - tD, vol: pV, sharpe: (pR - RF) / pV, div: pD, exp: pE, tDrag: tD },
  };
}

function runMC(amt, r, v, yrs, n = 1000) {
  const paths = [];
  for (let s = 0; s < n; s++) {
    let val = amt; const p = [val];
    for (let y = 0; y < yrs; y++) {
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      val *= (1 + r + v * z); val = Math.max(0, val); p.push(val);
    }
    paths.push(p);
  }
  const pd = [];
  for (let y = 0; y <= yrs; y++) {
    const vals = paths.map(p => p[y]).sort((a, b) => a - b);
    pd.push({ year: y, label: y === 0 ? "Now" : `Yr ${y}`, p10: vals[Math.floor(n * .1)], p25: vals[Math.floor(n * .25)], p50: vals[Math.floor(n * .5)], p75: vals[Math.floor(n * .75)], p90: vals[Math.floor(n * .9)] });
  }
  const fin = paths.map(p => p[p.length - 1]).sort((a, b) => a - b);
  return { pd, pGain: fin.filter(v => v > amt).length / n, p2x: fin.filter(v => v > amt * 2).length / n };
}

function runWD(amt, r, v, mW) {
  const aW = mW * 12, n = 500; let ok = 0;
  const paths = [];
  for (let s = 0; s < n; s++) {
    let val = amt; let good = true; const p = [val];
    for (let y = 0; y < 35; y++) {
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      val = val * (1 + r + v * z) - aW;
      if (val <= 0) { good = false; val = 0; } p.push(Math.max(0, val));
    }
    if (good) ok++; paths.push(p);
  }
  const md = [];
  for (let y = 0; y <= 35; y++) {
    const vals = paths.map(p => p[y]).sort((a, b) => a - b);
    md.push({ year: y, label: y === 0 ? "Now" : `Yr ${y}`, p10: vals[Math.floor(n * .1)], p50: vals[Math.floor(n * .5)], p90: vals[Math.floor(n * .9)] });
  }
  return { sr: ok / n, md, rate: aW / amt };
}

function whatIfCalc(amt, mo, r, yrs) {
  const d = [];
  for (let y = 0; y <= yrs; y++) {
    const base = amt * Math.pow(1 + r, y);
    let extra = amt;
    for (let yr = 0; yr < y; yr++) { for (let m = 0; m < 12; m++) extra = extra * (1 + r / 12) + mo; }
    d.push({ year: y, label: y === 0 ? "Now" : `Yr ${y}`, base: Math.round(base), extra: Math.round(extra), contributed: mo * 12 * y, diff: Math.round(extra - base) });
  }
  return d;
}

function benchmarkCalc(amt, portR, yrs) {
  const d = [];
  for (let y = 0; y <= yrs; y++) {
    d.push({ year: y, label: y === 0 ? "Now" : `Yr ${y}`, portfolio: Math.round(amt * Math.pow(1 + portR, y)), sp500: Math.round(amt * Math.pow(1 + SP500.expReturn, y)) });
  }
  return d;
}

function fmt(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }
function pct(n) { return `${(n * 100).toFixed(1)}%`; }
function inflAdj(n, yrs) { return n / Math.pow(1 + INFLATION, yrs); }

const PTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (<div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 8, padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 11, fontFamily: "'Source Serif 4', serif" }}>
    <div style={{ fontWeight: 600, color: "#2c2416" }}>{d.ticker} — {d.alloc}%</div>
    <div style={{ color: "#8a7e6b" }}>{d.name}</div>
    {d.livePrice && <div style={{ color: "#6b8f71", marginTop: 2 }}>${d.livePrice} × {d.shares} shares</div>}
  </div>);
};

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (<div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 8, padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 11, fontFamily: "'Source Serif 4', serif" }}>
    <div style={{ fontWeight: 600, marginBottom: 3, color: "#2c2416" }}>{label}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color || p.stroke, marginTop: 1 }}>{p.name}: <strong>{fmt(p.value)}</strong></div>)}
  </div>);
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function WealthPath() {
  const [page, setPage] = useState("landing"); // landing, quiz, meet, setup, results
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [risk, setRisk] = useState(5);
  const [age, setAge] = useState(58);
  const [amount, setAmount] = useState(500000);
  const [horizon, setHorizon] = useState(15);
  const [acct, setAcct] = useState("traditional");
  const [mW, setMW] = useState(2500);
  const [tab, setTab] = useState("portfolio");
  const [prices, setPrices] = useState({});
  const [pLoad, setPLoad] = useState(false);
  const [extraMo, setExtraMo] = useState(500);
  const [showInflation, setShowInflation] = useState(false);
  const [customHoldings, setCustomHoldings] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Personal profile built through onboarding
  const [profile, setProfile] = useState({ name: "", situation: "", goals: "", worries: "", personality: "" });
  const [meetMsgs, setMeetMsgs] = useState([]);
  const [meetInput, setMeetInput] = useState("");
  const [meetStep, setMeetStep] = useState(0);

  // Goal tracker
  const [goals, setGoals] = useState([]); // [{ id, name, target, current, deadline, icon }]

  // Life events
  const [activeLifeEvent, setActiveLifeEvent] = useState(null);

  // Adaptive voice — tracks interaction style preferences
  const [voiceProfile, setVoiceProfile] = useState({
    formality: 0.5, // 0=casual, 1=formal
    detail: 0.5, // 0=brief, 1=detailed
    humor: 0.5, // 0=serious, 1=playful
    encouragement: 0.5, // 0=direct, 1=encouraging
    msgCount: 0, // total messages for learning
    lastTopics: [], // recent conversation topics
  });

  // Chat messages initialized with personalized greeting
  const [chatMsgs, setChatMsgs] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  // Plaid brokerage connection
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [realHoldingsSnapshot, setRealHoldingsSnapshot] = useState(null); // snapshot of brokerage holdings before optimization
  const [viewMode, setViewMode] = useState("optimized"); // "optimized" | "yours"
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidAccounts, setPlaidAccounts] = useState([]);
  const [plaidHoldings, setPlaidHoldings] = useState([]);

  const port = useMemo(() => optimize(risk, age, acct), [risk, age, acct]);

  // Active holdings = custom if modified, otherwise optimized
  const activeHoldings = useMemo(() => {
    if (!customHoldings) return port.holdings.map(h => ({ ...h, locked: false }));
    return customHoldings;
  }, [customHoldings, port]);

  // Calculate metrics from active holdings
  const activeMetrics = useMemo(() => {
    const h = activeHoldings;
    const tW = h.reduce((s, x) => s + x.weight, 0);
    const pR = h.reduce((s, x) => s + x.weight * x.expReturn, 0) / tW;
    const pV = Math.sqrt(h.reduce((s, x) => s + (x.weight * x.vol) ** 2, 0) / (tW * tW)) * 1.15;
    const pD = h.reduce((s, x) => s + x.weight * x.div, 0) / tW;
    const pE = h.reduce((s, x) => s + x.weight * (x.er || 0), 0) / tW;
    const tD = acct === "taxable" ? pD * 0.15 : 0;
    return { ret: pR, aTax: pR - tD, vol: pV, sharpe: (pR - RF) / pV, div: pD, exp: pE, tDrag: tD };
  }, [activeHoldings, acct]);

  // Compare custom vs optimized for the nudge
  const sharpeDiff = activeMetrics.sharpe - port.m.sharpe;
  const isCustomized = customHoldings !== null;

  // Rebalance unlocked holdings to fill 100%
  const rebalanceUnlocked = useCallback((holdings) => {
    const locked = holdings.filter(h => h.locked);
    const unlocked = holdings.filter(h => !h.locked);
    const lockedTotal = locked.reduce((s, h) => s + h.weight, 0);
    const remaining = Math.max(0, 1 - lockedTotal);
    const unlockTotal = unlocked.reduce((s, h) => s + h.weight, 0);
    if (unlockTotal === 0) return holdings;
    return holdings.map(h => {
      if (h.locked) return h;
      const newWeight = (h.weight / unlockTotal) * remaining;
      return { ...h, weight: newWeight, alloc: Math.round(newWeight * 100) };
    });
  }, []);

  const updateWeight = useCallback((ticker, newWeight) => {
    const base = customHoldings || port.holdings.map(h => ({ ...h, locked: false }));
    const updated = base.map(h => h.ticker === ticker ? { ...h, weight: newWeight, alloc: Math.round(newWeight * 100) } : h);
    setCustomHoldings(rebalanceUnlocked(updated));
  }, [customHoldings, port, rebalanceUnlocked]);

  const toggleLock = useCallback((ticker) => {
    const base = customHoldings || port.holdings.map(h => ({ ...h, locked: false }));
    setCustomHoldings(base.map(h => h.ticker === ticker ? { ...h, locked: !h.locked } : h));
  }, [customHoldings, port]);

  const removeHolding = useCallback((ticker) => {
    const base = customHoldings || port.holdings.map(h => ({ ...h, locked: false }));
    const filtered = base.filter(h => h.ticker !== ticker);
    setCustomHoldings(rebalanceUnlocked(filtered));
  }, [customHoldings, port, rebalanceUnlocked]);

  const addHolding = useCallback((asset) => {
    const base = customHoldings || port.holdings.map(h => ({ ...h, locked: false }));
    if (base.find(h => h.ticker === asset.ticker)) return;
    const newH = { ...asset, weight: 0.05, alloc: 5, locked: false };
    setCustomHoldings(rebalanceUnlocked([...base, newH]));
    setShowAddPanel(false);
    setAddSearch("");
  }, [customHoldings, port, rebalanceUnlocked]);

  const resetToOptimized = useCallback(() => {
    setCustomHoldings(null);
  }, []);
  const mcD = useMemo(() => runMC(amount, activeMetrics.aTax, activeMetrics.vol, horizon), [amount, activeMetrics, horizon]);
  const wdD = useMemo(() => runWD(amount, activeMetrics.aTax, activeMetrics.vol, mW), [amount, activeMetrics, mW]);
  const wiD = useMemo(() => whatIfCalc(amount, extraMo, activeMetrics.aTax, horizon), [amount, extraMo, activeMetrics, horizon]);
  const bmD = useMemo(() => benchmarkCalc(amount, activeMetrics.aTax, horizon), [amount, activeMetrics, horizon]);
  const annDiv = Math.round(amount * activeMetrics.div);

  const hWP = useMemo(() => activeHoldings.map(h => {
    const p = prices[h.ticker]; const tW = activeHoldings.reduce((s, x) => s + x.weight, 0);
    const normWeight = h.weight / tW; const d = Math.round(amount * normWeight);
    return { ...h, livePrice: p, shares: p ? Math.floor(d / p) : null, dollarAmt: d, normWeight };
  }), [activeHoldings, prices, amount]);

  const handleQuizAnswer = (score) => {
    const newAnswers = [...quizAnswers, score];
    setQuizAnswers(newAnswers);
    if (quizIdx < QUIZ.length - 1) {
      setQuizIdx(quizIdx + 1);
    } else {
      const avg = Math.round(newAnswers.reduce((s, v) => s + v, 0) / newAnswers.length);
      setRisk(Math.max(1, Math.min(10, avg)));
      setMeetMsgs([{ role: "assistant", content: "Okay cool, I've got a sense of how you feel about risk. But before I start crunching numbers, I wanna know who I'm actually working with here.\n\nWhat's your name?" }]);
      setMeetStep(0);
      setPage("setup");
    }
  };

  const MEET_QS = [
    null,
    (n) => `${n}! Love it. Okay ${n}, give me the quick version of your life right now — married? Kids? Working? Retired? Just paint me a picture in a couple sentences.`,
    (n) => `Got it. So here's the big question, ${n} — what are you actually trying to DO with your money? Like, is there a dream you're building toward? Early retirement, a house, travel, kids' college, just peace of mind? Whatever it is, I want to know.`,
    (n) => `Okay now the honest one — what's the thing that freaks you out about money? Like when you can't sleep and your brain starts spiraling... what's it about? Market crash? Running out? Making a dumb mistake? No wrong answers here.`,
    (n) => `Last one and then we're done with the feelings stuff, I promise. How would you describe yourself as a person? Like are you a spreadsheet-and-plan type or a go-with-the-flow type? Optimist? Worrier? Both? Just gimme your vibe.`,
  ];

  const sendMeet = useCallback((msg) => {
    if (!msg.trim()) return;
    const newMsgs = [...meetMsgs, { role: "user", content: msg }];
    setMeetMsgs(newMsgs);
    setMeetInput("");
    const step = meetStep;
    const np = { ...profile };

    if (step === 0) np.name = msg.trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, "");
    else if (step === 1) np.situation = msg.trim();
    else if (step === 2) np.goals = msg.trim();
    else if (step === 3) np.worries = msg.trim();
    else if (step === 4) {
      np.personality = msg.trim();
      setProfile(np);
      const summary = `Okay ${np.name}, I feel like I actually know you now. Here's what I'm working with:\n\nYou're ${np.situation}. You want ${np.goals}. You're worried about ${np.worries}. And personality-wise, you're ${np.personality}.\n\nI'm gonna keep ALL of that in my head — not just when I pick your investments, but every time you ask me anything. This isn't gonna be generic advice. It's YOUR advice. Let's go build this thing.`;
      setMeetMsgs([...newMsgs, { role: "assistant", content: summary }]);
      setMeetStep(5);
      setChatMsgs([{ role: "assistant", content: `Alright ${np.name}, I'm here. Your portfolio's about to be ready and I'll walk you through the whole thing. Anything you wanna know, anything you wanna change — just talk to me like a normal person and I'll handle it.` }]);
      setTimeout(() => setPage("setup"), 3500);
      return;
    }

    setProfile(np);
    const ns = step + 1;
    setMeetStep(ns);
    if (ns <= 4) {
      const name = np.name || "friend";
      setTimeout(() => setMeetMsgs(prev => [...prev, { role: "assistant", content: MEET_QS[ns](name) }]), 500);
    }
  }, [meetStep, profile, meetMsgs]);

  /* ── Plaid Brokerage Connection ── */
  const connectBrokerage = useCallback(async () => {
    setPlaidLoading(true);
    try {
      // Step 1: Request link token (or sandbox shortcut)
      const linkRes = await fetch("/api/plaid-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.name || "anon", useSandboxShortcut: true }),
      });
      const linkData = await linkRes.json();
      console.log("Plaid link response:", linkData);

      // Error from API
      if (linkData.error) {
        setChatMsgs(prev => [...prev, { role: "assistant", content: `Having trouble connecting to the brokerage service — ${linkData.details || linkData.error}. This might be a config issue. Try again in a moment.` }]);
        setChatOpen(true);
        setPlaidLoading(false);
        return;
      }

      // Sandbox shortcut: we got a public_token directly, skip the Link modal
      if (linkData.sandbox_direct && linkData.public_token) {
        const holdRes = await fetch("/api/plaid-holdings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: linkData.public_token }),
        });
        const data = await holdRes.json();
        console.log("Plaid holdings response:", data);
        if (data.error) {
          setChatMsgs(prev => [...prev, { role: "assistant", content: `Connected but couldn't fetch holdings — ${data.details || data.error}. Working on it.` }]);
          setChatOpen(true);
        } else if (data.holdings) {
          handlePlaidData(data);
        }
        setPlaidLoading(false);
        return;
      }

      // Normal flow: open Plaid Link modal
      const { link_token } = linkData;
      if (!link_token) {
        setChatMsgs(prev => [...prev, { role: "assistant", content: "Couldn't start the connection flow. The brokerage service might be temporarily down." }]);
        setChatOpen(true);
        setPlaidLoading(false);
        return;
      }

      const handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token) => {
          try {
            const holdRes = await fetch("/api/plaid-holdings", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public_token }),
            });
            const data = await holdRes.json();
            if (data.holdings) handlePlaidData(data);
          } catch (e) { console.error("Holdings fetch failed:", e); }
          setPlaidLoading(false);
        },
        onExit: () => setPlaidLoading(false),
      });
      handler.open();
    } catch (e) {
      console.error("Plaid link failed:", e);
      setPlaidLoading(false);
    }
  }, [profile]);

  // Shared handler for Plaid data
  const handlePlaidData = useCallback((data) => {
    setPlaidAccounts(data.accounts || []);
    setPlaidHoldings(data.holdings || []);
    setPlaidConnected(true);

    if (data.totalValue > 0) setAmount(Math.round(data.totalValue));

    const firstAcct = data.accounts?.[0];
    if (firstAcct?.subtype) {
      if (/roth/.test(firstAcct.subtype)) setAcct("roth");
      else if (/ira|401/.test(firstAcct.subtype)) setAcct("traditional");
      else setAcct("taxable");
    }

    // Build portfolio from ALL real holdings — match to our DB where possible
    const allKnown = [...Object.values(UNIVERSE).flat(), ...ALL_ASSETS];
    const colors = ["#7EB8A2","#B8A07E","#A2C4D9","#D4A2A2","#C4B8D9","#D9C4A2","#A2D9B8","#D9A2C4","#8BC4A0","#D98A8A","#B8B0D9","#D9B87E","#D97EA2","#7EA8D9","#D9C48A","#A2B8D4","#C4D4A2","#D9D07E"];
    const holdings = [];
    const uniqueTickers = new Set();
    let colorIdx = 0;

    for (const h of data.holdings) {
      if (uniqueTickers.has(h.ticker)) continue;
      uniqueTickers.add(h.ticker);
      const known = allKnown.find(a => a.ticker === h.ticker);
      const weight = data.totalValue > 0 ? h.value / data.totalValue : 0;

      if (known) {
        // Known asset: use our enriched data (inside, expected returns, etc)
        holdings.push({ ...known, weight, alloc: Math.round(weight * 100), locked: false,
          livePrice: h.price, realQty: h.quantity, realValue: h.value, realCostBasis: h.costBasis });
      } else {
        // Unknown asset: create entry from Plaid data
        holdings.push({
          ticker: h.ticker, name: h.name, type: h.type === "equity" ? "Stock" : h.type === "etf" ? "ETF" : h.type === "mutual fund" ? "Fund" : "Other",
          sector: "Unknown", expReturn: 0.08, vol: 0.20, div: 0.01, er: 0, color: colors[colorIdx % colors.length],
          weight, alloc: Math.round(weight * 100), locked: false,
          livePrice: h.price, realQty: h.quantity, realValue: h.value, realCostBasis: h.costBasis,
          inside: { top: [h.name], role: `From your brokerage — ${h.quantity} shares @ $${h.price?.toFixed(2)}` },
        });
        colorIdx++;
      }
    }

    const sorted = holdings.sort((a, b) => b.weight - a.weight);
    setRealHoldingsSnapshot(sorted);
    if (sorted.length >= 1) setCustomHoldings(sorted);
    setViewMode("yours");

    const unmatchedCount = data.holdings.filter(h => !allKnown.find(a => a.ticker === h.ticker)).length;

    setChatMsgs(prev => [...prev, { role: "assistant",
      content: `${profile.name ? profile.name + ", this" : "This"} is awesome — I can see your real portfolio now! You've got ${data.holdings.length} holdings worth ${fmt(data.totalValue)} across ${data.accounts.length} account${data.accounts.length > 1 ? "s" : ""}.${unmatchedCount > 0 ? ` (${unmatchedCount} holding${unmatchedCount > 1 ? "s aren't" : " isn't"} in my analysis database yet, but I've loaded them all in so you can see everything.)` : ""} We're working with your actual money now. Ask me anything — "how's my allocation look?" or "what would you change?"`
    }]);
    if (!chatOpen) setChatOpen(true);
  }, [profile, chatOpen]);

  const buildPortfolio = useCallback(async () => {
    setPage("results"); setTab("portfolio"); setPLoad(true); setCustomHoldings(null);
    // Auto-open chat with personalized greeting
    if (!isMobile) setChatOpen(true);
    const greeting = profile.name
      ? `${profile.name}! Okay, your portfolio's done. I kept it tight — just ${optimize(risk, age, acct).holdings.length} core ETFs. No fluff, no random stock picks, just the stuff that actually moves the needle for someone in your situation.\n\nScroll through and check it out. If anything feels off or you wanna add something specific — like "throw some Tesla in there" or "get rid of bonds" — just tell me and I'll make it happen right now.`
      : `Portfolio's ready! I went with ${optimize(risk, age, acct).holdings.length} focused ETFs — clean, simple, optimized for your risk level.\n\nWant me to walk you through it? Or if you already know what you want to change, just say the word — "add NVDA", "drop bonds", whatever. I'll handle it.`;
    setChatMsgs(prev => prev.length <= 1 ? [{ role: "assistant", content: greeting }] : prev);
    const tickers = optimize(risk, age, acct).holdings.map(h => h.ticker).join(", ");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: `Find current stock/ETF prices for: ${tickers}. Return ONLY JSON like {"AAPL":232.50}. Numbers only, no text.` }] }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.type === "text" ? b.text : "").join("") || "{}";
      const m = text.match(/\{[^}]+\}/);
      if (m) setPrices(JSON.parse(m[0]));
    } catch {}
    setPLoad(false);
  }, [risk, age, acct]);

  const sendChat = useCallback(async (msg) => {
    if (!msg.trim() || chatLoading) return;
    const userMsg = { role: "user", content: msg };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatInput(""); setChatLoading(true);
    const lm = msg.toLowerCase();

    // ── Adaptive Voice Learning ──
    const vp = { ...voiceProfile, msgCount: voiceProfile.msgCount + 1 };
    if (lm.length < 30) vp.detail = Math.max(0, vp.detail - 0.04);
    if (lm.length > 100) vp.detail = Math.min(1, vp.detail + 0.04);
    if (/lol|haha|😂|funny/.test(lm)) vp.humor = Math.min(1, vp.humor + 0.1);
    if (/serious|concerned|worried/.test(lm)) { vp.humor = Math.max(0, vp.humor - 0.08); vp.encouragement = Math.min(1, vp.encouragement + 0.08); }
    if (/scared|nervous|anxious|panic|help me/.test(lm)) vp.encouragement = Math.min(1, vp.encouragement + 0.12);
    if (/just tell me|bottom line|quick|tldr/.test(lm)) vp.detail = Math.max(0, vp.detail - 0.1);
    if (/explain|how does|teach|walk me through/.test(lm)) vp.detail = Math.min(1, vp.detail + 0.1);
    if (/dude|bro|lol|yo /.test(lm)) vp.formality = Math.max(0, vp.formality - 0.08);
    if (/please|thank|appreciate/.test(lm)) vp.formality = Math.min(1, vp.formality + 0.05);
    setVoiceProfile(vp);

    // ── Direct Portfolio Modifications ──
    let portfolioAction = null;
    // Detect "add X" commands
    const addMatch = lm.match(/(?:add|buy|include|throw in|get some)\s+(?:some\s+)?(\w+(?:\.\w)?)/i);
    if (addMatch) {
      const ticker = addMatch[1].toUpperCase();
      const asset = ALL_ASSETS.find(a => a.ticker === ticker || a.name.toLowerCase().includes(addMatch[1].toLowerCase()));
      if (asset && !activeHoldings.find(h => h.ticker === asset.ticker)) {
        portfolioAction = { type: "add", asset, ticker: asset.ticker };
      }
    }
    // Detect "remove X" commands
    const removeMatch = lm.match(/(?:remove|drop|sell|get rid of|ditch|dump)\s+(?:all\s+)?(\w+(?:\.\w)?)/i);
    if (removeMatch && activeHoldings.length > 2) {
      const ticker = removeMatch[1].toUpperCase();
      const holding = activeHoldings.find(h => h.ticker === ticker || h.name.toLowerCase().includes(removeMatch[1].toLowerCase()));
      if (holding) portfolioAction = { type: "remove", ticker: holding.ticker, name: holding.name };
    }
    // Detect "more/less X" or "increase/decrease X"
    const weightMatch = lm.match(/(?:more|increase|bump up|raise)\s+(\w+(?:\.\w)?)/i);
    const weightDownMatch = lm.match(/(?:less|decrease|reduce|lower)\s+(\w+(?:\.\w)?)/i);
    if (weightMatch) {
      const ticker = weightMatch[1].toUpperCase();
      const h = activeHoldings.find(x => x.ticker === ticker || x.name.toLowerCase().includes(weightMatch[1].toLowerCase()));
      if (h) portfolioAction = { type: "increase", ticker: h.ticker, name: h.name };
    }
    if (weightDownMatch && !portfolioAction) {
      const ticker = weightDownMatch[1].toUpperCase();
      const h = activeHoldings.find(x => x.ticker === ticker || x.name.toLowerCase().includes(weightDownMatch[1].toLowerCase()));
      if (h) portfolioAction = { type: "decrease", ticker: h.ticker, name: h.name };
    }

    // Execute portfolio action
    if (portfolioAction) {
      if (portfolioAction.type === "add") addHolding(portfolioAction.asset);
      if (portfolioAction.type === "remove") removeHolding(portfolioAction.ticker);
      if (portfolioAction.type === "increase") {
        const h = activeHoldings.find(x => x.ticker === portfolioAction.ticker);
        if (h) updateWeight(portfolioAction.ticker, Math.min(0.6, h.weight + 0.05));
      }
      if (portfolioAction.type === "decrease") {
        const h = activeHoldings.find(x => x.ticker === portfolioAction.ticker);
        if (h) updateWeight(portfolioAction.ticker, Math.max(0.02, h.weight - 0.05));
      }
    }

    // ── Detect Life Events ──
    const LES = [
      { keys: ["married","wedding","engaged"], ev: "marriage", g: "Discuss combining finances, beneficiary updates, joint goals" },
      { keys: ["baby","pregnant","expecting","child","newborn"], ev: "new_baby", g: "529 plans, life insurance, emergency fund boost, timeline changes" },
      { keys: ["divorced","divorce","separated"], ev: "divorce", g: "Be deeply empathetic. Asset splitting, beneficiaries, rebuilding" },
      { keys: ["laid off","lost my job","fired","unemployed"], ev: "job_loss", g: "Lead with empathy. Emergency fund runway, reduce withdrawals, this is temporary" },
      { keys: ["inherited","inheritance","windfall","lottery"], ev: "windfall", g: "Avoid mistakes. Tax implications, dollar-cost averaging, don't change lifestyle yet" },
      { keys: ["retiring","retire soon","just retired"], ev: "retirement", g: "Celebrate! Then withdrawal strategy, Social Security, healthcare, purpose" },
      { keys: ["bought a house","buying a house","mortgage","down payment"], ev: "home_buy", g: "Liquidity impact, mortgage vs investing, emergency fund after" },
      { keys: ["health issue","medical","surgery","diagnosed","cancer"], ev: "health", g: "Be deeply human first. Emergency fund, insurance, reducing stress" },
    ];
    let lifeCtx = "";
    for (const l of LES) { if (l.keys.some(k => lm.includes(k))) { setActiveLifeEvent(l.ev); lifeCtx = `\nLIFE EVENT: ${l.ev.toUpperCase()} — Acknowledge emotions FIRST, be human before advisor. Then: ${l.g}`; break; } }
    if (!lifeCtx && activeLifeEvent) lifeCtx = `\nOngoing: ${activeLifeEvent} — keep this context.`;

    // ── Scenario Math ──
    let scenCtx = "";
    if (/what if|what would|scenario|hypothetical/.test(lm)) {
      const retM = msg.match(/retire\s*(?:at\s*)?(\d{2})/i);
      const conM = msg.match(/(?:save|invest|contribute|put away|add)\s*\$?([\d,]+)\s*(?:\/|\s*per\s*)?\s*(?:mo|month)/i);
      const lumpM = msg.match(/(?:invest|put in|add|got|received|inherited)\s*\$?([\d,]+)/i);
      if (retM) { const ra=parseInt(retM[1]),yl=Math.max(0,ra-age),pv=amount*Math.pow(1+activeMetrics.aTax,yl),sw=Math.round(pv*0.04/12); scenCtx+=`\nSCENARIO Retire@${ra}: ${yl}yr left, portfolio ${fmt(Math.round(pv))}, safe withdrawal ${fmt(sw)}/mo. USE THESE NUMBERS.`; }
      if (conM) { const ex=parseInt(conM[1].replace(/,/g,"")),fb=amount*Math.pow(1+activeMetrics.aTax,horizon); let fe=amount; for(let y=0;y<horizon;y++) for(let m=0;m<12;m++) fe=fe*(1+activeMetrics.aTax/12)+ex; scenCtx+=`\nSCENARIO Extra $${ex}/mo: Without ${fmt(Math.round(fb))}, With ${fmt(Math.round(fe))}, Diff +${fmt(Math.round(fe-fb))}. USE THESE NUMBERS.`; }
      if (lumpM && !conM) { const lp=parseInt(lumpM[1].replace(/,/g,"")); if(lp>500){ const wL=(amount+lp)*Math.pow(1+activeMetrics.aTax,horizon),woL=amount*Math.pow(1+activeMetrics.aTax,horizon); scenCtx+=`\nSCENARIO Lump $${lp}: New total ${fmt(amount+lp)}, in ${horizon}yr ${fmt(Math.round(wL))} vs ${fmt(Math.round(woL))}. USE THESE NUMBERS.`; } }
    }

    // ── Goals ──
    const goalCtx = goals.length ? `\nGOALS: ${goals.map(g=>`${g.icon}${g.name}: ${fmt(g.current||0)}/${fmt(+g.target)} (${Math.round(((g.current||0)/(+g.target))*100)}%)`).join(", ")}` : "";

    // ── Build System Prompt ──
    const hList = hWP.map(h=>`${h.ticker}(${h.alloc}%=${fmt(h.dollarAmt)})`).join(", ");
    const vGuide = `${vp.formality<0.35?"casual":vp.formality>0.65?"polished":"warm"}, ${vp.detail<0.35?"ultra-brief 2-3 sentences":vp.detail>0.65?"thorough":"medium"}, ${vp.humor>0.65?"playful/witty":vp.humor<0.3?"serious":"light personality"}, ${vp.encouragement>0.65?"very supportive":"direct"} (${vp.msgCount} msgs)`;

    const sys = `You're ${profile.name ? profile.name + "'s" : "someone's"} money person. Not a financial advisor in a suit — more like that one friend who happens to be really good with money and actually gives a damn about you.

You talk like a real human. You use contractions. You say "honestly" and "look" and "here's the thing." You react to what people say — if they tell you something scary, you feel it with them before jumping to solutions. If something's exciting, you get excited too. You have opinions and you share them — you don't hedge everything with "it depends."

${profile.name ? `You know ${profile.name} personally. Here's what you know about them:
They told you: "${profile.situation || "haven't shared their life situation yet"}"
What they're working toward: "${profile.goals || "haven't shared their goals yet"}"
What scares them: "${profile.worries || "haven't shared their worries yet"}"  
Their vibe: "${profile.personality || "still getting to know them"}"

Weave this into conversation naturally. If ${profile.name} said they're worried about running out of money, and they ask about their withdrawal rate — connect those dots. "I know this is the thing that keeps you up at night, so let me put your mind at ease..." That kind of thing. Make them feel SEEN.` : "You're still getting to know this person. Be warm and curious."}

How you talk (learned from ${vp.msgCount} messages with them):
${vp.humor > 0.5 ? "They like personality — be witty, use analogies, make them smile." : "Keep it grounded — they prefer straight talk."}
${vp.detail > 0.6 ? "They want the full picture. Don't skimp on explanations." : vp.detail < 0.35 ? "They want it short. 2-4 sentences. Get to the point." : "Medium detail — key insight plus brief context."}
${vp.encouragement > 0.6 ? "They need reassurance. Lead with confidence-building." : "They can handle directness. Don't sugarcoat."}
${vp.formality > 0.6 ? "They're a bit formal — match that energy, but stay warm." : "Keep it conversational. Like texting a smart friend."}

Their money situation:
${fmt(amount)} invested, age ${age}, planning ${horizon} years out. Risk tolerance: ${risk}/10 (${RL[risk]}). Account: ${ACCTS.find(a=>a.key===acct)?.label}.${mW>0?` Pulling out ${fmt(mW)}/month.`:""}
They own: ${hList}
Numbers: ${pct(activeMetrics.aTax)} expected return, Sharpe ${activeMetrics.sharpe.toFixed(2)}, earning ${fmt(annDiv)}/yr in dividends.
Monte Carlo says: ${(mcD.pGain*100).toFixed(0)}% chance of making money, median landing at ${fmt(mcD.pd[mcD.pd.length-1].p50)}.${mW>0?` Their withdrawal has a ${(wdD.sr*100).toFixed(0)}% chance of lasting 30 years.`:""}${plaidConnected ? `
REAL BROKERAGE DATA: They connected their actual brokerage account. This is their REAL money, not hypothetical. Accounts: ${plaidAccounts.map(a => `${a.name} (${a.subtype}, ${fmt(a.balance)})`).join(", ")}. Real holdings: ${plaidHoldings.map(h => `${h.ticker}: ${h.quantity} shares @ $${h.price} = ${fmt(h.value)}`).join(", ")}. ${plaidHoldings.filter(h => !([...Object.values(UNIVERSE).flat(), ...ALL_ASSETS].find(a => a.ticker === h.ticker))).length > 0 ? `Note: some of their holdings (${plaidHoldings.filter(h => !([...Object.values(UNIVERSE).flat(), ...ALL_ASSETS].find(a => a.ticker === h.ticker))).map(h => h.ticker).join(", ")}) aren't in our analysis engine yet, so the portfolio view is partial.` : ""}` : ""}${goalCtx}${scenCtx}${lifeCtx}

Important stuff:
- Use their actual dollar amounts. "${fmt(amount)}" not "your portfolio." "${fmt(annDiv)} a year" not "dividend income."
- When scenario numbers are calculated above, use those exact figures.
- For life events (job loss, baby, divorce, etc): be a human first. Feel it with them. THEN get practical.
- You can modify their portfolio. ${portfolioAction ? `You just ${portfolioAction.type === "add" ? `added ${portfolioAction.ticker}` : portfolioAction.type === "remove" ? `removed ${portfolioAction.name}` : portfolioAction.type === "increase" ? `bumped up ${portfolioAction.name}` : `dialed back ${portfolioAction.name}`}. Tell them what you did, what it means for their portfolio, and whether YOU personally think it's smart for them.` : "If they want changes, they happen automatically. You can also suggest moves — like \"honestly I'd add some international exposure, want me to throw in VXUS?\""}
- NEVER use bullet points, numbered lists, or headers. Write in flowing sentences like a person.
- Skip the financial disclaimer unless you're giving a genuinely big recommendation. And if you must, one casual sentence max at the very end — not a legal paragraph.
- Keep responses tight. Say what matters. Don't pad.`;


    try {
      const history = [...chatMsgs, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 800,
          system: sys,
          messages: history,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.type === "text" ? b.text : "").join("") || "Sorry, I couldn't process that. Try again.";
      setChatMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setChatMsgs(prev => [...prev, { role: "assistant", content: "Connection hiccup — try again in a sec." }]);
    }
    setChatLoading(false);
  }, [chatMsgs, chatLoading, hWP, age, risk, amount, horizon, acct, mW, activeMetrics, mcD, wdD, annDiv, isCustomized, profile, goals, voiceProfile, activeLifeEvent, activeHoldings, addHolding, removeHolding, updateWeight, plaidConnected, plaidAccounts, plaidHoldings]);

  const generatePDF = useCallback(() => {
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const fMC = mcD.pd[mcD.pd.length - 1]; const fWI = wiD[wiD.length - 1]; const fBM = bmD[bmD.length - 1];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WealthPath Report</title><style>
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#2c2416;line-height:1.6;font-size:11px}
.pg{padding:40px;page-break-after:always;min-height:100vh}.pg:last-child{page-break-after:avoid}
h1{font-family:'Source Serif 4',serif;font-size:24px;font-weight:700;margin-bottom:3px}
h2{font-family:'Source Serif 4',serif;font-size:15px;font-weight:600;margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid #e8e4dd}
p{font-size:11px;margin-bottom:7px;color:#4a4235;line-height:1.65}
.hdr{background:linear-gradient(135deg,#f7f4ef,#efe9df);padding:28px 40px;margin:-40px -40px 20px;border-bottom:3px solid #d4c9b5}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin:12px 0}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:12px 0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.bx{background:#f7f4ef;border-radius:6px;padding:10px 12px;text-align:center}
.bx .v{font-size:18px;font-weight:700;font-family:'Source Serif 4',serif}
.bx .l{font-size:8px;color:#8a7e6b;text-transform:uppercase;letter-spacing:0.08em}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
th{background:#f7f4ef;padding:7px 8px;text-align:left;font-weight:600;font-size:8px;text-transform:uppercase;letter-spacing:0.05em;color:#8a7e6b;border-bottom:2px solid #e8e4dd}
td{padding:7px 8px;border-bottom:1px solid #f0ece5}
.ex{background:#f0f5f1;border-left:4px solid #6b8f71;padding:12px 16px;border-radius:0 6px 6px 0;margin:12px 0}
.hi{background:#f5f0ff;border-left:4px solid #8b6fc0;padding:12px 16px;border-radius:0 6px 6px 0;margin:12px 0}
.disc{background:#fdf8f0;border:1px solid #e8dcc8;border-radius:5px;padding:10px 12px;font-size:9px;color:#8a7e6b;margin-top:18px}
.ft{text-align:center;padding:14px;font-size:8px;color:#b5a892;border-top:1px solid #e8e4dd;margin-top:20px}
@media print{.pg{page-break-after:always}}
</style></head><body>
<div class="pg">
<div class="hdr"><div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#8a7e6b;margin-bottom:4px">WealthPath — Portfolio Report</div>
<h1>Your Optimized Portfolio</h1><div style="color:#8a7e6b;font-size:11px">${today} • ${ACCTS.find(a=>a.key===acct)?.label} • ${RL[risk]}</div></div>
<h2>Profile</h2>
<div class="g4"><div class="bx"><div class="l">Age</div><div class="v">${age}</div></div><div class="bx"><div class="l">Risk</div><div class="v">${risk}/10</div></div><div class="bx"><div class="l">Investment</div><div class="v">${fmt(amount)}</div></div><div class="bx"><div class="l">Horizon</div><div class="v">${horizon}yr</div></div></div>
<h2>Holdings</h2>
<table><tr><th>Ticker</th><th>Name</th><th>Type</th><th>Alloc</th><th>Amount</th>${Object.keys(prices).length?"<th>Price</th><th>Shares</th>":""}<th>Return</th><th>Div</th></tr>
${hWP.map(h=>`<tr><td style="font-weight:600;color:#6b8f71">${h.ticker}</td><td>${h.name}</td><td>${h.type}</td><td style="font-weight:600">${h.alloc}%</td><td>${fmt(h.dollarAmt)}</td>${h.livePrice?`<td>$${h.livePrice}</td><td style="font-weight:600;color:#6b8f71">${h.shares}</td>`:(Object.keys(prices).length?"<td>—</td><td>—</td>":"")}<td>${pct(h.expReturn)}</td><td>${pct(h.div)}</td></tr>`).join("")}</table>
<h2>Metrics</h2>
<div class="g4"><div class="bx"><div class="l">After-Tax Return</div><div class="v" style="color:#6b8f71">${pct(port.m.aTax)}</div></div><div class="bx"><div class="l">Sharpe Ratio</div><div class="v" style="color:#7a9bb5">${port.m.sharpe.toFixed(2)}</div></div><div class="bx"><div class="l">Dividend Income</div><div class="v" style="color:#b5897a">${fmt(annDiv)}/yr</div></div><div class="bx"><div class="l">Volatility</div><div class="v" style="color:#c4956a">${pct(port.m.vol)}</div></div></div>
<h2>Monte Carlo (1,000 Scenarios)</h2>
<div class="g3"><div class="bx"><div class="l">Worst 10%</div><div class="v" style="color:#c4956a">${fmt(fMC.p10)}</div></div><div class="bx"><div class="l">Median</div><div class="v" style="color:#6b8f71">${fmt(fMC.p50)}</div></div><div class="bx"><div class="l">Best 10%</div><div class="v" style="color:#7a9bb5">${fmt(fMC.p90)}</div></div></div>
<p>Probability of gain: <strong>${(mcD.pGain*100).toFixed(0)}%</strong> • Probability of doubling: <strong>${(mcD.p2x*100).toFixed(0)}%</strong></p>
<h2>vs S&P 500 Benchmark</h2>
<div class="g2"><div class="bx"><div class="l">Your Portfolio (Yr ${horizon})</div><div class="v" style="color:#6b8f71">${fmt(fBM.portfolio)}</div></div><div class="bx"><div class="l">S&P 500 (Yr ${horizon})</div><div class="v" style="color:#c4956a">${fmt(fBM.sp500)}</div></div></div>
<p>${fBM.portfolio>fBM.sp500?`Your optimized portfolio outperforms a simple S&P 500 investment by ${fmt(fBM.portfolio-fBM.sp500)} over ${horizon} years.`:`The S&P 500 projects higher raw returns, but your portfolio offers better risk-adjusted performance (Sharpe: ${port.m.sharpe.toFixed(2)}) with lower volatility and higher income.`}</p>
</div>
<div class="pg">
<h1>What If I Save More?</h1>
<p style="color:#8a7e6b">Impact of ${fmt(extraMo)}/month additional savings over ${horizon} years</p>
<div class="g2"><div class="bx"><div class="l">Without Extra</div><div class="v" style="color:#8a7e6b">${fmt(fWI.base)}</div></div><div class="bx"><div class="l">With ${fmt(extraMo)}/mo</div><div class="v" style="color:#8b6fc0">${fmt(fWI.extra)}</div></div></div>
<div class="g3"><div class="bx"><div class="l">You'd Put In</div><div class="v">${fmt(fWI.contributed)}</div></div><div class="bx"><div class="l">Compounding Earns</div><div class="v" style="color:#6b8f71">${fmt(fWI.diff-fWI.contributed)}</div></div><div class="bx"><div class="l">Total Extra</div><div class="v" style="color:#8b6fc0">${fmt(fWI.diff)}</div></div></div>
<div class="hi"><p>By saving ${fmt(extraMo)}/month extra, you'd contribute ${fmt(fWI.contributed)} but end up with ${fmt(fWI.diff)} more thanks to compound growth — that's ${fmt(fWI.diff-fWI.contributed)} in free gains.</p></div>
${mW>0?`<h2>Withdrawal Analysis</h2><div class="g3"><div class="bx"><div class="l">Monthly</div><div class="v">${fmt(mW)}</div></div><div class="bx"><div class="l">Rate</div><div class="v" style="color:${wdD.rate<=0.04?'#6b8f71':'#c4956a'}">${pct(wdD.rate)}</div></div><div class="bx"><div class="l">30-Yr Success</div><div class="v" style="color:${wdD.sr>=0.9?'#6b8f71':'#c4956a'}">${(wdD.sr*100).toFixed(0)}%</div></div></div>`:""}
<div class="disc"><strong>Important:</strong> This report is for educational purposes only. Not financial advice. Past performance doesn't guarantee future results. Monte Carlo uses randomized scenarios. Consult a financial advisor before investing. WealthPath is not a registered investment advisor.</div>
<div class="ft">WealthPath Report • ${today} • For Illustrative Purposes Only</div>
</div></body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 800); }
  }, [port, mcD, wiD, bmD, wdD, hWP, amount, age, risk, horizon, acct, mW, extraMo, prices, annDiv]);

  // Apply inflation adjustment to chart data
  const adjMC = useMemo(() => showInflation ? mcD.pd.map(d => ({ ...d, p10: Math.round(inflAdj(d.p10, d.year)), p25: Math.round(inflAdj(d.p25, d.year)), p50: Math.round(inflAdj(d.p50, d.year)), p75: Math.round(inflAdj(d.p75, d.year)), p90: Math.round(inflAdj(d.p90, d.year)) })) : mcD.pd, [mcD, showInflation]);
  const adjBM = useMemo(() => showInflation ? bmD.map(d => ({ ...d, portfolio: Math.round(inflAdj(d.portfolio, d.year)), sp500: Math.round(inflAdj(d.sp500, d.year)) })) : bmD, [bmD, showInflation]);
  const adjWI = useMemo(() => showInflation ? wiD.map(d => ({ ...d, base: Math.round(inflAdj(d.base, d.year)), extra: Math.round(inflAdj(d.extra, d.year)), diff: Math.round(inflAdj(d.diff, d.year)) })) : wiD, [wiD, showInflation]);

  const TABS = [
    { key: "portfolio", label: "Portfolio", icon: "📊" },
    { key: "montecarlo", label: "Scenarios", icon: "🎲" },
    { key: "benchmark", label: "vs S&P", icon: "📈" },
    { key: "whatif", label: "What If?", icon: "💡" },
    { key: "withdrawal", label: "Withdraw", icon: "🏦" },
  ];

  const css = `<style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .fade-up { animation: fadeUp 0.6s ease forwards; }
    .fade-up-1 { animation-delay: 0.1s; opacity: 0; }
    .fade-up-2 { animation-delay: 0.2s; opacity: 0; }
    .fade-up-3 { animation-delay: 0.3s; opacity: 0; }
    .fade-up-4 { animation-delay: 0.4s; opacity: 0; }
  </style>`;

  /* ═══════════════════════════════════════════
     LANDING PAGE
     ═══════════════════════════════════════════ */
  if (page === "landing") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg, #faf8f4 0%, #f0ece4 50%, #e8e4db 100%)", fontFamily: "'DM Sans', sans-serif", color: "#2c2416" }}>
      <div dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6b8f71, #4a6e50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontFamily: "'Source Serif 4'", fontWeight: 700 }}>W</div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>WealthPath</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 24px 40px", textAlign: "center" }}>
        <div className="fade-up" style={{ marginBottom: 16 }}>
          <span style={{ background: "#f0f5f1", color: "#4a6e50", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid #c8dcc8" }}>Free • No account needed • Not financial advice</span>
        </div>
        <h1 className="fade-up fade-up-1" style={{ fontFamily: "'Source Serif 4', serif", fontSize: 42, fontWeight: 700, lineHeight: 1.15, marginBottom: 16, color: "#2c2416" }}>
          Finally, a money person<br /><span style={{ color: "#6b8f71" }}>who actually gets you.</span>
        </h1>
        <p className="fade-up fade-up-2" style={{ fontSize: 17, color: "#8a7e6b", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
          5 quick questions. Then we'll build you a real portfolio, run 1,000 market scenarios on it, and stick around to answer whatever's on your mind. Like having a smart friend who's great with money.
        </p>

        <div className="fade-up fade-up-3" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button onClick={() => setPage("quiz")} style={{
            padding: "16px 40px", borderRadius: 14, border: "none", width: "100%", maxWidth: 340,
            background: "linear-gradient(135deg, #6b8f71, #4a6e50)", color: "#fff",
            fontSize: 17, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'",
            boxShadow: "0 6px 24px rgba(107,143,113,0.35)",
          }}>I'm starting fresh →</button>

          <button onClick={() => { setPage("setup"); }} style={{
            padding: "14px 40px", borderRadius: 14, width: "100%", maxWidth: 340,
            border: "2px solid #6b8f71", background: "rgba(255,255,255,0.7)", color: "#4a6e50",
            fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'",
          }}>I already invest — connect my account 🏦</button>
          <div style={{ fontSize: 11, color: "#b5a892", marginTop: -4 }}>Link your Fidelity, Schwab, Vanguard, or other brokerage</div>
        </div>

        <div className="fade-up fade-up-4" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 48 }}>
          {[
            { icon: "🧠", title: "Knows YOU", desc: "Learns your goals, fears, and personality over time" },
            { icon: "🎲", title: "1,000 futures", desc: "We simulate a thousand versions of your financial future" },
            { icon: "💬", title: "Just ask", desc: "\"Add Tesla\", \"what if I retire at 60?\" — it just works" },
          ].map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.6)", border: "1px solid #e8e4dd", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "#8a7e6b", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, opacity: 0.5 }}>
          {["Real-time prices", "Tax optimization", "Withdrawal planning", "PDF reports", "S&P 500 comparison", "Inflation-adjusted"].map(f => (
            <span key={f} style={{ fontSize: 11, color: "#8a7e6b" }}>✓ {f}</span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px", fontSize: 10, color: "#b5a892" }}>
        WealthPath is for educational purposes only. Not financial advice. Consult a qualified advisor before investing.
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     QUIZ
     ═══════════════════════════════════════════ */
  if (page === "quiz") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg, #faf8f4 0%, #f0ece4 100%)", fontFamily: "'DM Sans', sans-serif", color: "#2c2416", display: "flex", flexDirection: "column" }}>
      <div dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8e4dd" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6b8f71, #4a6e50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontFamily: "'Source Serif 4'", fontWeight: 700 }}>W</div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4'" }}>WealthPath</span>
        </div>
        <button onClick={() => { setPage("landing"); setQuizIdx(0); setQuizAnswers([]); }} style={{ fontSize: 12, color: "#8a7e6b", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%" }}>
          {/* Progress */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
            {QUIZ.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= quizIdx ? "#6b8f71" : "#e8e4dd", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#b5a892", marginBottom: 8 }}>Question {quizIdx + 1} of {QUIZ.length}</div>
          <h2 style={{ fontFamily: "'Source Serif 4'", fontSize: 22, fontWeight: 700, marginBottom: 20, lineHeight: 1.3 }}>{QUIZ[quizIdx].q}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {QUIZ[quizIdx].opts.map((opt, i) => (
              <button key={i} onClick={() => handleQuizAnswer(opt.score)} style={{
                padding: "14px 18px", borderRadius: 10, border: "1px solid #e8e4dd",
                background: "#fff", textAlign: "left", cursor: "pointer",
                fontSize: 14, color: "#2c2416", fontFamily: "'DM Sans'", fontWeight: 500,
                transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
                onMouseEnter={e => { e.target.style.borderColor = "#6b8f71"; e.target.style.background = "#f0f5f1"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#e8e4dd"; e.target.style.background = "#fff"; }}
              >{opt.text}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     MEET — Personal Onboarding Chat
     ═══════════════════════════════════════════ */
  if (page === "meet") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg, #faf8f4 0%, #f0ece4 100%)", fontFamily: "'DM Sans', sans-serif", color: "#2c2416", display: "flex", flexDirection: "column" }}>
      <div dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e8e4dd", display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6b8f71, #4a6e50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontFamily: "'Source Serif 4'", fontWeight: 700 }}>W</div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4'" }}>WealthPath</span>
        </div>
        <button onClick={() => setPage("setup")} style={{ fontSize: 11, color: "#8a7e6b", background: "none", border: "none", cursor: "pointer" }}>Skip →</button>
      </div>

      <div style={{ flex: 1, maxWidth: 520, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", padding: "0 24px" }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, padding: "16px 0 8px", justifyContent: "center" }}>
          {[0,1,2,3,4].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i <= meetStep ? "#6b8f71" : "#e8e4dd", transition: "background 0.3s" }} />)}
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#b5a892", marginBottom: 12 }}>Getting to know you — {Math.min(meetStep + 1, 5)} of 5</div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>
          {meetMsgs.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%", padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "linear-gradient(135deg, #6b8f71, #4a6e50)" : "#fff",
                color: msg.role === "user" ? "#fff" : "#2c2416",
                border: msg.role === "user" ? "none" : "1px solid #e8e4dd",
                fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}>{msg.content}</div>
            </div>
          ))}
        </div>

        {/* Input */}
        {meetStep < 5 && (
          <div style={{ padding: "12px 0 20px", display: "flex", gap: 8 }}>
            <input type="text" value={meetInput} onChange={e => setMeetInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMeet(meetInput)}
              placeholder={meetStep === 0 ? "Your first name..." : "Type your answer..."}
              style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #e8e4dd", fontSize: 14, fontFamily: "'DM Sans'", outline: "none", background: "#fff" }}
              autoFocus
            />
            <button onClick={() => sendMeet(meetInput)} style={{
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: meetInput.trim() ? "linear-gradient(135deg, #6b8f71, #4a6e50)" : "#e8e4dd",
              color: meetInput.trim() ? "#fff" : "#b5a892",
              fontSize: 14, fontWeight: 600, cursor: meetInput.trim() ? "pointer" : "default", fontFamily: "'DM Sans'",
            }}>→</button>
          </div>
        )}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     SETUP
     ═══════════════════════════════════════════ */
  if (page === "setup") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg, #faf8f4 0%, #f0ece4 100%)", fontFamily: "'DM Sans', sans-serif", color: "#2c2416" }}>
      <div dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e8e4dd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6b8f71, #4a6e50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontFamily: "'Source Serif 4'", fontWeight: 700 }}>W</div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4'" }}>WealthPath</span>
        </div>
        <button onClick={() => { setPage("quiz"); setQuizIdx(0); setQuizAnswers([]); }} style={{ fontSize: 12, color: "#8a7e6b", background: "none", border: "none", cursor: "pointer" }}>← Retake Quiz</button>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ background: "#f0f5f1", border: "1px solid #c8dcc8", borderRadius: 12, padding: "14px 18px", marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#4a6e50", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Your Risk Profile</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#6b8f71", marginTop: 2 }}>{RL[risk]}</div>
          <div style={{ fontSize: 12, color: "#8a7e6b", marginTop: 2 }}>Score: {risk}/10 — <button onClick={() => { setPage("quiz"); setQuizIdx(0); setQuizAnswers([]); }} style={{ color: "#6b8f71", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}>retake quiz</button></div>
        </div>

        <h2 style={{ fontFamily: "'Source Serif 4'", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{profile.name ? `Okay ${profile.name}, two quick things` : "Just two things to get started"}</h2>

        <div style={{ marginBottom: 20 }}><label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>How old are you?</label><div style={{ display: "flex", alignItems: "center", gap: 12 }}><input type="range" min={18} max={85} value={age} onChange={e => { setAge(+e.target.value); setHorizon(Math.max(3, Math.min(30, 67 - +e.target.value))); }} style={{ flex: 1, accentColor: "#6b8f71" }} /><span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#6b8f71", minWidth: 36, textAlign: "right" }}>{age}</span></div><div style={{ fontSize: 10, color: "#b5a892", marginTop: 2 }}>Planning for {horizon} years (until ~age {age + horizon})</div></div>

        <div style={{ marginBottom: 24 }}><label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>How much are you investing?</label><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[50000, 100000, 250000, 500000, 1000000].map(v => <button key={v} onClick={() => setAmount(v)} style={{ padding: "6px 12px", borderRadius: 7, border: amount === v ? "2px solid #6b8f71" : "1px solid #e8e4dd", background: amount === v ? "#f0f5f1" : "#fff", color: amount === v ? "#4a6e50" : "#8a7e6b", fontSize: 11, fontWeight: amount === v ? 600 : 500, cursor: "pointer", fontFamily: "'DM Sans'" }}>{fmt(v)}</button>)}<input type="number" value={amount} onChange={e => setAmount(Math.max(1000, +e.target.value))} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #e8e4dd", fontSize: 12, width: 100, fontFamily: "'JetBrains Mono'", outline: "none" }} /></div></div>

        <button onClick={buildPortfolio} style={{ width: "100%", padding: "14px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #6b8f71, #4a6e50)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'", boxShadow: "0 4px 16px rgba(107,143,113,0.3)", marginBottom: 12 }}>Build My Portfolio →</button>

        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 12, color: "#8a7e6b", cursor: "pointer", textAlign: "center" }}>More options (account type, horizon, withdrawals)</summary>
          <div style={{ marginTop: 16, padding: "16px", background: "#fff", border: "1px solid #e8e4dd", borderRadius: 10 }}>
            <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Account type</label><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{ACCTS.map(a => <button key={a.key} onClick={() => setAcct(a.key)} style={{ padding: "7px 10px", borderRadius: 7, textAlign: "left", border: acct === a.key ? "2px solid #6b8f71" : "1px solid #e8e4dd", background: acct === a.key ? "#f0f5f1" : "#fff", cursor: "pointer" }}><span style={{ fontSize: 11, fontWeight: 600, color: acct === a.key ? "#4a6e50" : "#2c2416" }}>{a.label}</span> <span style={{ fontSize: 9, color: "#b5a892" }}>{a.desc}</span></button>)}</div></div>
            <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Time horizon</label><div style={{ display: "flex", alignItems: "center", gap: 12 }}><input type="range" min={3} max={30} value={horizon} onChange={e => setHorizon(+e.target.value)} style={{ flex: 1, accentColor: "#6b8f71" }} /><span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#6b8f71" }}>{horizon} yrs</span></div></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Monthly withdrawal</label><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[0, 1500, 2500, 4000].map(v => <button key={v} onClick={() => setMW(v)} style={{ padding: "5px 10px", borderRadius: 6, border: mW === v ? "2px solid #6b8f71" : "1px solid #e8e4dd", background: mW === v ? "#f0f5f1" : "#fff", color: mW === v ? "#4a6e50" : "#8a7e6b", fontSize: 10, fontWeight: mW === v ? 600 : 500, cursor: "pointer", fontFamily: "'DM Sans'" }}>{v === 0 ? "None" : fmt(v) + "/mo"}</button>)}</div></div>
          </div>
        </details>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     RESULTS
     ═══════════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg, #faf8f4 0%, #f0ece4 100%)", fontFamily: "'DM Sans', sans-serif", color: "#2c2416" }}>
      <div dangerouslySetInnerHTML={{ __html: css }} />

      {/* Header */}
      <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8e4dd", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg, #6b8f71, #4a6e50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontFamily: "'Source Serif 4'", fontWeight: 700 }}>W</div>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Source Serif 4'" }}>WealthPath</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#8a7e6b", cursor: "pointer" }}>
            <input type="checkbox" checked={showInflation} onChange={e => setShowInflation(e.target.checked)} style={{ accentColor: "#6b8f71" }} />
            Inflation-adjusted
          </label>
          <button onClick={() => setPage("setup")} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e8e4dd", background: "#fff", color: "#8a7e6b", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>← Edit</button>
          <button onClick={generatePDF} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "linear-gradient(135deg, #6b8f71, #4a6e50)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'" }}>📄 PDF</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: "12px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 8, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em" }}>{ACCTS.find(a => a.key === acct)?.label} • {RL[risk]}{isCustomized ? " • Customized" : ""}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Source Serif 4'" }}>{fmt(amount)} • {horizon}-year plan</div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[{ l: "Return", v: pct(activeMetrics.aTax), c: "#6b8f71" }, { l: "Risk", v: pct(activeMetrics.vol), c: "#c4956a" }, { l: "Income", v: `${fmt(annDiv)}/yr`, c: "#b5897a" }].map((m, i) => (
              <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4'", color: m.c }}>{m.v}</div><div style={{ fontSize: 8, color: "#b5a892", textTransform: "uppercase" }}>{m.l}</div></div>
            ))}
          </div>
        </div>
        {/* Gentle nudge when customized */}
        {isCustomized && (
          <div style={{ marginTop: 6, padding: "8px 14px", borderRadius: 8, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center", background: sharpeDiff >= 0 ? "rgba(107,143,113,0.08)" : sharpeDiff > -0.15 ? "rgba(230,168,0,0.08)" : "rgba(196,78,78,0.08)", border: `1px solid ${sharpeDiff >= 0 ? "rgba(107,143,113,0.2)" : sharpeDiff > -0.15 ? "rgba(230,168,0,0.2)" : "rgba(196,78,78,0.2)"}` }}>
            <span style={{ color: sharpeDiff >= 0 ? "#4a6e50" : sharpeDiff > -0.15 ? "#8a6b30" : "#8a3030" }}>
              {sharpeDiff >= 0.05 ? "✨ Nice move — that actually improved things" : sharpeDiff >= 0 ? "👍 Looks good, not hurting anything" : sharpeDiff > -0.15 ? `Sharpe dipped ${Math.abs(sharpeDiff).toFixed(2)} — not a big deal if you like the picks` : `Heads up — risk-adjusted returns dropped a fair bit. Might wanna tweak.`}
            </span>
            <button onClick={resetToOptimized} style={{ fontSize: 10, color: "#6b8f71", background: "none", border: "1px solid rgba(107,143,113,0.3)", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontFamily: "'DM Sans'", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8 }}>Reset to Optimized</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: "10px 20px 0" }}>
        <div style={{ display: "flex", gap: 2, background: "#f0ece5", borderRadius: 8, padding: 2, overflowX: "auto" }}>
          {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: "1 0 auto", padding: "7px 6px", borderRadius: 6, border: "none", background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? (t.key === "whatif" ? "#8b6fc0" : "#6b8f71") : "#b5a892", fontSize: 10, fontWeight: tab === t.key ? 600 : 500, cursor: "pointer", fontFamily: "'DM Sans'", boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none", whiteSpace: "nowrap" }}>{t.icon} {t.label}</button>)}
        </div>
        {showInflation && <div style={{ fontSize: 10, color: "#6b8f71", marginTop: 4, textAlign: "center" }}>📉 Showing values in today's purchasing power (3% inflation)</div>}
      </div>

      <div style={{ padding: "12px 20px 20px" }}>

        {/* PORTFOLIO */}
        {tab === "portfolio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Plaid Connect Banner */}
            {!plaidConnected ? (
              <div style={{ background: "linear-gradient(135deg, #f0f5f1, #e8f0e8)", border: "1px solid #c8dcc8", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#2c2416", marginBottom: 2 }}>🏦 Connect your real brokerage</div>
                  <div style={{ fontSize: 11, color: "#6b8f71", lineHeight: 1.5 }}>Link your Fidelity, Schwab, Vanguard, or other account. We'll analyze your actual holdings — not hypotheticals.</div>
                </div>
                <button onClick={connectBrokerage} disabled={plaidLoading} style={{
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: plaidLoading ? "#b5a892" : "linear-gradient(135deg, #6b8f71, #4a6e50)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: plaidLoading ? "wait" : "pointer",
                  fontFamily: "'DM Sans'", boxShadow: "0 2px 8px rgba(107,143,113,0.25)", whiteSpace: "nowrap",
                }}>{plaidLoading ? "Connecting..." : "Connect Account"}</button>
              </div>
            ) : (
              <div style={{ background: "#f0f5f1", border: "1px solid #c8dcc8", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#4a6e50" }}>{plaidAccounts.map(a => a.name).join(", ")}</div>
                      <div style={{ fontSize: 10, color: "#6b8f71" }}>{plaidHoldings.length} holdings • {fmt(amount)} total</div>
                    </div>
                  </div>
                </div>
                {/* Yours vs Optimized toggle */}
                {realHoldingsSnapshot && (
                  <div style={{ display: "flex", gap: 0, marginTop: 10, background: "#e8e4dd", borderRadius: 8, padding: 2 }}>
                    <button onClick={() => { setViewMode("yours"); setCustomHoldings(realHoldingsSnapshot); }} style={{
                      flex: 1, padding: "8px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'", transition: "all 0.2s",
                      background: viewMode === "yours" ? "#fff" : "transparent", color: viewMode === "yours" ? "#2c2416" : "#8a7e6b",
                      boxShadow: viewMode === "yours" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    }}>Your Holdings</button>
                    <button onClick={() => { setViewMode("optimized"); setCustomHoldings(null); }} style={{
                      flex: 1, padding: "8px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'", transition: "all 0.2s",
                      background: viewMode === "optimized" ? "#fff" : "transparent", color: viewMode === "optimized" ? "#4a6e50" : "#8a7e6b",
                      boxShadow: viewMode === "optimized" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    }}>✨ Our Recommendation</button>
                  </div>
                )}
              </div>
            )}

            {/* Pie + Live Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
              <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 9, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Allocation</div>
                <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={hWP} dataKey="alloc" nameKey="ticker" cx="50%" cy="50%" innerRadius={40} outerRadius={74} paddingAngle={2} stroke="none">{hWP.map((h, i) => <Cell key={i} fill={h.color} />)}</Pie><Tooltip content={<PTip />} /></PieChart></ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>{hWP.map(h => <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#8a7e6b" }}><div style={{ width: 6, height: 6, borderRadius: 2, background: h.color }} />{h.ticker} {h.alloc}%</div>)}</div>
              </div>
              {/* Live Metrics Panel */}
              <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 9, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Live Metrics {isCustomized && <span style={{ color: "#6b8f71" }}>• updating</span>}</div>
                {[
                  { l: "Expected Return", v: pct(activeMetrics.aTax), c: "#6b8f71", base: pct(port.m.aTax) },
                  { l: "Volatility (Risk)", v: pct(activeMetrics.vol), c: "#c4956a", base: pct(port.m.vol) },
                  { l: "Sharpe Ratio", v: activeMetrics.sharpe.toFixed(2), c: "#7a9bb5", base: port.m.sharpe.toFixed(2) },
                  { l: "Dividend Yield", v: pct(activeMetrics.div), c: "#b5897a", base: pct(port.m.div) },
                  { l: "Annual Income", v: fmt(annDiv), c: "#6b8f71", base: fmt(Math.round(amount * port.m.div)) },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < 4 ? "1px solid #f5f2ec" : "none" }}>
                    <span style={{ fontSize: 11, color: "#8a7e6b" }}>{m.l}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Source Serif 4'", color: m.c }}>{m.v}</span>
                      {isCustomized && m.v !== m.base && <span style={{ fontSize: 9, color: "#b5a892" }}>was {m.base}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings with controls */}
            <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em" }}>Holdings — drag sliders to customize {pLoad && <span style={{ color: "#6b8f71" }}>• loading prices...</span>}</div>
                <button onClick={() => setShowAddPanel(!showAddPanel)} style={{ fontSize: 10, fontWeight: 600, color: "#6b8f71", background: "#f0f5f1", border: "1px solid #c8dcc8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans'" }}>
                  {showAddPanel ? "✕ Close" : "+ Add Holding"}
                </button>
              </div>

              {/* Add Holdings Panel */}
              {showAddPanel && (
                <div style={{ background: "#f7f4ef", border: "1px solid #e8e4dd", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <input type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search stocks & ETFs..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid #e8e4dd", fontSize: 12, fontFamily: "'DM Sans'", outline: "none", marginBottom: 8, background: "#fff" }} />
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {ALL_ASSETS
                      .filter(a => !activeHoldings.find(h => h.ticker === a.ticker))
                      .filter(a => !addSearch || a.ticker.toLowerCase().includes(addSearch.toLowerCase()) || a.name.toLowerCase().includes(addSearch.toLowerCase()) || a.sector.toLowerCase().includes(addSearch.toLowerCase()))
                      .map(a => (
                        <div key={a.ticker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px", borderBottom: "1px solid #f0ece5" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: "#2c2416" }}>{a.ticker}</span>
                              <span style={{ fontSize: 8, color: "#b5a892", background: "#fff", padding: "0 4px", borderRadius: 2 }}>{a.type}</span>
                              <span style={{ fontSize: 8, color: "#8a7e6b" }}>{a.sector}</span>
                            </div>
                            <div style={{ fontSize: 10, color: "#8a7e6b" }}>{a.name}{a.inside ? ` — ${a.inside.role}` : ""}</div>
                          </div>
                          <button onClick={() => addHolding(a)} style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: "#6b8f71", border: "none", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans'" }}>Add</button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Individual Holdings */}
              {hWP.map(h => {
                const insideData = h.inside || ALL_ASSETS.find(a => a.ticker === h.ticker)?.inside;
                return (
                <div key={h.ticker} style={{ padding: "10px 0", borderBottom: "1px solid #f5f2ec" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: h.color }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{h.ticker}</span>
                      <span style={{ fontSize: 8, color: "#b5a892", background: "#f7f4ef", padding: "0 4px", borderRadius: 2 }}>{h.type}</span>
                      <span style={{ fontSize: 10, color: "#8a7e6b" }}>{h.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {plaidConnected && h.realQty ? (
                        <span style={{ fontSize: 10, color: "#8a7e6b" }}>{h.realQty} shares @ ${h.livePrice?.toFixed(2)}</span>
                      ) : h.livePrice ? (
                        <span style={{ fontSize: 10, color: "#8a7e6b" }}>${h.livePrice} × {h.shares}</span>
                      ) : null}
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: "#6b8f71", minWidth: 42, textAlign: "right" }}>{h.alloc}%</span>
                      <span style={{ fontSize: 11, color: "#8a7e6b", minWidth: 65, textAlign: "right" }}>{fmt(plaidConnected && h.realValue ? h.realValue : h.dollarAmt)}</span>
                    </div>
                  </div>
                  {/* Gain/loss for real holdings */}
                  {plaidConnected && h.realCostBasis > 0 && h.realValue > 0 && (
                    <div style={{ marginLeft: 12, marginBottom: 2, fontSize: 10, color: h.realValue >= h.realCostBasis ? "#4a6e50" : "#b04040" }}>
                      {h.realValue >= h.realCostBasis ? "▲" : "▼"} {fmt(Math.abs(h.realValue - h.realCostBasis))} ({((h.realValue - h.realCostBasis) / h.realCostBasis * 100).toFixed(1)}%)
                    </div>
                  )}
                  {/* What's Inside */}
                  {insideData && (
                    <details style={{ marginLeft: 12, marginBottom: 4 }}>
                      <summary style={{ fontSize: 10, color: "#6b8f71", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>
                        What's inside{insideData.count ? ` (${insideData.count})` : ""} ▾
                      </summary>
                      <div style={{ background: "#f9f7f3", border: "1px solid #f0ece5", borderRadius: 6, padding: "8px 10px", marginTop: 4 }}>
                        {insideData.role && <div style={{ fontSize: 11, color: "#4a6e50", fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>{insideData.role}</div>}
                        {insideData.top && insideData.top.map((t, i) => <div key={i} style={{ fontSize: 10, color: "#6b5a40", lineHeight: 1.5, paddingLeft: 6, borderLeft: "2px solid #e8e4dd", marginBottom: 2 }}>{t}</div>)}
                      </div>
                    </details>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 12 }}>
                    <input type="range" min={1} max={60} value={Math.round(h.weight * 100)} disabled={h.locked}
                      onChange={e => updateWeight(h.ticker, +e.target.value / 100)}
                      style={{ flex: 1, accentColor: h.locked ? "#b5a892" : "#6b8f71", opacity: h.locked ? 0.4 : 1 }} />
                    <button onClick={() => toggleLock(h.ticker)} title={h.locked ? "Unlock" : "Lock at this %"}
                      style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer", opacity: h.locked ? 1 : 0.4, padding: "2px" }}>
                      {h.locked ? "🔒" : "🔓"}
                    </button>
                    <button onClick={() => removeHolding(h.ticker)} title="Remove" disabled={activeHoldings.length <= 2}
                      style={{ fontSize: 12, background: "none", border: "none", cursor: activeHoldings.length <= 2 ? "not-allowed" : "pointer", opacity: activeHoldings.length <= 2 ? 0.2 : 0.5, padding: "2px", color: "#c45050" }}>
                      ✕
                    </button>
                  </div>
                </div>
              );})}
            </div>
            {/* Disclaimer */}
            <div style={{ marginTop: 8, padding: "10px 12px", background: "#fdf8f0", border: "1px solid #e8dcc8", borderRadius: 6, fontSize: 9, color: "#8a7e6b", lineHeight: 1.5 }}>
              Expected returns are estimates based on historical data. Actual results will vary. This is educational — not financial advice. Consult a licensed advisor before investing.
            </div>
          </div>
        )}

        {/* MONTE CARLO */}
        {tab === "montecarlo" && (
          <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", gap: 14, margin: "0 0 10px", flexWrap: "wrap" }}>
              {[{ l: "Worst 10%", v: fmt(adjMC[adjMC.length-1].p10), c: "#c4956a" }, { l: "Median", v: fmt(adjMC[adjMC.length-1].p50), c: "#6b8f71" }, { l: "Best 10%", v: fmt(adjMC[adjMC.length-1].p90), c: "#7a9bb5" }, { l: "Prob Gain", v: `${(mcD.pGain*100).toFixed(0)}%`, c: "#6b8f71" }].map((m, i) => <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Source Serif 4'", color: m.c }}>{m.v}</div><div style={{ fontSize: 8, color: "#b5a892", textTransform: "uppercase" }}>{m.l}</div></div>)}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={adjMC} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b8f71" stopOpacity={0.15} /><stop offset="100%" stopColor="#6b8f71" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece5" /><XAxis dataKey="label" tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={{ stroke: "#e8e4dd" }} tickLine={false} /><YAxis tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} /><Tooltip content={<CT />} />
                <Area type="monotone" dataKey="p90" stroke="#7a9bb5" strokeWidth={1} fill="none" strokeDasharray="4 3" name="90th" />
                <Area type="monotone" dataKey="p50" stroke="#6b8f71" strokeWidth={2.5} fill="url(#mg)" name="Median" />
                <Area type="monotone" dataKey="p10" stroke="#c4956a" strokeWidth={1} fill="none" strokeDasharray="4 3" name="10th" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* BENCHMARK */}
        {tab === "benchmark" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#fff", border: "2px solid #c8dcc8", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#4a6e50", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Your Portfolio</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#6b8f71", marginTop: 4 }}>{fmt(adjBM[adjBM.length-1].portfolio)}</div>
                <div style={{ fontSize: 11, color: "#8a7e6b" }}>{pct(activeMetrics.aTax)} return • {pct(activeMetrics.vol)} vol • Sharpe {activeMetrics.sharpe.toFixed(2)}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em" }}>S&P 500 Index</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#c4956a", marginTop: 4 }}>{fmt(adjBM[adjBM.length-1].sp500)}</div>
                <div style={{ fontSize: 11, color: "#8a7e6b" }}>{pct(SP500.expReturn)} return • {pct(SP500.vol)} vol</div>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 18 }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={adjBM} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b8f71" stopOpacity={0.15}/><stop offset="100%" stopColor="#6b8f71" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece5" /><XAxis dataKey="label" tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={{ stroke: "#e8e4dd" }} tickLine={false} /><YAxis tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} /><Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="portfolio" stroke="#6b8f71" strokeWidth={2.5} fill="url(#pg)" name="Your Portfolio" />
                  <Area type="monotone" dataKey="sp500" stroke="#c4956a" strokeWidth={2} fill="none" strokeDasharray="5 3" name="S&P 500" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#f0f5f1", border: "1px solid #c8dcc8", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#3a4f3e", lineHeight: 1.7 }}>
              {adjBM[adjBM.length-1].portfolio > adjBM[adjBM.length-1].sp500
                ? `Your portfolio outperforms the S&P 500 by ${fmt(adjBM[adjBM.length-1].portfolio - adjBM[adjBM.length-1].sp500)} over ${horizon} years, with a superior Sharpe ratio of ${activeMetrics.sharpe.toFixed(2)}.`
                : `The S&P 500 shows higher raw returns, but your portfolio offers a better Sharpe ratio (${activeMetrics.sharpe.toFixed(2)}), meaning better risk-adjusted performance. You're getting paid more per unit of risk taken, plus ${fmt(annDiv)}/year in dividend income.`}
            </div>
          </div>
        )}

        {/* WHAT IF */}
        {tab === "whatif" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#8b6fc0", marginBottom: 8 }}>What if I saved an extra...</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="range" min={100} max={5000} step={100} value={extraMo} onChange={e => setExtraMo(+e.target.value)} style={{ flex: 1, accentColor: "#8b6fc0" }} />
                <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#8b6fc0", minWidth: 90, textAlign: "right" }}>{fmt(extraMo)}</span>
              </div>
              <div style={{ fontSize: 11, color: "#b5a892", marginTop: 3 }}>per month for {horizon} years</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em" }}>Without Extra</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#8a7e6b", marginTop: 3 }}>{fmt(adjWI[adjWI.length-1].base)}</div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #f5f0ff, #ede6ff)", border: "2px solid #c4b0e8", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#8b6fc0", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>With {fmt(extraMo)}/mo</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#8b6fc0", marginTop: 3 }}>{fmt(adjWI[adjWI.length-1].extra)}</div>
                <div style={{ fontSize: 10, color: "#6b5a8e" }}>+{fmt(adjWI[adjWI.length-1].diff)}</div>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16 }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={adjWI} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b6fc0" stopOpacity={0.2}/><stop offset="100%" stopColor="#8b6fc0" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece5" /><XAxis dataKey="label" tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={{ stroke: "#e8e4dd" }} tickLine={false} /><YAxis tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} /><Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="extra" stroke="#8b6fc0" strokeWidth={2.5} fill="url(#wg)" name={`With ${fmt(extraMo)}/mo`} />
                  <Area type="monotone" dataKey="base" stroke="#b5a892" strokeWidth={2} fill="none" strokeDasharray="4 4" name="Without" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "linear-gradient(135deg, #f5f0ff, #fff)", border: "1px solid #d4c5ee", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#4a3670", lineHeight: 1.7 }}>
              {fmt(extraMo)}/month = {fmt(adjWI[adjWI.length-1].diff)} more over {horizon} years. You'd contribute {fmt(wiD[wiD.length-1].contributed)}, but compound growth adds {fmt(wiD[wiD.length-1].diff - wiD[wiD.length-1].contributed)} on top — that's money your money earned.
            </div>
          </div>
        )}

        {/* WITHDRAWAL */}
        {tab === "withdrawal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[{ l: "Monthly", v: fmt(mW) }, { l: "Rate", v: pct(wdD.rate), c: wdD.rate <= 0.04 ? "#6b8f71" : "#c4956a" }, { l: "30-Yr Success", v: `${(wdD.sr*100).toFixed(0)}%`, c: wdD.sr >= 0.9 ? "#6b8f71" : "#c4956a" }].map((m, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#b5a892", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.l}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Source Serif 4'", color: m.c || "#2c2416", marginTop: 2 }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#b5a892" }}>$0</span>
                <input type="range" min={0} max={Math.round(amount * 0.1 / 12)} step={100} value={mW} onChange={e => setMW(+e.target.value)} style={{ flex: 1, accentColor: "#6b8f71" }} />
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Source Serif 4'", color: "#6b8f71" }}>{fmt(mW)}/mo</span>
              </div>
              <div style={{ fontSize: 10, color: "#b5a892", marginTop: 3 }}>Safe: ~{fmt(Math.round(amount * 0.04 / 12))}/mo (4% rule)</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e8e4dd", borderRadius: 12, padding: 16 }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={wdD.md} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece5" /><XAxis dataKey="label" tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={{ stroke: "#e8e4dd" }} tickLine={false} /><YAxis tick={{ fill: "#b5a892", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} /><Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="p90" stroke="#7a9bb5" strokeWidth={1} fill="none" strokeDasharray="4 3" name="Best 10%" />
                  <Area type="monotone" dataKey="p50" stroke="#6b8f71" strokeWidth={2.5} fill="none" name="Median" />
                  <Area type="monotone" dataKey="p10" stroke="#c4956a" strokeWidth={1.5} fill="none" strokeDasharray="4 3" name="Worst 10%" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* AI Chat Button */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{
          position: "fixed", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
          background: "linear-gradient(135deg, #6b8f71, #4a6e50)", border: "none", color: "#fff",
          fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(107,143,113,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>💬</button>
      )}

      {/* AI Chat Drawer */}
      {chatOpen && (
        <div style={{
          position: "fixed", bottom: 0, right: 0, width: "min(420px, 100vw)", height: "min(600px, 90vh)",
          background: "#faf8f4", border: "1px solid #e8e4dd", borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.12)", zIndex: 200,
          display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
        }}>
          {/* Chat Header */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e4dd", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #f7f4ef, #f0ece5)", borderRadius: "16px 16px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: "linear-gradient(135deg, #6b8f71, #4a6e50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 }}>🤖</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Source Serif 4', serif", color: "#2c2416" }}>{profile.name ? `${profile.name}'s money person` : "Your money person"}</div>
                <div style={{ fontSize: 10, color: "#8a7e6b" }}>{profile.name ? "knows your story, knows your numbers" : "ask me anything"}</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", fontSize: 18, color: "#8a7e6b", cursor: "pointer", padding: 4 }}>✕</button>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMsgs.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #6b8f71, #4a6e50)" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#2c2416",
                  border: msg.role === "user" ? "none" : "1px solid #e8e4dd",
                  fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "#fff", border: "1px solid #e8e4dd", fontSize: 13, color: "#8a7e6b" }}>
                  {activeLifeEvent ? "Give me a sec, thinking about this one carefully..." : profile.name ? `Hmm, let me think about that, ${profile.name}...` : "Let me look at your numbers..."}
                </div>
              </div>
            )}
          </div>

          {/* Life Event Quick Buttons */}
          {chatMsgs.length <= 3 && (
            <div style={{ padding: "0 16px 4px" }}>
              <div style={{ fontSize: 9, color: "#b5a892", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Life Events</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[
                  { icon: "👶", label: "Having a baby", msg: "So... I'm having a baby. What do I need to think about money-wise?" },
                  { icon: "💍", label: "Getting married", msg: "I'm getting married! How should we think about money together?" },
                  { icon: "🏠", label: "Buying a home", msg: "I'm thinking about buying a house. Can I afford it without messing up my investments?" },
                  { icon: "🎉", label: "Retiring", msg: "I think I might be ready to retire. Am I actually ready though?" },
                  { icon: "💰", label: "Got a windfall", msg: "I just got a big chunk of money I wasn't expecting. What do I do with it?" },
                  { icon: "😰", label: "Lost my job", msg: "I just lost my job and I'm kind of freaking out. What should I do with my money right now?" },
                ].map(e => (
                  <button key={e.label} onClick={() => sendChat(e.msg)} style={{ padding: "4px 8px", borderRadius: 10, border: "1px solid #e8e4dd", background: "#fff", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans'" }}>{e.icon} {e.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion Chips */}
          {chatMsgs.length <= 2 && (
            <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                "Am I gonna be okay?",
                "Add some Tesla",
                "What if I retire at 62?",
                "What would YOU change?",
              ].map(q => (
                <button key={q} onClick={() => sendChat(q)} style={{ padding: "5px 10px", borderRadius: 14, border: "1px solid #e8e4dd", background: "#fff", color: "#6b8f71", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans'", fontWeight: 500 }}>{q}</button>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid #e8e4dd", display: "flex", gap: 8, background: "#fff", borderRadius: "0 0 0 0" }}>
            <input
              type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat(chatInput)}
              placeholder="Ask about your portfolio..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e8e4dd", fontSize: 13, fontFamily: "'DM Sans'", outline: "none", background: "#faf8f4" }}
            />
            <button onClick={() => sendChat(chatInput)} disabled={chatLoading || !chatInput.trim()} style={{
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: chatInput.trim() ? "linear-gradient(135deg, #6b8f71, #4a6e50)" : "#e8e4dd",
              color: chatInput.trim() ? "#fff" : "#b5a892",
              fontSize: 13, fontWeight: 600, cursor: chatInput.trim() ? "pointer" : "default", fontFamily: "'DM Sans'",
            }}>Send</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "16px 20px", textAlign: "center", fontSize: 10, color: "#b5a892", borderTop: "1px solid #e8e4dd" }}>
        WealthPath is for educational purposes only. Not financial advice. Past performance ≠ future results. Consult a qualified financial advisor before investing.
      </div>
    </div>
  );
}
