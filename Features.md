# Voice Booking Agent — Feature Status

> Blueprint: `Voice Booking Agent Blueprint.pdf`
> Implementation guide: `ai_voice_booking_implementation_guide.pdf`
> Last reviewed: 2026-04-11

Legend: ✅ Implemented · ⬜ Not started

---

## Week 1 — Foundation, Environment & Schema

### Project Structure & Environment
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | Git repository with `/backend`, `/workflows`, `/dashboard`, `/docs`, `/sql` folders | ✅ | Folder structure present in repo |
| 1.2 | Backend `.env` template (Twilio, Google, DB, Email, AI) | ✅ | `backend/.env.sample` — simplified to `DATABASE_URL` only |
| 1.3 | Dashboard `.env` template | ✅ | `dashboard/.env.sample` |
| 1.4 | `.gitignore` covering secrets, node_modules, build outputs, tokens | ✅ | `.gitignore` |
| 1.5 | Architecture note (stack + deterministic vs AI logic split) | ✅ | `docs/architecture.md` |

### PostgreSQL Schema (`sql/001_schema.sql`)
| # | Table | Status | Notes |
|---|-------|--------|-------|
| 1.6 | `businesses` table | ✅ | Includes `config JSONB` field |
| 1.7 | `services` table (multilingual: `name_en`, `name_hi`, `name_zh`) | ✅ | Fixed seed bug: CERAMIC row column mismatch |
| 1.8 | `customers` table | ✅ | |
| 1.9 | `bookings` table | ✅ | Includes `calendar_event_id` |
| 1.10 | `calls` table (stateful, with `current_state`) | ✅ | |
| 1.11 | `booking_events` table | ✅ | |
| 1.12 | `availability_rules` table | ✅ | |
| 1.13 | `notification_log` table | ✅ | |
| 1.14 | `callback_requests` table | ✅ | |
| 1.15 | Indexes (call SID, caller phone, booking status, booking date) | ✅ | |
| 1.16 | Seed: demo car detailing business + services + availability rules | ✅ | "Shine Mobile Detailing" |
| 1.17 | Seed: demo cleaning business + services + availability rules | ✅ | "SparkClean Services" |
| 1.18 | Business config stored as JSONB (languages, menu, reminder timing) | ✅ | Embedded in seed data |
| 1.18a | Schema applied to Render PostgreSQL database | ✅ | Live on `singapore-postgres.render.com` |

### n8n Setup
| # | Feature | Status |
|---|---------|--------|
| 1.19 | n8n running locally or on test server | ⬜ |
| 1.20 | Hello-world webhook workflow | ⬜ |
| 1.21 | Test vs production URL strategy documented | ✅ | In `docs/architecture.md` — webhook URL strategy section |

### Twilio Setup
| # | Feature | Status |
|---|---------|--------|
| 1.22 | Twilio voice number configured | ✅ | Credentials added to `backend/.env` |
| 1.23 | Twilio webhook pointed at backend (via ngrok in dev) | ⬜ | Needs ngrok tunnel + Twilio console update |
| 1.24 | Basic TwiML response verified on a real phone call | ⬜ | Pending ngrok setup |

---

## Backend Express Server (Telephony / API Layer)

> Note: The blueprint specifies n8n for webhook handling. We implemented an Express.js backend as the telephony/API layer that handles TwiML responses directly. n8n will be used for the business logic sub-workflows (quote, booking, cancellation, reminders).

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| B1 | Express server entry point with `/health` and `/webhook/twilio` | ✅ | `backend/src/index.js` |
| B2 | PostgreSQL connection pool (auto SSL for Render) | ✅ | `backend/src/db.js` |
| B3 | Twilio signature validation middleware | ✅ | `backend/src/middleware/twilioValidation.js` |
| B4 | IVR call router (`backend/src/routes/twilio.js`) | ✅ | Stateful — reads/writes `calls` table |
| B5 | `/health` endpoint verified against live Render DB | ✅ | Returns `{"status":"ok","db_time":"..."}` |

