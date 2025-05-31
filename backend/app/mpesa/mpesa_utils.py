"""
Utility functions for M-PESA integration.
"""
import re
import logging

# Set up logger
logger = logging.getLogger(__name__)

def format_phone_number(phone_number):
    """
    Format a phone number to the required format for M-PESA API.

    Args:
        phone_number (str): Phone number to format

    Returns:
        str: Formatted phone number
    """
    # Remove any non-digit characters
    phone = re.sub(r'\D', '', phone_number)

    # Handle different formats
    if phone.startswith('0'):
        # Convert 07XXXXXXXX or 01XXXXXXXX to 254XXXXXXXX
        phone = '254' + phone[1:]
    elif phone.startswith('+'):
        # Remove the + sign
        phone = phone[1:]
    elif phone.startswith('7') or phone.startswith('1'):
        # If it starts with 7 or 1 and is 9 digits, add 254 prefix
        if len(phone) == 9:
            phone = '254' + phone
    elif not phone.startswith('254'):
        # Add country code if not present
        phone = '254' + phone

    return phone

def is_valid_kenyan_phone(phone_number):
    """
    Check if a phone number is a valid Kenyan phone number.

    Args:
        phone_number (str): Phone number to validate

    Returns:
        bool: True if valid, False otherwise
    """
    # Remove any non-digit characters
    phone = re.sub(r'\D', '', phone_number)

    # Check if it's a valid Kenyan phone number
    # Valid formats: 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXX, +254XXXXXXXX
    kenyan_regex = r'^(?:254|\+254|0)?(7|1)[0-9]{8}$'

    return bool(re.match(kenyan_regex, phone))

def format_amount(amount):
    """
    Format an amount to the required format for M-PESA API.

    Args:
        amount (float/int/str): Amount to format

    Returns:
        int: Formatted amount as integer
    """
    # Convert to float first
    try:
        amount_float = float(amount)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid amount: {amount}")

    # Convert to integer (M-PESA API requires integer amounts)
    return int(amount_float)
