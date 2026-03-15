// /api/_supabase.js
// Shared Supabase client — returns null if not configured

let client = null;

function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) return null;

  // Lightweight Supabase REST client (no SDK needed)
  client = {
    url,
    key,
    async query(table, method, body, filters) {
      let endpoint = `${url}/rest/v1/${table}`;
      if (filters) endpoint += `?${filters}`;

      const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : undefined,
      };
      // Remove undefined headers
      Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k]);

      const opts = { method: method || 'GET', headers };
      if (body && (method === 'POST' || method === 'PATCH')) {
        opts.body = JSON.stringify(body);
      }

      const res = await fetch(endpoint, opts);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase ${method} ${table}: ${res.status} ${err}`);
      }
      return res.json();
    },
  };

  return client;
}

module.exports = { getSupabase };
