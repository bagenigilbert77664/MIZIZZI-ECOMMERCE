#!/bin/bash

# Make the test script executable and run it
chmod +x scripts/test-admin-endpoints.sh

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo "jq is not installed. Installing jq for JSON parsing..."

    # Try to install jq based on the OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y jq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        if command -v brew &> /dev/null; then
            brew install jq
        else
            echo "Please install jq manually: https://stedolan.github.io/jq/download/"
            exit 1
        fi
    else
        echo "Please install jq manually: https://stedolan.github.io/jq/download/"
        exit 1
    fi
fi

# Run the admin tests
echo "Starting Admin API Tests..."
./scripts/test-admin-endpoints.sh
