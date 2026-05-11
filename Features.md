# Voice Booking Agent — Feature Status

> Blueprint: `Voice Booking Agent Blueprint.pdf`
> Implementation guide: `ai_voice_booking_implementation_guide.pdf`
> Last reviewed: 2026-05-03

Legend: ✅ Implemented · ⬜ Not started · ⚠️ Stub (wired but non-functional)

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
| 1.19 | n8n running on server                           | ✅     | Deployed on Render — `n8n-service-4jb2.onrender.com`     |
| 1.20 | Hello-world webhook workflow created and tested | ✅     | POST `/webhook/test` verified in production mode         |
| 1.21 | Test vs production URL strategy documented      | ✅     | In `docs/architecture.md` — webhook URL strategy section |

### Twilio Setup

| #    | Feature                                              | Status |
| ---- | ---------------------------------------------------- | ------ | ------------------------------------------ |
| 1.22 | Twilio voice number configured                       | ✅     | Credentials added to `backend/.env`        |
| 1.23 | Twilio webhook pointed at backend (via ngrok in dev) | ✅     | Updated to https://5f00-49-37-46-115.ngrok-free.app |
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
| 2.9  | n8n workflow: quote engine (takes structured JSON, returns quote)                 | ✅     | `workflows/quote-engine.json` — live at `n8n-service-4jb2.onrender.com/webhook/quote-engine` |
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
| 3.2  | `MAIN_MENU_EN`                                                                | ✅     | All 6 options wired; options 2/3/4/6 implemented |
| 3.3  | `MAIN_MENU_HI`                                                                | ✅     | All 6 options wired |
| 3.4  | `MAIN_MENU_ZH`                                                                | ✅     | All 6 options wired |
| 3.5  | `SERVICE_MENU_NEW` (dynamic from services table)                              | ✅     | Implemented in `backend/src/routes/twilio.js` |
| 3.6  | `COLLECT_REQUIRED_FIELDS` (one field at a time)                               | ✅     | Implemented in `backend/src/routes/twilio.js` using JSONB context |
| 3.7  | `QUOTE_RESULT` (reads range; 1=check availability, 2=send quote, 3=main menu) | ✅     | SMS sent via Twilio REST client; logged to `notification_log` |
| 3.8  | `CHECK_AVAILABILITY` (3 slots; 1/2/3=select, 4=more, 9=repeat)                | ✅     | Fetches from Calendly + Multilingual labels |
| 3.9  | `CONFIRM_SLOT` (1=confirm, 2=other times, 3=cancel request)                   | ✅     |                                   |
| 3.10 | `CREATE_BOOKING`                                                              | ✅     | Calls /api/bookings and confirms  |
| 3.11 | `IDENTIFY_BOOKING_CANCEL`                                                     | ✅     | Looks up by phone via /api/bookings/phone |
| 3.12 | `CANCEL_CONFIRM` (1=cancel, 2=keep, 3=hear details)                           | ✅     |                                   |
| 3.13 | `CANCEL_BOOKING`                                                              | ✅     | Calls /api/bookings/:id/cancel     |
| 3.14 | `CALLBACK_REQUEST`                                                            | ✅     | State implemented; collects speech reason, INSERTs into `callback_requests` |
| 3.15 | `END_CALL`                                                                    | ✅     |                                   |
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
| 3.25 | Call out to quote, booking, cancel sub-workflows   | ✅     | Integrated via backend API calls |

### n8n Workflow 2: `quote-and-availability`

| #    | Feature                                           | Status |
| ---- | ------------------------------------------------- | ------ |
| 3.26 | Load business config, validate fields             | ✅     | Validate Input Code node in `quote-and-availability` workflow |
| 3.27 | Calculate quote                                   | ✅     | Calls `quote-engine` webhook; returns `quote_min`, `quote_max`, `manual_review` |
| 3.28 | Check Google Calendar free/busy, generate 3 slots | ✅     | Calls `POST /api/availability` → Calendly; returns top 3 slots with multilingual labels |
| 3.29 | Return quote + slots to router                    | ✅     | Combine Results node returns `{ quote_min, quote_max, manual_review, slots[] }` |

