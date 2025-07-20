#!/bin/bash

# Script to run cart-related tests for the Mizizzi E-commerce backend
# This script runs both the cart routes tests and cart validation tests

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mizizzi E-commerce Cart Tests ===${NC}"
echo -e "${YELLOW}Starting cart testing...${NC}"

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the cart routes tests
echo -e "\n${BLUE}=== Running Cart Routes Tests ===${NC}"
python -m pytest backend/app/tests/test_cart_routes.py -v
ROUTES_RESULT=$?

# Run the cart validation tests
echo -e "\n${BLUE}=== Running Cart Validation Tests ===${NC}"
python -m pytest backend/app/tests/test_cart_validation.py -v
VALIDATION_RESULT=$?

# Check the results
echo -e "\n${BLUE}=== Test Results Summary ===${NC}"

if [ $ROUTES_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Cart Routes Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Cart Routes Tests: FAILED${NC}"
fi

if [ $VALIDATION_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Cart Validation Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Cart Validation Tests: FAILED${NC}"
fi

if [ $ROUTES_RESULT -eq 0 ] && [ $VALIDATION_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}All cart tests passed successfully!${NC}"
else
    echo -e "\n${RED}Some cart tests failed. Please check the output above for details.${NC}"
    exit 1
fi

echo -e "${YELLOW}Test run completed.${NC}"
