# Architecture — AI Voice Booking System

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Telephony | Twilio Voice + TwiML/Gather | Inbound calls, DTMF keypad, speech input, call control |
| Workflow orchestration | n8n | Webhook handling, booking logic, reminders, summaries |
| Database | PostgreSQL (Render) | Source-of-truth for all bookings, calls, customers |
| Calendar | Google Calendar API | Availability checking and booking event creation |
| Backend API | Node.js + Express | Receives Twilio webhooks, reads call state, returns TwiML |
| Dashboard | Next.js | Provider admin UI |
| AI (optional) | Ollama (llama3.2) | Speech normalisation, transcript cleanup, off-script fallback only |

---

## Design Principle: Deterministic Core, AI at the Edges

**Use AI only for:**
- Language understanding and normalisation (Hindi, Mandarin speech)
- Transcript cleanup for unclear speech
- Off-script fallback responses

**Never use AI for:**
- Quote calculation
- Slot generation
- Booking creation or cancellation
- Reminder timing
- Any business rule that must be auditable

---

## Request Flow

```
Incoming call (Twilio)
        │
        ▼
POST /webhook/twilio  (Express backend)
        │
        ├─ Validate Twilio signature
        ├─ Read current_state from calls table
        ├─ Route to correct state handler
        └─ Return TwiML XML to Twilio
               │
               ├─ For quote/availability → n8n sub-workflow → Google Calendar
               ├─ For booking creation  → n8n sub-workflow → PostgreSQL + Google Calendar
               └─ For notifications     → n8n sub-workflow → Email (SMTP)
```

---

## Webhook URL Strategy

### Development
- Run Express backend locally on `http://localhost:3001`
- Expose via **ngrok**: `ngrok http 3001`
- Twilio webhook URL: `https://<ngrok-id>.ngrok-free.app/webhook/twilio`
- n8n runs locally on `http://localhost:5678`

### Production
- Deploy Express backend to a server with a stable HTTPS URL
- Set `APP_BASE_URL` in `.env` to the production domain
- Twilio webhook URL: `https://yourdomain.com/webhook/twilio`
- n8n runs on its own subdomain or server: `https://n8n.yourdomain.com`
- Set `N8N_WEBHOOK_BASE_URL` accordingly

> Note: Twilio requires HTTPS for all production webhooks.
> During development, ngrok provides a free HTTPS tunnel.
> The Twilio console must be updated whenever the ngrok URL changes (ngrok free plan generates a new URL each session).

---

## Call State Machine

States stored in the `calls.current_state` column:

```
LANGUAGE_MENU → MAIN_MENU_EN / MAIN_MENU_HI / MAIN_MENU_ZH
     │
     └─► SERVICE_MENU_NEW
              │
              └─► COLLECT_REQUIRED_FIELDS
                        │
                        ├─► QUOTE_RESULT
                        │        └─► CHECK_AVAILABILITY
                        │                  └─► CONFIRM_SLOT
                        │                            └─► CREATE_BOOKING → END_CALL
                        │
                        └─► IDENTIFY_BOOKING_CANCEL
                                  └─► CANCEL_CONFIRM
                                            └─► CANCEL_BOOKING → END_CALL

CALLBACK_REQUEST → END_CALL
```

---

## Business Configuration

Each business stores its configuration as JSONB in `businesses.config`:

```json
{
  "languages": ["en", "hi", "zh"],
  "provider_daily_summary_time": "16:30",
  "customer_reminder_hours_before": 24,
  "provider_reminder_hours_before": 24,
  "main_menu": {
    "1": "new_booking",
    "2": "check_availability",
    "3": "get_quote",
    "4": "change_booking",
    "5": "cancel_booking",
    "6": "leave_message"
  }
}
```

This allows one codebase to serve both car detailing and cleaning businesses without code changes.

---

## n8n Workflows (planned)

| # | Name | Trigger | Purpose |
|---|------|---------|---------|
| 1 | `twilio-incoming-call-router` | Twilio POST webhook | Main IVR router |
| 2 | `quote-and-availability` | Called by workflow 1 | Quote + 3 slot generation |
| 3 | `create-booking` | Called by workflow 1 | Write booking + Google Calendar |
| 4 | `cancel-booking` | Called by workflow 1 | Cancel + notify |
| 5 | `customer-reminders` | Hourly schedule | 24h customer reminder |
| 6 | `provider-reminders` | Hourly schedule | 24h provider reminder |
| 7 | `provider-summary-1630` | Daily 4:30 PM AEST | Tomorrow's bookings email |
