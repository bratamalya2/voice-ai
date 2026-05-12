# ServiceOS — Feature Status

> Primary reference: `serviceos-complete-build-guide.docx`
> Secondary reference: `Voice Booking Agent Blueprint.pdf`, `ai_voice_booking_implementation_guide.pdf`
> Last reviewed: 2026-05-11

Legend: ✅ Implemented · ⬜ Not started · ⚠️ Partial / Stub

---

## Week 1 — Foundation (Days 1–7)

### Day 1: Project Scaffold & Dependencies

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 1.1  | Next.js app running locally                                    | ✅     | Next.js 16.2.4 dashboard running |
| 1.2  | TypeScript strict mode configured                              | ⬜     | Using JavaScript, not TypeScript |
| 1.3  | Tailwind CSS configured                                        | ⬜     | Using custom CSS, not Tailwind |
| 1.4  | shadcn/ui components installed                                 | ⬜     | Using custom components |
| 1.5  | Drizzle ORM installed                                          | ⬜     | Using `pg` directly |
| 1.6  | Upstash Redis client installed                                 | ⬜     | Not installed |
| 1.7  | Clerk auth SDK installed                                       | ⬜     | No auth implemented |
| 1.8  | Stripe SDK installed                                           | ⬜     | Not installed |
| 1.9  | Twilio SDK installed                                           | ✅     | Backend uses Twilio SDK |
| 1.10 | Vitest testing framework installed                             | ⬜     | No test framework |
| 1.11 | `.env` template with all required variables                    | ✅     | `backend/.env` and `dashboard/.env` |
| 1.12 | `.gitignore` covering secrets, node_modules, build outputs     | ✅     | Present |
| 1.13 | Git repository initialised                                     | ✅     | Present |

### Day 2: Authentication Module

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 2.1  | Role type: owner / manager / staff / billing_admin / viewer    | ⬜     | No role system |
| 2.2  | Role hierarchy with numeric weights                            | ⬜     | |
| 2.3  | `canManageMember(actorRole, targetRole)` function              | ⬜     | |
| 2.4  | 29 permissions mapped to allowed roles                         | ⬜     | |
| 2.5  | `hasPermission(role, permission)` function                     | ⬜     | |
| 2.6  | `requirePermission(ctx, permission)` — throws ForbiddenError   | ⬜     | |
| 2.7  | `extractAuthContext()` reads Clerk auth state                  | ⬜     | |
| 2.8  | `withOrg(table, orgId)` ensures every query is tenant-scoped   | ⬜     | |
| 2.9  | ApiError, SlotUnavailableError, ForbiddenError, NotFoundError  | ⬜     | |
| 2.10 | Unit tests: 145 permission tests (29 permissions × 5 roles)    | ⬜     | |

### Day 3: Clerk Integration

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 3.1  | ClerkProvider wrapping the app                                 | ⬜     | No auth |
| 3.2  | Middleware protecting all routes except marketing/auth         | ⬜     | |
| 3.3  | Sign-up page (`/sign-up`)                                      | ⬜     | |
| 3.4  | Sign-in page (`/sign-in`)                                      | ⬜     | |
| 3.5  | Marketing landing page with CTAs                               | ⬜     | |
| 3.6  | Clerk Organizations enabled (multi-tenant)                     | ⬜     | |

### Day 4: Dashboard Layout

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 4.1  | Sidebar with grouped navigation (16 nav items)                 | ⚠️     | Basic sidebar with 6 links, not full 16 |
| 4.2  | Permission-filtered navigation (hides links by role)           | ⬜     | No role system |
| 4.3  | Dashboard header with OrganizationSwitcher + UserButton        | ⬜     | No Clerk integration |
| 4.4  | Mobile hamburger sidebar                                       | ⬜     | Responsive CSS only, no mobile sidebar |
| 4.5  | `PermissionGate` component                                     | ⬜     | |
| 4.6  | Dashboard layout redirects to sign-in if unauthenticated       | ⬜     | No auth guard |
| 4.7  | Active route highlighting in sidebar                           | ✅     | `NavLinks.js` with `usePathname()` |

