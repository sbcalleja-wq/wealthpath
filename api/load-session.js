// /api/load-session.js
// Loads user portfolio, chat history, profile, and settings
const { getSupabase } = require('./_supabase.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getSupabase();
  if (!db) return res.status(503).json({ error: 'Database not configured' });

  const sessionId = req.query.id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session id' });

  try {
    const rows = await db.query('sessions', 'GET', null, `id=eq.${sessionId}`);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const s = rows[0];
    return res.json({
      sessionId: s.id,
      data: {
        risk: s.risk,
        age: s.age,
        amount: s.amount,
        horizon: s.horizon,
        acct: s.acct,
        mW: s.monthly_withdrawal,
        profile: s.profile,
        customHoldings: s.custom_holdings,
        chatMsgs: s.chat_history,
        voiceProfile: s.voice_profile,
        plaidConnected: s.plaid_connected,
        plaidAccounts: s.plaid_accounts,
        plaidHoldings: s.plaid_holdings,
        realHoldingsSnapshot: s.real_holdings_snapshot,
      },
    });
  } catch (error) {
    console.error('Load session error:', error.message);
    return res.status(500).json({ error: 'Failed to load session', details: error.message });
  }
};
