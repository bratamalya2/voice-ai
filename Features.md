# Voice Booking Agent — Feature Status

> Blueprint: `Voice Booking Agent Blueprint.pdf`
> Implementation guide: `ai_voice_booking_implementation_guide.pdf`
> Last reviewed: 2026-04-14

Legend: ✅ Implemented · ⬜ Not started

---

## Week 1 — Foundation, Environment & Schema

### Project Structure & Environment

| #   | Feature                                                                             | Status | Notes                                                     |
| --- | ----------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| 1.1 | Git repository with `/backend`, `/workflows`, `/dashboard`, `/docs`, `/sql` folders | ✅     | Folder structure present in repo                          |
| 1.2 | Backend `.env` template (Twilio, Google, DB, Email, AI)                             | ✅     | `backend/.env.sample` — simplified to `DATABASE_URL` only |
| 1.3 | Dashboard `.env` template                                                           | ✅     | `dashboard/.env.sample`                                   |
| 1.4 | `.gitignore` covering secrets, node_modules, build outputs, tokens                  | ✅     | `.gitignore`                                              |
| 1.5 | Architecture note (stack + deterministic vs AI logic split)                         | ✅     | `docs/architecture.md`                                    |

### PostgreSQL Schema (`sql/001_schema.sql`)

| #     | Table                                                              | Status | Notes                                       |
| ----- | ------------------------------------------------------------------ | ------ | ------------------------------------------- |
| 1.6   | `businesses` table                                                 | ✅     | Includes `config JSONB` field               |
| 1.7   | `services` table (multilingual: `name_en`, `name_hi`, `name_zh`)   | ✅     | Fixed seed bug: CERAMIC row column mismatch |
| 1.8   | `customers` table                                                  | ✅     |                                             |
| 1.9   | `bookings` table                                                   | ✅     | Includes `calendar_event_id`                |
| 1.10  | `calls` table (stateful, with `current_state`)                     | ✅     |                                             |
| 1.11  | `booking_events` table                                             | ✅     |                                             |
| 1.12  | `availability_rules` table                                         | ✅     |                                             |
| 1.13  | `notification_log` table                                           | ✅     |                                             |
| 1.14  | `callback_requests` table                                          | ✅     |                                             |
| 1.15  | Indexes (call SID, caller phone, booking status, booking date)     | ✅     |                                             |
| 1.16  | Seed: demo car detailing business + services + availability rules  | ✅     | "Shine Mobile Detailing"                    |
| 1.17  | Seed: demo cleaning business + services + availability rules       | ✅     | "SparkClean Services"                       |
| 1.18  | Business config stored as JSONB (languages, menu, reminder timing) | ✅     | Embedded in seed data                       |
| 1.18a | Schema applied to Render PostgreSQL database                       | ✅     | Live on `singapore-postgres.render.com`     |

### n8n Setup

| #    | Feature                                         | Status | Notes                                                    |
| ---- | ----------------------------------------------- | ------ | -------------------------------------------------------- |
| 1.19 | n8n running on server                           | ✅     | Deployed on Render — `n8n-uz06.onrender.com`             |
| 1.20 | Hello-world webhook workflow created and tested | ✅     | POST `/webhook/test` verified in production mode         |
| 1.21 | Test vs production URL strategy documented      | ✅     | In `docs/architecture.md` — webhook URL strategy section |

### Twilio Setup

| #    | Feature                                              | Status |
| ---- | ---------------------------------------------------- | ------ | ------------------------------------------ |
| 1.22 | Twilio voice number configured                       | ✅     | Credentials added to `backend/.env`        |
| 1.23 | Twilio webhook pointed at backend (via ngrok in dev) | ⬜     | Needs ngrok tunnel + Twilio console update |
| 1.24 | Basic TwiML response verified on a real phone call   | ⬜     | Pending ngrok setup                        |

---

## Backend Express Server (Telephony / API Layer)

> Note: The blueprint specifies n8n for webhook handling. We implemented an Express.js backend as the telephony/API layer that handles TwiML responses directly. n8n will be used for the business logic sub-workflows (quote, booking, cancellation, reminders).

