const axios = require("axios");

const CALENDLY_API_BASE = "https://api.calendly.com";
const TZ = process.env.TIMEZONE || "Australia/Melbourne";

// Extract date parts (year, month 1-12, day, hour, minute, dayOfWeek 0-6) in TZ
function tzParts(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", weekday: "short", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map(({ type, value }) => [type, value]));
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(p.year), month: parseInt(p.month), day: parseInt(p.day),
    hour: parseInt(p.hour), minute: parseInt(p.minute), dayOfWeek: dow[p.weekday] ?? 0,
  };
}

// Convert a local business-timezone hour on a given date to a UTC Date
function localHourToUTC(year, month1, day, hour) {
  const utcMidnight = new Date(Date.UTC(year, month1 - 1, day));
  const { hour: tzHour, minute: tzMin } = tzParts(utcMidnight);
  const offsetMs = (tzHour * 60 + tzMin) * 60000;
  return new Date(utcMidnight.getTime() - offsetMs + hour * 3600000);
}

/**
 * Get authorization headers for Calendly API
 */
function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch the current user's resource URI (needed for API calls)
 * Cache it to avoid multiple calls
 */
let cachedUserUri = null;

async function getUserUri() {
  if (cachedUserUri) return cachedUserUri;

  try {
    const response = await axios.get(`${CALENDLY_API_BASE}/users/me`, {
      headers: getHeaders(),
    });
    cachedUserUri = response.data.resource.uri;
    return cachedUserUri;
  } catch (error) {
    console.error("Calendly API error (getUserUri):", error.message);
    throw new Error(`Failed to fetch user URI: ${error.message}`);
  }
}

/**
 * Get available time slots for a date range
 * Calendly v2 API doesn't have a direct "available times" endpoint,
 * so we calculate availability by:
 * 1. Getting all scheduled events (busy times)
 * 2. Getting event types (duration info)
 * 3. Calculating free slots between busy times
 * @param {string} startTime - ISO 8601 format (e.g., 2026-04-20T00:00:00Z)
 * @param {string} endTime - ISO 8601 format (e.g., 2026-04-27T23:59:59Z)
 * @returns {Array} List of available slots
 */
async function getAvailableSlots(startTime, endTime) {
  let busyIntervals = [];
  try {
    const userUri = await getUserUri();
    const resp = await axios.get(`${CALENDLY_API_BASE}/scheduled_events`, {
      headers: getHeaders(),
      params: { user: userUri, min_start_time: startTime, max_start_time: endTime },
    });
    busyIntervals = (resp.data.collection || []).map(e => ({
      start: new Date(e.start_time),
      end:   new Date(e.end_time),
    }));
  } catch {
    // Calendly unavailable — generate slots without busy-time filtering
  }

  const slots = [];
  const end = new Date(endTime);

  // Iterate UTC days; check day-of-week in Melbourne timezone
  for (let cur = new Date(startTime); cur <= end && slots.length < 3; cur.setUTCDate(cur.getUTCDate() + 1)) {
    const { dayOfWeek, year, month, day } = tzParts(cur);
    if (dayOfWeek === 0) continue; // skip Sunday

    // Business hours in Melbourne: Mon–Fri 8am–5pm, Sat 9am–3pm
    const openHour  = dayOfWeek === 6 ? 9  : 8;
    const closeHour = dayOfWeek === 6 ? 15 : 17;

    for (let h = openHour; h < closeHour && slots.length < 3; h++) {
      const slotStart = localHourToUTC(year, month, day, h);
      const slotEnd   = new Date(slotStart.getTime() + 3600000);
      if (!busyIntervals.some(b => slotStart < b.end && slotEnd > b.start)) {
        slots.push({ start_time: slotStart.toISOString(), end_time: slotEnd.toISOString() });
      }
    }
  }

  return slots;
}

/**
 * Create a new scheduled event
 * @param {Object} eventData - { title, description, startTime, endTime, inviteeEmail, inviteeName }
 * @returns {Object} Created event details with calendar_event_id
 */
