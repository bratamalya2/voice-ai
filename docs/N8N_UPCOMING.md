# Upcoming n8n Workflows

This file documents the remaining workflows to be built after `availability-engine` is live.

## 2. `quote-and-availability` Workflow ⬜

**Purpose:** Combines quote calculation + availability in one call

**Input:**

```json
{
  "businessId": 1,
  "serviceId": 1,
  "startDate": "2026-04-20",
  "endDate": "2026-04-27",
  "quoteData": {
    "vehicleType": "sedan",
    "condition": "good",
    "addon": "ceramic_coat"
  }
}
```

**Process:**

1. Call `quote-engine` workflow → get quote_min, quote_max
2. Call `availability-engine` workflow → get 3 slots
3. Combine results and return

**Output:**

```json
{
  "quote_min": 410,
  "quote_max": 608,
  "slots": [
    { "slot_start": "...", "slot_end": "...", "duration_minutes": 60 },
    ...
  ]
}
```

---

## 3. `create-booking` Workflow ⬜

**Purpose:** Create a booking after customer confirms slot

**Backend endpoint needed:** `POST /api/bookings`

**Endpoint implementation:**

```javascript
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      businessId,
      customerId,
      slot_start,
      slot_end,
      quote_min,
      quote_max,
      serviceId,
    } = req.body;

    // Create booking in database
    const booking = await pool.query(
      `INSERT INTO bookings 
       (business_id, customer_id, service_id, scheduled_start, scheduled_end, 
        quote_min, quote_max, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed') 
       RETURNING id, calendar_event_id`,
      [
        businessId,
        customerId,
        serviceId,
        slot_start,
        slot_end,
        quote_min,
        quote_max,
      ],
    );

    const bookingId = booking.rows[0].id;

    // Create Calendly event
    const event = await calendlyService.createEvent({
      title: `Booking #${bookingId}`,
      description: `Service: ${serviceId}\\nPhone: ${customerPhone}`,
      startTime: slot_start,
      endTime: slot_end,
      inviteeEmail: customerEmail,
      inviteeName: customerName,
    });

    // Update booking with calendar_event_id
    await pool.query(
      "UPDATE bookings SET calendar_event_id = $1 WHERE id = $2",
      [event.calendar_event_id, bookingId],
    );

    res.json({ bookingId, calendarEventId: event.calendar_event_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**n8n workflow steps:**

1. Webhook → receive booking data
2. HTTP → POST to `/api/bookings`
3. Response → return booking ID

---

## 4. `cancel-booking` Workflow ⬜

**Purpose:** Cancel a booking and remove calendar event

**Backend endpoint needed:** `POST /api/bookings/:id/cancel`

**Endpoint implementation:**

```javascript
app.post("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    // Get booking details
    const booking = await pool.query("SELECT * FROM bookings WHERE id = $1", [
      id,
    ]);

    if (!booking.rows.length) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { calendar_event_id } = booking.rows[0];

    // Cancel Calendly event
    if (calendar_event_id) {
      await calendlyService.cancelEvent(calendar_event_id);
    }

    // Update booking status
    await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [
      "cancelled",
      id,
    ]);

    res.json({ success: true, bookingId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 5. `reschedule-booking` Workflow ⬜

**Purpose:** Change booking to a different time slot

**Backend endpoint needed:** `POST /api/bookings/:id/reschedule`

**Endpoint implementation:**

```javascript
app.post("/api/bookings/:id/reschedule", async (req, res) => {
  try {
    const { id } = req.params;
    const { newStartTime, newEndTime } = req.body;

    const booking = await pool.query("SELECT * FROM bookings WHERE id = $1", [
      id,
    ]);

    if (!booking.rows.length) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { calendar_event_id } = booking.rows[0];

    // Update Calendly event
    if (calendar_event_id) {
      await calendlyService.updateEvent(calendar_event_id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }

    // Update booking in database
    await pool.query(
      "UPDATE bookings SET scheduled_start = $1, scheduled_end = $2 WHERE id = $3",
      [newStartTime, newEndTime, id],
    );

    res.json({ success: true, bookingId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Implementation Order

1. ✅ **availability-engine** — Done
2. ⬜ **quote-and-availability** — Combine existing workflows
3. ⬜ **create-booking** — Use backend `/api/bookings` endpoint
4. ⬜ **cancel-booking** — Use backend `/api/bookings/:id/cancel` endpoint
5. ⬜ **reschedule-booking** — Use backend `/api/bookings/:id/reschedule` endpoint

---

## Implementation Checklist

- [ ] Add backend endpoints (see code above)
- [ ] Test endpoints with curl or Postman
- [ ] Create n8n workflows
- [ ] Test workflows in n8n UI
- [ ] Update IVR to call workflows at the right time
- [ ] Test end-to-end from phone call

---

## Files to Update

| File                                    | Changes                        |
| --------------------------------------- | ------------------------------ |
| `backend/src/index.js`                  | Add 3 new POST endpoints       |
| `workflows/quote-and-availability.json` | Create new workflow            |
| `workflows/create-booking.json`         | Create new workflow            |
| `workflows/cancel-booking.json`         | Create new workflow            |
| `workflows/reschedule-booking.json`     | Create new workflow            |
| `backend/src/routes/twilio.js`          | Call workflows at right states |
