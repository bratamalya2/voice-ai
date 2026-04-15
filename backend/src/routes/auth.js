const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Step 1 — Redirect to Google consent screen
router.get('/google', (req, res) => {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  res.redirect(url);
});

// Step 2 — Handle callback, display refresh token
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);

    res.send(`
      <h2>Google OAuth Success</h2>
      <p>Copy your <strong>refresh token</strong> and paste it into <code>backend/.env</code> as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
      <pre style="background:#f4f4f4;padding:16px;border-radius:6px;word-break:break-all">${tokens.refresh_token}</pre>
      <p><strong>Access token</strong> (not needed — for reference only):</p>
      <pre style="background:#f4f4f4;padding:16px;border-radius:6px;word-break:break-all">${tokens.access_token}</pre>
      <p>You can now close this tab and stop the backend server.</p>
    `);
  } catch (err) {
    res.status(500).send(`OAuth error: ${err.message}`);
  }
});

module.exports = router;
