require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const express = require("express");
const pool = require("./db");
const twilioRouter = require("./routes/twilio");
const calendlyService = require("./services/calendlyService");
const slotLabelsService = require("./services/slotLabelsService");
const workflowLoggingService = require("./services/workflowLoggingService");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────

// Parse Twilio's URL-encoded POST bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────

// Health check — tests DB connectivity
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");
    res.json({ status: "ok", db_time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Twilio webhook
app.use("/webhook/twilio", twilioRouter);

// ─── n8n Integration APIs ───────────────────────────────────────────────────

/**
 * POST /api/availability — Fetch available calendar slots
 * Input: startDate, endDate (YYYY-MM-DD), serviceDuration (minutes)
 * Output: Array of slots with spoken labels in 3 languages
 */
app.post("/api/availability", async (req, res) => {
  const startTime = Date.now();

  try {
    const { startDate, endDate, serviceDuration } = req.body;

    if (!startDate || !endDate || !serviceDuration) {
      return res.status(400).json({
        error: "Missing required fields: startDate, endDate, serviceDuration",
      });
    }

    // Format dates to ISO 8601
    const startTimeISO = `${startDate}T00:00:00Z`;
    const endTimeISO = `${endDate}T23:59:59Z`;

    // Get available slots from Calendly
    const slots = await calendlyService.getAvailableSlots(startTimeISO, endTimeISO);

    // Filter to top 3 matching service duration
    const topSlots = calendlyService.filterSlotsByDuration(
      slots,
      serviceDuration,
      3
    );

    // Generate multilingual spoken labels
    const labels = slotLabelsService.generateMultilingualLabels(topSlots);

    // Prepare response with spoken labels
    const response = topSlots.map((slot, index) => ({
      slot_number: index + 1,
      slot_start: slot.slot_start,
      slot_end: slot.slot_end,
      duration_minutes: slot.duration_minutes,
      spoken_labels: {
        en: labels.en[index],
        hi: labels.hi[index],
        zh: labels.zh[index],
      },
    }));

    // Log test result to PostgreSQL
    const executionTimeMs = Date.now() - startTime;
    await workflowLoggingService.logTestResult({
      workflowName: "availability-engine",
      testType: "API",
      status: "success",
      requestPayload: { startDate, endDate, serviceDuration },
      responsePayload: response,
      executionTimeMs,
    });

    res.json(response);
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    // Log error to PostgreSQL
    await workflowLoggingService.logTestResult({
      workflowName: "availability-engine",
      testType: "API",
      status: "error",
      requestPayload: req.body,
      responsePayload: null,
      errorMessage: error.message,
      executionTimeMs,
    }).catch(err => console.error('Failed to log error:', err.message));

    console.error("Availability API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Services API ────────────────────────────────────────────────────────────

app.get("/api/services/:businessId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT service_id, service_code, name_en, duration_minutes, base_price_min, base_price_max FROM services WHERE business_id = $1 AND active = TRUE ORDER BY keypad_option",
      [req.params.businessId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Booking APIs ────────────────────────────────────────────────────────────

/**
 * POST /api/bookings — Create a new booking
 * Input: businessId, serviceId, callerPhone, customerName, customerEmail (opt),
 *        slotStart, slotEnd, quoteMin, quoteMax, suburb (opt), notes (opt)
 * Output: { bookingId, customerId, calendarEventId }
 */
app.post("/api/bookings", async (req, res) => {
  const {
    businessId, serviceId, callerPhone, customerName, customerEmail,
    slotStart, slotEnd, quoteMin, quoteMax, suburb, notes,
  } = req.body;

  if (!businessId || !serviceId || !callerPhone || !slotStart || !slotEnd) {
    return res.status(400).json({
      error: "Missing required fields: businessId, serviceId, callerPhone, slotStart, slotEnd",
    });
  }

  try {
    // Upsert customer by phone
    const customerResult = await pool.query(
      `INSERT INTO customers (phone, full_name, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, customers.full_name),
         email     = COALESCE(EXCLUDED.email, customers.email)
       RETURNING customer_id`,
      [callerPhone, customerName || null, customerEmail || null]
    );
    const customerId = customerResult.rows[0].customer_id;

    // Insert booking
    const bookingResult = await pool.query(
      `INSERT INTO bookings
         (business_id, customer_id, service_id, scheduled_start, scheduled_end,
          quote_min, quote_max, suburb, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
       RETURNING booking_id`,
      [businessId, customerId, serviceId, slotStart, slotEnd,
       quoteMin || null, quoteMax || null, suburb || null, notes || null]
    );
    const bookingId = bookingResult.rows[0].booking_id;

    // Try to create Calendly event (best-effort — don't fail booking if it errors)
    let calendarEventId = null;
    if (customerEmail) {
      try {
        const event = await calendlyService.createEvent({
          title: `Booking #${bookingId}`,
          description: notes || "",
          startTime: slotStart,
          endTime: slotEnd,
          inviteeEmail: customerEmail,
          inviteeName: customerName || "Customer",
        });
        calendarEventId = event.calendar_event_id;
        await pool.query(
          "UPDATE bookings SET calendar_event_id = $1 WHERE booking_id = $2",
          [calendarEventId, bookingId]
        );
      } catch (calErr) {
        console.error("Calendly event creation failed (non-fatal):", calErr.message);
      }
    }

    // Log booking event
    await pool.query(
      `INSERT INTO booking_events (booking_id, event_type, event_payload)
       VALUES ($1, 'booking_created', $2)`,
      [bookingId, JSON.stringify({ quoteMin, quoteMax, slotStart, slotEnd, suburb })]
    );

    res.json({ bookingId, customerId, calendarEventId });
  } catch (error) {
    console.error("Create booking error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bookings/phone/:phone — Find future confirmed bookings by caller phone
 * Output: Array of booking rows with service name
 */
app.get("/api/bookings/phone/:phone", async (req, res) => {
  const { phone } = req.params;

  try {
    const result = await pool.query(
      `SELECT b.booking_id, b.status, b.scheduled_start, b.scheduled_end,
              b.quote_min, b.quote_max, b.suburb, b.calendar_event_id,
              s.name_en AS service_name, s.name_hi, s.name_zh
       FROM bookings b
       JOIN customers  c ON b.customer_id = c.customer_id
       JOIN services   s ON b.service_id  = s.service_id
       WHERE c.phone      = $1
         AND b.status     = 'confirmed'
         AND b.scheduled_start > NOW()
       ORDER BY b.scheduled_start ASC
       LIMIT 5`,
      [phone]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Lookup bookings error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bookings/:id/cancel — Cancel a booking and its Calendly event
 * Input (body, optional): reason
 * Output: { success, bookingId }
 */
app.post("/api/bookings/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  try {
    const booking = await pool.query(
      "SELECT * FROM bookings WHERE booking_id = $1",
      [id]
    );

    if (!booking.rows.length) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { calendar_event_id, status } = booking.rows[0];

    if (status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // Try to cancel Calendly event (best-effort)
    if (calendar_event_id) {
      try {
        await calendlyService.cancelEvent(calendar_event_id);
      } catch (calErr) {
        console.error("Calendly cancel failed (non-fatal):", calErr.message);
      }
    }

    await pool.query(
      "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE booking_id = $1",
      [id]
    );

    await pool.query(
      `INSERT INTO booking_events (booking_id, event_type, event_payload)
       VALUES ($1, 'booking_cancelled', $2)`,
      [id, JSON.stringify({ reason: reason || "Customer requested cancellation", cancelled_at: new Date().toISOString() })]
    );

    res.json({ success: true, bookingId: id });
  } catch (error) {
    console.error("Cancel booking error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Health:        http://localhost:${PORT}/health`);
  console.log(`Twilio webhook: http://localhost:${PORT}/webhook/twilio`);
  console.log(`Availability API: POST http://localhost:${PORT}/api/availability`);
});