| #   | Feature                                                         | Status | Notes                                                              |
| --- | --------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| B1  | Express server entry point with `/health` and `/webhook/twilio` | ✅     | `backend/src/index.js`                                             |
| B2  | PostgreSQL connection pool (auto SSL for Render)                | ✅     | `backend/src/db.js`                                                |
| B3  | Twilio signature validation middleware                          | ✅     | `backend/src/middleware/twilioValidation.js`                       |
| B4  | IVR call router (`backend/src/routes/twilio.js`)                | ✅     | Stateful — reads/writes `calls` table                              |
| B5  | `/health` endpoint verified against live Render DB              | ✅     | Returns `{"status":"ok","db_time":"..."}`                          |
| B6  | Calendly integration setup                                      | ✅     | `backend/src/services/calendlyService.js` — 7 functions, ready for n8n |

---

## Week 2 — Quote Engine, Availability Engine & Core Logic

### Quote Engine

| #   | Feature                                                                                                       | Status | Notes                                               |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| 2.1 | Car detailing quote rules (service type, vehicle type, condition, add-ons, suburb/travel fee)                 | ✅     | n8n `quote-engine` workflow — Code node             |
| 2.2 | Cleaning quote rules (service type, property type, bedrooms, bathrooms, extras, suburb/travel fee, frequency) | ✅     | n8n `quote-engine` workflow — Code node             |
| 2.3 | Returns `quote_min`, `quote_max`, and `manual_review` flag                                                    | ✅     | Tested: car detailing $410–$608, cleaning $320–$500 |

### Availability Engine

| #   | Feature                                                                      | Status | Notes                   |
| --- | ---------------------------------------------------------------------------- | ------ | ----------------------- |
| 2.4 | Calendly API credentials created and connected                               | ✅     | API key + User ID in `.env`        |
| 2.5 | Calendly `getAvailableSlots()` used to read available slots                  | ✅     | Service function implemented       |
| 2.6 | Available slots filtered by service duration                                 | ✅     | `filterSlotsByDuration()` ready    |
| 2.7 | Returns top 3 valid slots with `slot_start` / `slot_end`                     | ✅     | Format ready for IVR              |
| 2.8 | Spoken labels generated for English, Hindi, and Mandarin                     | ✅     | `slotLabelsService.js` — 3 languages |

### n8n Workflows (Week 2)

| #    | Feature                                                                           | Status | Notes                                                |
| ---- | --------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| 2.9  | n8n workflow: quote engine (takes structured JSON, returns quote)                 | ✅     | Live at `n8n-uz06.onrender.com/webhook/quote-engine` |
| 2.10 | n8n workflow: availability engine (takes duration + date window, returns 3 slots) | ✅     | Webhook + HTTP node, with spoken labels |
| 2.11 | Test results stored in PostgreSQL for traceability                                | ✅     | `workflowLoggingService.js` — auto-creates table |
| 2.14 | n8n workflow: `quote-and-availability` (combines both engines, single call)       | ✅     | `workflows/quote-and-availability.json` — import into n8n |

### Local AI Service (Ollama)

| #    | Feature                                                           | Status |
| ---- | ----------------------------------------------------------------- | ------ |
| 2.12 | Ollama installed and local API accessible                         | ⬜     |
| 2.13 | Helper service normalises speech/free-text into structured fields | ⬜     |

---

## Week 3 — Twilio Call State Machine, Booking & Cancellation

### IVR / Call State Machine