### Day 5: Database Schema

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 5.1  | 20-table schema via Drizzle ORM                                | ⚠️     | 9 tables via raw SQL (not Drizzle) |
| 5.2  | `businesses` table                                             | ✅     | |
| 5.3  | `services` table (multilingual: en/hi/zh)                      | ✅     | |
| 5.4  | `customers` table                                              | ✅     | |
| 5.5  | `bookings` table                                               | ✅     | |
| 5.6  | `calls` table with `current_state` and `context` JSONB         | ✅     | |
| 5.7  | `booking_events` table                                         | ✅     | |
| 5.8  | `availability_rules` table                                     | ✅     | |
| 5.9  | `notification_log` table                                       | ✅     | |
| 5.10 | `callback_requests` table                                      | ✅     | |
| 5.11 | `organizations` table (Clerk multi-tenant)                     | ⬜     | Not needed with current non-Clerk setup |
| 5.12 | `members` table (roles per org)                                | ⬜     | |
| 5.13 | `pricing_rules` table                                          | ⬜     | |
| 5.14 | `blocked_slots` table                                          | ⬜     | |
| 5.15 | `calendar_configs` table (Google OAuth tokens)                 | ⬜     | |
| 5.16 | `phone_configs` table                                          | ⬜     | |
| 5.17 | `subscriptions` table (Stripe)                                 | ⬜     | |
| 5.18 | `usage_logs` table                                             | ⬜     | |
| 5.19 | All indexes applied                                            | ✅     | Present in `sql/001_schema.sql` |
| 5.20 | Schema live on cloud database                                  | ✅     | Live on Render PostgreSQL (Singapore) |

### Day 6: Seed Data + Clerk Webhooks

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 6.1  | Clerk webhook handler (`user.created`, `org.created`)          | ⬜     | No Clerk |
| 6.2  | Industry templates: Car Detailing (6 services)                 | ✅     | Seeded in `sql/001_schema.sql` |
| 6.3  | Industry templates: Cleaning (5 services)                      | ✅     | Seeded in `sql/001_schema.sql` |
| 6.4  | Dev seed script (test org + owner + services)                  | ⬜     | Seed embedded in schema SQL |

### Day 7: Week 1 Smoke Test

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 7.1  | Sign-up → dashboard flow works end to end                      | ⬜     | No auth flow |
| 7.2  | Database rows created on org signup                            | ⬜     | |

---

## Week 2 — Services & Engines (Days 8–14)

### Day 8: Services CRUD API

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 8.1  | `GET /api/services` — list with nested variants                | ✅     | `GET /api/services/:businessId` |
| 8.2  | `POST /api/services` — create (plan-gated by maxServices)      | ⚠️     | Create exists, no plan gating |
| 8.3  | `PATCH /api/services/:id`                                      | ✅     | Via dashboard edit page |
| 8.4  | `DELETE /api/services/:id`                                     | ⬜     | Not implemented |
| 8.5  | `apiHandler` wrapper with standard error format                | ⬜     | Manual error handling |
| 8.6  | Zod validation schemas for all inputs                          | ⬜     | No Zod |
| 8.7  | `requireCountableLimit` plan gating helper                     | ⬜     | |

### Day 9: Services Dashboard Page

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 9.1  | Services list page (`/services`)                               | ✅     | Shows all services with price/duration |
| 9.2  | Edit service page (`/services/:id`)                            | ✅     | Name, price, duration, active toggle |
| 9.3  | Plan limit indicator ("3/3 services used")                     | ⬜     | |
| 9.4  | Add service dialog                                             | ⬜     | No add-from-dashboard UI |

### Day 10: Pricing Rules

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 10.1 | Pricing rules CRUD API                                         | ⬜     | Not implemented |
| 10.2 | 4-tab pricing UI (Add-Ons, Surcharges, Weekend, Minimum)       | ⬜     | |
| 10.3 | Rule types: add_on, surcharge_percent, weekend_multiplier, min | ⬜     | |

