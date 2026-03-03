import { plaidClient } from './_plaid.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.body.userId || 'wealthpath-user-' + Date.now() },
      client_name: 'WealthPath',
      products: ['investments'],
      country_codes: ['US'],
      language: 'en',
    });
    return res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Link token error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to create link token' });
  }
}
