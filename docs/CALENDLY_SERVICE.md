# Calendly Service Integration

## Overview

The Calendly service (`backend/src/services/calendlyService.js`) provides a complete integration with the Calendly API for managing availability and events.

## Environment Variables

Add these to `backend/.env`:

```
CALENDLY_API_KEY=your_api_token
CALENDLY_USER_ID=your_user_id
```

## Available Functions

### 1. **getUserUri()** — Get user resource URI

```javascript
const userUri = await calendlyService.getUserUri();
// Returns: "https://api.calendly.com/users/a2a6719c-..."
```

- Caches the result to avoid repeated API calls
- Required internally by other functions

### 2. **getAvailableSlots(startTime, endTime)** — Fetch availability

```javascript
const slots = await calendlyService.getAvailableSlots(
  "2026-04-20T00:00:00Z",
  "2026-04-27T23:59:59Z",
);
// Returns: [ { start_time: "...", end_time: "..." }, ... ]
```

- Queries Calendly availability schedule
- Returns all available slots in the date range

### 3. **createEvent(eventData)** — Create calendar event

```javascript
const event = await calendlyService.createEvent({
  title: "Car Detailing - John Doe",
  description: "Standard car wash\nPhone: +61412345678",
  startTime: "2026-04-22T10:00:00Z",
  endTime: "2026-04-22T11:00:00Z",
  inviteeEmail: "customer@example.com",
  inviteeName: "John Doe",
});
// Returns: { calendar_event_id: "abc123", event_uri: "...", ... }
```

- Creates a scheduled event on your calendar
- Invites the customer by email
- Returns the `calendar_event_id` to store in database

### 4. **cancelEvent(eventId)** — Cancel/delete event

```javascript
await calendlyService.cancelEvent("abc123");
// Returns: true
```

- Deletes the event from calendar
- Used when customer cancels booking

### 5. **updateEvent(eventId, updateData)** — Reschedule event

```javascript
await calendlyService.updateEvent("abc123", {
  startTime: "2026-04-23T14:00:00Z",
  endTime: "2026-04-23T15:00:00Z",
});
```

- Updates event time
- Used for rescheduling bookings

### 6. **getEventDetails(eventId)** — Get event info

```javascript
const details = await calendlyService.getEventDetails("abc123");
// Returns: { start_time, end_time, invitees, status, ... }
```

### 7. **filterSlotsByDuration(slots, durationMinutes, topN)** — Filter and sort slots

```javascript
const top3 = calendlyService.filterSlotsByDuration(slots, 60, 3);
// Returns: [
//   { slot_start: "...", slot_end: "...", duration_minutes: 60 },
//   ...
// ]
```

- Filters slots by minimum duration
- Returns top N slots sorted by start time
- Useful for finding slots matching service duration

## Usage in n8n Workflows

### Example: Availability Engine Workflow

```javascript
// In n8n Code node:
const calendlyService = require("/backend/src/services/calendlyService");

const startTime = $input.all()[0].json.startTime; // "2026-04-20T00:00:00Z"
const endTime = $input.all()[0].json.endTime;
const serviceDuration = $input.all()[0].json.serviceDuration; // 60 minutes

// Get available slots
const slots = await calendlyService.getAvailableSlots(startTime, endTime);

// Filter to top 3 matching duration
const topSlots = calendlyService.filterSlotsByDuration(
  slots,
  serviceDuration,
  3,
);

return topSlots;
```

### Example: Create Booking Workflow

```javascript
const calendlyService = require("/backend/src/services/calendlyService");

const selectedSlot = $input.all()[0].json.slot; // User selected slot
const customerEmail = $input.all()[0].json.customerEmail;
const serviceName = $input.all()[0].json.serviceName;

// Create calendar event
const event = await calendlyService.createEvent({
  title: `${serviceName} - Customer Booking`,
  description: `Phone: ${customerPhone}\nService: ${serviceName}`,
  startTime: selectedSlot.slot_start,
  endTime: selectedSlot.slot_end,
  inviteeEmail: customerEmail,
  inviteeName: customerName,
});

// Save to database
const bookingId = await db.insert("bookings", {
  calendar_event_id: event.calendar_event_id,
  // ... other fields
});

return { bookingId, eventId: event.calendar_event_id };
```

### Example: Cancel Booking Workflow

```javascript
const calendlyService = require("/backend/src/services/calendlyService");

const bookingId = $input.all()[0].json.bookingId;
const calendarEventId = $input.all()[0].json.calendarEventId;

// Cancel the event
await calendlyService.cancelEvent(calendarEventId);

// Update database
await db.query("UPDATE bookings SET status = $1 WHERE id = $2", [
  "cancelled",
  bookingId,
]);

return { success: true };
```

## Testing

Run the test script to verify integration:

```bash
node testCalendlyService.js
```

Expected output:

```
🔧 Testing Calendly Integration...

✓ Test 1: Fetching user URI...
  User URI: https://api.calendly.com/users/a2a6719c-...

✓ Test 2: Fetching available slots...
  Found X available slots
  First slot: 2026-04-22T10:00:00Z

✓ Test 3: Filtering slots for 60-minute service...
  Filtered to top 3 slots: 3 slots
  ...

✅ Calendly integration is set up correctly!
```

## Error Handling

All functions throw errors with descriptive messages:

```javascript
try {
  const slots = await calendlyService.getAvailableSlots(start, end);
} catch (error) {
  console.error("Failed to fetch slots:", error.message);
  // "Failed to fetch slots: No availability schedule found"
}
```

## API Rate Limits

- Calendly API has rate limits (check their docs for current limits)
- The service caches the user URI to reduce calls
- Consider caching availability results in n8n for peak times

## Next Steps

1. ✅ Calendly service created
2. ⬜ Build n8n `availability-engine` workflow using this service
3. ⬜ Build n8n `create-booking` workflow to create events
4. ⬜ Build n8n `cancel-booking` workflow to delete events
5. ⬜ Build n8n `reschedule-booking` workflow to update events
