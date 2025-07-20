#!/bin/bash

# filepath: backend/app/tests/user/run_tests.sh

# Test runner script for user authentication tests
# Usage: ./run_tests.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting User Authentication Test Suite${NC}"
echo "========================================"

# Set environment variables
export FLASK_ENV=testing
export TESTING=True
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Create test results directory
mkdir -p test_results

# Function to run tests with different configurations
run_test_suite() {
    local test_type=$1
    local test_file=$2
    local markers=$3

    echo -e "\n${YELLOW}Running $test_type tests...${NC}"

    if [ -n "$markers" ]; then
        pytest "$test_file" -m "$markers" -v --tb=short \
            --junitxml=test_results/${test_type}_results.xml \
            --cov=backend.routes.user.user \
            --cov-report=html:test_results/${test_type}_coverage \
            --cov-report=term-missing
    else
        pytest "$test_file" -v --tb=short \
            --junitxml=test_results/${test_type}_results.xml \
            --cov=backend.routes.user.user \
            --cov-report=html:test_results/${test_type}_coverage \
            --cov-report=term-missing
    fi
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        run_test_suite "unit" "backend/app/tests/user/test_user_auth.py" "unit"
        ;;
    "integration")
        run_test_suite "integration" "backend/app/tests/user/test_user_auth_integration.py" "integration"
        ;;
    "fast")
        run_test_suite "fast" "backend/app/tests/user/test_user_auth.py" "not slow"
        ;;
    "slow")
        run_test_suite "slow" "backend/app/tests/user/test_user_auth.py" "slow"
        ;;
    "all")
        echo -e "${YELLOW}Running all tests...${NC}"
        run_test_suite "all_unit" "backend/app/tests/user/test_user_auth.py" ""
        run_test_suite "all_integration" "backend/app/tests/user/test_user_auth_integration.py" ""
        ;;
    "coverage")
        echo -e "${YELLOW}Running tests with detailed coverage...${NC}"
        pytest backend/app/tests/user/test_user_auth.py backend/app/tests/user/test_user_auth_integration.py \
            -v --tb=short \
            --cov=backend.routes.user.user \
            --cov=backend.models.models \
            --cov=backend.validations \
            --cov-report=html:test_results/full_coverage \
            --cov-report=term-missing \
            --cov-fail-under=80
        ;;
    "help")
        echo "Usage: $0 [unit|integration|fast|slow|all|coverage|help]"
        echo ""
        echo "Options:"
        echo "  unit        - Run only unit tests"
        echo "  integration - Run only integration tests"
        echo "  fast        - Run only fast tests (exclude slow tests)"
        echo "  slow        - Run only slow tests"
        echo "  all         - Run all tests (default)"
        echo "  coverage    - Run all tests with detailed coverage report"
        echo "  help        - Show this help message"
        exit 0
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Test suite completed!${NC}"
echo "Results saved in test_results/ directory"

# Check if any tests failed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}Some tests failed. Check the output above for details.${NC}"
    exit 1
fi