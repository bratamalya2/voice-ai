// Ollama local LLM — used ONLY when regex speech matching fails.
// Regex handles ~95% of cases with zero latency. Ollama handles the rest.

// OLLAMA_BASE_URL can be localhost (dev) or an ngrok/tunnel URL (prod)
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TIMEOUT_MS = 4000; // Twilio expects reply within 15s — keep Ollama under 4s

// What each state accepts
const STATE_OPTIONS = {
  LANGUAGE_MENU:        { '1': 'English',          '2': 'Hindi',            '3': 'Mandarin/Chinese', '9': 'repeat' },
  MAIN_MENU_EN:         { '1': 'new booking',       '2': 'check availability','3': 'get quote',        '4': 'reschedule', '5': 'cancel', '6': 'callback or leave message', '9': 'repeat' },
  MAIN_MENU_HI:         { '1': 'new booking',       '2': 'check availability','3': 'get quote',        '4': 'reschedule', '5': 'cancel', '6': 'callback or leave message', '9': 'repeat' },
  MAIN_MENU_ZH:         { '1': 'new booking',       '2': 'check availability','3': 'get quote',        '4': 'reschedule', '5': 'cancel', '6': 'callback or leave message', '9': 'repeat' },
  QUOTE_RESULT:         { '1': 'check availability','2': 'send quote by SMS', '3': 'return to main menu' },
  CHECK_AVAILABILITY:   { '1': 'first slot',        '2': 'second slot',      '3': 'third slot',       '9': 'repeat slots' },
  CONFIRM_SLOT:         { '1': 'confirm / yes',     '2': 'hear other times', '3': 'cancel request' },
  CANCEL_CONFIRM:       { '1': 'yes cancel it',     '2': 'no keep booking',  '3': 'hear booking details' },
  RESCHEDULE_CONFIRM:   { '1': 'choose new time',   '3': 'return to main menu' },
};

function buildPrompt(speech, state, language) {
  const options = STATE_OPTIONS[state];
  if (!options) return null;

  const optionLines = Object.entries(options)
    .map(([digit, meaning]) => `  ${digit} = ${meaning}`)
    .join('\n');

  const langHint = language === 'hi'
    ? 'The caller is speaking Hindi. Understand Hindi words and phrases.'
    : language === 'zh'
    ? 'The caller is speaking Mandarin Chinese. Understand Mandarin words and phrases.'
    : 'The caller is speaking English.';

  return `You are an IVR (phone menu) assistant. A caller said something and you must map it to a menu option.

${langHint}
Current menu: ${state}
Caller said: "${speech}"

Valid options:
${optionLines}

Rules:
- Reply with ONLY a single digit (e.g. 1, 2, 3).
- If you are not confident, reply with the word: null
- Do not explain. Do not add punctuation. Just the digit or null.

Your answer:`;
}

async function classifyIntent(speech, state, language = 'en') {
  const prompt = buildPrompt(speech, state, language);
  if (!prompt) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0, num_predict: 4 }, // deterministic + short output
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('Ollama HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    const raw = (data.response || '').trim();

    // Accept single digit 1-9
    if (/^[1-9]$/.test(raw)) {
      console.log(`[Ollama] "${speech}" → ${raw} (state: ${state})`);
      return raw;
    }

    if (raw === 'null' || raw === '') return null;

    // Sometimes the model adds punctuation — strip and retry
    const digit = raw.replace(/\D/g, '').charAt(0);
    if (/^[1-9]$/.test(digit)) {
      console.log(`[Ollama] "${speech}" → ${digit} (stripped, state: ${state})`);
      return digit;
    }

    return null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Ollama] Timed out after', TIMEOUT_MS, 'ms — falling back to repeat menu');
    } else {
      console.error('[Ollama] Error:', err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { classifyIntent };
