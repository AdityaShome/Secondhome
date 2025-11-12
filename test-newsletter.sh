#!/bin/bash

# Newsletter Testing Script
echo "🧪 Testing Newsletter System..."
echo ""

# Test 1: Send Weekly Digest
echo "📧 Test 1: Sending Weekly Digest..."
curl -X POST http://localhost:3000/api/newsletter/send-weekly \
  -H "Authorization: Bearer your-secret-key-123" \
  -H "Content-Type: application/json"
echo ""
echo ""

# Test 2: Send Instant Alert
echo "⚡ Test 2: Sending Instant Alert..."
curl -X POST http://localhost:3000/api/newsletter/send-instant \
  -H "Content-Type: application/json" \
  -d '{
    "propertyData": {
      "_id": "test123",
      "title": "Cozy 2BHK near RV College",
      "location": "Jayanagar, Bangalore",
      "price": 15000,
      "type": "Flat",
      "description": "Fully furnished with WiFi, AC, and parking"
    }
  }'
echo ""
echo ""

echo "✅ Tests completed! Check your email inbox."