| #    | State                                                                         | Status | Notes                             |
| ---- | ----------------------------------------------------------------------------- | ------ | --------------------------------- |
| 3.1  | `LANGUAGE_MENU` (English / Hindi / Mandarin / 9=repeat)                       | ✅     | In `backend/src/routes/twilio.js` |
| 3.2  | `MAIN_MENU_EN`                                                                | ✅     |                                   |
| 3.3  | `MAIN_MENU_HI`                                                                | ✅     |                                   |
| 3.4  | `MAIN_MENU_ZH`                                                                | ✅     |                                   |
| 3.5  | `SERVICE_MENU_NEW` (dynamic from services table)                              | ⬜     |                                   |
| 3.6  | `COLLECT_REQUIRED_FIELDS` (one field at a time)                               | ⬜     |                                   |
| 3.7  | `QUOTE_RESULT` (reads range; 1=check availability, 2=send quote, 3=main menu) | ⬜     |                                   |
| 3.8  | `CHECK_AVAILABILITY` (3 slots; 1/2/3=select, 4=more, 9=repeat)                | ⬜     |                                   |
| 3.9  | `CONFIRM_SLOT` (1=confirm, 2=other times, 3=cancel request)                   | ⬜     |                                   |
| 3.10 | `CREATE_BOOKING`                                                              | ⬜     |                                   |
| 3.11 | `IDENTIFY_BOOKING_CANCEL`                                                     | ⬜     |                                   |
| 3.12 | `CANCEL_CONFIRM` (1=cancel, 2=keep, 3=hear details)                           | ⬜     |                                   |
| 3.13 | `CANCEL_BOOKING`                                                              | ⬜     |                                   |
| 3.14 | `CALLBACK_REQUEST`                                                            | ⬜     |                                   |
| 3.15 | `END_CALL`                                                                    | ⬜     |                                   |
| 3.16 | `current_state` stored in `calls` table, updated on every transition          | ✅     | Tested and verified               |
| 3.17 | Both DTMF digits and `SpeechResult` parsed                                    | ✅     | Speech fallback in `routeState()` |
| 3.18 | Key 9 repeats current menu in all states                                      | ✅     | Tested and verified               |

### Twilio Router (Express — replaces n8n Workflow 1 for TwiML layer)

| #    | Feature                                            | Status | Notes                                             |
| ---- | -------------------------------------------------- | ------ | ------------------------------------------------- |
| 3.19 | Webhook receives Twilio POST, normalises payload   | ✅     | `CallSid`, `From`, `To`, `Digits`, `SpeechResult` |
| 3.20 | Lookup call by `CallSid`; create call row if new   | ✅     | Business matched by Twilio number                 |
| 3.21 | Load active call context; route by `current_state` | ✅     |                                                   |
| 3.22 | Build TwiML for language menu and all main menus   | ✅     | Service/booking menus pending (Week 3 cont.)      |
| 3.23 | Parse user selection (digits + speech fallback)    | ✅     | `routeState()` function                           |
| 3.24 | Update call state in DB after each valid action    | ✅     |                                                   |
| 3.25 | Call out to quote, booking, cancel sub-workflows   | ⬜     | Requires Week 2 engines first                     |

### n8n Workflow 2: `quote-and-availability`

| #    | Feature                                           | Status |
| ---- | ------------------------------------------------- | ------ |
| 3.26 | Load business config, validate fields             | ⬜     |
| 3.27 | Calculate quote                                   | ⬜     |
| 3.28 | Check Google Calendar free/busy, generate 3 slots | ⬜     |
| 3.29 | Return quote + slots to router                    | ⬜     |

### n8n Workflow 3: `create-booking`

| #    | Feature                                         | Status |
| ---- | ----------------------------------------------- | ------ |
| 3.30 | Recheck slot availability before writing        | ⬜     |
| 3.31 | Insert booking row in PostgreSQL                | ✅     | `POST /api/bookings` — upserts customer, inserts booking |
| 3.32 | Create Calendly event, save `calendar_event_id` | ✅     | Best-effort in `POST /api/bookings` — non-fatal if fails |
| 3.33 | Log booking event in `booking_events`           | ✅     | `booking_created` event logged on every booking |
| 3.34 | Send provider confirmation email                | ⬜     |
| 3.35 | Send customer confirmation email                | ⬜     |
| 3.31a | n8n workflow: `create-booking` (calls `/api/bookings`) | ✅  | `workflows/create-booking.json` — import into n8n |

### n8n Workflow 4: `cancel-booking`

