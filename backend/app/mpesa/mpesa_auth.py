"""
M-PESA Authentication Module for Mizizzi E-commerce Platform.
Handles token generation for M-PESA API requests.
"""
import base64
import requests
import logging
from datetime import datetime, timedelta

from .mpesa_credentials import CONSUMER_KEY, CONSUMER_SECRET, get_token_url

# Set up logger
logger = logging.getLogger(__name__)

# Cache for the access token
token_cache = {
    'token': None,
    'expiry': None
}

def generate_access_token():
    """
    Generate an access token for the M-PESA API.

    Returns:
        str: The access token

    Raises:
        Exception: If token generation fails
    """
    # Check if we have a cached token that's still valid
    now = datetime.now()
    if token_cache['token'] and token_cache['expiry'] and token_cache['expiry'] > now:
        logger.debug("Using cached M-PESA token")
        return token_cache['token']

    try:
        # Encode credentials
        auth_string = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
        encoded_credentials = base64.b64encode(auth_string.encode()).decode()

        # Set up headers
        headers = {
            "Authorization": f"Basic {encoded_credentials}"
        }

        # Make the request
        url = get_token_url()
        logger.info(f"Generating M-PESA access token from {url}")

        response = requests.get(url, headers=headers)

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"Token generation failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            raise Exception(f"Token generation failed with status code {response.status_code}: {response.text}")

        # Parse the response
        response_data = response.json()

        # Extract the access token
        if "access_token" in response_data:
            token = response_data["access_token"]

            # Cache the token (tokens are valid for 1 hour, but we'll cache for 50 minutes to be safe)
            token_cache['token'] = token
            token_cache['expiry'] = now + timedelta(minutes=50)

            logger.info("M-PESA access token generated successfully")
            return token
        else:
            logger.error(f"Token generation failed: {response_data}")
            raise Exception(f"Token generation failed: {response_data}")

    except Exception as e:
        logger.error(f"Error generating access token: {str(e)}")
        raise Exception(f"Failed to generate access token: {str(e)}")
