"""
Pesapal Authentication Manager
Handles token management, caching, and authentication with Pesapal API
"""

import os
import json
import logging
import requests
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Any
import threading

# Setup logging
logger = logging.getLogger(__name__)

class PesapalAuthManager:
    """Manages Pesapal authentication and token caching"""

    def __init__(self, config=None):
        """Initialize auth manager with configuration"""
        if config:
            self.consumer_key = config.consumer_key
            self.consumer_secret = config.consumer_secret
            self.environment = config.environment
            self.auth_url = config.auth_url
        else:
            # Fallback to environment variables
            self.environment = os.getenv('PESAPAL_ENVIRONMENT', 'production')

            if self.environment == 'production':
                self.consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', 'MneI7qziaBzoGPuRhd1QZNTjZedp5Eqh')
                self.consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', 'Iy98/30kmlhg3/pjG1Wsneay9/Y=')
                self.auth_url = "https://pay.pesapal.com/v3/api/Auth/RequestToken"
            else:
                self.consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', 'qkio1BGGYAXTu2JOfm7XSXNjRrK5NpUJ')
                self.consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', 'osGQ364R49cXKeOYSpaOnT++rHs=')
                self.auth_url = "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken"

        # Token cache
        self._token_cache = {}
        self._cache_lock = threading.Lock()

        # Request settings
        self.max_retries = 3
        self.retry_delay = 1.0
        self.request_timeout = 30

        logger.info(f"PesapalAuthManager initialized for {self.environment}")
        logger.info(f"Auth URL: {self.auth_url}")

    def get_access_token(self) -> Optional[str]:
        """
        Get access token with caching and retry logic

        Returns:
            Access token string or None if failed
        """
        with self._cache_lock:
            # Check if we have a valid cached token
            cached_token = self._get_cached_token()
            if cached_token:
                logger.info("Using cached access token")
                return cached_token

            # Request new token
            return self._request_new_token()

    def _get_cached_token(self) -> Optional[str]:
        """Get cached token if still valid"""
        if not self._token_cache:
            return None

        token_data = self._token_cache
        expires_at = token_data.get('expires_at')

        if not expires_at:
            return None

        # Check if token is still valid (with 30 second buffer)
        current_time = datetime.now(timezone.utc)
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))

        if current_time < (expires_at - timedelta(seconds=30)):
            return token_data.get('token')

        # Token expired, clear cache
        self._token_cache = {}
        return None

    def _request_new_token(self) -> Optional[str]:
        """Request new access token from Pesapal"""
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Requesting Pesapal access token (attempt {attempt}/{self.max_retries})")

                # Prepare request
                headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }

                payload = {
                    'consumer_key': self.consumer_key,
                    'consumer_secret': self.consumer_secret
                }

                # Make request
                response = requests.post(
                    self.auth_url,
                    headers=headers,
                    json=payload,
                    timeout=self.request_timeout
                )

                logger.info(f"Pesapal auth response: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                logger.info(f"Response text: {response.text}")

                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        logger.info(f"Extracting token from response: {response_data}")

                        # Extract token from response
                        token = self._extract_token_from_response(response_data)
                        if token:
                            return token
                        else:
                            logger.error("No token found in response")
                            logger.error(f"Response keys: {list(response_data.keys())}")

                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON response: {e}")
                        logger.error(f"Response text: {response.text}")

                else:
                    logger.error(f"Auth request failed: {response.status_code} - {response.text}")

                # Retry logic
                if attempt < self.max_retries:
                    delay = self.retry_delay * attempt
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)

            except requests.exceptions.RequestException as e:
                logger.error(f"Auth request exception: {e}")
                if attempt < self.max_retries:
                    delay = self.retry_delay * attempt
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)

            except Exception as e:
                logger.error(f"Unexpected error during auth: {e}")
                break

        logger.error("Failed to obtain access token after all retries")
        return None

    def _extract_token_from_response(self, response_data: Dict[str, Any]) -> Optional[str]:
        """Extract token from Pesapal response"""
        try:
            # Check for error first
            if response_data.get('error'):
                error_info = response_data['error']
                logger.error(f"Pesapal auth error: {error_info}")
                return None

            # Extract token
            token = response_data.get('token')
            if not token:
                logger.error("No token field in response")
                return None

            logger.info("Token extracted from 'token' field")

            # Extract expiry
            expiry_str = response_data.get('expiryDate')
            if expiry_str:
                logger.info(f"Expiry extracted from 'expiryDate' field: {expiry_str}")

                # Parse expiry date
                try:
                    if expiry_str.endswith('Z'):
                        expires_at = datetime.fromisoformat(expiry_str.replace('Z', '+00:00'))
                    else:
                        expires_at = datetime.fromisoformat(expiry_str)

                    # Calculate seconds until expiry
                    current_time = datetime.now(timezone.utc)
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)

                    seconds_until_expiry = int((expires_at - current_time).total_seconds())
                    logger.info(f"Calculated seconds until expiry: {seconds_until_expiry}")

                except Exception as e:
                    logger.warning(f"Could not parse expiry date: {e}")
                    # Default to 5 minutes
                    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
                    seconds_until_expiry = 300
            else:
                # Default expiry if not provided
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
                seconds_until_expiry = 300
                logger.warning("No expiry date provided, defaulting to 5 minutes")

            # Cache the token
            self._token_cache = {
                'token': token,
                'expires_at': expires_at,
                'obtained_at': datetime.now(timezone.utc)
            }

            logger.info("Successfully obtained Pesapal access token")
            logger.info(f"Token expires at: {expires_at}")

            return token

        except Exception as e:
            logger.error(f"Error extracting token: {e}")
            return None

    def get_token_info(self) -> Dict[str, Any]:
        """Get information about the current token"""
        if not self._token_cache:
            return {
                'has_token': False,
                'message': 'No token cached'
            }

        token_data = self._token_cache
        expires_at = token_data.get('expires_at')
        obtained_at = token_data.get('obtained_at')

        current_time = datetime.now(timezone.utc)

        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))

        time_until_expiry = int((expires_at - current_time).total_seconds()) if expires_at else 0

        return {
            'has_token': True,
            'expires_at': expires_at.isoformat() if expires_at else None,
            'obtained_at': obtained_at.isoformat() if obtained_at else None,
            'time_until_expiry': max(0, time_until_expiry),
            'is_valid': time_until_expiry > 30  # 30 second buffer
        }

    def clear_token_cache(self):
        """Clear the token cache"""
        with self._cache_lock:
            self._token_cache = {}
            logger.info("Token cache cleared")

    def test_authentication(self) -> Dict[str, Any]:
        """Test authentication with Pesapal"""
        try:
            token = self.get_access_token()

            if token:
                token_info = self.get_token_info()
                return {
                    'success': True,
                    'message': 'Authentication successful',
                    'token_info': token_info
                }
            else:
                return {
                    'success': False,
                    'message': 'Failed to obtain access token'
                }

        except Exception as e:
            return {
                'success': False,
                'message': f'Authentication test failed: {str(e)}'
            }

