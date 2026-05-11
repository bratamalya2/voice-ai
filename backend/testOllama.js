require('dotenv').config();
const { classifyIntent } = require('./src/services/ollamaService');

const tests = [
  { speech: 'I want to book a new appointment', state: 'MAIN_MENU_EN', expected: '1' },
  { speech: 'English please',                   state: 'LANGUAGE_MENU',  expected: '1' },
  { speech: 'yes confirm that time',            state: 'CONFIRM_SLOT',   expected: '1' },
  { speech: 'cancel it yes',                    state: 'CANCEL_CONFIRM', expected: '1' },
  { speech: 'check when you are free',          state: 'MAIN_MENU_EN',   expected: '2' },
];

async function run() {
  console.log('Testing Ollama classifyIntent...\n');
  let passed = 0;
  for (const t of tests) {
    const result = await classifyIntent(t.speech, t.state, 'en');
    const ok = result === t.expected;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.speech}" → got=${result} expected=${t.expected}`);
    if (ok) passed++;
  }
  console.log(`\n${passed}/${tests.length} passed`);
}

run().catch(console.error);