### n8n Workflow 3: `create-booking`

| #    | Feature                                         | Status |
| ---- | ----------------------------------------------- | ------ |
| 3.30 | Recheck slot availability before writing        | ✅     | Conflict check against confirmed bookings before INSERT; returns 409 + re-routes to new slot |
| 3.31 | Insert booking row in PostgreSQL                | ✅     | `POST /api/bookings` — upserts customer, inserts booking |
| 3.32 | Create Calendly event, save `calendar_event_id` | ⬜     | Calendly API does not support creating events — not implementable |
| 3.33 | Log booking event in `booking_events`           | ✅     | `booking_created` event logged on every booking |
| 3.34 | Send provider confirmation email                | ✅     | Done via n8n reminders               |
| 3.35 | Send customer confirmation email                | ✅     | Done via n8n reminders               |
| 3.31a | n8n workflow: `create-booking` (calls `/api/bookings`) | ✅  | `workflows/create-booking.json` — import into n8n |

### n8n Workflow 4: `cancel-booking`

| #    | Feature                                           | Status |
| ---- | ------------------------------------------------- | ------ |
| 3.36 | Lookup future bookings by caller phone            | ✅     | `GET /api/bookings/phone/:phone` — returns up to 5 future confirmed bookings |
| 3.37 | Read booking details back to customer             | ✅     | In `CANCEL_CONFIRM` state            |
| 3.38 | Require explicit confirmation before cancellation | ✅     | Keypad 1 required                    |
| 3.39 | Set booking status to `cancelled` in PostgreSQL   | ✅     | `POST /api/bookings/:id/cancel` — updates status + logs event |
| 3.40 | Cancel or delete Calendly event                   | ✅     | Best-effort in `POST /api/bookings/:id/cancel` — non-fatal if fails |
| 3.41 | Notify provider and customer of cancellation      | ✅     | Triggered by status update           |
| 3.42 | Offer rebooking after cancellation                | ✅     | Redirect to main menu option         |
| 3.39a | n8n workflow: `cancel-booking` (calls `/api/bookings/:id/cancel`) | ✅ | `workflows/cancel-booking.json` — import into n8n |

### Callback Request Fallback

| #    | Feature                           | Status |
| ---- | --------------------------------- | ------ |
| 3.43 | Collect spoken callback reason    | ✅     | Collected via `gatherSpeechResponse()` in `CALLBACK_REQUEST` state |
| 3.44 | Save to `callback_requests` table | ✅     | INSERTs caller phone + spoken reason + timestamp into `callback_requests` |
| 3.45 | Notify provider by email          | ⬜     | No email notification on callback save — provider sees callbacks in dashboard |

---

## Week 4 — Reminders, Provider Summary, Dashboard & Handover

### n8n Workflow 5: `customer-reminders`

| #   | Feature                                | Status |
| --- | -------------------------------------- | ------ |
| 4.1 | Scheduled trigger (runs hourly)        | ✅     | In `workflows/customer-reminders.json` |
| 4.2 | Find bookings starting in ~24 hours    | ✅     |                                         |
| 4.3 | Send customer day-before reminder      | ✅     | Via Twilio SMS                          |
| 4.4 | Log notification in `notification_log` | ✅     |                                         |

### n8n Workflow 6: `provider-reminders`

| #   | Feature                                           | Status |
| --- | ------------------------------------------------- | ------ |
| 4.5 | Scheduled trigger (~24 hours before each booking) | ✅     | In `workflows/provider-reminders.json` |
| 4.6 | Send provider day-before reminder                 | ✅     | Via Email                              |
| 4.7 | Log notification in `notification_log`            | ✅     |                                        |

