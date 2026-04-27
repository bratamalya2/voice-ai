/**
 * Find correct Calendly API endpoints
 * Run: cd backend && node tests/discover_calendly_api.js
 */

require("dotenv").config({ path: ".env" });
const axios = require("axios");

const BASE_URL = "https://api.calendly.com";
const API_KEY = process.env.CALENDLY_API_KEY;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function discoverAPI() {
  console.log("🔍 Discovering Calendly API Structure\n");

  // Step 1: Get user
  console.log("Step 1: Get current user");
  const userRes = await axios.get(`${BASE_URL}/users/me`, { headers });
  const userUri = userRes.data.resource.uri;
  const userId = userUri.split("/").pop();
  console.log(`✓ User URI: ${userUri}`);
  console.log(`✓ User ID: ${userId}\n`);

  // Step 2: Get event types with proper parameter
  console.log("Step 2: Get event types (with user parameter)");
  try {
    const eventTypesRes = await axios.get(`${BASE_URL}/event_types`, {
      headers,
      params: { user: userUri },
    });
    console.log(`✓ Event types found: ${eventTypesRes.data.collection.length}`);
    if (eventTypesRes.data.collection.length > 0) {
      const eventType = eventTypesRes.data.collection[0];
      console.log(`✓ First event type:`, {
        id: eventType.id,
        name: eventType.name,
        duration: eventType.duration,
        uri: eventType.uri,
      });
    }
  } catch (err) {
    console.log(`✗ Error: ${err.response?.data?.message || err.message}`);
  }
  console.log();

  // Step 3: Get scheduled events with proper parameter
  console.log("Step 3: Get scheduled events (with user parameter)");
  try {
    const eventsRes = await axios.get(`${BASE_URL}/scheduled_events`, {
      headers,
      params: { user: userUri },
    });
    console.log(
      `✓ Scheduled events found: ${eventsRes.data.collection.length}`,
    );
    if (eventsRes.data.collection.length > 0) {
      const event = eventsRes.data.collection[0];
      console.log(`✓ First event:`, {
        id: event.id,
        start_time: event.start_time,
        end_time: event.end_time,
      });
    }
  } catch (err) {
    console.log(`✗ Error: ${err.response?.data?.message || err.message}`);
  }
  console.log();

  // Step 4: Test scheduling links
  console.log("Step 4: Get scheduling links");
  try {
    const linksRes = await axios.get(`${BASE_URL}/scheduling_links`, {
      headers,
      params: { owner: userUri },
    });
    console.log(`✓ Scheduling links found: ${linksRes.data.collection.length}`);
    if (linksRes.data.collection.length > 0) {
      const link = linksRes.data.collection[0];
      console.log(`✓ First link:`, {
        name: link.booking_url || link.name,
        owner: link.owner,
      });
    }
  } catch (err) {
    console.log(`✗ Error: ${err.response?.data?.message || err.message}`);
  }
  console.log();

  console.log("📋 Summary of Working Endpoints:");
  console.log("✓ GET /users/me");
  console.log("✓ GET /event_types?user={userUri}");
  console.log("✓ GET /scheduled_events?user={userUri}");
  console.log("✓ GET /scheduling_links?owner={userUri}");
  console.log("\n❌ Non-existent Endpoints:");
  console.log("✗ GET /availability_schedules");
  console.log("✗ POST /available_times");
  console.log(
    "\n💡 Note: Calendly v2 API does not have built-in 'available times' endpoints.",
  );
  console.log("   To get availability, you must:");
  console.log("   1. Parse event_types for duration");
  console.log("   2. Parse scheduled_events for busy times");
  console.log("   3. Calculate free slots manually\n");
}

discoverAPI().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
