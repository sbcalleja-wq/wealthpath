const { plaidClient } = require('./_plaid.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const isSandbox = (process.env.PLAID_ENV || 'sandbox') === 'sandbox';

    if (isSandbox && req.body.useSandboxShortcut) {
      const ptRes = await plaidClient.sandboxPublicTokenCreate({
        institution_id: 'ins_109508',
        initial_products: ['investments'],
        options: {
          override_username: 'user_custom',
          override_password: JSON.stringify({
            override_accounts: [
              {
                type: 'investment',
                subtype: 'brokerage',
                starting_balance: 287500,
                meta: { name: 'Plaid Brokerage', official_name: 'Plaid Taxable Brokerage' },
                holdings: {
                  securities: [
                    { ticker_symbol: 'VTI', current_price: 285.50, iso_currency_code: 'USD' },
                    { ticker_symbol: 'VXUS', current_price: 62.30, iso_currency_code: 'USD' },
                    { ticker_symbol: 'BND', current_price: 72.10, iso_currency_code: 'USD' },
                    { ticker_symbol: 'AAPL', current_price: 228.50, iso_currency_code: 'USD' },
                    { ticker_symbol: 'MSFT', current_price: 415.20, iso_currency_code: 'USD' },
                    { ticker_symbol: 'NVDA', current_price: 138.70, iso_currency_code: 'USD' },
                    { ticker_symbol: 'COST', current_price: 925.40, iso_currency_code: 'USD' },
                  ],
                  holdings: [
                    { institution_price: 285.50, quantity: 350, security_id: 'VTI', cost_basis: 78000 },
                    { institution_price: 62.30, quantity: 500, security_id: 'VXUS', cost_basis: 28000 },
                    { institution_price: 72.10, quantity: 400, security_id: 'BND', cost_basis: 30000 },
                    { institution_price: 228.50, quantity: 100, security_id: 'AAPL', cost_basis: 18000 },
                    { institution_price: 415.20, quantity: 60, security_id: 'MSFT', cost_basis: 22000 },
                    { institution_price: 138.70, quantity: 150, security_id: 'NVDA', cost_basis: 12000 },
                    { institution_price: 925.40, quantity: 15, security_id: 'COST', cost_basis: 11000 },
                  ],
                },
              },
              {
                type: 'investment',
                subtype: 'ira',
                starting_balance: 142000,
                meta: { name: 'Plaid IRA', official_name: 'Plaid Traditional IRA' },
                holdings: {
                  securities: [
                    { ticker_symbol: 'VOO', current_price: 530.20, iso_currency_code: 'USD' },
                    { ticker_symbol: 'SCHD', current_price: 82.40, iso_currency_code: 'USD' },
                    { ticker_symbol: 'QQQ', current_price: 505.60, iso_currency_code: 'USD' },
                  ],
                  holdings: [
                    { institution_price: 530.20, quantity: 150, security_id: 'VOO', cost_basis: 68000 },
                    { institution_price: 82.40, quantity: 400, security_id: 'SCHD', cost_basis: 29000 },
                    { institution_price: 505.60, quantity: 50, security_id: 'QQQ', cost_basis: 20000 },
                  ],
                },
              },
            ],
          }),
        },
      });
      return res.json({ public_token: ptRes.data.public_token, sandbox_direct: true });
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.body.userId || 'wealthpath-user-' + Date.now() },
      client_name: 'WealthPath',
      products: ['investments'],
      country_codes: ['US'],
      language: 'en',
      account_filters: {
        investment: {
          account_subtypes: ['brokerage', '401k', 'ira', 'roth', '529'],
        },
      },
    });
    return res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Link token error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to create link token', details: error?.response?.data?.error_message || error.message });
  }
};