| #    | Feature                                           | Status |
| ---- | ------------------------------------------------- | ------ |
| 3.36 | Lookup future bookings by caller phone            | ✅     | `GET /api/bookings/phone/:phone` — returns up to 5 future confirmed bookings |
| 3.37 | Read booking details back to customer             | ⬜     |
| 3.38 | Require explicit confirmation before cancellation | ⬜     |
| 3.39 | Set booking status to `cancelled` in PostgreSQL   | ✅     | `POST /api/bookings/:id/cancel` — updates status + logs event |
| 3.40 | Cancel or delete Calendly event                   | ✅     | Best-effort in `POST /api/bookings/:id/cancel` — non-fatal if fails |
| 3.41 | Notify provider and customer of cancellation      | ⬜     |
| 3.42 | Offer rebooking after cancellation                | ⬜     |
| 3.39a | n8n workflow: `cancel-booking` (calls `/api/bookings/:id/cancel`) | ✅ | `workflows/cancel-booking.json` — import into n8n |

### Callback Request Fallback

| #    | Feature                           | Status |
| ---- | --------------------------------- | ------ |
| 3.43 | Collect spoken callback reason    | ⬜     |
| 3.44 | Save to `callback_requests` table | ⬜     |
| 3.45 | Notify provider by email          | ⬜     |

---

## Week 4 — Reminders, Provider Summary, Dashboard & Handover

### n8n Workflow 5: `customer-reminders`

| #   | Feature                                | Status |
| --- | -------------------------------------- | ------ |
| 4.1 | Scheduled trigger (runs hourly)        | ⬜     |
| 4.2 | Find bookings starting in ~24 hours    | ⬜     |
| 4.3 | Send customer day-before reminder      | ⬜     |
| 4.4 | Log notification in `notification_log` | ⬜     |

### n8n Workflow 6: `provider-reminders`

| #   | Feature                                           | Status |
| --- | ------------------------------------------------- | ------ |
| 4.5 | Scheduled trigger (~24 hours before each booking) | ⬜     |
| 4.6 | Send provider day-before reminder                 | ⬜     |
| 4.7 | Log notification in `notification_log`            | ⬜     |

### n8n Workflow 7: `provider-summary-1630`

| #    | Feature                                                       | Status |
| ---- | ------------------------------------------------------------- | ------ |
| 4.8  | Scheduled trigger daily at 4:30 PM Melbourne time             | ⬜     |
| 4.9  | Fetch tomorrow's bookings, count total, group by service type | ⬜     |
| 4.10 | Sum quote estimates                                           | ⬜     |
| 4.11 | Email formatted summary to provider                           | ⬜     |

### Provider Dashboard (Next.js)

| #    | Page                                     | Status |
| ---- | ---------------------------------------- | ------ |
| 4.12 | Dashboard overview (counts, quick stats) | ⬜     |
| 4.13 | Bookings list (filterable)               | ⬜     |
| 4.14 | Tomorrow's bookings view                 | ⬜     |
| 4.15 | Calls log                                | ⬜     |
| 4.16 | Callbacks list                           | ⬜     |
| 4.17 | Services management                      | ⬜     |
| 4.18 | Pricing management                       | ⬜     |
| 4.19 | Availability rules management            | ⬜     |
| 4.20 | Settings page                            | ⬜     |

### Customer-Facing Web Pages

| #    | Page                          | Status |
| ---- | ----------------------------- | ------ |
| 4.21 | Instant quote page            | ⬜     |
| 4.22 | Booking confirmation page     | ⬜     |
| 4.23 | Cancel booking page           | ⬜     |
| 4.24 | Reschedule booking page       | ⬜     |
| 4.25 | Optional chat widget          | ⬜     |
| 4.26 | Optional click-to-call button | ⬜     |

### Reschedule Engine

| #    | Feature                                      | Status |
| ---- | -------------------------------------------- | ------ |
| 4.27 | Identify booking to reschedule               | ⬜     |
| 4.28 | Generate next available slots                | ⬜     |
| 4.29 | Confirm selected slot with caller            | ⬜     |
| 4.30 | Update booking row and Google Calendar event | ⬜     |
| 4.31 | Notify provider and customer of reschedule   | ⬜     |

### AI Fallback Layer (Ollama — post-MVP)