### Day 11: Quote Engine

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 11.1 | `calculateQuote(input)` — pure function, no DB imports         | ⚠️     | Quote calculated in n8n workflow, not a standalone pure function |
| 11.2 | Base price + add-ons + surcharges + weekend multiplier + min   | ⚠️     | Partial — basic pricing in n8n |
| 11.3 | Line items in quote result                                     | ⬜     | |
| 11.4 | 18 unit tests all passing                                      | ⬜     | No unit tests |

### Day 12: Slot Engine

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 12.1 | `generateAvailableSlots(input)` — pure function, no DB         | ⚠️     | Slots via Calendly API + fallback generation |
| 12.2 | DST-aware slot generation using date-fns-tz                    | ✅     | Melbourne timezone handled |
| 12.3 | Excludes slots overlapping existing bookings + buffer          | ✅     | Conflict check via SQL overlap query |
| 12.4 | 14 unit tests all passing                                      | ⬜     | No unit tests |

### Day 13: Booking State Machine + Redis Lock

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 13.1 | `validateTransition(from, to)` — legal status transitions only | ⬜     | Basic status update, no state machine |
| 13.2 | `transitionBookingStatus()` with row lock + events log         | ⬜     | |
| 13.3 | Upstash Redis client singleton                                 | ⬜     | No Redis |
| 13.4 | `acquireSlotLock(orgId, startAt, ttl)` — SET NX               | ⬜     | |
| 13.5 | `createBookingWithLock()` — atomic, releases lock on failure   | ⬜     | |
| 13.6 | Double-booking test: 5 concurrent → exactly 1 wins            | ⬜     | |

### Day 14: Availability Dashboard

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 14.1 | Weekly availability schedule API (read/write)                  | ⬜     | Rules in DB but no dashboard editor |
| 14.2 | Weekly grid UI (7 rows, time pickers, active toggle)           | ⬜     | |
| 14.3 | Preset buttons (Mon-Fri 8-5, Mon-Sat 8-6, Every day 7-7)      | ⬜     | |
| 14.4 | Blocked slots CRUD (API + UI)                                  | ⬜     | |
| 14.5 | `GET /api/availability/slots?date=&variantId=`                 | ⬜     | Slots served via Calendly/n8n |

---

## Week 3 — Bookings & IVR (Days 15–21)

### Day 15: Booking Creation + Double-Booking Test

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 15.1 | `POST /api/bookings` with full validation and quote calc       | ✅     | Working |
| 15.2 | `POST /api/bookings/quote-preview` (no create)                 | ⬜     | Not a separate endpoint |
| 15.3 | 409 on duplicate slot                                          | ✅     | SQL overlap check returns 409 |
| 15.4 | 5 concurrent requests → exactly 1 succeeds (Redis lock test)  | ⬜     | No Redis lock; race condition possible |

### Day 16: Cancel, Complete, No-Show

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 16.1 | `POST /api/bookings/:id/cancel`                                | ✅     | Working |
| 16.2 | `PATCH /api/bookings/:id/complete`                             | ⬜     | Not implemented |
| 16.3 | `PATCH /api/bookings/:id/no-show`                              | ⬜     | Not implemented |
| 16.4 | Invalid transition rejected (e.g. cancel completed booking)    | ⬜     | No validation |

### Day 17: Manual Booking Form

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 17.1 | 4-step booking wizard in dashboard                             | ⬜     | Not implemented |
| 17.2 | Step 1: Customer search / create inline                        | ⬜     | |
| 17.3 | Step 2: Service + variant select + live quote preview          | ⬜     | |
| 17.4 | Step 3: Date picker + available time slots                     | ⬜     | |
| 17.5 | Step 4: Review + confirm                                       | ⬜     | |
| 17.6 | Bookings list page (`/bookings`)                               | ✅     | Shows all bookings |
| 17.7 | Booking detail page (`/bookings/:id`)                          | ⬜     | Not implemented |