---

## Week 2 — Quote Engine, Availability Engine & Core Logic

### Quote Engine
| # | Feature | Status |
|---|---------|--------|
| 2.1 | Car detailing quote rules (service type, vehicle type, condition, add-ons, suburb/travel fee) | ⬜ |
| 2.2 | Cleaning quote rules (service type, property type, bedrooms, bathrooms, extras, suburb/travel fee, frequency) | ⬜ |
| 2.3 | Returns `quote_min`, `quote_max`, and `manual_review` flag | ⬜ |

### Availability Engine
| # | Feature | Status |
|---|---------|--------|
| 2.4 | Google Calendar OAuth credentials created and connected | ⬜ |
| 2.5 | `freeBusy.query` used to read provider busy blocks | ⬜ |
| 2.6 | Available slots generated from calendar + availability rules + service duration | ⬜ |
| 2.7 | Returns top 3 valid slots with `slot_start` / `slot_end` | ⬜ |
| 2.8 | Spoken labels generated for English, Hindi, and Mandarin | ⬜ |

### n8n Workflows (Week 2)
| # | Feature | Status |
|---|---------|--------|
| 2.9 | n8n workflow: quote engine (takes structured JSON, returns quote) | ⬜ |
| 2.10 | n8n workflow: availability engine (takes duration + date window, returns 3 slots) | ⬜ |
| 2.11 | Test results stored in PostgreSQL for traceability | ⬜ |

### Local AI Service (Ollama)
| # | Feature | Status |
|---|---------|--------|
| 2.12 | Ollama installed and local API accessible | ⬜ |
| 2.13 | Helper service normalises speech/free-text into structured fields | ⬜ |

---

## Week 3 — Twilio Call State Machine, Booking & Cancellation

### IVR / Call State Machine
| # | State | Status | Notes |
|---|-------|--------|-------|
| 3.1 | `LANGUAGE_MENU` (English / Hindi / Mandarin / 9=repeat) | ✅ | In `backend/src/routes/twilio.js` |
| 3.2 | `MAIN_MENU_EN` | ✅ | |
| 3.3 | `MAIN_MENU_HI` | ✅ | |
| 3.4 | `MAIN_MENU_ZH` | ✅ | |
| 3.5 | `SERVICE_MENU_NEW` (dynamic from services table) | ⬜ | |
| 3.6 | `COLLECT_REQUIRED_FIELDS` (one field at a time) | ⬜ | |
| 3.7 | `QUOTE_RESULT` (reads range; 1=check availability, 2=send quote, 3=main menu) | ⬜ | |
| 3.8 | `CHECK_AVAILABILITY` (3 slots; 1/2/3=select, 4=more, 9=repeat) | ⬜ | |
| 3.9 | `CONFIRM_SLOT` (1=confirm, 2=other times, 3=cancel request) | ⬜ | |
| 3.10 | `CREATE_BOOKING` | ⬜ | |
| 3.11 | `IDENTIFY_BOOKING_CANCEL` | ⬜ | |
| 3.12 | `CANCEL_CONFIRM` (1=cancel, 2=keep, 3=hear details) | ⬜ | |
| 3.13 | `CANCEL_BOOKING` | ⬜ | |
| 3.14 | `CALLBACK_REQUEST` | ⬜ | |
| 3.15 | `END_CALL` | ⬜ | |
| 3.16 | `current_state` stored in `calls` table, updated on every transition | ✅ | Tested and verified |
| 3.17 | Both DTMF digits and `SpeechResult` parsed | ✅ | Speech fallback in `routeState()` |
| 3.18 | Key 9 repeats current menu in all states | ✅ | Tested and verified |

