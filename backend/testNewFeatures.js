require('dotenv').config({ path: __dirname + '/.env' });
const twilio = require('twilio');
const axios = require('axios');
const { Pool } = require('pg');

const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'http://localhost:3001/webhook/twilio';
const toPhone = '+61347084980';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false } : false,
});

async function sendWebhook(params) {
  const signature = twilio.getExpectedTwilioSignature(authToken, webhookUrl, params);
  try {
    const response = await axios.post(webhookUrl, new URLSearchParams(params).toString(), {
      headers: { 'X-Twilio-Signature': signature, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(`\n--- [${params.Digits || params.SpeechResult || 'init'}] ---`);
    const sayMatch = response.data.match(/<Say[^>]*>([^<]+)<\/Say>/g);
    if (sayMatch) sayMatch.forEach(s => console.log('  SAY:', s.replace(/<[^>]+>/g, '').trim()));
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Cancels all confirmed test bookings so slots are free at the start of each test run.
async function cancelAllTestBookings() {
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE customer_id IN (SELECT customer_id FROM customers WHERE phone = $1)
       AND status = 'confirmed'`,
    ['+61499999999']
  );
  console.log(`  [setup] Cancelled ${result.rowCount} existing test booking(s)`);
}

// Creates a confirmed booking 7 days in the future so the reschedule test always has something to find.
async function createFutureBooking(callerPhone) {
  const bizRes = await pool.query(
    'SELECT business_id FROM businesses WHERE twilio_number = $1', [toPhone]
  );
  if (!bizRes.rows.length) throw new Error('Business not found for number ' + toPhone);
  const businessId = bizRes.rows[0].business_id;

  const svcRes = await pool.query(
    'SELECT service_id FROM services WHERE business_id = $1 AND active = TRUE ORDER BY keypad_option LIMIT 1',
    [businessId]
  );
  if (!svcRes.rows.length) throw new Error('No active services found');
  const serviceId = svcRes.rows[0].service_id;

  // Noon UTC 7 days out — well in the future regardless of current time of day
  const future = new Date();
  future.setDate(future.getDate() + 7);
  future.setUTCHours(12, 0, 0, 0);
  const slotStart = future.toISOString();
  const slotEnd   = new Date(future.getTime() + 60 * 60 * 1000).toISOString();

  const res = await axios.post('http://localhost:3001/api/bookings', {
    businessId, serviceId, callerPhone,
    customerName: 'Test Customer',
    slotStart, slotEnd,
  });
  return res.data.bookingId;
}

async function testOption2_CheckAvailability() {
  console.log('\n════════════════════════════════════════');
  console.log('TEST: Option 2 — Check Availability');
  console.log('════════════════════════════════════════');
  const sid = 'TEST_AVAIL_' + Date.now();
  const base = { CallSid: sid, From: '+61499999999', To: toPhone };
  await sendWebhook(base);                          // LANGUAGE_MENU
  await sendWebhook({ ...base, Digits: '1' });      // MAIN_MENU_EN
  await sendWebhook({ ...base, Digits: '2' });      // Option 2 → SERVICE_MENU with availability prompt
  await sendWebhook({ ...base, Digits: '1' });      // Select service 1 → CHECK_AVAILABILITY (skip quote)
  await sendWebhook({ ...base, Digits: '2' });      // Select slot 2 → CONFIRM_SLOT
  await sendWebhook({ ...base, Digits: '1' });      // Confirm → CREATE_BOOKING
}

async function testOption3_GetQuote() {
  console.log('\n════════════════════════════════════════');
  console.log('TEST: Option 3 — Get a Quote');
  console.log('════════════════════════════════════════');
  const sid = 'TEST_QUOTE_' + Date.now();
  const base = { CallSid: sid, From: '+61499999999', To: toPhone };
  await sendWebhook(base);                          // LANGUAGE_MENU
  await sendWebhook({ ...base, Digits: '1' });      // MAIN_MENU_EN
  await sendWebhook({ ...base, Digits: '3' });      // Option 3 → SERVICE_MENU with quote prompt
  await sendWebhook({ ...base, Digits: '1' });      // Select service → COLLECT_REQUIRED_FIELDS
  await sendWebhook({ ...base, Digits: '1' });      // Vehicle: sedan
  await sendWebhook({ ...base, Digits: '1' });      // Condition: standard → QUOTE_RESULT
  await sendWebhook({ ...base, Digits: '3' });      // Press 3 → back to main menu (quote only, no booking)
}

async function testOption4_Reschedule() {
  console.log('\n════════════════════════════════════════');
  console.log('TEST: Option 4 — Change Booking (Reschedule)');
  console.log('════════════════════════════════════════');

  // Guarantee a future booking exists before entering the IVR
  const bookingId = await createFutureBooking('+61499999999');
  console.log('  [setup] Created future booking:', bookingId);

  const sid = 'TEST_RESCHEDULE_' + Date.now();
  const base = { CallSid: sid, From: '+61499999999', To: toPhone };
  await sendWebhook(base);                          // LANGUAGE_MENU
  await sendWebhook({ ...base, Digits: '1' });      // MAIN_MENU_EN
  await sendWebhook({ ...base, Digits: '4' });      // Option 4 → IDENTIFY_BOOKING_RESCHEDULE (finds booking)
  await sendWebhook({ ...base, Digits: '1' });      // Press 1 → RESCHEDULE_CONFIRM → CHECK_AVAILABILITY
  await sendWebhook({ ...base, Digits: '1' });      // Select slot 1 → CONFIRM_SLOT
  await sendWebhook({ ...base, Digits: '1' });      // Confirm → RESCHEDULE_BOOKING
}

async function testOption6_Callback() {
  console.log('\n════════════════════════════════════════');
  console.log('TEST: Option 6 — Callback Request');
  console.log('════════════════════════════════════════');
  const sid = 'TEST_CALLBACK_' + Date.now();
  const base = { CallSid: sid, From: '+61499999999', To: toPhone };
  await sendWebhook(base);                          // LANGUAGE_MENU
  await sendWebhook({ ...base, Digits: '1' });      // MAIN_MENU_EN
  await sendWebhook({ ...base, Digits: '6' });      // Option 6 → CALLBACK_REQUEST prompt
  await sendWebhook({ ...base, SpeechResult: 'I want to ask about pricing for my SUV' });
}

async function testSpeechFallback() {
  console.log('\n════════════════════════════════════════');
  console.log('TEST: Speech Fallback — say "cancel" at main menu');
  console.log('════════════════════════════════════════');
  const sid = 'TEST_SPEECH_' + Date.now();
  const base = { CallSid: sid, From: '+61499999999', To: toPhone };
  await sendWebhook(base);
  await sendWebhook({ ...base, Digits: '1' });
  await sendWebhook({ ...base, SpeechResult: 'I want to cancel my booking' });
}

async function runAll() {
  try {
    await cancelAllTestBookings();   // start fresh — free all slots for this run
    await testOption2_CheckAvailability();
    await testOption3_GetQuote();
    await testOption4_Reschedule();
    await testOption6_Callback();
    await testSpeechFallback();
  } finally {
    await pool.end();
  }
}

runAll();
