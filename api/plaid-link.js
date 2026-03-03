const { plaidClient } = require('./_plaid.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const isSandbox = (process.env.PLAID_ENV || 'sandbox') === 'sandbox';

    // In sandbox: create a public token directly (bypasses Link modal)
    if (isSandbox && req.body.useSandboxShortcut) {
      try {
        const ptRes = await plaidClient.sandboxPublicTokenCreate({
          institution_id: 'ins_115616',
          initial_products: ['investments'],
        });
        return res.json({ public_token: ptRes.data.public_token, sandbox_direct: true });
      } catch (sandboxErr) {
        console.error('Sandbox shortcut failed:', sandboxErr?.response?.data || sandboxErr.message);
        // Fall through to normal Link flow
      }
    }

    // Normal flow: create a link token for Plaid Link modal
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.body.userId || 'wealthpath-user-' + Date.now() },
      client_name: 'WealthPath',
      products: ['investments'],
      country_codes: ['US'],
      language: 'en',
    });
    return res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Link token error:', JSON.stringify(error?.response?.data || error.message));
    return res.status(500).json({ 
      error: 'Failed to create link token', 
      details: error?.response?.data?.error_message || error.message 
    });
  }
};