### Day 18: Twilio Voice Webhook

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 18.1 | Twilio signature validation middleware                         | ✅     | `twilioValidation.js` (bypassable in dev) |
| 18.2 | Call state stored in Redis (Upstash)                           | ⬜     | Stored in PostgreSQL `calls.context` JSONB |
| 18.3 | Call state stored in PostgreSQL as fallback                    | ✅     | `calls.context` JSONB |
| 18.4 | `POST /webhook/twilio` — looks up business by Twilio number    | ✅     | |
| 18.5 | TwiML builder helpers (`say`, `gather`, `twiml`)               | ✅     | Inline in `twilio.js` |
| 18.6 | Greeting TwiML returned on call start                          | ✅     | Trilingual greeting |

### Day 19: IVR Main Menu

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 19.1 | Language menu (EN/HI/ZH) with DTMF + speech                   | ✅     | |
| 19.2 | Main menu — 6 options (book, availability, quote, reschedule, cancel, callback) | ✅ | |
| 19.3 | Service menu — dynamic from DB by keypad_option                | ✅     | |
| 19.4 | Key-9 repeat in all states                                     | ✅     | |
| 19.5 | Invalid digit retry with count limit                           | ✅     | |
| 19.6 | Regex speech-to-DTMF mapping                                   | ✅     | `regexSpeechToDigit()` across all states |

### Day 20: Quote Readback on Phone

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 20.1 | Quote calculated and read aloud on phone                       | ✅     | Via n8n quote-engine workflow |
| 20.2 | Multilingual price readback (EN/HI/ZH)                         | ✅     | |
| 20.3 | Option to book next / hear times / go back from quote          | ✅     | |
| 20.4 | SMS quote delivery (option 2 from quote result)                | ✅     | Twilio REST SMS |

### Day 21: Real Phone Call Completes Booking

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 21.1 | Book next available slot (auto-select)                         | ✅     | |
| 21.2 | Book from slot list (pick 1 of 3)                              | ✅     | |
| 21.3 | `get-or-create` customer by phone number                       | ✅     | |
| 21.4 | Booking confirmed TwiML with date/time readback                | ✅     | |
| 21.5 | SlotUnavailableError auto-retry (up to 3 times)                | ✅     | 409 re-routes to CHECK_AVAILABILITY |
| 21.6 | No slots in 7 days → "fully booked" TwiML                     | ✅     | |

---

## Week 4 — Multilingual, Integrations, Billing (Days 22–30)

### Day 22: Hindi & Mandarin IVR

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 22.1 | Full Hindi scripts (Devanagari)                                | ✅     | In `twilio.js` |
| 22.2 | Full Mandarin scripts (Chinese characters)                     | ✅     | |
| 22.3 | Hindi speech-to-digit mappings (ek, do, teen…)                 | ✅     | Regex patterns |
| 22.4 | Mandarin speech-to-digit mappings (yi, er, san…)               | ✅     | Regex patterns |
| 22.5 | Multilingual date/time formatting for slot readback            | ✅     | `slotLabelsService.js` |
| 22.6 | Twilio Polly voices: Joanna (EN), Aditi (HI), Zhiyu (ZH)      | ✅     | Language attributes on `<Say>` |

### Day 23: Cancel & Callback IVR Flows

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 23.1 | Cancel via phone — lookup booking by caller phone              | ✅     | `IDENTIFY_BOOKING` state |
| 23.2 | Cancel confirm TwiML → `transitionBookingStatus`               | ✅     | |
| 23.3 | "No booking found" TwiML                                       | ✅     | |
| 23.4 | Reschedule via phone (IDENTIFY → AVAILABILITY → CONFIRM)       | ✅     | Full reschedule flow |
| 23.5 | Callback request saved to `callback_requests` table            | ✅     | With reason via speech |
| 23.6 | Callback requests visible in dashboard                         | ✅     | `/callbacks` page with Mark Resolved |

