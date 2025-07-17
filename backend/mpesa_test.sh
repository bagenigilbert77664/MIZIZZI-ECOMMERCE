#!/bin/bash
# mpesa_test.sh

# Set your token
TOKEN="your_token_here"

# Test all endpoints
echo "Testing token generation..."
curl -s -X GET http://localhost:5000/api/mpesa/test-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\nTesting credentials..."
curl -s -X GET http://localhost:5000/api/mpesa/test-credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\nTesting direct payment..."
curl -s -X POST http://localhost:5000/api/mpesa/direct-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "phone": "254746741719",
    "amount": 1,
    "account_reference": "MIZIZZI-TEST",
    "transaction_desc": "Test Payment"
  }' | jq

# ... add the rest of the commands