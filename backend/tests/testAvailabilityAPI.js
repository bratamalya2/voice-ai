/**
 * Test script for /api/availability endpoint
 * Run: cd backend && node tests/testAvailabilityAPI.js
 */

require("dotenv").config({ path: ".env" });
const axios = require("axios");

async function testAvailabilityAPI() {
  console.log("🔧 Testing Availability API Endpoint...\n");

  try {
    // Test data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 6);

    const startDate = tomorrow.toISOString().split("T")[0];
    const endDate = nextWeek.toISOString().split("T")[0];

    const testPayload = {
      startDate,
      endDate,
      serviceDuration: 60, // 1 hour
    };

    console.log("📤 Sending request to POST /api/availability");
    console.log("Payload:", JSON.stringify(testPayload, null, 2));
    console.log();

    // Call the API (local)
    const response = await axios.post(
      "http://localhost:3001/api/availability",
      testPayload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
    );

    console.log("✅ Success! Response:");
    console.log(JSON.stringify(response.data, null, 2));
    console.log();

    if (response.data.length === 0) {
      console.log("⚠️  No available slots found.");
      console.log("Check: Is Calendly account configured with availability?");
      process.exit(0);
    }

    console.log(`✅ Found ${response.data.length} available slots`);
    console.log();
    console.log("💡 Usage in n8n:");
    console.log("1. Create HTTP Request node");
    console.log("2. Set URL to: {{ $env.BACKEND_API_URL }}/api/availability");
    console.log("3. POST body:");
    console.log(
      JSON.stringify(
        {
          startDate: "{{ $json.startDate }}",
          endDate: "{{ $json.endDate }}",
          serviceDuration: "{{ $json.serviceDuration }}",
        },
        null,
        2,
      ),
    );
    console.log();
    console.log("✅ API endpoint is working correctly!");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error("❌ Connection refused. Is backend running?");
      console.error("   Run: npm run dev");
    } else if (error.response) {
      console.error("❌ API Error:", error.response.status);
      console.error("   Message:", error.response.data);
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  }
}

testAvailabilityAPI();
