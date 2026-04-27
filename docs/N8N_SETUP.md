# n8n Workflow Setup & Testing

## Quick Start

### 1. Configure Environment Variables

Add to `backend/.env`:

```
BACKEND_API_URL=http://localhost:3001
```

Or for production (Render):

```
BACKEND_API_URL=https://your-render-backend-url.onrender.com
```

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

Expected output:

```
Backend running on port 3001
Health:        http://localhost:3001/health
Twilio webhook: http://localhost:3001/webhook/twilio
Availability API: POST http://localhost:3001/api/availability
```

### 3. Test API Endpoint (Optional but Recommended)

```bash
cd backend
node tests/testAvailabilityAPI.js
```

Expected output:

```
✅ Found 3 available slots
[
  {
    "slot_start": "2026-04-22T10:00:00Z",
    "slot_end": "2026-04-22T11:00:00Z",
    "duration_minutes": 60
  },
  ...
]
```

---

## Import Workflow into n8n

### Option A: Manual Import (Recommended)

1. **Go to n8n:** https://n8n-uz06.onrender.com
2. **Click:** Import → Import from URL
3. **Enter:** `https://raw.githubusercontent.com/your-repo/main/workflows/availability-engine.json`
   (or paste the contents of `workflows/availability-engine.json`)
4. **Update variables:**
   - Find `{{ $env.BACKEND_API_URL }}`
   - Replace with your actual backend URL
5. **Activate workflow**

### Option B: Create Manually in UI

**Nodes to create:**

| #   | Node Type          | Name               | Config                                                           |
| --- | ------------------ | ------------------ | ---------------------------------------------------------------- |
| 1   | Webhook            | Webhook            | Path: `availability-engine`, Method: POST                        |
| 2   | HTTP Request       | Call Backend API   | URL: `{{ $env.BACKEND_API_URL }}/api/availability`, Method: POST |
| 3   | Respond to Webhook | Respond to Webhook | Response: `{{ $json }}`                                          |

**Connections:**

- Webhook → Call Backend API → Respond to Webhook

---

## Test the Workflow

### In n8n UI

1. **Open** availability-engine workflow
2. **Click** Test Workflow (play button)
3. **Send test data:**

```json
{
  "startDate": "2026-04-20",
  "endDate": "2026-04-27",
  "serviceDuration": 60
}
```

### Via Terminal (curl)

```bash
curl -X POST https://n8n-uz06.onrender.com/webhook/availability-engine \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-20",
    "endDate": "2026-04-27",
    "serviceDuration": 60
  }'
```

### Via Terminal (node)

```bash
node -e "
const axios = require('axios');
axios.post('https://n8n-uz06.onrender.com/webhook/availability-engine', {
  startDate: '2026-04-20',
  endDate: '2026-04-27',
  serviceDuration: 60
}).then(r => console.log(JSON.stringify(r.data, null, 2)))
.catch(e => console.error(e.message))
"
```

---

## Environment Setup

### n8n Variables

Set these in n8n Settings → Variables:

| Variable           | Value                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `BACKEND_API_URL`  | `http://localhost:3001` (dev) or `https://your-url.onrender.com` (prod) |
| `CALENDLY_API_KEY` | Your Calendly API key                                                   |
| `DATABASE_URL`     | Your PostgreSQL connection string                                       |

---

## Troubleshooting

### "Connection refused"

- ❌ Backend not running
- ✅ Solution: `cd backend && npm run dev`

### "No available slots found"

- ❌ Calendly account has no availability configured
- ✅ Solution: Go to Calendly and set up availability rules

### "Invalid credentials"

- ❌ CALENDLY_API_KEY is wrong
- ✅ Solution: Check backend/.env has correct API key

### "Cannot find startDate/endDate"

- ❌ Input JSON format is wrong
- ✅ Solution: Check curl command sends proper JSON structure

### n8n shows "ENOTFOUND"

- ❌ Backend URL is incorrect or unreachable
- ✅ Solution: Use ngrok tunnel if backend is local: `ngrok http 3001`

---

## Next Steps

1. ✅ availability-engine workflow is live
2. ⬜ Create `quote-and-availability` workflow (combines quote + availability)
3. ⬜ Create `create-booking` workflow (calls createEvent, inserts DB)
4. ⬜ Create `cancel-booking` workflow (calls cancelEvent, updates DB)
5. ⬜ Create `reschedule-booking` workflow (calls updateEvent, updates DB)

---

## Files Reference

| File                                      | Purpose                                   |
| ----------------------------------------- | ----------------------------------------- |
| `backend/src/index.js`                    | Backend with `/api/availability` endpoint |
| `backend/src/services/calendlyService.js` | Calendly API client (7 functions)         |
| `workflows/availability-engine.json`      | n8n workflow (JSON export)                |
| `testAvailabilityAPI.js`                  | Test script for API endpoint              |
| `testCalendlyService.js`                  | Test script for Calendly service          |
| `docs/N8N_IMPLEMENTATION.md`              | Full n8n guide                            |

---

## Quick Reference: API Endpoint

**POST** `/api/availability`

**Request:**

```json
{
  "startDate": "2026-04-20",
  "endDate": "2026-04-27",
  "serviceDuration": 60
}
```

**Response:**

```json
[
  {
    "slot_start": "2026-04-22T10:00:00Z",
    "slot_end": "2026-04-22T11:00:00Z",
    "duration_minutes": 60
  },
  {
    "slot_start": "2026-04-22T14:00:00Z",
    "slot_end": "2026-04-22T15:00:00Z",
    "duration_minutes": 60
  },
  {
    "slot_start": "2026-04-23T09:00:00Z",
    "slot_end": "2026-04-23T10:00:00Z",
    "duration_minutes": 60
  }
]
```

**Error Response:**

```json
{
  "error": "Missing required fields: startDate, endDate, serviceDuration"
}
```
