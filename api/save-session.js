// /api/save-session.js
// Saves user portfolio, chat history, profile, and settings
const { getSupabase } = require('./_supabase.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = getSupabase();
  if (!db) return res.status(503).json({ error: 'Database not configured' });

  const { sessionId, data } = req.body;
  if (!sessionId || !data) return res.status(400).json({ error: 'Missing sessionId or data' });

  try {
    // Upsert: insert if new, update if exists
    const result = await db.query('sessions', 'POST', {
      id: sessionId,
      risk: data.risk,
      age: data.age,
      amount: data.amount,
      horizon: data.horizon,
      acct: data.acct,
      monthly_withdrawal: data.mW,
      profile: data.profile,
      custom_holdings: data.customHoldings,
      chat_history: data.chatMsgs,
      voice_profile: data.voiceProfile,
      plaid_connected: data.plaidConnected,
      plaid_accounts: data.plaidAccounts,
      plaid_holdings: data.plaidHoldings,
      real_holdings_snapshot: data.realHoldingsSnapshot,
      updated_at: new Date().toISOString(),
    }, 'on_conflict=id');

    return res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Save session error:', error.message);
    return res.status(500).json({ error: 'Failed to save session', details: error.message });
  }
};
