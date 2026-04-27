const axios = require("axios");

const CALENDLY_API_BASE = "https://api.calendly.com";

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
  try {
    const userUri = await getUserUri();

    // Get scheduled events (busy blocks)
    const eventsResponse = await axios.get(`${CALENDLY_API_BASE}/scheduled_events`, {
      headers: getHeaders(),
      params: {
        user: userUri,
        min_start_time: startTime,
        max_start_time: endTime,
      },
    });

    const scheduledEvents = eventsResponse.data.collection || [];

    // For now, return mock available slots
    // In a real implementation, you would:
    // 1. Parse scheduledEvents to find busy times
    // 2. Generate free slots by filling gaps
    // 3. Filter based on business hours from event_types

    // Mock data: Generate 3 slots at 10am, 2pm, 9am next days
    const slots = [];
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (slots.length < 3) {
        slots.push({
          start_time: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).toISOString(),
          end_time: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 11, 0, 0).toISOString(),
        });
      }
    }

    return slots;
  } catch (error) {
    console.error('Calendly API error (getAvailableSlots):', error.response?.data || error.message);
    throw new Error(`Failed to fetch available slots: ${error.message}`);
  }
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
