import requests
import json

# Base URL of your backend API
BASE_URL = "http://localhost:5000"  # Change this if your backend is running on a different port or host

def test_email_sending():
    """Test the email sending functionality"""

    # Endpoint URL
    url = f"{BASE_URL}/api/test-email"

    # Make the request
    try:
        response = requests.get(url)

        # Print the response
        print("Status Code:", response.status_code)
        print("Response:")
        print(json.dumps(response.json(), indent=4))

        # Check if successful
        if response.status_code == 200 and response.json().get('success'):
            print("\n✅ Email test successful!")
            print(f"Verification code: {response.json().get('verification_code')}")
            print("Please check the email inbox for REDACTED-SENDER-EMAIL")
        else:
            print("\n❌ Email test failed!")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    print("Testing email functionality...")
    test_email_sending()
