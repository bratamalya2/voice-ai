require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const pool    = require('./db');
const twilioRouter = require('./routes/twilio');
const authRouter   = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────

// Parse Twilio's URL-encoded POST bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────

// Health check — tests DB connectivity
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', db_time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Twilio webhook
app.use('/webhook/twilio', twilioRouter);

// Google OAuth (one-time use to get refresh token)
app.use('/auth', authRouter);

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Health:        http://localhost:${PORT}/health`);
  console.log(`Twilio webhook: http://localhost:${PORT}/webhook/twilio`);
});
