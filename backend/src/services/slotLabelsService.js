/**
 * Generate spoken labels for available slots in multiple languages
 * Used by IVR to read availability options to callers
 *
 * Example:
 *   "Monday, April 21st at 10:00 AM"
 *   "सोमवार, 21 अप्रैल को सुबह 10:00 बजे"
 *   "星期一，四月21日上午10:00"
 */

const TZ = process.env.TIMEZONE || "Australia/Melbourne";

// Extract date/time parts from a UTC Date in the business timezone
function tzParts(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", weekday: "short", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map(({ type, value }) => [type, value]));
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayOfWeek: dow[p.weekday] ?? 0,
    day:       parseInt(p.day),
    month:     parseInt(p.month) - 1, // 0-indexed for monthNames arrays
    hour:      parseInt(p.hour),
    minute:    parseInt(p.minute),
  };
}

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
 * Generate spoken label for a slot in the given language.
 * Times are always shown in the business timezone (TIMEZONE env var).
 * @param {Date} date - Slot start as a UTC Date
 * @param {string} lang - Language code ('en', 'hi', 'zh')
 * @returns {string} Human-readable label
 */
function generateSlotLabel(date, lang = "en") {
  const { dayOfWeek, day, month, hour, minute } = tzParts(date);
  const dayName   = dayNames[lang][dayOfWeek];
  const monthName = monthNames[lang][month];

  if (lang === "en") {
    const ordinal = getOrdinalSuffix(day);
    return `${dayName}, ${monthName} ${day}${ordinal} at ${formatTime12Hour(hour, minute)}`;
  } else if (lang === "hi") {
    return `${dayName}, ${day} ${monthName} को ${formatTime24Hour(hour, minute)} बजे`;
  } else {
    return `${dayName}，${monthName}${day}日${formatTime24Hour(hour, minute)}`;
  }
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
