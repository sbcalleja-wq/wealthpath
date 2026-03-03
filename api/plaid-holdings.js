import { plaidClient } from './_plaid.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { public_token } = req.body;
  if (!public_token) return res.status(400).json({ error: 'Missing public_token' });

  try {
    // Exchange public token for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = exchangeRes.data.access_token;

    // Fetch holdings
    const holdingsRes = await plaidClient.investmentsHoldingsGet({ access_token });
    const { accounts, holdings, securities } = holdingsRes.data;

    // Build a clean response: map holdings to securities
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
        securityType: security?.type,
        isCash: security?.is_cash_equivalent || false,
      };
    }).filter(h => !h.isCash); // Exclude cash positions

    // Build account summary
    const accountSummary = accounts
      .filter(a => a.type === 'investment')
      .map(a => ({
        name: a.name,
        officialName: a.official_name,
        subtype: a.subtype, // ira, 401k, brokerage, etc
        balance: a.balances.current,
        mask: a.mask,
      }));

    const totalValue = accountSummary.reduce((s, a) => s + (a.balance || 0), 0);

    return res.json({
      accounts: accountSummary,
      holdings: enrichedHoldings,
      totalValue,
      // Don't send access_token to client — keep it server-side in production
      // For now we send it back so we can refresh later
      _accessToken: access_token,
    });
  } catch (error) {
    console.error('Holdings error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch holdings' });
  }
}