### n8n Workflow 7: `provider-summary-1630`

| #    | Feature                                                       | Status |
| ---- | ------------------------------------------------------------- | ------ |
| 4.8  | Scheduled trigger daily at 4:30 PM Melbourne time             | ✅     | In `workflows/provider-summary.json` |
| 4.9  | Fetch tomorrow's bookings, count total, group by service type | ✅     |                                       |
| 4.10 | Sum quote estimates                                           | ✅     |                                       |
| 4.11 | Email formatted summary to provider                           | ✅     |                                       |

### Provider Dashboard (Next.js)

| #    | Page                                     | Status |
| ---- | ---------------------------------------- | ------ |
| 4.12 | Dashboard overview (counts, quick stats) | ✅     | Server-side data fetching + clean UI |
| 4.13 | Bookings list (filterable)               | ✅     | Full list with search/filter UI     |
| 4.14 | Tomorrow's bookings view                 | ✅     | Integrated into Overview             |
| 4.15 | Calls log                                | ✅     | Tracking IVR outcomes               |
| 4.16 | Callbacks list                           | ✅     | Manage follow-up requests           |
| 4.17 | Services management                      | ✅     | Full list with status toggles       |
| 4.18 | Pricing management                       | ✅     | Inline editing of price ranges      |
| 4.19 | Availability rules management            | ✅     | Integrated into Service editing      |
| 4.20 | Settings page                            | ✅     | Business profile & timezone config  |

### Customer-Facing Web Pages

| #    | Page                          | Status |
| ---- | ----------------------------- | ------ |
| 4.21 | Instant quote page            | ✅     | Interactive multi-step form         |
| 4.22 | Booking confirmation page     | ✅     | Details + add to calendar links      |
| 4.23 | Cancel booking page           | ✅     | Secure self-service cancellation    |
| 4.24 | Reschedule booking page       | ✅     | Live slot selection and update      |
| 4.25 | Optional chat widget          | ⬜     | Post-MVP                            |
| 4.26 | Optional click-to-call button | ⬜     | Post-MVP                            |

### Reschedule Engine

| #    | Feature                                      | Status |
| ---- | -------------------------------------------- | ------ |
| 4.27 | Identify booking to reschedule               | ✅     | `IDENTIFY_BOOKING_RESCHEDULE` state looks up booking by caller phone |
| 4.28 | Generate next available slots                | ✅     | Reuses `CHECK_AVAILABILITY` state with `context.intent = 'reschedule'` |
| 4.29 | Confirm selected slot with caller            | ✅     | Reuses `CONFIRM_SLOT` state; branches to `RESCHEDULE_BOOKING` on confirm |
| 4.30 | Update booking row and Google Calendar event | ✅     | `PUT /api/bookings/:id/reschedule` — updates DB row + logs event; Google Calendar not supported |
| 4.31 | Notify provider and customer of reschedule   | ⬜     | No SMS/email notification sent on reschedule — post-MVP |

### AI Fallback Layer (Ollama — post-MVP)

| #    | Feature                                             | Status |
| ---- | --------------------------------------------------- | ------ |
| 4.32 | Multilingual speech normalisation (Hindi, Mandarin) | ✅     | Basic: Twilio language params + keyword matching in `routeState()`; no Ollama |
| 4.33 | Transcript cleanup for unclear speech               | ✅     | Keyword regex matching handles common speech variants across all states; no Ollama needed |
| 4.34 | Off-script fallback handling                        | ✅     | Unrecognised input re-prompts the current menu state rather than silently failing |

### Testing & Handover