| #    | Feature                                             | Status |
| ---- | --------------------------------------------------- | ------ |
| 4.32 | Multilingual speech normalisation (Hindi, Mandarin) | ⬜     |
| 4.33 | Transcript cleanup for unclear speech               | ⬜     |
| 4.34 | Off-script fallback handling                        | ⬜     |

### Testing & Handover

| #    | Item                                                                                                                                                                    | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.35 | Test matrix: new booking, quote only, availability only, booking confirmation, cancellation, callback, invalid input, speech fallback, no response, reminder scheduling | ⬜     |
| 4.36 | Each scenario tested for both car detailing and cleaning business types                                                                                                 | ⬜     |
| 4.37 | Defect log created and all P1/P2 issues resolved                                                                                                                        | ⬜     |
| 4.38 | Handover doc: env vars, service accounts, OAuth steps, Twilio setup, n8n workflow names, DB migration files, deployment process                                         | ⬜     |
| 4.39 | Operator guide for the business owner                                                                                                                                   | ⬜     |
| 4.40 | Developer handover note (where to modify services, prices, prompts, reminder timing)                                                                                    | ⬜     |

---

## Summary

| Phase                                    | Total   | Done   | In Progress | Remaining |
| ---------------------------------------- | ------- | ------ | ----------- | --------- |
| Week 1 — Foundation & Schema             | 25      | 24     | 0           | 1         |
| Backend Express Server                   | 6       | 6      | 0           | 0         |
| Week 2 — Quote & Availability            | 13      | 11     | 0           | 2         |
| Week 3 — IVR, Booking & Cancellation     | 27      | 13     | 0           | 14        |
| Week 4 — Reminders, Dashboard & Handover | 31      | 0      | 0           | 31        |
| **Total**                                | **102** | **54** | **0**       | **48**    |

> 🔄 = in progress (partially done)

### What is done

- Complete PostgreSQL schema (all 9 tables), indexes, seed data — live on Render PostgreSQL
- Backend and dashboard `.env` templates
- Architecture note (`docs/architecture.md`) — stack, design principles, webhook URL strategy, state machine
- Express backend: `/health`, `/webhook/twilio`, Twilio signature validation, PostgreSQL pool (Google OAuth route removed)
- n8n deployed on Render (`n8n-uz06.onrender.com`), hello-world webhook verified
- IVR states: `LANGUAGE_MENU`, `MAIN_MENU_EN`, `MAIN_MENU_HI`, `MAIN_MENU_ZH` — tested and working
- Stateful call tracking, DTMF + speech parsing, key-9 repeat
- **Quote engine** (n8n): car detailing + cleaning rules, tested for both business types
- **Calendly service** (`calendlyService.js`): 7 functions — getAvailableSlots, createEvent, cancelEvent, updateEvent, getEventDetails, filterSlotsByDuration, getUserUri
- Calendly credentials configured in `.env` (API key + User ID)
- Test script created (`testCalendlyService.js`) to verify integration
- **Backend API endpoint:** `POST /api/availability` — queries Calendly + filters slots
- **n8n workflow:** `availability-engine` — production-ready JSON workflow
- Test scripts created: `testAvailabilityAPI.js`, `testCalendlyService.js`
- Comprehensive documentation: `docs/N8N_SETUP.md`, `docs/N8N_IMPLEMENTATION.md`, `docs/CALENDLY_SERVICE.md`

### What is next (in order)

1. **Week 2 (cont.):** Build n8n `availability-engine` workflow (use Calendly slots + filtering)
2. **Week 1 finish:** Expose backend via ngrok, point Twilio webhook, verify on real phone (1.23, 1.24)
3. **Week 2 finish:** Build n8n `quote-and-availability` workflow combining both engines
4. **Week 3 (cont.):** `SERVICE_MENU_NEW`, `COLLECT_REQUIRED_FIELDS`, booking/cancellation states with n8n integration
5. **Week 3 (cont.):** Build n8n `create-booking` workflow (insert DB + create Calendly event)
6. **Week 3 (cont.):** Build n8n `cancel-booking` workflow (set status + delete Calendly event)
7. **Week 4:** Reminders, provider summary, Next.js dashboard
8. **Post-MVP:** Reschedule flow, customer web pages, AI fallback layer
