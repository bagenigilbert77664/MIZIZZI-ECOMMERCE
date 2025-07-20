#!/bin/bash

# Script to test the cart routes in the Mizizzi E-commerce backend
# This script runs the cart routes test suite and displays the results

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mizizzi E-commerce Cart Routes Test ===${NC}"
echo -e "${YELLOW}Starting tests...${NC}"

# Change to the backend directory
cd backend || { echo -e "${RED}Error: backend directory not found${NC}"; exit 1; }

# Run the tests
echo -e "${BLUE}Running cart routes tests...${NC}"
python -m tests.test_cart_routes

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All cart route tests passed!${NC}"
else
    echo -e "${RED}Some cart route tests failed. Please check the output above for details.${NC}"
fi

echo -e "${YELLOW}Test run completed.${NC}"
