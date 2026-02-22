require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY;
const LIVEAVATAR_BASE_URL = process.env.LIVEAVATAR_BASE_URL || 'https://api.liveavatar.com';
const AVATAR_ID = process.env.LIVEAVATAR_AVATAR_ID;
const CONTEXT_ID = process.env.LIVEAVATAR_CONTEXT_ID || '';
const VOICE_ID = process.env.LIVEAVATAR_VOICE_ID || '';
const LANGUAGE = process.env.LIVEAVATAR_LANGUAGE || '';
const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const isUuid = (v) => UUID_RE.test(v);

app.use(express.json());
app.use(express.static('public'));

app.post('/api/session', async (req, res) => {
  if (!LIVEAVATAR_API_KEY) {
    return res.status(500).json({ error: 'Missing LIVEAVATAR_API_KEY' });
  }
  if (!AVATAR_ID) {
    return res.status(500).json({ error: 'Missing LIVEAVATAR_AVATAR_ID' });
  }

  try {
    const tokenResp = await fetch(`${LIVEAVATAR_BASE_URL}/v1/sessions/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': LIVEAVATAR_API_KEY
      },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: AVATAR_ID,
        interactivity_type: 'PUSH_TO_TALK',
        avatar_persona: {
          voice_id: isUuid(VOICE_ID) ? VOICE_ID : undefined,
          context_id: isUuid(CONTEXT_ID) ? CONTEXT_ID : undefined,
          language: LANGUAGE || undefined
        }
      })
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return res.status(tokenResp.status).json({ error: 'Create session token failed', details: errText });
    }

    const tokenData = await tokenResp.json();
    const sessionToken =
      tokenData.session_token ||
      tokenData.token ||
      (tokenData.data && tokenData.data.session_token) ||
      (tokenData.data && tokenData.data.token);
    const sessionId =
      tokenData.session_id ||
      (tokenData.data && tokenData.data.session_id);

    if (!sessionToken) {
      return res.status(500).json({
        error: 'Missing session_token in token response',
        details: tokenData
      });
    }

    const startResp = await fetch(`${LIVEAVATAR_BASE_URL}/v1/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({})
    });

    if (!startResp.ok) {
      const errText = await startResp.text();
      return res.status(startResp.status).json({ error: 'Start session failed', details: errText });
    }

    const startData = await startResp.json();

    return res.json({
      session_id: sessionId,
      session_token: sessionToken,
      ...startData,
      debug: {
        tokenData,
        startData
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/session/stop', async (req, res) => {
  if (!LIVEAVATAR_API_KEY) {
    return res.status(500).json({ error: 'Missing LIVEAVATAR_API_KEY' });
  }

  const { session_id: sessionId, session_token: sessionToken } = req.body || {};
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
});

app.listen(PORT, () => {
  console.log(`LiveAvatar demo server listening on http://localhost:${PORT}`);
});
