const { plaidClient } = require('./_plaid.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { public_token } = req.body;
  if (!public_token) return res.status(400).json({ error: 'Missing public_token' });

  try {
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = exchangeRes.data.access_token;

    const holdingsRes = await plaidClient.investmentsHoldingsGet({ access_token });
    const { accounts, holdings, securities } = holdingsRes.data;

    const enrichedHoldings = holdings.map(h => {
      const security = securities.find(s => s.security_id === h.security_id);
      return {
        ticker: security?.ticker_symbol || 'UNKNOWN',
        name: security?.name || 'Unknown Security',
        type: security?.type || 'unknown',
        quantity: h.quantity,
        price: security?.close_price || 0,
        value: h.institution_value || (h.quantity * (security?.close_price || 0)),
        costBasis: h.cost_basis,
        isCash: security?.is_cash_equivalent || false,
      };
    }).filter(h => !h.isCash && h.ticker !== 'UNKNOWN');

    const accountSummary = accounts
      .filter(a => a.type === 'investment')
      .map(a => ({
        name: a.name,
        officialName: a.official_name,
        subtype: a.subtype,
        balance: a.balances.current,
        mask: a.mask,
      }));

    const totalValue = accountSummary.reduce((s, a) => s + (a.balance || 0), 0);

    return res.json({ accounts: accountSummary, holdings: enrichedHoldings, totalValue });
  } catch (error) {
    console.error('Holdings error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch holdings', details: error?.response?.data?.error_message || error.message });
  }
};
