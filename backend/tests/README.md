# Backend Tests

Quick test scripts for Calendly integration and API endpoints.

## Running Tests

### Test 1: Calendly Service

```bash
cd backend
node tests/testCalendlyService.js
```

Tests:

- ✓ getUserUri() — Get Calendly user resource URI
- ✓ getAvailableSlots() — Fetch calendar availability
- ✓ filterSlotsByDuration() — Filter slots by service duration

Expected output:

```
✅ Calendly integration is set up correctly!
```

---

### Test 2: Availability API Endpoint

```bash
cd backend
npm run dev  # In one terminal

# In another terminal:
node tests/testAvailabilityAPI.js
```

Tests:

- ✓ POST /api/availability — Query Calendly + filter slots
- ✓ Response format — Array of slots with duration

Expected output:

```
✅ Found 3 available slots
✅ API endpoint is working correctly!
```

---

## Test Data

Both tests use 7-day windows starting from tomorrow:

- **startDate:** tomorrow (YYYY-MM-DD)
- **endDate:** 6 days from tomorrow
- **serviceDuration:** 60 minutes

---

## Troubleshooting

| Issue                 | Solution                                                |
| --------------------- | ------------------------------------------------------- |
| "Connection refused"  | Start backend: `npm run dev`                            |
| "No available slots"  | Check Calendly has availability configured              |
| "Invalid credentials" | Verify CALENDLY_API_KEY in .env                         |
| "Cannot find module"  | Run from backend folder: `cd backend && node tests/...` |

---

## Files

- `testCalendlyService.js` — Test Calendly service functions
- `testAvailabilityAPI.js` — Test backend API endpoint

Both tests run independently and provide detailed output.