### Twilio Router (Express — replaces n8n Workflow 1 for TwiML layer)
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.19 | Webhook receives Twilio POST, normalises payload | ✅ | `CallSid`, `From`, `To`, `Digits`, `SpeechResult` |
| 3.20 | Lookup call by `CallSid`; create call row if new | ✅ | Business matched by Twilio number |
| 3.21 | Load active call context; route by `current_state` | ✅ | |
| 3.22 | Build TwiML for language menu and all main menus | ✅ | Service/booking menus pending (Week 3 cont.) |
| 3.23 | Parse user selection (digits + speech fallback) | ✅ | `routeState()` function |
| 3.24 | Update call state in DB after each valid action | ✅ | |
| 3.25 | Call out to quote, booking, cancel sub-workflows | ⬜ | Requires Week 2 engines first |

### n8n Workflow 2: `quote-and-availability`
| # | Feature | Status |
|---|---------|--------|
| 3.26 | Load business config, validate fields | ⬜ |
| 3.27 | Calculate quote | ⬜ |
| 3.28 | Check Google Calendar free/busy, generate 3 slots | ⬜ |
| 3.29 | Return quote + slots to router | ⬜ |

### n8n Workflow 3: `create-booking`
| # | Feature | Status |
|---|---------|--------|
| 3.30 | Recheck slot availability before writing | ⬜ |
| 3.31 | Insert booking row in PostgreSQL | ⬜ |
| 3.32 | Create Google Calendar event, save `calendar_event_id` | ⬜ |
| 3.33 | Log booking event in `booking_events` | ⬜ |
| 3.34 | Send provider confirmation email | ⬜ |
| 3.35 | Send customer confirmation email | ⬜ |

### n8n Workflow 4: `cancel-booking`
| # | Feature | Status |
|---|---------|--------|
| 3.36 | Lookup future bookings by caller phone | ⬜ |
| 3.37 | Read booking details back to customer | ⬜ |
| 3.38 | Require explicit confirmation before cancellation | ⬜ |
| 3.39 | Set booking status to `cancelled` in PostgreSQL | ⬜ |
| 3.40 | Update or delete Google Calendar event | ⬜ |
| 3.41 | Notify provider and customer of cancellation | ⬜ |
| 3.42 | Offer rebooking after cancellation | ⬜ |

### Callback Request Fallback
| # | Feature | Status |
|---|---------|--------|
| 3.43 | Collect spoken callback reason | ⬜ |
| 3.44 | Save to `callback_requests` table | ⬜ |
| 3.45 | Notify provider by email | ⬜ |

---

## Week 4 — Reminders, Provider Summary, Dashboard & Handover

### n8n Workflow 5: `customer-reminders`
| # | Feature | Status |
|---|---------|--------|
| 4.1 | Scheduled trigger (runs hourly) | ⬜ |
| 4.2 | Find bookings starting in ~24 hours | ⬜ |
| 4.3 | Send customer day-before reminder | ⬜ |
| 4.4 | Log notification in `notification_log` | ⬜ |

### n8n Workflow 6: `provider-reminders`
| # | Feature | Status |
|---|---------|--------|
| 4.5 | Scheduled trigger (~24 hours before each booking) | ⬜ |
| 4.6 | Send provider day-before reminder | ⬜ |
| 4.7 | Log notification in `notification_log` | ⬜ |

### n8n Workflow 7: `provider-summary-1630`
| # | Feature | Status |
|---|---------|--------|
| 4.8 | Scheduled trigger daily at 4:30 PM Melbourne time | ⬜ |
| 4.9 | Fetch tomorrow's bookings, count total, group by service type | ⬜ |
| 4.10 | Sum quote estimates | ⬜ |
| 4.11 | Email formatted summary to provider | ⬜ |

### Provider Dashboard (Next.js)
| # | Page | Status |
|---|------|--------|
| 4.12 | Dashboard overview (counts, quick stats) | ⬜ |
| 4.13 | Bookings list (filterable) | ⬜ |
| 4.14 | Tomorrow's bookings view | ⬜ |
| 4.15 | Calls log | ⬜ |
| 4.16 | Callbacks list | ⬜ |
| 4.17 | Services management | ⬜ |
| 4.18 | Pricing management | ⬜ |
| 4.19 | Availability rules management | ⬜ |
| 4.20 | Settings page | ⬜ |

