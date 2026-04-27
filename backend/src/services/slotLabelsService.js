/**
 * Generate spoken labels for available slots in multiple languages
 * Used by IVR to read availability options to callers
 *
 * Example:
 *   "Monday, April 21st at 10:00 AM"
 *   "सोमवार, 21 अप्रैल को सुबह 10:00 बजे"
 *   "星期一，四月21日上午10:00"
 */

const dayNames = {
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  hi: [
    "रविवार",
    "सोमवार",
    "मंगलवार",
    "बुधवार",
    "गुरुवार",
    "शुक्रवार",
    "शनिवार",
  ],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};

const monthNames = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  hi: [
    "जनवरी",
    "फरवरी",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुलाई",
    "अगस्त",
    "सितंबर",
    "अक्टूबर",
    "नवंबर",
    "दिसंबर",
  ],
  zh: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
};

/**
 * Get ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(num) {
  if (num > 3 && num < 21) return "th";
  switch (num % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Format time in 12-hour format (e.g., 10:00 AM)
 */
function formatTime12Hour(hour, minute) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minStr = String(minute).padStart(2, "0");
  return `${hour12}:${minStr} ${ampm}`;
}

/**
 * Format time in 24-hour format (e.g., 10:00)
 */
function formatTime24Hour(hour, minute) {
  const hourStr = String(hour).padStart(2, "0");
  const minStr = String(minute).padStart(2, "0");
  return `${hourStr}:${minStr}`;
}

/**
 * Generate spoken label for a slot in English
 * @param {Date} date - Slot start date
 * @param {string} lang - Language code ('en', 'hi', 'zh')
 * @returns {string} Human-readable label
 */
function generateSlotLabel(date, lang = "en") {
  const dayName = dayNames[lang][date.getDay()];
  const dayNum = date.getDate();
  const monthName = monthNames[lang][date.getMonth()];
  const hour = date.getHours();
  const minute = date.getMinutes();

  let timeStr;
  let timeLabel;

  if (lang === "en") {
    const ordinal = getOrdinalSuffix(dayNum);
    timeStr = formatTime12Hour(hour, minute);
    timeLabel = `${dayName}, ${monthName} ${dayNum}${ordinal} at ${timeStr}`;
  } else if (lang === "hi") {
    timeStr = formatTime24Hour(hour, minute);
    // Hindi: Day, Date Month को time बजे
    timeLabel = `${dayName}, ${dayNum} ${monthName} को ${timeStr} बजे`;
  } else if (lang === "zh") {
    timeStr = formatTime24Hour(hour, minute);
    // Chinese: Day, Month Date at time
    timeLabel = `${dayName}，${monthName}${dayNum}日${timeStr}`;
  }

  return timeLabel;
}

/**
 * Generate spoken labels for all slots in a language
 * @param {Array} slots - Array of { slot_start, slot_end, duration_minutes }
 * @param {string} lang - Language code ('en', 'hi', 'zh')
 * @returns {Array} Array of labels
 */
function generateSlotLabels(slots, lang = "en") {
  return slots.map((slot) => {
    const date = new Date(slot.slot_start);
    return generateSlotLabel(date, lang);
  });
}

/**
 * Generate multilingual slot labels
 * @param {Array} slots - Array of slots
 * @returns {Object} { en: [...], hi: [...], zh: [...] }
 */
function generateMultilingualLabels(slots) {
  return {
    en: generateSlotLabels(slots, "en"),
    hi: generateSlotLabels(slots, "hi"),
    zh: generateSlotLabels(slots, "zh"),
  };
}

module.exports = {
  generateSlotLabel,
  generateSlotLabels,
  generateMultilingualLabels,
};
