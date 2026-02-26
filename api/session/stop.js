const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY;
const LIVEAVATAR_BASE_URL = process.env.LIVEAVATAR_BASE_URL || 'https://api.liveavatar.com';

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!LIVEAVATAR_API_KEY) {
    return res.status(500).json({ error: 'Missing LIVEAVATAR_API_KEY' });
  }

  const body = parseBody(req);
  const { session_id: sessionId, session_token: sessionToken } = body || {};
  if (!sessionId || !sessionToken) {
    return res.status(400).json({ error: 'Missing session_id or session_token' });
  }

  try {
    const stopResp = await fetch(`${LIVEAVATAR_BASE_URL}/v1/sessions/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!stopResp.ok) {
      const errText = await stopResp.text();
      return res.status(stopResp.status).json({ error: 'Stop session failed', details: errText });
    }

    const stopData = await stopResp.json().catch(() => ({}));
    return res.json({ ok: true, ...stopData });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