### Customer-Facing Web Pages
| # | Page | Status |
|---|------|--------|
| 4.21 | Instant quote page | ⬜ |
| 4.22 | Booking confirmation page | ⬜ |
| 4.23 | Cancel booking page | ⬜ |
| 4.24 | Reschedule booking page | ⬜ |
| 4.25 | Optional chat widget | ⬜ |
| 4.26 | Optional click-to-call button | ⬜ |

### Reschedule Engine
| # | Feature | Status |
|---|---------|--------|
| 4.27 | Identify booking to reschedule | ⬜ |
| 4.28 | Generate next available slots | ⬜ |
| 4.29 | Confirm selected slot with caller | ⬜ |
| 4.30 | Update booking row and Google Calendar event | ⬜ |
| 4.31 | Notify provider and customer of reschedule | ⬜ |

### AI Fallback Layer (Ollama — post-MVP)
| # | Feature | Status |
|---|---------|--------|
| 4.32 | Multilingual speech normalisation (Hindi, Mandarin) | ⬜ |
| 4.33 | Transcript cleanup for unclear speech | ⬜ |
| 4.34 | Off-script fallback handling | ⬜ |

### Testing & Handover
| # | Item | Status |
|---|------|--------|
| 4.35 | Test matrix: new booking, quote only, availability only, booking confirmation, cancellation, callback, invalid input, speech fallback, no response, reminder scheduling | ⬜ |
| 4.36 | Each scenario tested for both car detailing and cleaning business types | ⬜ |
| 4.37 | Defect log created and all P1/P2 issues resolved | ⬜ |
| 4.38 | Handover doc: env vars, service accounts, OAuth steps, Twilio setup, n8n workflow names, DB migration files, deployment process | ⬜ |
| 4.39 | Operator guide for the business owner | ⬜ |
| 4.40 | Developer handover note (where to modify services, prices, prompts, reminder timing) | ⬜ |

---

## Summary

| Phase | Total | Done | Remaining |
|-------|-------|------|-----------|
| Week 1 — Foundation & Schema | 25 | 22 | 3 |
| Backend Express Server | 5 | 5 | 0 |
| Week 2 — Quote & Availability | 13 | 0 | 13 |
| Week 3 — IVR, Booking & Cancellation | 27 | 13 | 14 |
| Week 4 — Reminders, Dashboard & Handover | 31 | 0 | 31 |
| **Total** | **101** | **40** | **61** |

### What is done
- Complete PostgreSQL schema (all 9 tables) with indexes and seed data, applied to live Render DB
- Backend and dashboard `.env` templates (simplified to `DATABASE_URL`)
- Architecture note with stack overview, design principles, webhook URL strategy, state machine diagram
- Express backend server: `/health`, `/webhook/twilio`, Twilio signature validation, PostgreSQL pool
- IVR states: `LANGUAGE_MENU`, `MAIN_MENU_EN`, `MAIN_MENU_HI`, `MAIN_MENU_ZH` — all tested
- Stateful call tracking: `calls` table updated on every transition
- DTMF + speech input parsing, key-9 repeat on all current menus

### What is next (in order)
1. **Finish Week 1:** Expose server via ngrok, point Twilio console webhook at it, verify on a real phone (1.23, 1.24)
2. **Week 2:** Quote engine, Google Calendar OAuth + availability engine, n8n setup
3. **Week 3 (cont.):** `SERVICE_MENU_NEW`, `COLLECT_REQUIRED_FIELDS`, booking/cancellation states, sub-workflow integration
4. **Week 4:** Reminders, provider summary, Next.js dashboard
5. **Post-MVP:** Reschedule flow, customer web pages, AI fallback layer
