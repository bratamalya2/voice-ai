require('dotenv').config({ path: __dirname + '/.env' });
const twilio = require('twilio');
const axios = require('axios');

const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'http://localhost:3001/webhook/twilio';

async function sendWebhook(params) {
  // Generate Twilio signature
  const signature = twilio.getExpectedTwilioSignature(authToken, webhookUrl, params);

  try {
    const response = await axios.post(webhookUrl, new URLSearchParams(params).toString(), {
      headers: {
        'X-Twilio-Signature': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log(`\n--- Response for Digits: ${params.Digits || 'none'} ---`);
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

async function runTest() {
  const callSid = 'TEST_' + Date.now();
  const toPhone = '+61400000001'; // Shine Mobile Detailing
  
  // 1. Start Call -> Expect LANGUAGE_MENU
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone
  });

  // 2. Select English (1) -> Expect MAIN_MENU_EN
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 3. Select New Booking (1) -> Expect SERVICE_MENU_NEW
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 4. Select Exterior Wash (1) -> Expect COLLECT_REQUIRED_FIELDS (vehicleType prompt)
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 5. Select Sedan (1) -> Expect COLLECT_REQUIRED_FIELDS (condition prompt)
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 6. Select Standard condition (1) -> Expect QUOTE_RESULT
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 7. Select Check Availability (1) -> Expect CHECK_AVAILABILITY (slots prompt)
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 8. Select Slot 2 (2) -> Expect CONFIRM_SLOT
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '2'
  });

  // 9. Confirm Slot (1) -> Expect CREATE_BOOKING
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });
}

runTest();
