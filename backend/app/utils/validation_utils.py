"""Validation utilities for the Mizizzi E-commerce Platform
Provides comprehensive validation functions for various data types and business logic."""

import re
import logging
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, Union

logger = logging.getLogger(__name__)

def validate_phone_number(phone: str) -> Dict[str, Any]:
    """
    Validate and format phone number for M-PESA

    Args:
        phone: Phone number string

    Returns:
        Dict with validation result and formatted number
    """
    try:
        if not phone:
            return {"valid": False, "error": "Phone number is required"}

        # Remove all non-digit characters
        clean_phone = re.sub(r'\D', '', str(phone))

        if not clean_phone:
            return {"valid": False, "error": "Phone number must contain digits"}

        # Handle different formats
        if clean_phone.startswith('0'):
            # Convert 0712345678 to 254712345678
            clean_phone = '254' + clean_phone[1:]
        elif clean_phone.startswith('254'):
            # Already in correct format
            pass
        elif clean_phone.startswith('+254'):
            # Remove + sign
            clean_phone = clean_phone[1:]
        elif len(clean_phone) == 9:
            # Add country code
            clean_phone = '254' + clean_phone
        else:
            return {"valid": False, "error": "Invalid phone number format"}

        # Validate length (should be 12 digits for Kenya)
        if len(clean_phone) != 12:
            return {"valid": False, "error": "Phone number must be 12 digits"}

        # Validate Kenya mobile prefixes
        valid_prefixes = ['2547', '2541', '2570']  # Safaricom, Airtel, Telkom
        if not any(clean_phone.startswith(prefix) for prefix in valid_prefixes):
            return {"valid": False, "error": "Invalid Kenya mobile number"}

        return {
            "valid": True,
            "mpesa_format": clean_phone,
            "display_format": f"+{clean_phone[:3]} {clean_phone[3:6]} {clean_phone[6:9]} {clean_phone[9:]}"
        }

    except Exception as e:
        logger.error(f"Phone validation error: {str(e)}")
        return {"valid": False, "error": "Phone validation failed"}

def validate_payment_amount(amount: Union[str, int, float, Decimal]) -> Dict[str, Any]:
    """
    Validate payment amount

    Args:
        amount: Amount to validate

    Returns:
        Dict with validation result and decimal amount
    """
    try:
        if amount is None:
            return {"valid": False, "error": "Amount is required"}

        # Convert to Decimal for precise handling
        try:
            decimal_amount = Decimal(str(amount))
        except (InvalidOperation, ValueError):
            return {"valid": False, "error": "Invalid amount format"}

        # Check if amount is positive
        if decimal_amount <= 0:
            return {"valid": False, "error": "Amount must be positive"}

        # Check minimum amount (1 KES)
        if decimal_amount < Decimal('1.00'):
            return {"valid": False, "error": "Minimum amount is 1.00 KES"}

        # Check maximum amount (70,000 KES for M-PESA)
        if decimal_amount > Decimal('70000.00'):
            return {"valid": False, "error": "Maximum amount is 70,000.00 KES"}

        # Check decimal places (max 2)
        if decimal_amount.as_tuple().exponent < -2:
            return {"valid": False, "error": "Amount cannot have more than 2 decimal places"}

        return {
            "valid": True,
            "amount": decimal_amount,
            "formatted": f"{decimal_amount:,.2f}"
        }

    except Exception as e:
        logger.error(f"Amount validation error: {str(e)}")
        return {"valid": False, "error": "Amount validation failed"}

def sanitize_input(input_data: Any) -> str:
    """
    Sanitize input data to prevent XSS and other attacks

    Args:
        input_data: Data to sanitize

    Returns:
        Sanitized string
    """
    try:
        if input_data is None:
            return ""

        # Convert to string
        text = str(input_data)

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove script tags and content
        text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', text, flags=re.IGNORECASE)

        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\r', '\n']
        for char in dangerous_chars:
            text = text.replace(char, '')

        # Trim whitespace
        text = text.strip()

        # Limit length
        if len(text) > 1000:
            text = text[:1000]

        return text

    except Exception as e:
        logger.error(f"Input sanitization error: {str(e)}")
        return str(input_data)[:100] if input_data else ""

def validate_email(email: str) -> Dict[str, Any]:
    """
    Validate email address

    Args:
        email: Email address to validate

    Returns:
        Dict with validation result
    """
    try:
        if not email:
            return {"valid": False, "error": "Email is required"}

        # Basic email regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

        if not re.match(email_pattern, email):
            return {"valid": False, "error": "Invalid email format"}

        # Check length
        if len(email) > 254:
            return {"valid": False, "error": "Email too long"}

        return {"valid": True, "email": email.lower()}

    except Exception as e:
        logger.error(f"Email validation error: {str(e)}")
        return {"valid": False, "error": "Email validation failed"}

def validate_order_id(order_id: Any) -> Dict[str, Any]:
    """
    Validate order ID

    Args:
        order_id: Order ID to validate

    Returns:
        Dict with validation result
    """
    try:
        if not order_id:
            return {"valid": False, "error": "Order ID is required"}

        # Convert to string and sanitize
        order_id_str = sanitize_input(str(order_id))

        if not order_id_str:
            return {"valid": False, "error": "Invalid order ID"}

        # Check if it's a valid integer or UUID format
        if order_id_str.isdigit():
            # Integer ID
            order_id_int = int(order_id_str)
            if order_id_int <= 0:
                return {"valid": False, "error": "Order ID must be positive"}
            return {"valid": True, "order_id": order_id_str}

        # Check if it's a UUID format
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if re.match(uuid_pattern, order_id_str, re.IGNORECASE):
            return {"valid": True, "order_id": order_id_str}

        # Check if it's an alphanumeric order number
        if re.match(r'^[A-Za-z0-9_-]+$', order_id_str) and len(order_id_str) <= 50:
            return {"valid": True, "order_id": order_id_str}

        return {"valid": False, "error": "Invalid order ID format"}

    except Exception as e:
        logger.error(f"Order ID validation error: {str(e)}")
        return {"valid": False, "error": "Order ID validation failed"}

def validate_transaction_id(transaction_id: Any) -> Dict[str, Any]:
    """
    Validate transaction ID

    Args:
        transaction_id: Transaction ID to validate

    Returns:
        Dict with validation result
    """
    try:
        if not transaction_id:
            return {"valid": False, "error": "Transaction ID is required"}

        transaction_id_str = sanitize_input(str(transaction_id))

        if not transaction_id_str:
            return {"valid": False, "error": "Invalid transaction ID"}

        # Check if it's a UUID format
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if re.match(uuid_pattern, transaction_id_str, re.IGNORECASE):
            return {"valid": True, "transaction_id": transaction_id_str}

        return {"valid": False, "error": "Invalid transaction ID format"}

    except Exception as e:
        logger.error(f"Transaction ID validation error: {str(e)}")
        return {"valid": False, "error": "Transaction ID validation failed"}

# Export all validation functions
__all__ = [
    'validate_email',
    'validate_phone_number',
    'validate_payment_amount',
    'validate_order_id',
    'validate_transaction_id'
]
