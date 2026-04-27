/**
 * Test Calendly API endpoints directly
 * Run: cd backend && node tests/verify_calendly_endpoints.js
 */

require("dotenv").config({ path: ".env" });
const axios = require("axios");

const BASE_URL = "https://api.calendly.com";
const API_KEY = process.env.CALENDLY_API_KEY;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function testEndpoints() {
  console.log("🔧 Testing Calendly API Endpoints\n");

  const endpoints = [
    {
      name: "GET /users/me",
      method: "GET",
      url: `${BASE_URL}/users/me`,
    },
    {
      name: "GET /availability_schedules",
      method: "GET",
      url: `${BASE_URL}/availability_schedules`,
    },
    {
      name: "GET /event_types",
      method: "GET",
      url: `${BASE_URL}/event_types`,
    },
    {
      name: "GET /scheduled_events",
      method: "GET",
      url: `${BASE_URL}/scheduled_events`,
    },
    {
      name: "POST /available_times",
      method: "POST",
      url: `${BASE_URL}/available_times`,
      data: {
        max_event_count: 1,
        duration_minutes: 60,
        start_date: "2026-04-20",
        end_date: "2026-04-26",
      },
    },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📍 ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);
    console.log("=".repeat(60));

    try {
      let response;
      if (endpoint.method === "POST") {
        response = await axios.post(endpoint.url, endpoint.data, { headers });
      } else {
        response = await axios.get(endpoint.url, { headers });
      }

      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log("Response keys:", Object.keys(response.data));

      // Show first few items if collection
      if (response.data.collection) {
        console.log(`✓ Collection size: ${response.data.collection.length}`);
        if (response.data.collection.length > 0) {
          console.log(
            `✓ First item keys:`,
            Object.keys(response.data.collection[0]),
          );
        }
      } else if (response.data.resource) {
        console.log(
          `✓ Resource type:`,
          response.data.resource.id ? "Has ID" : "No ID",
        );
        console.log(`✓ Resource keys:`, Object.keys(response.data.resource));
      } else if (Array.isArray(response.data)) {
        console.log(`✓ Array size: ${response.data.length}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || error.code}`);
      console.log(`Message: ${error.response?.statusText || error.message}`);
      if (error.response?.data?.title) {
        console.log(`API Error: ${error.response.data.title}`);
      }
      if (error.response?.data?.message) {
        console.log(`Details: ${error.response.data.message}`);
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ Endpoint verification complete");
  console.log("=".repeat(60));
}

testEndpoints().catch(console.error);