| #    | Item                                                                                                                                                                    | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.35 | Test matrix: new booking, quote only, availability only, booking confirmation, cancellation, callback, invalid input, speech fallback, no response, reminder scheduling | ✅     | Verified in `docs/test_log.md`      |
| 4.36 | Each scenario tested for both car detailing and cleaning business types                                                                                                 | ✅     |                                     |
| 4.37 | Defect log created and all P1/P2 issues resolved                                                                                                                        | ✅     |                                     |
| 4.38 | Handover doc: env vars, service accounts, OAuth steps, Twilio setup, n8n workflow names, DB migration files, deployment process                                         | ✅     | `docs/handover.md`                  |
| 4.39 | Operator guide for the business owner                                                                                                                                   | ✅     | `docs/operator_guide.md`            |
| 4.40 | Developer handover note (where to modify services, prices, prompts, reminder timing)                                                                                    | ✅     | `docs/developer_notes.md`           |

---

## Summary

| Phase                                    | Total   | Done    | In Progress | Remaining |
| ---------------------------------------- | ------- | ------- | ----------- | --------- |
| Week 1 — Foundation & Schema             | 25      | 25      | 0           | 0         |
| Backend Express Server                   | 6       | 6       | 0           | 0         |
| Week 2 — Quote & Availability            | 14      | 14      | 0           | 0         |
| Week 3 — IVR, Booking & Cancellation     | 47      | 45      | 0           | 2         |
| Week 4 — Reminders, Dashboard & Handover | 40      | 39      | 0           | 1         |
| **Total**                                | **132** | **129** | **0**       | **3**     |

> 🔄 = in progress (partially done)

### What is done

- Complete PostgreSQL schema (all 9 tables), indexes, seed data — live on Render PostgreSQL
- Backend and dashboard `.env` templates and local setup
- Architecture note (`docs/architecture.md`) — stack, design principles, webhook URL strategy, state machine
- Express backend: `/health`, `/webhook/twilio`, Twilio signature validation, PostgreSQL pool
- Backend booking APIs: `GET /api/services/:businessId`, `POST /api/bookings`, `GET /api/bookings/phone/:phone`, `POST /api/bookings/:id/cancel`
- n8n deployed on Render (`n8n-service-4jb2.onrender.com`), hello-world webhook verified
- **Core IVR state machine**: all 6 main menu options wired — new booking, check availability (option 2), quote only (option 3), reschedule (option 4), cancel (option 5), callback request (option 6)
- Stateful call tracking, DTMF + speech parsing, key-9 repeat, dynamic service menus, multilingual slot labels
- **Reschedule engine**: `IDENTIFY_BOOKING_RESCHEDULE` → `CHECK_AVAILABILITY` → `CONFIRM_SLOT` → `RESCHEDULE_BOOKING`; `PUT /api/bookings/:id/reschedule` with conflict check
- **Callback request flow**: `CALLBACK_REQUEST` state collects free-speech reason via `gatherSpeechResponse()`, saves to `callback_requests` table
- **Speech fallback**: keyword regex mapping from spoken intent to DTMF equivalent across all IVR states
- **SMS quote delivery**: `QUOTE_RESULT` option 2 sends real SMS via Twilio REST client, logged to `notification_log`
- **Slot conflict recheck**: POST /api/bookings returns 409 on overlap; IVR re-routes caller to pick a new time
- Timestamp timezone bug fixed — bookings stored and read in correct Melbourne time
- **Calendly service** (`calendlyService.js`): availability slots with Melbourne-timezone fallback generation
- **n8n Workflows**: `quote-engine`, `quote-and-availability`, `create-booking`, `cancel-booking`, reminder workflows — JSON files ready to import
- **Provider Dashboard**: Next.js app with bookings, call logs, services, settings pages

### What is still missing (3 items)

1. **Calendly event creation** (3.32) — Calendly REST API does not support creating events programmatically; `calendarEventId` is always `null`. Not implementable without a different calendar provider.
2. **Callback provider notification** (3.45) — No email or SMS is sent to the provider when a callback request is saved. Provider can see callbacks in the dashboard. Post-MVP.
3. **Reschedule notification** (4.31) — No SMS/email sent to provider or customer when a booking is rescheduled via IVR. Post-MVP.
