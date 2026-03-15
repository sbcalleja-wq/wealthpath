-- Run this in Supabase SQL Editor to create the sessions table
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  risk INTEGER,
  age INTEGER,
  amount BIGINT,
  horizon INTEGER,
  acct TEXT,
  monthly_withdrawal INTEGER DEFAULT 0,
  profile JSONB DEFAULT '{}',
  custom_holdings JSONB,
  chat_history JSONB DEFAULT '[]',
  voice_profile JSONB DEFAULT '{}',
  plaid_connected BOOLEAN DEFAULT false,
  plaid_accounts JSONB DEFAULT '[]',
  plaid_holdings JSONB DEFAULT '[]',
  real_holdings_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow upserts (insert or update on conflict)
-- Enable Row Level Security (optional, but good practice)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (tighten when you add auth)
CREATE POLICY "Allow all" ON sessions FOR ALL USING (true) WITH CHECK (true);