### Day 24: n8n + Booking Confirmed Workflow

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 24.1 | n8n deployed (Railway recommended, Render used)                | ✅     | On Render — `n8n-service-4jb2.onrender.com` |
| 24.2 | `triggerWorkflow(slug, payload)` helper — never throws         | ✅     | `axios.post` to n8n webhook URL |
| 24.3 | `booking-confirmed` workflow: SMS to customer                  | ✅     | Workflow JSON in `/workflows` |
| 24.4 | `create-booking` workflow                                      | ✅     | |
| 24.5 | `cancel-booking` workflow                                      | ✅     | |
| 24.6 | `quote-engine` workflow                                        | ✅     | |
| 24.7 | `quote-and-availability` combined workflow                     | ✅     | |
| 24.8 | SMS confirmation arrives after IVR booking                     | ✅     | Verified in testing |

### Day 25: Reminders + Cancellation Workflow

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 25.1 | Customer reminder workflow (24h before appointment)            | ✅     | `customer-reminders.json` |
| 25.2 | Provider reminder workflow                                     | ✅     | `provider-reminders.json` |
| 25.3 | Provider daily summary workflow (4:30 PM)                      | ✅     | `provider-summary.json` |
| 25.4 | Booking-cancelled workflow                                     | ✅     | |
| 25.5 | Reminder cron fires in correct ±8 min window                   | ⚠️     | Workflow exists; production cron not verified |

### Day 26: Google Calendar OAuth

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 26.1 | `generateAuthUrl(orgId, userId)` with JWT state                | ⬜     | `routes/auth.js` has basic OAuth stub |
| 26.2 | `exchangeCodeForTokens(code)`                                  | ⬜     | |
| 26.3 | `refreshAccessToken()` with 5-min buffer                       | ⬜     | |
| 26.4 | AES-256-GCM token encryption/decryption                        | ⬜     | |
| 26.5 | `POST /api/calendar/connect` → returns authUrl                 | ⬜     | |
| 26.6 | `GET /api/calendar/callback` → exchanges code, saves to DB     | ⬜     | |
| 26.7 | Integrations page showing connection status                    | ⬜     | |
| 26.8 | Calendly used as temporary availability source                 | ✅     | `calendlyService.js` |

### Day 27: Google Calendar Event Sync

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 27.1 | `createEvent(orgId, event)` — creates event, returns eventId   | ⬜     | `calendarEventId` always null |
| 27.2 | `deleteEvent(orgId, eventId)` — deletes on cancel              | ⬜     | |
| 27.3 | Booking confirmed → calendar event created                     | ⬜     | |
| 27.4 | Booking cancelled → calendar event deleted                     | ⬜     | |
| 27.5 | `POST /api/calendar/sync` — manual backfill                    | ⬜     | |

### Day 28: Onboarding Wizard

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 28.1 | 5-step onboarding wizard with progress bar                     | ⬜     | |
| 28.2 | Step 1: Industry + business name + timezone                    | ⬜     | |
| 28.3 | Step 2: Pre-loaded service templates, customisable             | ⬜     | |
| 28.4 | Step 3: Weekly availability schedule                           | ⬜     | |
| 28.5 | Step 4: Twilio number provisioning (buy via API)               | ⬜     | |
| 28.6 | Step 5: Billing / plan selection                               | ⬜     | |
| 28.7 | Middleware redirects to correct onboarding step                | ⬜     | |

### Day 29: Stripe Billing

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 29.1 | 3 subscription plans: Starter $29 / Growth $79 / Pro $149      | ⬜     | |
| 29.2 | Annual pricing (Starter $288 / Growth $792 / Pro $1488)        | ⬜     | |
| 29.3 | `PLAN_LIMITS` constant (maxServices, maxSMS, languages, etc.)  | ⬜     | |
| 29.4 | `POST /api/billing/checkout` → Stripe Checkout session         | ⬜     | |
| 29.5 | `POST /api/billing/portal` → Stripe Customer Portal            | ⬜     | |
| 29.6 | Stripe webhook handler (5 event types)                         | ⬜     | |
| 29.7 | Feature gates enforced on all plan-limited endpoints           | ⬜     | |
| 29.8 | Billing dashboard page (plan card, usage meters)               | ⬜     | |
| 29.9 | 14-day free trial + subscription flow                          | ⬜     | |