# Global auth manager instances
_auth_managers = {}
_auth_lock = threading.Lock()

def get_auth_manager(environment: str = None) -> PesapalAuthManager:
    """Get auth manager instance for environment"""
    environment = environment or os.getenv('PESAPAL_ENVIRONMENT', 'production')

    with _auth_lock:
        if environment not in _auth_managers:
            _auth_managers[environment] = PesapalAuthManager()

        return _auth_managers[environment]

def cleanup_expired_tokens() -> int:
    """Clean up expired tokens from all auth managers"""
    cleaned_count = 0

    with _auth_lock:
        for env, auth_manager in _auth_managers.items():
            if auth_manager._token_cache:
                expires_at = auth_manager._token_cache.get('expires_at')
                if expires_at:
                    current_time = datetime.now(timezone.utc)
                    if isinstance(expires_at, str):
                        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))

                    if current_time >= expires_at:
                        auth_manager._token_cache = {}
                        cleaned_count += 1
                        logger.info(f"Cleaned expired token for {env} environment")

    return cleaned_count

def test_all_auth_managers() -> Dict[str, Any]:
    """Test all auth manager instances"""
    results = {}

    for env in ['production', 'sandbox']:
        try:
            auth_manager = get_auth_manager(env)
            results[env] = auth_manager.test_authentication()
        except Exception as e:
            results[env] = {
                'success': False,
                'message': f'Test failed: {str(e)}'
            }

    return results

# Export public functions
__all__ = [
    'PesapalAuthManager',
    'get_auth_manager',
    'cleanup_expired_tokens',
    'test_all_auth_managers'
]
