# WealthPath

A personalized AI wealth companion. Takes a 5-question risk quiz, learns about you through a conversational onboarding, then builds a lean ETF portfolio optimized for your risk profile, age, and tax situation.

## Features

- **AI Companion** — Knows your name, goals, fears, and personality. Adapts its communication style over time.
- **Lean Core Portfolios** — 3-4 ETFs per risk tier, optimized for maximum Sharpe ratio.
- **Monte Carlo Simulation** — 1,000 scenarios showing the range of possible outcomes.
- **Natural Language Portfolio Control** — "Add some Tesla", "drop bonds", "more QQQ" — changes happen in real-time.
- **Life Event Mode** — Detects major life events (baby, marriage, job loss, retirement) and responds with empathy first, numbers second.
- **Scenario Conversations** — "What if I retire at 62?" runs actual math and gives you real numbers.
- **What's Inside** — Every holding shows what it actually contains and why it's in your portfolio.
- **What If Savings** — See how extra monthly contributions compound over time.
- **Withdrawal Analysis** — Monte Carlo simulation of your withdrawal sustainability.
- **S&P 500 Benchmark** — Compare your portfolio against a simple index strategy.
- **PDF Report** — Downloadable portfolio summary.

## Tech

- React + Vite
- Recharts for data visualization
- Anthropic API (Claude Sonnet) for AI chat + live price fetching
- No backend — runs entirely in the browser

## Development

```bash
npm install
npm run dev
```

## Deployment

Built for Vercel — just connect the repo and deploy.
