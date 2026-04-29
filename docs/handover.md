# Handover Documentation — Voice Booking Agent

## Environment Variables
The following variables must be set in your production environment (Render, Vercel, etc.):

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Render provided) |
| `TWILIO_ACCOUNT_SID` | Found in Twilio Console |
| `TWILIO_AUTH_TOKEN` | Found in Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your active voice-enabled number |
| `CALENDLY_API_KEY` | Personal Access Token from Calendly Developer Portal |
| `CALENDLY_USER_ID` | Your Calendly User UUID (found via API or backend logs) |
| `N8N_BASE_URL` | The URL where your n8n instance is running |
| `APP_BASE_URL` | The URL of your backend/dashboard |

## Service Accounts & OAuth
- **Calendly**: Uses Personal Access Tokens (PAT). No OAuth flow required for the owner, but ensure the PAT has all scopes enabled.
- **Twilio**: Webhooks must be pointed to `https://your-backend.com/webhook/twilio`.

## n8n Workflows
The following workflows must be imported from the `/workflows` folder:
1. `quote-engine.json`
2. `quote-and-availability.json`
3. `create-booking.json`
4. `cancel-booking.json`
5. `customer-reminders.json`
6. `provider-reminders.json`
7. `provider-summary.json`

## Deployment Process
1. **Database**: Run the scripts in `/sql` against your production DB.
2. **Backend**: Deploy the `/backend` folder. Ensure `npm start` runs the Express server.
3. **Dashboard**: Deploy the `/dashboard` folder to a Next.js host (Vercel recommended).
4. **Twilio**: Update the Voice Webhook URL in the Twilio Console to your backend URL.
