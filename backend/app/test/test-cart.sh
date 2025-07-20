#!/bin/bash

# Cart Testing Script
# This script runs tests for the cart functionality

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mizizzi E-commerce Cart Testing ===${NC}"
echo "Starting tests at $(date)"
echo

# 1. Test backend cart API
echo -e "${BLUE}Testing backend cart API...${NC}"
python -m backend.tests.cart_api_test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backend cart API tests completed successfully!${NC}"
else
    echo -e "${RED}Backend cart API tests failed!${NC}"
fi
echo

# 2. Start development server if not already running
echo -e "${BLUE}Checking if development server is running...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${YELLOW}Development server not running. Starting it...${NC}"
    # Start the server in the background
    npm run dev &
    SERVER_PID=$!
    echo "Server started with PID: $SERVER_PID"
    # Wait for server to start
    echo "Waiting for server to start..."
    sleep 10
else
    echo -e "${GREEN}Development server is already running.${NC}"
fi
echo

# 3. Run frontend cart component tests
echo -e "${BLUE}Testing frontend cart components...${NC}"
echo "Navigate to http://localhost:3000/cart-test in your browser to run the interactive tests"
echo "Press Enter when you've completed the frontend tests..."
read

# 4. Check logs for errors
echo -e "${BLUE}Checking logs for cart-related errors...${NC}"
echo "Backend logs:"
grep -i "error" backend/logs/app.log | grep -i "cart" | tail -n 20
echo
echo "Frontend logs (check browser console for more details)"

# 5. Cleanup
echo -e "${BLUE}Cleaning up...${NC}"
# Kill the server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping development server (PID: $SERVER_PID)..."
    kill $SERVER_PID
    echo "Server stopped."
fi

echo -e "${GREEN}Cart testing completed!${NC}"
echo "Finished at $(date)"