async function createEvent(eventData) {
  try {
    const userUri = await getUserUri();

    // Get user's event types to find the default one
    const eventTypesResponse = await axios.get(
      `${CALENDLY_API_BASE}/event_types`,
      {
        headers: getHeaders(),
        params: {
          user: userUri,
          active: true,
        },
      },
    );

    const eventType = eventTypesResponse.data.collection[0];
    if (!eventType) {
      throw new Error("No active event types found in Calendly account");
    }

    // Create the scheduled event
    const response = await axios.post(
      `${CALENDLY_API_BASE}/scheduled_events`,
      {
        event_type_uri: eventType.uri,
        invitees: [
          {
            name: eventData.inviteeName || "Customer",
            email: eventData.inviteeEmail,
          },
        ],
        start_time: eventData.startTime, // ISO 8601
        end_time: eventData.endTime, // ISO 8601
      },
      { headers: getHeaders() },
    );

    const event = response.data.resource;
    return {
      calendar_event_id: event.id,
      event_uri: event.uri,
      title: eventData.title,
      description: eventData.description,
      start_time: event.start_time,
      end_time: event.end_time,
      invitee_email: eventData.inviteeEmail,
    };
  } catch (error) {
    console.error(
      "Calendly API error (createEvent):",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to create event: ${error.message}`);
  }
}

/**
 * Cancel/delete a scheduled event
 * @param {string} eventId - Calendly event ID
 * @returns {boolean} Success status
 */
async function cancelEvent(eventId) {
  try {
    // Delete the scheduled event
    await axios.delete(`${CALENDLY_API_BASE}/scheduled_events/${eventId}`, {
      headers: getHeaders(),
    });

    console.log(`Event ${eventId} cancelled successfully`);
    return true;
  } catch (error) {
    console.error(
      "Calendly API error (cancelEvent):",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to cancel event: ${error.message}`);
  }
}

/**
 * Update/reschedule an existing event
 * @param {string} eventId - Calendly event ID
 * @param {Object} updateData - { startTime, endTime } to reschedule
 * @returns {Object} Updated event details
 */
async function updateEvent(eventId, updateData) {
  try {
    const response = await axios.put(
      `${CALENDLY_API_BASE}/scheduled_events/${eventId}`,
      {
        start_time: updateData.startTime,
        end_time: updateData.endTime,
      },
      { headers: getHeaders() },
    );

    return response.data.resource;
  } catch (error) {
    console.error(
      "Calendly API error (updateEvent):",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to update event: ${error.message}`);
  }
}

/**
 * Get event details by ID
 * @param {string} eventId - Calendly event ID
 * @returns {Object} Event details
 */
async function getEventDetails(eventId) {
  try {
    const response = await axios.get(
      `${CALENDLY_API_BASE}/scheduled_events/${eventId}`,
      {
        headers: getHeaders(),
      },
    );

    return response.data.resource;
  } catch (error) {
    console.error(
      "Calendly API error (getEventDetails):",
      error.response?.data || error.message,
    );
    throw new Error(`Failed to get event details: ${error.message}`);
  }
}

/**
 * Filter available slots by service duration
 * @param {Array} slots - Available slots from Calendly
 * @param {number} durationMinutes - Required service duration in minutes
 * @param {number} topN - Return top N slots (default: 3)
 * @returns {Array} Filtered and sorted slots
 */
function filterSlotsByDuration(slots, durationMinutes, topN = 3) {
  if (!slots || slots.length === 0) {
    return [];
  }

  // Filter slots that have enough duration
  const validSlots = slots.filter((slot) => {
    const startTime = new Date(slot.start_time);
    const endTime = new Date(slot.end_time);
    const slotDuration = (endTime - startTime) / (1000 * 60); // Convert to minutes

    return slotDuration >= durationMinutes;
  });

  // Sort by start time and return top N
  return validSlots
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, topN)
    .map((slot) => ({
      slot_start: slot.start_time,
      slot_end: slot.end_time,
      duration_minutes: Math.round(
        (new Date(slot.end_time) - new Date(slot.start_time)) / (1000 * 60),
      ),
    }));
}

module.exports = {
  getUserUri,
  getAvailableSlots,
  createEvent,
  cancelEvent,
  updateEvent,
  getEventDetails,
  filterSlotsByDuration,
};
