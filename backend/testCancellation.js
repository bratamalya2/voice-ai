require('dotenv').config({ path: __dirname + '/.env' });
const twilio = require('twilio');
const axios = require('axios');

const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'http://localhost:3001/webhook/twilio';

async function sendWebhook(params) {
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
  const callSid = 'TEST_CANCEL_' + Date.now();
  const toPhone = '+61347084980'; // Shine Mobile Detailing
  
  // 1. Start Call
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone
  });

  // 2. Select English (1)
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });

  // 3. Select Cancellation (5)
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '5'
  });

  // 4. Confirm Cancellation (1)
  await sendWebhook({
    CallSid: callSid,
    From: '+61499999999',
    To: toPhone,
    Digits: '1'
  });
}

runTest();
