#!/bin/bash
# Test Calendly API endpoints directly
# Usage: bash test_calendly_api.sh

echo "🔧 Testing Calendly API Endpoints"
echo "===================================="
echo ""

API_KEY="$CALENDLY_API_KEY"
if [ -z "$API_KEY" ]; then
  echo "❌ CALENDLY_API_KEY not set in environment"
  echo "Set it: export CALENDLY_API_KEY=your_token"
  exit 1
fi

BASE_URL="https://api.calendly.com"

# Test 1: Get current user
echo "Test 1: GET /users/me"
echo "Command: curl -H \"Authorization: Bearer $API_KEY\" $BASE_URL/users/me"
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/users/me" | jq '.' 2>/dev/null || echo "Failed or invalid JSON"
echo ""
echo ""

# Test 2: Get user availability schedules
echo "Test 2: GET /availability_schedules"
echo "Command: curl -H \"Authorization: Bearer $API_KEY\" $BASE_URL/availability_schedules"
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/availability_schedules" | jq '.' 2>/dev/null || echo "Failed or invalid JSON"
echo ""
echo ""

# Test 3: Get user event types
echo "Test 3: GET /event_types"
echo "Command: curl -H \"Authorization: Bearer $API_KEY\" $BASE_URL/event_types"
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/event_types" | jq '.' 2>/dev/null || echo "Failed or invalid JSON"
echo ""
echo ""

# Test 4: Get scheduled events (existing bookings)
echo "Test 4: GET /scheduled_events"
echo "Command: curl -H \"Authorization: Bearer $API_KEY\" $BASE_URL/scheduled_events"
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/scheduled_events" | jq '.' 2>/dev/null || echo "Failed or invalid JSON"
echo ""
echo ""

echo "✅ API endpoint tests complete"
