const express = require('express');
const router = express.Router();
const pool = require('../db');
const twilioValidation = require('../middleware/twilioValidation');
const axios = require('axios');

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

async function buildServiceMenu(businessId, language = 'en') {
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
    prompt = 'Nayi booking ke liye, seva chunein. ';
    services.rows.forEach(s => prompt += `${s.name_hi} ke liye ${s.keypad_option} dabaiye. `);
    prompt += 'Dobara sunne ke liye 9 dabaiye.';
  } else if (language === 'zh') {
    prompt = '要进行新预约，请选择服务。';
    services.rows.forEach(s => prompt += `${s.name_zh}请按${s.keypad_option}。`);
    prompt += '重听请按9。';
  } else {
    prompt = 'To make a new booking, please select a service. ';
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

async function routeState(state, digits, speech, language, callRecord) {
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
      if (selected === '1') return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language), language };
      if (selected === '5') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_CANCEL', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '6') {
        let msg = 'We have received your request for a callback. A team member will contact you on this number as soon as possible. Goodbye!';
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
      }
      if (selected === '9') return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };
      return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language };

    case 'MAIN_MENU_HI':
      if (selected === '1') return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language), language };
      if (selected === '5') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_CANCEL', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '6') {
        let msg = 'Humein aapka callback request mil gaya hai. Hum aapko jald hi is number par sampark karenge. Alvida!';
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
      }
      if (selected === '9') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language };
      return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language };

    case 'MAIN_MENU_ZH':
      if (selected === '1') return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language), language };
      if (selected === '5') {
        const nextPhase = await routeState('IDENTIFY_BOOKING_CANCEL', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      }
      if (selected === '6') {
        let msg = '我们已收到您的回电请求。工作人员会尽快通过此号码与您联系。再见！';
        return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
      }
      if (selected === '9') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language };
      return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language };

    case 'SERVICE_MENU_NEW':
      if (selected === '9') return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language), language };
      
      if (selected) {
        const services = await pool.query(
          'SELECT service_code FROM services WHERE business_id = $1 AND keypad_option = $2 AND active = TRUE',
          [callRecord.business_id, parseInt(selected)]
        );
        if (services.rows.length > 0) {
           const serviceCode = services.rows[0].service_code;
           // Proceed immediately to COLLECT_REQUIRED_FIELDS
           const nextCallRecord = { ...callRecord, selected_service_code: serviceCode };
           const nextPhase = await routeState('COLLECT_REQUIRED_FIELDS', '', '', language, nextCallRecord);
           return { 
             nextState: nextPhase.nextState, 
             xml: nextPhase.xml, 
             language: nextPhase.language, 
             updates: { selected_service_code: serviceCode, ...(nextPhase.updates || {}) } 
           };
        }
      }
      return { nextState: 'SERVICE_MENU_NEW', xml: await buildServiceMenu(callRecord.business_id, language), language };

    case 'COLLECT_REQUIRED_FIELDS': {
      let context = callRecord.context || {};
      const bizRes = await pool.query('SELECT business_type FROM businesses WHERE business_id = $1', [callRecord.business_id]);
      const bizType = bizRes.rows[0].business_type;

      let nextState = 'COLLECT_REQUIRED_FIELDS';
      let xml = '';
      
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

      // If we reach here, all required fields are collected!
      // Proceed immediately to QUOTE_RESULT
      const nextPhase = await routeState('QUOTE_RESULT', '', '', language, { ...callRecord, context });
      return { 
        nextState: nextPhase.nextState, 
        xml: nextPhase.xml, 
        language: nextPhase.language, 
        updates: { context, ...(nextPhase.updates || {}) } 
      };
    }

    case 'QUOTE_RESULT': {
      let context = callRecord.context || {};
      let selectedServiceCode = callRecord.selected_service_code;

      if (selected === '1') {
        const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      } else if (selected === '2') {
        return { nextState: 'QUOTE_RESULT', xml: gatherResponse(language === 'hi' ? 'Quote SMS kar diya gaya hai. Availability check karne ke liye 1 dabaiye, main menu ke liye 3 dabaiye.' : language === 'zh' ? '报价已通过短信发送。按 1 查询空闲时间，按 3 返回主菜单。' : 'Quote sent to your phone. Press 1 to check availability, or press 3 for the main menu.', language), language, updates: {} };
      } else if (selected === '3') {
        if (language === 'hi') return { nextState: 'MAIN_MENU_HI', xml: buildMainMenuHi(), language, updates: {} };
        if (language === 'zh') return { nextState: 'MAIN_MENU_ZH', xml: buildMainMenuZh(), language, updates: {} };
        return { nextState: 'MAIN_MENU_EN', xml: buildMainMenuEn(), language, updates: {} };
      }

      // If we don't have quote in context, fetch it
      if (!context.quoteMin || !context.quoteMax) {
        const bizRes = await pool.query('SELECT business_type FROM businesses WHERE business_id = $1', [callRecord.business_id]);
        const bizType = bizRes.rows[0].business_type;

        try {
          const payload = {
            serviceType: bizType,
            serviceCode: selectedServiceCode,
            ...context
          };

          const response = await axios.post(`${process.env.N8N_WEBHOOK_BASE_URL}/webhook/quote-engine`, payload);
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
        let msg = language === 'hi' ? 'Quote nikalne mein samasya aayi. Main menu ke liye 3 dabaiye.' : language === 'zh' ? '获取报价失败。按3返回主菜单。' : 'There was an issue calculating your quote. To return to the main menu, press 3.';
        xml = gatherResponse(msg, language);
      }

      return { nextState: 'QUOTE_RESULT', xml, language, updates: { context } };
    }

    case 'CHECK_AVAILABILITY': {
      let context = callRecord.context || {};
      let selectedServiceCode = callRecord.selected_service_code;

      if (selected === '1' || selected === '2' || selected === '3') {
        const slotIndex = parseInt(selected) - 1;
        if (context.slots && context.slots[slotIndex]) {
          context.selectedSlot = context.slots[slotIndex];
          const nextPhase = await routeState('CONFIRM_SLOT', '', '', language, { ...callRecord, context });
          return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: { context, ...(nextPhase.updates || {}) } };
        }
      } else if (selected === '4') {
        return { nextState: 'CHECK_AVAILABILITY', xml: gatherResponse(language === 'hi' ? 'Aur samay uplabdh nahi hai. Kripya 1, 2, ya 3 chunein.' : language === 'zh' ? '没有更多可用时间。请选择 1、2 或 3。' : 'No more slots available. Please select 1, 2, or 3.', language), language, updates: { context } };
      } else if (selected === '3' && (!context.slots || context.slots.length === 0)) {
        // If no slots and user pressed 3 to go to main menu
        let menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
        const nextPhase = await routeState(menuState, '', '', language, { ...callRecord, context });
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: { context, ...(nextPhase.updates || {}) } };
      }

      if (!context.slots) {
        try {
          const sRes = await pool.query('SELECT duration_minutes FROM services WHERE service_code = $1', [selectedServiceCode]);
          const duration = sRes.rows.length > 0 ? sRes.rows[0].duration_minutes : 60;

          const today = new Date();
          const startDate = today.toISOString().split('T')[0];
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 14);
          const endDate = nextWeek.toISOString().split('T')[0];

          const response = await axios.post(`http://127.0.0.1:${process.env.PORT || 3001}/api/availability`, {
            startDate,
            endDate,
            serviceDuration: duration
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
        if (language === 'hi') prompt += 'Dobara sunne ke liye 9 dabaiye.';
        else if (language === 'zh') prompt += '重听请按9。';
        else prompt += 'To repeat, press 9.';

        xml = gatherResponse(prompt, language);
      } else {
        let msg = language === 'hi' ? 'Kshama karein, koi samay uplabdh nahi hai. Main menu ke liye 3 dabaiye.' : language === 'zh' ? '抱歉，当前没有可用时间。按3返回主菜单。' : 'Sorry, there are no available times right now. Press 3 to return to the main menu.';
        xml = gatherResponse(msg, language);
      }

      return { nextState: 'CHECK_AVAILABILITY', xml, language, updates: { context } };
    }

    case 'CONFIRM_SLOT': {
      let context = callRecord.context || {};
      
      if (selected === '1') {
        const nextPhase = await routeState('CREATE_BOOKING', '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: nextPhase.updates };
      } else if (selected === '2') {
        const nextPhase = await routeState('CHECK_AVAILABILITY', '', '', language, { ...callRecord, context });
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: { context, ...(nextPhase.updates || {}) } };
      } else if (selected === '3') {
        let menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
        const nextPhase = await routeState(menuState, '', '', language, { ...callRecord, context });
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language, updates: { context, ...(nextPhase.updates || {}) } };
      }

      const label = context.selectedSlot.spoken_labels[language] || context.selectedSlot.spoken_labels['en'];
      
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

    case 'IDENTIFY_BOOKING_CANCEL': {
      try {
        const response = await axios.get(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings/phone/${callRecord.caller_phone}`);
        const bookings = response.data;

        if (bookings.length === 0) {
          let msg = language === 'hi' ? 'Is number ke liye koi active booking nahi mili. Main menu ke liye 3 dabaiye.' : language === 'zh' ? '该号码没有查询到预约。按3返回主菜单。' : 'We could not find any active bookings for your phone number. Press 3 to return to the main menu.';
          return { nextState: 'MAIN_MENU_EN', xml: gatherResponse(msg, language), language };
        }

        // Use the first (soonest) booking
        const booking = bookings[0];
        const dateStr = new Date(booking.scheduled_start).toLocaleString(language === 'hi' ? 'hi-IN' : language === 'zh' ? 'zh-CN' : 'en-AU', {
          weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });

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
      let context = callRecord.context || {};
      const booking = context.bookingToCancel;

      if (selected === '1') {
        try {
          await axios.post(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings/${booking.booking_id}/cancel`, {
            reason: 'Cancelled via IVR'
          });

          let msg = language === 'hi' ? 'Aapki booking cancel kar di gayi hai. Alvida!' : language === 'zh' ? '您的预约已取消。再见！' : 'Your booking has been successfully cancelled. Goodbye!';
          return { nextState: 'END_CALL', xml: buildEndCall(msg), language };
        } catch (err) {
          console.error('Cancel booking error:', err.message);
          return { nextState: 'END_CALL', xml: buildEndCall('Sorry, we could not cancel your booking at this time.'), language };
        }
      } else if (selected === '3') {
        let menuState = language === 'hi' ? 'MAIN_MENU_HI' : language === 'zh' ? 'MAIN_MENU_ZH' : 'MAIN_MENU_EN';
        const nextPhase = await routeState(menuState, '', '', language, callRecord);
        return { nextState: nextPhase.nextState, xml: nextPhase.xml, language: nextPhase.language };
      }

      return { nextState: 'CANCEL_CONFIRM', xml: gatherResponse('Please press 1 to confirm cancellation or 3 to return to the main menu.', language), language };
    }

    case 'CREATE_BOOKING': {
      let context = callRecord.context || {};
      let selectedServiceCode = callRecord.selected_service_code;

      try {
        // 1. Get service_id
        const sRes = await pool.query(
          'SELECT service_id FROM services WHERE business_id = $1 AND service_code = $2',
          [callRecord.business_id, selectedServiceCode]
        );
        const serviceId = sRes.rows[0]?.service_id;

        if (!serviceId) throw new Error('Service not found');

        // 2. Call internal bookings API
        const payload = {
          businessId: callRecord.business_id,
          serviceId: serviceId,
          callerPhone: callRecord.caller_phone,
          customerName: 'Phone Customer',
          slotStart: context.selectedSlot.slot_start,
          slotEnd: context.selectedSlot.slot_end,
          quoteMin: context.quoteMin,
          quoteMax: context.quoteMax,
          suburb: context.suburb || null,
          notes: `IVR Booking. Vehicle/Property details: ${JSON.stringify(context)}`
        };

        const response = await axios.post(`http://127.0.0.1:${process.env.PORT || 3001}/api/bookings`, payload);
        const bookingId = response.data.bookingId;

        let msg = '';
        if (language === 'hi') {
          msg = `Dhanyavad! Aapki booking confirm ho gayi hai. Aapka booking number hai ${bookingId}. Aapko jaldi hi ek SMS milega. Alvida!`;
        } else if (language === 'zh') {
          msg = `谢谢！您的预约已确认。您的预约编号是 ${bookingId}。您很快会收到一条确认短信。再见！`;
        } else {
          msg = `Thank you! Your booking is confirmed. Your booking reference is ${bookingId}. You will receive a confirmation SMS shortly. Goodbye!`;
        }

        return { nextState: 'END_CALL', xml: buildEndCall(msg), language, updates: {} };

      } catch (err) {
        console.error('Booking creation error:', err.message);
        let msg = language === 'hi' ? 'Maaf kijiye, booking karne mein samasya aayi. Kripya thodi der baad koshish karein.' : language === 'zh' ? '抱歉，预约失败。请稍后再试。' : 'Sorry, we encountered an error creating your booking. Please try again later.';
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
    let callRecord   = null;

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
      
      call = await pool.query('SELECT * FROM calls WHERE twilio_call_sid = $1', [callSid]);
      callRecord = call.rows[0];
    } else {
      callRecord = call.rows[0];
      currentState = callRecord.current_state;
      language     = callRecord.language_code;
    }

    // Route to next state
    const result = await routeState(
      currentState, digits, speech, language, callRecord
    );
    
    const nextState = result.nextState;
    const xml = result.xml;
    const nextLanguage = result.language;
    const updates = result.updates || {};
    const selectedServiceCode = updates.selected_service_code !== undefined ? updates.selected_service_code : callRecord.selected_service_code;
    const context = updates.context !== undefined ? updates.context : (callRecord.context || {});

    // Persist updated state
    await pool.query(
      `UPDATE calls
       SET current_state = $1, language_code = $2, selected_service_code = $3, context = $4, updated_at = NOW()
       WHERE twilio_call_sid = $5`,
      [nextState, nextLanguage, selectedServiceCode, context, callSid]
    );

    return res.send(xml);

  } catch (err) {
    console.error('Twilio webhook error:', err.message);
    return res.send(buildEndCall('Sorry, we are experiencing technical difficulties. Please call back shortly.'));
  }
});

module.exports = router;
