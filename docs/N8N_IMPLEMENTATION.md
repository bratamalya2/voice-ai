# n8n Workflow Implementation Guide

## Overview

This guide walks through building all n8n workflows for the Voice Booking Agent. Workflows are hosted at: **https://n8n-uz06.onrender.com**

**Workflows to build (in order):**

1. ✅ `quote-engine` (already exists)
2. ⬜ `availability-engine` (next)
3. ⬜ `quote-and-availability`
4. ⬜ `create-booking`
5. ⬜ `cancel-booking`
6. ⬜ `reschedule-booking`

---

## Workflow 1: `availability-engine` ⬜

**Purpose:** Query Calendly for available slots, filter by service duration, return top 3.

**Webhook URL:** `https://n8n-uz06.onrender.com/webhook/availability-engine`

**Input JSON:**

```json
{
  "startDate": "2026-04-20",
  "endDate": "2026-04-27",
  "serviceDuration": 60
}
```

**Expected Output:**

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

---

## Building in n8n UI (Step-by-step)

### Step 1: Create New Workflow

1. Go to **https://n8n-uz06.onrender.com**
2. Click **+ New** → **New Workflow**
3. Name it: `availability-engine`

### Step 2: Add Webhook Trigger

1. Click the **+** button to add a node
2. Search for **Webhook** node
3. Configure:
   - **Method:** POST
   - **Path:** `availability-engine`
   - Leave Authentication as "None" (or add if you have security requirements)
4. Node name: `Webhook`

### Step 3: Add Code Node (Call Calendly Service)

1. Click **+** to add another node
2. Search for **Code** node
3. Set **Language:** JavaScript
4. Copy this code:

```javascript
// Parse input
const startDate = $input.all()[0].json.startDate; // "2026-04-20"
const endDate = $input.all()[0].json.endDate; // "2026-04-27"
const serviceDuration = $input.all()[0].json.serviceDuration; // minutes

// Call the Calendly service via HTTP (since we can't require Node modules in n8n)
// We'll use HTTP node to call our backend which imports the service

return {
  startDate,
  endDate,
  serviceDuration,
  timestamp: new Date().toISOString(),
};
```

4. Node name: `Parse Input`

### Step 4: Add HTTP Node (Call Backend Service)

1. Click **+** to add HTTP Request node
2. Configure:
   - **Method:** POST
   - **URL:** `http://localhost:3001/api/availability` (change to your backend URL in production)
   - **Headers:** Add `Content-Type: application/json`
   - **Body:** Use **Body (JSON)** mode:

```json
{
  "startDate": "{{ $node['Parse Input'].json.startDate }}",
  "endDate": "{{ $node['Parse Input'].json.endDate }}",
  "serviceDuration": "{{ $node['Parse Input'].json.serviceDuration }}"
}
```

Wait — we haven't created the backend endpoint yet. Let me revise this approach.

---

## Better Approach: Call Calendly Service Directly

Since we have the Calendly service in the backend, let's create a helper backend endpoint first, then use it from n8n.

### Step 1: Add Backend Endpoint

Update `backend/src/index.js`:

```javascript
app.post("/api/availability", async (req, res) => {
  try {
    const { startDate, endDate, serviceDuration } = req.body;
    const calendlyService = require("./services/calendlyService");

    // Format dates to ISO 8601
    const startTime = `${startDate}T00:00:00Z`;
    const endTime = `${endDate}T23:59:59Z`;

    // Get available slots
    const slots = await calendlyService.getAvailableSlots(startTime, endTime);

    // Filter to top 3 matching duration
    const topSlots = calendlyService.filterSlotsByDuration(
      slots,
      serviceDuration,
      3,
    );

    res.json(topSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## n8n Workflow Setup (Revised)

### Step 1: Webhook Trigger

- **Method:** POST
- **Path:** `availability-engine`
- Input format (from IVR):

```json
{
  "startDate": "2026-04-20",
  "endDate": "2026-04-27",
  "serviceDuration": 60
}
```

### Step 2: HTTP Request to Backend

- **Method:** POST
- **URL:** `https://your-backend-domain.com/api/availability`
- **Body (JSON):**

```json
{
  "startDate": "{{ $json.startDate }}",
  "endDate": "{{ $json.endDate }}",
  "serviceDuration": "{{ $json.serviceDuration }}"
}
```

### Step 3: Respond to Webhook

- Add **Webhook Response** node
- **Body:**

```json
{
  "slots": "{{ $json }}"
}
```

---

## Testing the Workflow

1. **From n8n UI:**
   - Click **Test Workflow** button
   - Send test JSON:

   ```json
   {
     "startDate": "2026-04-20",
     "endDate": "2026-04-27",
     "serviceDuration": 60
   }
   ```

2. **From Terminal:**

```bash
curl -X POST https://n8n-uz06.onrender.com/webhook/availability-engine \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-20",
    "endDate": "2026-04-27",
    "serviceDuration": 60
  }'
```

---

## Next Workflows (Coming Soon)

Once `availability-engine` is working:

1. **quote-and-availability** — Combine quote + availability
2. **create-booking** — Create calendar event + DB record
3. **cancel-booking** — Delete event + update status
4. **reschedule-booking** — Update event time + DB record

---

## Troubleshooting

| Issue                          | Solution                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| Workflow fails to execute      | Check backend URL is accessible from n8n environment       |
| "No available slots found"     | Verify Calendly account has availability configured        |
| Backend returns 500            | Check backend logs: `npm run dev` and review error         |
| n8n shows "Connection refused" | Backend might not be exposed to internet; use ngrok tunnel |

---

## Documentation References

- n8n Docs: https://docs.n8n.io
- Workflow JSON export: See `workflows/availability-engine.json` (next)
- Backend API docs: See `docs/BACKEND_API.md` (to be created)
