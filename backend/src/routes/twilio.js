const express = require('express');
const router = express.Router();
const pool = require('../db');
const twilioValidation = require('../middleware/twilioValidation');

// ─── Helpers ────────────────────────────────────────────────────────────────

function twiml(xml) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

function gatherResponse(sayText, language = null) {
  const actionUrl = `${process.env.APP_BASE_URL}/webhook/twilio`;
  const langAttr = language ? ` language="${language}"` : '';
  return twiml(`
<Response>
  <Gather input="dtmf speech" numDigits="1" timeout="5" action="${actionUrl}" method="POST">
    <Say${langAttr}>${sayText}</Say>
  </Gather>
  <Redirect method="POST">${actionUrl}</Redirect>
</Response>`);
}

// ─── State builders ──────────────────────────────────────────────────────────

function buildLanguageMenu() {
  return gatherResponse(
    'Welcome. For English, press 1. Hindi ke liye 2 dabaiye. Zhongwen qing an 3. To repeat, press 9.'
  );
}

function buildMainMenuEn() {
  return gatherResponse(
    'To make a new booking, press 1. To check availability, press 2. To get a quote, press 3. ' +
    'To change a booking, press 4. To cancel a booking, press 5. ' +
    'To leave a message or request a callback, press 6. To repeat, press 9.'
  );
}

function buildMainMenuHi() {
  return gatherResponse(
    'Nayi booking ke liye 1 dabaiye. Uplabdh samay jaanne ke liye 2 dabaiye. ' +
    'Kotation ke liye 3 dabaiye. Booking badalne ke liye 4 dabaiye. ' +
    'Booking raddh karne ke liye 5 dabaiye. Sandesh chhodne ya call back ke liye 6 dabaiye. ' +
    'Dobara sunne ke liye 9 dabaiye.',
    'hi-IN'
  );
}

function buildMainMenuZh() {
  return gatherResponse(
    '新预约请按1，查询可预约时间请按2，获取报价请按3，更改预约请按4，取消预约请按5，留言或请求回电请按6。重听请按9。',
    'cmn-CN'
  );
}

function buildEndCall(message = 'Thank you for calling. Goodbye.') {
  return twiml(`
<Response>
  <Say>${message}</Say>
  <Hangup/>
</Response>`);
}

// ─── State router ────────────────────────────────────────────────────────────

function routeState(state, digits, speech, language) {
  // Normalise input: digits take priority over speech
  let selected = (digits || '').trim();

  if (!selected && state === 'LANGUAGE_MENU') {
    const s = (speech || '').toLowerCase();
    if (s.includes('english'))                          selected = '1';
    else if (s.includes('hindi'))                       selected = '2';
    else if (s.includes('mandarin') || s.includes('chinese')) selected = '3';
  }

  switch (state) {
    case 'LANGUAGE_MENU':
      if (selected === '1') return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language: 'en' };
      if (selected === '2') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language: 'hi' };
      if (selected === '3') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language: 'zh' };
      return { nextState: 'LANGUAGE_MENU', xml: buildLanguageMenu(), language };

    case 'MAIN_MENU_EN':
      if (selected === '9') return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };
      // Further states (SERVICE_MENU, CANCEL, CALLBACK) implemented in Week 3
      return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };

    case 'MAIN_MENU_HI':
      if (selected === '9') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language };
      return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language };

    case 'MAIN_MENU_ZH':
      if (selected === '9') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language };
      return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language };

    default:
      return { nextState: 'LANGUAGE_MENU', xml: buildLanguageMenu(), language: 'en' };
  }
}

// ─── Route: POST /webhook/twilio ─────────────────────────────────────────────

router.post('/', twilioValidation, async (req, res) => {
  res.type('text/xml');

  const callSid   = req.body.CallSid   || '';
  const fromPhone = req.body.From      || '';
  const toPhone   = req.body.To        || '';
  const digits    = req.body.Digits    || '';
  const speech    = req.body.SpeechResult || '';

  try {
    // Look up or create call record
    let call = await pool.query(
      'SELECT * FROM calls WHERE twilio_call_sid = $1',
      [callSid]
    );

    let currentState = 'LANGUAGE_MENU';
    let language     = 'en';

    if (call.rows.length === 0) {
      // New call — look up business by Twilio number
      const biz = await pool.query(
        'SELECT business_id FROM businesses WHERE twilio_number = $1 AND active = TRUE LIMIT 1',
        [toPhone]
      );
      const businessId = biz.rows[0]?.business_id || null;

      await pool.query(
        `INSERT INTO calls (twilio_call_sid, business_id, caller_phone, current_state, language_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [callSid, businessId, fromPhone, 'LANGUAGE_MENU', 'en']
      );
    } else {
      currentState = call.rows[0].current_state;
      language     = call.rows[0].language_code;
    }

    // Route to next state
    const { nextState, xml, language: nextLanguage } = routeState(
      currentState, digits, speech, language
    );

    // Persist updated state
    await pool.query(
      `UPDATE calls
       SET current_state = $1, language_code = $2, updated_at = NOW()
       WHERE twilio_call_sid = $3`,
      [nextState, nextLanguage, callSid]
    );

    return res.send(xml);

  } catch (err) {
    console.error('Twilio webhook error:', err.message);
    return res.send(buildEndCall('Sorry, we are experiencing technical difficulties. Please call back shortly.'));
  }
});

module.exports = router;
