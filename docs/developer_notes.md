# Developer Handover Note

## Architecture
This system is a hybrid of a **Deterministic Express State Machine** (for IVR stability) and **n8n Business Logic** (for flexibility).

- **Telephony Layer**: `backend/src/routes/twilio.js`. This is where the IVR logic lives. To add a new state, add a case to the `switch` statement in `routeState()`.
- **Business Logic**: Located in the `/workflows` folder. All pricing rules, availability filtering, and external integrations (Calendly) are handled here.
- **Data Model**: PostgreSQL using `JSONB` for call context. This allows us to store varying fields (vehicle type, room count) without schema changes.

## Where to Modify...
- **Prompts**: Search for `twiml.say` or `twiml.gather` in `backend/src/routes/twilio.js`. All prompts are multilingual.
- **Pricing**: Modify the `Quote Engine` workflow in n8n.
- **Reminder Timing**: Modify the cron trigger in the `customer-reminders` and `provider-reminders` n8n workflows.
- **Dashboard Styles**: Modify `dashboard/src/app/globals.css`.

## Scalability
- The `calls` table grows with every call. Implement a cleanup job or move old calls to an archive table if volume is high.
- n8n is used for many sub-tasks. If latency becomes an issue, move high-frequency logic (like quote calculation) directly into the Express backend.