### Day 30: Launch Checklist + Production Deploy

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 30.1 | Vercel production deployment                                   | ⬜     | Running locally via ngrok |
| 30.2 | Neon PostgreSQL (production branch)                            | ⬜     | Using Render PostgreSQL |
| 30.3 | Railway n8n (production instance)                              | ⬜     | Using Render n8n |
| 30.4 | Custom domain configured                                       | ⬜     | |
| 30.5 | Twilio A2P 10DLC registration approved                         | ⬜     | On trial account |
| 30.6 | Google OAuth verification submitted/approved                   | ⬜     | |
| 30.7 | Stripe live mode configured                                    | ⬜     | |
| 30.8 | 30-item pre-launch checklist passed                            | ⬜     | |

---

## Infrastructure & Observability

| #    | Feature                                                        | Status | Notes |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| I.1  | Sentry error tracking                                          | ⬜     | |
| I.2  | Axiom log aggregation                                          | ⬜     | |
| I.3  | Betterstack uptime monitoring                                  | ⬜     | |
| I.4  | Cloudflare R2 database backups                                 | ⬜     | |
| I.5  | UptimeRobot pinging `/health` every 5 min (keep Render warm)   | ⬜     | |
| I.6  | `GET /api/health` endpoint                                     | ✅     | Returns `{status: "ok", db_time}` |

---

## Summary

| Phase                                       | Total | Done | Partial | Not Started |
| ------------------------------------------- | ----- | ---- | ------- | ----------- |
| Week 1 — Foundation (Days 1–7)              | 36    | 14   | 2       | 20          |
| Week 2 — Services & Engines (Days 8–14)     | 28    | 5    | 5       | 18          |
| Week 3 — Bookings & IVR (Days 15–21)        | 28    | 19   | 1       | 8           |
| Week 4 — Integrations & Billing (Days 22–30)| 47    | 22   | 2       | 23          |
| Infrastructure & Observability              | 6     | 1    | 0       | 5           |
| **Total**                                   | **145**| **61**| **10** | **74**      |

---

## What is fully working (core product)

- **IVR phone system** — full call flow in English, Hindi, Mandarin
- **All 6 main menu options** — new booking, availability, quote, reschedule, cancel, callback
- **Speech recognition** — regex-based speech-to-DTMF across all states
- **SMS confirmation and quote delivery** via Twilio
- **Slot conflict detection** — 409 re-routes caller to pick another time
- **Automated reminders** — customer (24h), provider, daily summary via n8n
- **Provider dashboard** — bookings, call logs, callbacks, services, settings
- **PostgreSQL database** live on Render

---

## What still needs to be built (to match full ServiceOS spec)

### High Priority (Blocks Production Launch)
1. **Authentication** — Clerk Organizations multi-tenancy (Days 2–3)
2. **Stripe billing** — subscriptions, plan gating, trial (Day 29)
3. **Production deployment** — Vercel + Neon + Railway (Day 30)
4. **Redis slot locking** — prevent race conditions under load (Day 13)
5. **Google Calendar OAuth** — replace Calendly (Days 26–27)
6. **Onboarding wizard** — self-serve signup flow (Day 28)
7. **Twilio A2P 10DLC** — required for production SMS in AU/US

### Medium Priority (Required for Full Feature Set)
8. **TypeScript** — migrate from JavaScript
9. **Drizzle ORM** — replace raw pg queries
10. **Pricing rules CRUD** — dynamic pricing (Day 10)
11. **Pure quote engine** — standalone function with 18 unit tests (Day 11)
12. **Pure slot engine** — standalone function with 14 unit tests (Day 12)
13. **Booking state machine** — valid transitions + events log (Day 13)
14. **Weekly availability editor** — dashboard UI for schedule (Day 14)
15. **Manual booking form** — 4-step wizard in dashboard (Day 17)
16. **Complete/No-show status** — additional booking transitions (Day 16)

### Low Priority (Nice to Have)
17. **Observability** — Sentry, Axiom, Betterstack (Infrastructure)
18. **Cloudflare R2 backups** (Infrastructure)
19. **Callback email notification to provider** (original 3.45)
20. **Reschedule notification email** (original 4.31)
