const express = require('express');
const router = express.Router();
const pool = require('../db');
const twilioValidation = require('../middleware/twilioValidation');
const axios = require('axios');
const twilio = require('twilio');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

// Used for free-form speech collection (callback reason) — no numDigits limit
function gatherSpeechResponse(sayText, language = null, timeout = 8) {
  const actionUrl = `${process.env.APP_BASE_URL}/webhook/twilio`;
  const langAttr = language ? ` language="${language}"` : '';
  return twiml(`
<Response>
  <Gather input="speech dtmf" timeout="${timeout}" speechTimeout="auto" action="${actionUrl}" method="POST">
    <Say${langAttr}>${sayText}</Say>
  </Gather>
  <Redirect method="POST">${actionUrl}</Redirect>
</Response>`);
}

async function sendSms(to, body) {
  try {
    await twilioClient.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
  } catch (err) {
    console.error('SMS send error:', err.message);
  }
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

async function buildServiceMenu(businessId, language = 'en', intent = 'new_booking') {
  const services = await pool.query(
    'SELECT service_id, name_en, name_hi, name_zh, keypad_option FROM services WHERE business_id = $1 AND active = TRUE ORDER BY keypad_option ASC',
    [businessId]
  );

  if (services.rows.length === 0) {
    return buildEndCall(
      language === 'hi' ? 'Kshama karein, abhi koi seva uplabdh nahi hai.' :
      language === 'zh' ? '抱歉，当前没有可用服务。' :
      'Sorry, there are no services available at this time.'
    );
  }

  let prompt = '';
  if (language === 'hi') {
    prompt = intent === 'check_availability' ? 'Uplabdh samay dekhne ke liye, seva chunein. ' :
             intent === 'quote' ? 'Quote ke liye, seva chunein. ' :
             'Nayi booking ke liye, seva chunein. ';
    services.rows.forEach(s => prompt += `${s.name_hi} ke liye ${s.keypad_option} dabaiye. `);
    prompt += 'Dobara sunne ke liye 9 dabaiye.';
  } else if (language === 'zh') {
    prompt = intent === 'check_availability' ? '要查询可预约时间，请选择服务。' :
             intent === 'quote' ? '要获取报价，请选择服务。' :
             '要进行新预约，请选择服务。';
    services.rows.forEach(s => prompt += `${s.name_zh}请按${s.keypad_option}。`);
    prompt += '重听请按9。';
  } else {
    prompt = intent === 'check_availability' ? 'To check availability, please select a service. ' :
             intent === 'quote' ? 'To get a quote, please select a service. ' :
             'To make a new booking, please select a service. ';
    services.rows.forEach(s => prompt += `For ${s.name_en}, press ${s.keypad_option}. `);
    prompt += 'To repeat, press 9.';
  }

  return gatherResponse(prompt, language === 'hi' ? 'hi-IN' : language === 'zh' ? 'cmn-CN' : 'en');
}

function buildEndCall(message = 'Thank you for calling. Goodbye.') {
  return twiml(`
<Response>
  <Say>${message}</Say>
  <Hangup/>
</Response>`);
}

// ─── State router ────────────────────────────────────────────────────────────

// Fast regex speech → DTMF mapping. Returns digit string or null.
function regexSpeechToDigit(speech, state) {
  const s = speech.toLowerCase();

  if (state === 'LANGUAGE_MENU') {
    if (s.includes('english'))                                return '1';
    if (s.includes('hindi'))                                  return '2';
    if (s.includes('mandarin') || s.includes('chinese'))      return '3';
  }
  if (['MAIN_MENU_EN', 'MAIN_MENU_HI', 'MAIN_MENU_ZH'].includes(state)) {
    if (/\b(book|new booking|appointment)\b/.test(s))             return '1';
    if (/\b(availab|when|time|open|slot)\b/.test(s))              return '2';
    if (/\b(quote|price|cost|how much|estimate)\b/.test(s))       return '3';
    if (/\b(change|reschedule|move|different time)\b/.test(s))    return '4';
    if (/\b(cancel)\b/.test(s))                                   return '5';
    if (/\b(callback|call back|call me|message)\b/.test(s))       return '6';
  }
  if (state === 'QUOTE_RESULT') {
    if (/\b(availab|yes|book|when|slot)\b/.test(s))   return '1';
    if (/\b(sms|text|send|phone)\b/.test(s))          return '2';
    if (/\b(menu|back|no|main)\b/.test(s))            return '3';
  }
  if (state === 'CONFIRM_SLOT') {
    if (/\b(yes|confirm|ok|good|great|book|correct)\b/.test(s))   return '1';
    if (/\b(other|different|more|another|change)\b/.test(s))      return '2';
    if (/\b(cancel|no|back|stop)\b/.test(s))                      return '3';
  }
  if (state === 'CANCEL_CONFIRM') {
    if (/\b(yes|cancel|confirm|ok)\b/.test(s))        return '1';
    if (/\b(no|keep|back|menu|stop)\b/.test(s))       return '3';
  }
  if (state === 'RESCHEDULE_CONFIRM') {
    if (/\b(yes|reschedule|change|new time|pick|ok)\b/.test(s))   return '1';
    if (/\b(no|back|menu|cancel)\b/.test(s))                      return '3';
  }
  return null;
}

async function routeState(state, digits, speech, language, callRecord) {
  let selected = (digits || '').trim();

  if (!selected && speech) {
    selected = regexSpeechToDigit(speech, state) || '';
  }

  switch (state) {
    case 'LANGUAGE_MENU':
      if (selected === '1') return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language: 'en' };
      if (selected === '2') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language: 'hi' };
      if (selected === '3') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language: 'zh' };
      return { nextState: 'LANGUAGE_MENU', xml: buildLanguageMenu(), language };

    case 'MAIN_MENU_EN': {
      if (selected === '1') {
        const ctx = { ...(callRecord.context || {}), intent: 'new_booking' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'new_booking'), language, updates: { context: ctx } };
      }
      if (selected === '2') {
        const ctx = { ...(callRecord.context || {}), intent: 'check_availability' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'check_availability'), language, updates: { context: ctx } };
      }
      if (selected === '3') {
        const ctx = { ...(callRecord.context || {}), intent: 'quote' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'quote'), language, updates: { context: ctx } };
      }
      if (selected === '4') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_RESCHEDULE', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '5') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_CANCEL', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '6') {
        const ctx = { ...(callRecord.context || {}), callbackPrompted: true };
        return { nextState: 'CALLBACK_REQUEST', xml: gatherSpeechResponse('Please briefly describe the reason for your callback, or press any key to skip.'), language, updates: { context: ctx } };
      }
      if (selected === '9') return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };
      return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };
    }

    case 'MAIN_MENU_HI': {
      if (selected === '1') {
        const ctx = { ...(callRecord.context || {}), intent: 'new_booking' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'new_booking'), language, updates: { context: ctx } };
      }
      if (selected === '2') {
        const ctx = { ...(callRecord.context || {}), intent: 'check_availability' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'check_availability'), language, updates: { context: ctx } };
      }
      if (selected === '3') {
        const ctx = { ...(callRecord.context || {}), intent: 'quote' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'quote'), language, updates: { context: ctx } };
      }
      if (selected === '4') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_RESCHEDULE', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '5') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_CANCEL', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '6') {
        const ctx = { ...(callRecord.context || {}), callbackPrompted: true };
        return { nextState: 'CALLBACK_REQUEST', xml: gatherSpeechResponse('Callback ke liye, apni wajah bataiye, ya koi bhi key dabaiye skip karne ke liye.', 'hi-IN'), language, updates: { context: ctx } };
      }
      if (selected === '9') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language };
      return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language };
    }

    case 'MAIN_MENU_ZH': {
      if (selected === '1') {
        const ctx = { ...(callRecord.context || {}), intent: 'new_booking' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'new_booking'), language, updates: { context: ctx } };
      }
      if (selected === '2') {
        const ctx = { ...(callRecord.context || {}), intent: 'check_availability' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'check_availability'), language, updates: { context: ctx } };
      }
      if (selected === '3') {
        const ctx = { ...(callRecord.context || {}), intent: 'quote' };
        return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, 'quote'), language, updates: { context: ctx } };
      }
      if (selected === '4') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_RESCHEDULE', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '5') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_CANCEL', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '6') {
        const ctx = { ...(callRecord.context || {}), callbackPrompted: true };
        return { nextState: 'CALLBACK_REQUEST', xml: gatherSpeechResponse('请简短说明回电原因，或按任意键跳过。', 'cmn-CN'), language, updates: { context: ctx } };
      }
      if (selected === '9') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language };
      return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language };
    }

    case 'SERVICE_MENU_NEW': {
      const intent = callRecord.context?.intent || 'new_booking';
      if (selected === '9') return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, intent), language };

      if (selected) {
        const services = await pool.query(
          'SELECT service_code, name_en, name_hi, name_zh FROM services WHERE business_id = $1 AND keypad_option = $2 AND active = TRUE',
          [callRecord.business_id, parseInt(selected)]
        );
        if (services.rows.length > 0) {
          const { service_code: serviceCode, name_en, name_hi, name_zh } = services.rows[0];
          const serviceName = language === 'hi' ? name_hi : language === 'zh' ? name_zh : name_en;
          const updatedContext = { ...(callRecord.context || {}), serviceName };
          const updatedRecord = { ...callRecord, selected_service_code: serviceCode, context: updatedContext };

          // For availability-only and reschedule, skip quote collection and go straight to availability
          if (intent === 'check_availability') {
            const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, { ...updatedRecord, context: { ...updatedContext, slots: null } });
            return {
              nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language,
              updates: { selected_service_code: serviceCode, context: { ...updatedContext, slots: null, ...(nextPhase.updates?.context || {}) } }
            };
          }

          // For new_booking or quote: collect required fields → quote
          const nextPhase = await routeState('COLLECT_REQUIRED_FIELDS', '', '', language, updatedRecord);
          return {
            nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language,
            updates: { selected_service_code: serviceCode, context: updatedContext, ...(nextPhase.updates || {}) }
          };
        }
      }
      return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language, intent), language };
    }

    case 'COLLECT_REQUIRED_FIELDS': {
      let context = callRecord.context || {};
      const bizRes = await pool.query('SELECT business_type FROM businesses WHERE business_id = $1', [callRecord.business_id]);
      const bizType = bizRes.rows[0].business_type;

      const nextState = 'COLLECT_REQUIRED_FIELDS';

      if (bizType === 'car_detailing') {
        if (!context.vehicleType) {
          if (selected) {
            context.vehicleType = selected === '1' ? 'sedan' : selected === '2' ? 'suv' : 'van';
            selected = '';
          } else {
            return { nextState, xml: gatherResponse('For a Sedan, press 1. For an S U V, press 2. For a Van or Truck, press 3.', language), language, updates: { context } };
          }
        }
        if (!context.condition) {
          if (selected) {
            context.condition = selected === '1' ? 'average' : 'poor';
            selected = '';
          } else {
            return { nextState, xml: gatherResponse('For standard condition, press 1. For heavy dirt or pet hair, press 2.', language), language, updates: { context } };
          }
        }
      } else if (bizType === 'cleaning') {
        if (!context.propertyType) {
          if (selected) {
            context.propertyType = selected === '1' ? 'apartment' : 'house';
            selected = '';
          } else {
            return { nextState, xml: gatherResponse('For an apartment, press 1. For a house, press 2.', language), language, updates: { context } };
          }
        }
        if (!context.bedrooms) {
          if (selected && ['1','2','3','4','5','6','7','8','9'].includes(selected)) {
            context.bedrooms = parseInt(selected);
            selected = '';
          } else {
            return { nextState, xml: gatherResponse('Using your keypad, please enter the number of bedrooms.', language), language, updates: { context } };
          }
        }
        if (!context.bathrooms) {
          if (selected && ['1','2','3','4','5','6','7','8','9'].includes(selected)) {
            context.bathrooms = parseInt(selected);
            selected = '';
          } else {
            return { nextState, xml: gatherResponse('Using your keypad, please enter the number of bathrooms.', language), language, updates: { context } };
          }
        }
        if (!context.condition) {
          if (selected) {
            context.condition = selected === '1' ? 'average' : 'poor';
            selected = '';
          } else {
            return { nextState, xml: gatherResponse('For standard cleaning, press 1. For deep cleaning, press 2.', language), language, updates: { context } };
          }
        }
      }

      const nextPhase = await routeState('QUOTE_RESULT', '', '', language, { ...callRecord, context });
      return {
        nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language,
        updates: { context, ...(nextPhase.updates || {}) }
      };
    }

    case 'QUOTE_RESULT': {
      let context = callRecord.context || {};
      const selectedServiceCode = callRecord.selected_service_code;

      if (selected === '1') {
        const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '2') {
        // Send quote via SMS (3.7)
        try {
          const bizRes = await pool.query('SELECT name FROM businesses WHERE business_id = $1', [callRecord.business_id]);
          const bizName = bizRes.rows[0]?.name || 'Your provider';
          const smsBody = `${bizName} quote for ${context.serviceName || selectedServiceCode}: $${context.quoteMin}–$${context.quoteMax} AUD. Call ${process.env.TWILIO_PHONE_NUMBER} to book.`;
          await sendSms(callRecord.caller_phone, smsBody);
          await pool.query(
            `INSERT INTO notification_log (recipient_type, channel, body, sent_at, status) VALUES ('customer', 'sms', $1, NOW(), 'sent')`,
            [smsBody]
          );
        } catch (err) {
          console.error('Quote SMS error:', err.message);
        }
        const msg = language === 'hi' ? 'Quote SMS kar diya gaya hai. Availability check karne ke liye 1 dabaiye, main menu ke liye 3 dabaiye.' :
                    language === 'zh' ? '报价已通过短信发送。按 1 查询空闲时间，按 3 返回主菜单。' :
                    'Quote sent to your phone. Press 1 to check availability, or press 3 for the main menu.';
        return { nextState: 'QUOTE_RESULT', xml: gatherResponse(msg, language), language, updates: { context } };
      }
      if (selected === '3') {
        if (language === 'hi') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language, updates: {} };
        if (language === 'zh') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language, updates: {} };
        return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language, updates: {} };
      }

      if (!context.quoteMin || !context.quoteMax) {
        const bizRes = await pool.query('SELECT business_type FROM businesses WHERE business_id = $1', [callRecord.business_id]);
        const bizType = bizRes.rows[0].business_type;
        try {
          const response = await axios.post(`${process.env.N8N_WEBHOOK_BASE_URL}/webhook/quote-engine`, {
            serviceType: bizType, serviceCode: selectedServiceCode, ...context
          });
          context.quoteMin = response.data.quote_min;
          context.quoteMax = response.data.quote_max;
          context.manualReview = response.data.manual_review;
        } catch (err) {
          console.error('Quote engine error:', err.message);
          context.quoteMin = 0;
          context.quoteMax = 0;
        }
      }

      let xml = '';
      if (context.quoteMin > 0) {
        let msg = '';
        if (language === 'hi') {
          msg = `Aapka anumanit quote ${context.quoteMin} se ${context.quoteMax} dollar ke beech hai. Uplabdh samay jaanne ke liye 1 dabaiye. Quote SMS dwara bhejne ke liye 2 dabaiye. Main menu ke liye 3 dabaiye.`;
        } else if (language === 'zh') {
          msg = `您的预估报价在 ${context.quoteMin} 到 ${context.quoteMax} 澳元之间。要查询可预约时间，请按 1。要将报价发送到手机，请按 2。要返回主菜单，请按 3。`;
        } else {
          msg = `Your estimated quote is between ${context.quoteMin} and ${context.quoteMax} dollars. To check availability, press 1. To send this quote to your phone via SMS, press 2. To return to the main menu, press 3.`;
        }
        xml = gatherResponse(msg, language);
      } else {
        const msg = language === 'hi' ? 'Quote nikalne mein samasya aayi. Main menu ke liye 3 dabaiye.' :
                    language === 'zh' ? '获取报价失败。按3返回主菜单。' :
                    'There was an issue calculating your quote. To return to the main menu, press 3.';
        xml = gatherResponse(msg, language);
      }
      return { nextState: 'QUOTE_RESULT', xml, language, updates: { context } };
    }

    case 'CHECK_AVAILABILITY': {
      let context = callRecord.context || {};
      const selectedServiceCode = callRecord.selected_service_code;

      if (selected === '1' || selected === '2' || selected === '3') {
        const slotIndex = parseInt(selected) - 1;
        if (context.slots && context.slots[slotIndex]) {
          context.selectedSlot = context.slots[slotIndex];
          const nextPhase = await routeState('CONFIRM_SLOT', '', '', language, { ...callRecord, context });
          return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: { context, ...(nextPhase.updates || {}) } };
        }
      } else if (selected === '9' && context.slots) {
        // Repeat — fall through to rebuild the prompt below
      } else if (selected === '4') {
        return { nextState: 'CHECK_AVAILABILITY', xml: gatherResponse(
          language === 'hi' ? 'Aur samay uplabdh nahi hai. Kripya 1, 2, ya 3 chunein.' :
          language === 'zh' ? '没有更多可用时间。请选择 1、2 或 3。' :
          'No more slots available. Please select 1, 2, or 3.', language), language, updates: { context } };
      }

      if (!context.slots) {
        try {
          const sRes = await pool.query('SELECT duration_minutes FROM services WHERE service_code = $1', [selectedServiceCode]);
          const duration = sRes.rows.length > 0 ? sRes.rows[0].duration_minutes : 60;
          const now = new Date();
          const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.TIMEZONE || 'Australia/Melbourne' });
          const startDate = dateFmt.format(now);
          const endDate   = dateFmt.format(new Date(now.getTime() + 14 * 24 * 3600000));
          const response = await axios.post(`http://127.0.0.1:${process.env.PORT || 3001}/api/availability`, {
            startDate, endDate, serviceDuration: duration
          });
          context.slots = response.data;
        } catch (err) {
          console.error('Availability API error:', err.message);
          context.slots = [];
        }
      }

      let xml = '';
      if (context.slots && context.slots.length > 0) {
        let prompt = language === 'hi' ? 'Uplabdh samay hain: ' : language === 'zh' ? '可用时间有：' : 'Here are the available times. ';
        context.slots.forEach((slot, idx) => {
          const label = slot.spoken_labels[language] || slot.spoken_labels['en'];
          if (language === 'hi') prompt += `${label} ke liye ${idx + 1} dabaiye. `;
          else if (language === 'zh') prompt += `选择 ${label} 请按 ${idx + 1}。`;
          else prompt += `For ${label}, press ${idx + 1}. `;
        });
        prompt += language === 'hi' ? 'Dobara sunne ke liye 9 dabaiye.' : language === 'zh' ? '重听请按9。' : 'To repeat, press 9.';
        xml = gatherResponse(prompt, language);
      } else {
        const msg = language === 'hi' ? 'Kshama karein, koi samay uplabdh nahi hai. Main menu ke liye 9 dabaiye.' :
                    language === 'zh' ? '抱歉，当前没有可用时间。按9返回主菜单。' :
                    'Sorry, there are no available times right now. Press 9 to return to the main menu.';
        xml = gatherResponse(msg, language);
      }
      return { nextState: 'CHECK_AVAILABILITY', xml, language, updates: { context } };
    }

    case 'CONFIRM_SLOT': {
      let context = callRecord.context || {};
      const intent = context.intent || 'new_booking';

      if (selected === '1') {
        const targetState = intent === 'reschedule' ? 'RESCHEDULE_BOOKING' : 'CREATE_BOOKING';
        const nextPhase = await routeState(targetState, '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '2') {
        // Reset slots so CHECK_AVAILABILITY refetches
        context = { ...context, slots: null, selectedSlot: null };
        const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, { ...callRecord, context });
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: { context, ...(nextPhase.updates || {}) } };
      }
      if (selected === '3') {
        const menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
        const menu = language === 'hi' ? buildMainMenuHi() : language === 'zh' ? buildMainMenuZh() : buildMainMenuEn();
        return { nextState: menuState, xml: menu, language };
      }

      const label = context.selectedSlot?.spoken_labels?.[language] || context.selectedSlot?.spoken_labels?.['en'] || 'the selected time';
      let msg = '';
      if (language === 'hi') {
        msg = `Aapne chuna hai: ${label}. Confirm karne ke liye 1 dabaiye. Dusra samay chunne ke liye 2 dabaiye. Cancel karne ke liye 3 dabaiye.`;
      } else if (language === 'zh') {
        msg = `您选择了：${label}。确认请按1，选择其他时间请按2，取消请按3。`;
      } else {
        msg = `You have selected: ${label}. To confirm this time, press 1. To hear other times, press 2. To cancel this request, press 3.`;
      }
      return { nextState: 'CONFIRM_SLOT', xml: gatherResponse(msg, language), language, updates: { context } };
    }

    case 'CALLBACK_REQUEST': {
      // State is only entered after the prompt has been shown (callbackPrompted=true in context)
      const reason = speech ? speech.substring(0, 500) : null;
      try {
        await pool.query(
          'INSERT INTO callback_requests (business_id, phone, language_code, reason) VALUES ($1, $2, $3, $4)',
          [callRecord.business_id, callRecord.caller_phone, language, reason]
        );
      } catch (err) {
        console.error('Callback request save error:', err.message);
      }
      const msg = language === 'hi' ? 'Dhanyavad. Hum aapko jaldi hi call karenge. Alvida!' :
                  language === 'zh' ? '谢谢。我们会尽快回电给您。再见！' :
                  'Thank you. We will call you back as soon as possible. Goodbye!';
      return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
    }

    case 'IDENTIFY_BOOKING_CANCEL': {
      try {
        const response = await axios.get(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings/phone/${callRecord.caller_phone}`);
        const bookings = response.data;

        if (bookings.length === 0) {
          const msg = language === 'hi' ? 'Is number ke liye koi active booking nahi mili. Main menu ke liye 9 dabaiye.' :
                      language === 'zh' ? '该号码没有查询到预约。按9返回主菜单。' :
                      'We could not find any active bookings for your phone number. Press 9 to return to the main menu.';
          const menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
          return { nextState: menuState, xml: gatherResponse(msg, language), language };
        }

        const booking = bookings[0];
        const dateStr = new Date(booking.scheduled_start).toLocaleString(
          language === 'hi' ? 'hi-IN' : language === 'zh' ? 'zh-CN' : 'en-AU',
          { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: process.env.TIMEZONE || 'Australia/Melbourne' }
        );

        let msg = '';
        if (language === 'hi') {
          msg = `Humein aapki ${booking.service_name} ki booking mili hai, jo ${dateStr} ko hai. Ise cancel karne ke liye 1 dabaiye. Main menu ke liye 3 dabaiye.`;
        } else if (language === 'zh') {
          msg = `我们为您查询到一项 ${booking.service_name} 预约，时间是 ${dateStr}。确认取消请按1，返回主菜单请按3。`;
        } else {
          msg = `We found your booking for ${booking.service_name} on ${dateStr}. To cancel this booking, press 1. To return to the main menu, press 3.`;
        }
        return { nextState: 'CANCEL_CONFIRM', xml: gatherResponse(msg, language), language, updates: { context: { bookingToCancel: booking } } };
      } catch (err) {
        console.error('Lookup bookings error:', err.message);
        return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };
      }
    }

    case 'CANCEL_CONFIRM': {
      const context = callRecord.context || {};
      const booking = context.bookingToCancel;

      if (selected === '1') {
        try {
          await axios.post(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings/${booking.booking_id}/cancel`, { reason: 'Cancelled via IVR' });
          const msg = language === 'hi' ? 'Aapki booking cancel kar di gayi hai. Alvida!' :
                      language === 'zh' ? '您的预约已取消。再见！' :
                      'Your booking has been successfully cancelled. Goodbye!';
          return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
        } catch (err) {
          console.error('Cancel booking error:', err.message);
          return { nextState: 'END_CALL', xml: buildEndCall('Sorry, we could not cancel your booking at this time.'), language };
        }
      }
      if (selected === '3') {
        const menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
        const menu = language === 'hi' ? buildMainMenuHi() : language === 'zh' ? buildMainMenuZh() : buildMainMenuEn();
        return { nextState: menuState, xml: menu, language };
      }
      return { nextState: 'CANCEL_CONFIRM', xml: gatherResponse(
        language === 'hi' ? 'Cancel karne ke liye 1 dabaiye, main menu ke liye 3 dabaiye.' :
        language === 'zh' ? '确认取消请按1，返回主菜单请按3。' :
        'Please press 1 to confirm cancellation or 3 to return to the main menu.', language), language };
    }

    case 'IDENTIFY_BOOKING_RESCHEDULE': {
      try {
        const response = await axios.get(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings/phone/${callRecord.caller_phone}`);
        const bookings = response.data;

        if (bookings.length === 0) {
          const msg = language === 'hi' ? 'Is number ke liye koi active booking nahi mili. Main menu ke liye 9 dabaiye.' :
                      language === 'zh' ? '该号码没有查询到预约。按9返回主菜单。' :
                      'We could not find any active bookings for your phone number. Press 9 to return to the main menu.';
          const menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
          return { nextState: menuState, xml: gatherResponse(msg, language), language };
        }

        const booking = bookings[0];
        const dateStr = new Date(booking.scheduled_start).toLocaleString(
          language === 'hi' ? 'hi-IN' : language === 'zh' ? 'zh-CN' : 'en-AU',
          { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: process.env.TIMEZONE || 'Australia/Melbourne' }
        );

        let msg = '';
        if (language === 'hi') {
          msg = `Humein aapki ${booking.service_name} ki booking mili hai, jo ${dateStr} ko hai. Naya samay chunne ke liye 1 dabaiye. Main menu ke liye 3 dabaiye.`;
        } else if (language === 'zh') {
          msg = `我们为您查询到一项 ${booking.service_name} 预约，时间是 ${dateStr}。要选择新时间，请按1。返回主菜单请按3。`;
        } else {
          msg = `We found your booking for ${booking.service_name} on ${dateStr}. To choose a new time, press 1. To return to the main menu, press 3.`;
        }
        return {
          nextState: 'RESCHEDULE_CONFIRM',
          xml: gatherResponse(msg, language),
          language,
          updates: {
            selected_service_code: booking.service_code,
            context: { ...(callRecord.context || {}), bookingToReschedule: booking, intent: 'reschedule' }
          }
        };
      } catch (err) {
        console.error('Reschedule lookup error:', err.message);
        return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };
      }
    }

    case 'RESCHEDULE_CONFIRM': {
      const context = callRecord.context || {};
      const booking = context.bookingToReschedule;

      if (selected === '1') {
        // Go to availability check — reset slots so a fresh fetch happens
        const ctx = { ...context, slots: null, selectedSlot: null };
        const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, { ...callRecord, context: ctx });
        return {
          nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language,
          updates: { context: { ...ctx, ...(nextPhase.updates?.context || {}) } }
        };
      }
      if (selected === '3') {
        const menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
        const menu = language === 'hi' ? buildMainMenuHi() : language === 'zh' ? buildMainMenuZh() : buildMainMenuEn();
        return { nextState: menuState, xml: menu, language };
      }

      const dateStr = booking ? new Date(booking.scheduled_start).toLocaleString('en-AU', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: process.env.TIMEZONE || 'Australia/Melbourne'
      }) : 'the scheduled time';
      const msg = language === 'hi' ? `Aapki booking ${dateStr} ko hai. Naya samay chunne ke liye 1 dabaiye. Main menu ke liye 3 dabaiye.` :
                  language === 'zh' ? `您的预约时间是 ${dateStr}。要选择新时间，请按1。返回主菜单请按3。` :
                  `Your booking is on ${dateStr}. To choose a new time, press 1. To return to the main menu, press 3.`;
      return { nextState: 'RESCHEDULE_CONFIRM', xml: gatherResponse(msg, language), language };
    }

    case 'RESCHEDULE_BOOKING': {
      const context = callRecord.context || {};
      const booking = context.bookingToReschedule;

      try {
        await axios.put(
          `http://127.0.0.1:${process.env.PORT || 3001}/api/bookings/${booking.booking_id}/reschedule`,
          { slotStart: context.selectedSlot.slot_start, slotEnd: context.selectedSlot.slot_end }
        );
        const label = context.selectedSlot?.spoken_labels?.[language] || context.selectedSlot?.spoken_labels?.['en'];
        const msg = language === 'hi' ? `Aapki booking ${label} par reschedule kar di gayi hai. Alvida!` :
                    language === 'zh' ? `您的预约已改期至 ${label}。再见！` :
                    `Your booking has been rescheduled to ${label}. Goodbye!`;
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
      } catch (err) {
        console.error('Reschedule booking error:', err.message);
        if (err.response?.status === 409) {
          // Slot just taken — re-route caller to pick another time
          const ctx = { ...context, slots: null, selectedSlot: null };
          const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, { ...callRecord, context: ctx });
          const slotTakenMsg = language === 'hi' ? 'Sorry, woh samay abhi le liya gaya. Aur samay dekhte hain.' :
                               language === 'zh' ? '抱歉，该时间刚被预约。我们为您查询其他时间。' :
                               'Sorry, that time was just taken. Let us find you another slot.';
          return {
            nextState: nextPhase.nextState,
            xml: nextPhase.xml.replace(/<Say[^>]*>/, `<Say>${slotTakenMsg}</Say><Say>`),
            language: nextPhase.language,
            updates: { context: { ...ctx, ...(nextPhase.updates?.context || {}) } }
          };
        }
        const msg = language === 'hi' ? 'Booking reschedule karne mein dikkat aayi. Kripya baad mein call karein.' :
                    language === 'zh' ? '改期失败，请稍后再试。' :
                    'Sorry, we could not reschedule your booking. Please try again later.';
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
      }
    }

    case 'CREATE_BOOKING': {
      let context = callRecord.context || {};
      const selectedServiceCode = callRecord.selected_service_code;

      try {
        const sRes = await pool.query(
          'SELECT service_id FROM services WHERE business_id = $1 AND service_code = $2',
          [callRecord.business_id, selectedServiceCode]
        );
        const serviceId = sRes.rows[0]?.service_id;
        if (!serviceId) throw new Error('Service not found');

        const payload = {
          businessId:   callRecord.business_id,
          serviceId,
          callerPhone:  callRecord.caller_phone,
          customerName: 'Phone Customer',
          slotStart:    context.selectedSlot.slot_start,
          slotEnd:      context.selectedSlot.slot_end,
          quoteMin:     context.quoteMin,
          quoteMax:     context.quoteMax,
          suburb:       context.suburb || null,
          notes:        `IVR Booking. Details: ${JSON.stringify(context)}`
        };

        const response = await axios.post(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings`, payload);
        const bookingId = response.data.bookingId;

        const msg = language === 'hi' ? `Dhanyavad! Aapki booking confirm ho gayi hai. Aapka booking number hai ${bookingId}. Aapko jaldi hi ek SMS milega. Alvida!` :
                    language === 'zh' ? `谢谢！您的预约已确认。您的预约编号是 ${bookingId}。您很快会收到一条确认短信。再见！` :
                    `Thank you! Your booking is confirmed. Your booking reference is ${bookingId}. You will receive a confirmation SMS shortly. Goodbye!`;
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language, updates: {} };
      } catch (err) {
        console.error('Booking creation error:', err.message);
        // 409 = slot just taken — offer other times instead of ending the call
        if (err.response?.status === 409) {
          context.slots = null;
          context.selectedSlot = null;
          const msg = language === 'hi' ? 'Yeh samay abhi book ho gaya. Kripya ek aur samay chunein.' :
                      language === 'zh' ? '该时间刚刚被预订。请选择其他时间。' :
                      'Sorry, that time was just taken. Let us find you another slot.';
          const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, { ...callRecord, context });
          return { nextState: nextPhase.nextState, xml: gatherResponse(msg, language), language, updates: { context, ...(nextPhase.updates || {}) } };
        }
        const msg = language === 'hi' ? 'Maaf kijiye, booking karne mein samasya aayi. Kripya thodi der baad koshish karein.' :
                    language === 'zh' ? '抱歉，预约失败。请稍后再试。' :
                    'Sorry, we encountered an error creating your booking. Please try again later.';
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language, updates: {} };
      }
    }

    case 'END_CALL':
      return { nextState: 'END_CALL', xml: buildEndCall(), language };

    default:
      return { nextState: 'LANGUAGE_MENU', xml: buildLanguageMenu(), language: 'en' };
  }
}

// ─── Route: POST /webhook/twilio ─────────────────────────────────────────────

router.post('/', twilioValidation, async (req, res) => {
  res.type('text/xml');

  const callSid   = req.body.CallSid      || '';
  const fromPhone = req.body.From         || '';
  const toPhone   = req.body.To           || '';
  const digits    = req.body.Digits       || '';
  const speech    = req.body.SpeechResult || '';

  try {
    let call = await pool.query('SELECT * FROM calls WHERE twilio_call_sid = $1', [callSid]);

    let currentState = 'LANGUAGE_MENU';
    let language     = 'en';
    let callRecord   = null;

    if (call.rows.length === 0) {
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
      call = await pool.query('SELECT * FROM calls WHERE twilio_call_sid = $1', [callSid]);
      callRecord = call.rows[0];
    } else {
      callRecord   = call.rows[0];
      currentState = callRecord.current_state;
      language     = callRecord.language_code;
    }

    const result = await routeState(currentState, digits, speech, language, callRecord);

    const nextState   = result.nextState;
    const xml         = result.xml;
    const nextLang    = result.language;
    const updates     = result.updates || {};
    const svcCode     = updates.selected_service_code !== undefined ? updates.selected_service_code : callRecord.selected_service_code;
    const context     = updates.context !== undefined ? updates.context : (callRecord.context || {});

    await pool.query(
      `UPDATE calls
       SET current_state = $1, language_code = $2, selected_service_code = $3, context = $4, updated_at = NOW()
       WHERE twilio_call_sid = $5`,
      [nextState, nextLang, svcCode, context, callSid]
    );

    return res.send(xml);
  } catch (err) {
    console.error('Twilio webhook error:', err.message);
    return res.send(buildEndCall('Sorry, we are experiencing technical difficulties. Please call back shortly.'));
  }
});

module.exports = router;
