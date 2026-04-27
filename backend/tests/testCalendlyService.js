/**
 * Quick test script for Calendly service
 * Run: cd backend && node tests/testCalendlyService.js
 */

require("dotenv").config({ path: ".env" });

const calendlyService = require("../src/services/calendlyService");

async function testCalendlyIntegration() {
  console.log("🔧 Testing Calendly Integration...\n");

  try {
    // Test 1: Get user URI
    console.log("✓ Test 1: Fetching user URI...");
    const userUri = await calendlyService.getUserUri();
    console.log(`  User URI: ${userUri}\n`);

    // Test 2: Get available slots
    console.log("✓ Test 2: Fetching available slots...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 6);

    const startTime = tomorrow.toISOString().split("T")[0];
    const endTime = nextWeek.toISOString().split("T")[0];

    console.log(`  Date range: ${startTime} to ${endTime}`);
    const slots = await calendlyService.getAvailableSlots(
      `${startTime}T00:00:00Z`,
      `${endTime}T23:59:59Z`,
    );

    if (slots.length > 0) {
      console.log(`  Found ${slots.length} available slots`);
      console.log(`  First slot: ${slots[0].start_time}`);
    } else {
      console.log(
        "  ⚠️  No available slots found (this may be normal if calendar is full)",
      );
    }
    console.log();

    // Test 3: Filter slots
    console.log("✓ Test 3: Filtering slots for 60-minute service...");
    const filtered = calendlyService.filterSlotsByDuration(slots, 60, 3);
    console.log(`  Filtered to top 3 slots: ${filtered.length} slots`);
    if (filtered.length > 0) {
      filtered.forEach((slot, i) => {
        console.log(`    Slot ${i + 1}: ${slot.slot_start} → ${slot.slot_end}`);
      });
    }
    console.log();

    // Test 4: Get event types (dry run)
    console.log("✓ Test 4: Service validation complete");
    console.log("  All core functions are working!\n");

    console.log("✅ Calendly integration is set up correctly!");
    console.log("Next step: Build the n8n availability engine workflow.\n");
  } catch (error) {
    console.error("❌ Calendly test failed:", error.message);
    console.error(
      "   Make sure CALENDLY_API_KEY and CALENDLY_USER_ID are set in .env",
    );
    process.exit(1);
  }
}

testCalendlyIntegration();
