"""
Validation utilities for Mizizzi E-commerce platform.
Contains reusable validation functions and helpers.
"""
import re
import string
import json
import html
from datetime import datetime
from email_validator import validate_email, EmailNotValidError
from flask import current_app
from werkzeug.security import check_password_hash
from typing import Any, Union, Optional, List, Dict

# Try to import phonenumbers, with fallback
try:
    import phonenumbers
    PHONENUMBERS_AVAILABLE = True
except ImportError:
    PHONENUMBERS_AVAILABLE = False
    # Create a mock phonenumbers module for basic functionality
    class MockPhoneNumbers:
        @staticmethod
        def parse(phone, country):
            return phone

        @staticmethod
        def is_valid_number(phone):
            return len(str(phone).strip()) >= 10

    phonenumbers = MockPhoneNumbers()

# ----------------------
# General Validators
# ----------------------

def is_valid_string(value, min_length=1, max_length=None, pattern=None):
    """Validate string length and pattern if provided."""
    if not isinstance(value, str):
        return False
    if len(value.strip()) < min_length:
        return False
    if max_length and len(value) > max_length:
        return False
    if pattern and not re.match(pattern, value):
        return False
    return True


def is_valid_number(value, min_value=None, max_value=None):
    """Validate if value is a number within specified range."""
    try:
        num = float(value)
        if min_value is not None and num < min_value:
            return False
        if max_value is not None and num > max_value:
            return False
        return True
    except (ValueError, TypeError):
        return False


def is_valid_integer(value, min_value=None, max_value=None):
    """Validate if value is an integer within specified range."""
    try:
        if isinstance(value, float) and value != int(value):
            return False
        num = int(value)
        if min_value is not None and num < min_value:
            return False
        if max_value is not None and num > max_value:
            return True
    except (ValueError, TypeError):
        return False


def is_valid_email(email):
    """Validate email format using email_validator library."""
    if email is None:
        return False
    try:
        validate_email(email, check_deliverability=False)
        return True
    except EmailNotValidError:
        return False


def is_valid_url(url):
    """Validate URL format."""
    if url is None:
        return False
    pattern = r'^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$'
    return bool(re.match(pattern, url))


def is_valid_date(date_str, format='%Y-%m-%d'):
    """Validate date string against specified format."""
    try:
        datetime.strptime(date_str, format)
        return True
    except (ValueError, TypeError):
        return False


def sanitize_string(value):
    """Remove potentially dangerous characters from string and escape XSS payloads."""
    if not isinstance(value, str):
        return ""
    value = html.escape(value)
    # Remove script tags specifically
    value = re.sub(r'<script.*?</script>', '', value, flags=re.DOTALL)
    return value.strip()


def sanitize_html(value):
    """Sanitize HTML content but preserve basic formatting."""
    if not isinstance(value, str):
        return ""
    allowed_tags = ['p', 'br', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    value = value.lower()
    for tag in ['script', 'iframe', 'object', 'embed', 'style', 'form', 'input']:
        value = re.sub(r'<\s*' + tag + r'[^>]*>.*?<\s*/\s*' + tag + r'\s*>', '', value, flags=re.DOTALL)
    value = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '', value)
    value = re.sub(r'href\s*=\s*["\']javascript:[^"\']*["\']', 'href="#"', value)
    value = re.sub(r'<\s*([a-z][a-z0-9]*)\s+>', r'<\1>', value)
    return value.strip()


# ----------------------
# Kenya-Specific Validators
# ----------------------

def is_valid_kenyan_phone(phone_number):
    """Validate Kenyan phone numbers."""
    phone = str(phone_number).strip()
    kenyan_pattern = r'^(?:\+254|254|0)([17]\d{8})$'
    if not re.match(kenyan_pattern, phone):
        return False

    if not PHONENUMBERS_AVAILABLE:
        # Basic validation when phonenumbers library is not available
        return True

    try:
        if phone.startswith('0'):
            phone = '+254' + phone[1:]
        elif not phone.startswith('+'):
            phone = '+' + phone
        parsed_number = phonenumbers.parse(phone, "KE")
        return phonenumbers.is_valid_number(parsed_number)
    except:
        return False


def is_valid_kenyan_id(id_number):
    """Validate Kenyan National ID number format."""
    pattern = r'^\d{7,8}$'
    return bool(re.match(pattern, str(id_number).strip()))


def is_valid_kenyan_postal_code(postal_code):
    """Validate Kenyan postal code format."""
    pattern = r'^\d{5}$'
    return bool(re.match(pattern, str(postal_code).strip()))


def is_valid_nairobi_area(area):
    """Validate if the area is within Nairobi."""
    nairobi_areas = [
        'cbd', 'westlands', 'kilimani', 'karen', 'lavington', 'kileleshwa',
        'parklands', 'eastleigh', 'south b', 'south c', 'industrial area',
        'upperhill', 'ngara', 'huruma', 'mathare', 'kariobangi', 'kayole',
        'embakasi', 'pipeline', 'donholm', 'buruburu', 'umoja', 'komarock',
        'kasarani', 'roysambu', 'kahawa', 'githurai', 'zimmerman', 'kangemi',
        'dagoretti', 'kawangware', 'riruta', 'rongai', 'langata', 'kibera',
        'madaraka', 'nairobi west', 'ngong road', 'hurlingham', 'yaya',
        'valley arcade', 'jamhuri', 'woodley', 'adams arcade', 'golf course',
        'nyayo highrise', 'tassia', 'fedha', 'imara daima', 'utawala', 'ruai',
        'ruaka', 'kikuyu', 'uthiru', 'kinoo', 'kabete', 'spring valley',
        'loresho', 'mountain view', 'kitisuru'
    ]
    return str(area).lower().strip() in nairobi_areas


def is_valid_mpesa_code(code):
    """Validate M-Pesa transaction code format."""
    if code is None:
        return False
    pattern = r'^[A-Z][A-Z0-9]{9}$'
    return bool(re.match(pattern, str(code).strip()))


# ----------------------
# Security Validators
# ----------------------

def is_strong_password(password):
    """Validate password strength."""
    if not isinstance(password, str) or len(password) < 8:
        return False
    has_uppercase = any(c.isupper() for c in password)
    has_lowercase = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in string.punctuation for c in password)
    return has_uppercase and has_lowercase and has_digit and has_special


def verify_password(hashed_password, password):
    """Verify password against hashed password."""
    return check_password_hash(hashed_password, password)


def is_valid_json(json_str):
    """Validate if string is valid JSON."""
    try:
        json.loads(json_str)
        return True
    except (ValueError, TypeError):
        return False


def is_safe_redirect_url(url):
    """Validate if URL is safe for redirection."""
    if not url:
        return False
    if url.startswith('/') and not url.startswith('//'):
        return True
    allowed_hosts = current_app.config.get('ALLOWED_HOSTS', [])
    parsed_url = re.match(r'^(https?:\/\/)?([^\/]+)', url)
    if parsed_url:
        host = parsed_url.group(2)
        return host in allowed_hosts
    return False


# ----------------------
# Additional Validation Utilities (New additions)
# ----------------------

def validate_name(name: str, min_length: int = 2, max_length: int = 50) -> bool:
    """
    Validate a person's name.
    - Only letters, spaces, hyphens, and apostrophes allowed.
    - Length between min_length and max_length.
    Args:
        name: Name string to validate
        min_length: Minimum length (default 2)
        max_length: Maximum length (default 50)
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(name, str):
        return False
    name = name.strip()
    if not (min_length <= len(name) <= max_length):
        return False
    pattern = r"^[A-Za-z\s\-']+$"
    return bool(re.match(pattern, name))


def validate_phone(phone: str, country_code: str = 'KE') -> bool:
    """
    Validate phone number format for the specified country.

    Args:
        phone: Phone number to validate
        country_code: Country code (default: 'KE' for Kenya)

    Returns:
        True if phone is valid, False otherwise
    """
    if not phone or not isinstance(phone, str):
        return False

    # For Kenya specifically
    if country_code == 'KE':
        return is_valid_kenyan_phone(phone)

    # General phone validation for other countries
    try:
        parsed_number = phonenumbers.parse(phone, country_code)
        return phonenumbers.is_valid_number(parsed_number)
    except:
        # Fallback to basic validation
        phone_pattern = r'^\+?[\d\s\-()]{10,15}$'
        return bool(re.match(phone_pattern, phone.strip()))


def is_valid_phone(phone: str) -> bool:
    """
    Check if phone number format is valid.

    Args:
        phone: Phone number to validate

    Returns:
        True if phone is valid, False otherwise
    """
    if not phone:
        return False

    # Basic phone validation - can be enhanced
    phone_pattern = r'^\+?[\d\s\-()]{10,15}$'
    return bool(re.match(phone_pattern, phone))


def is_valid_string_length(value: str, min_length: Optional[int] = None, max_length: Optional[int] = None) -> bool:
    """
    Validate string length.

    Args:
        value: String to validate
        min_length: Minimum allowed length (optional)
        max_length: Maximum allowed length (optional)

    Returns:
        True if string length is valid, False otherwise
    """
    if not isinstance(value, str):
        return False

    length = len(value)

    if min_length is not None and length < min_length:
        return False

    if max_length is not None and length > max_length:
        return False

    return True


def is_valid_datetime(datetime_str: str, datetime_format: str = '%Y-%m-%d %H:%M:%S') -> bool:
    """
    Validate datetime string format.

    Args:
        datetime_str: Datetime string to validate
        datetime_format: Expected datetime format (default: '%Y-%m-%d %H:%M:%S')

    Returns:
        True if datetime is valid, False otherwise
    """
    if not datetime_str or not isinstance(datetime_str, str):
        return False

    try:
        datetime.strptime(datetime_str, datetime_format)
        return True
    except ValueError:
        return False


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength and return detailed feedback.

    Args:
        password: Password to validate

    Returns:
        Dictionary with validation results and feedback
    """
    if not isinstance(password, str):
        return {
            'valid': False,
            'message': 'Password must be a string',
            'score': 0
        }

    issues = []
    score = 0

    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    else:
        score += 1

    if not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
    else:
        score += 1

    if not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
    else:
        score += 1

    if not re.search(r'\d', password):
        issues.append("Password must contain at least one number")
    else:
        score += 1

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        issues.append("Password must contain at least one special character")
    else:
        score += 1

    if len(issues) == 0:
        return {"valid": True, "message": "Password is strong", "score": score}
    else:
        return {"valid": False, "message": "; ".join(issues), "score": score}


def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """
    Validate file extension.

    Args:
        filename: Name of the file
        allowed_extensions: List of allowed extensions (without dots)

    Returns:
        True if extension is allowed, False otherwise
    """
    if not filename or not isinstance(filename, str):
        return False

    if not allowed_extensions:
        return True

    # Get file extension
    extension = filename.lower().split('.')[-1] if '.' in filename else ''

    return extension in [ext.lower() for ext in allowed_extensions]


def validate_file_size(file_size: int, max_size_mb: float) -> bool:
    """
    Validate file size.

    Args:
        file_size: File size in bytes
        max_size_mb: Maximum allowed size in MB

    Returns:
        True if file size is within limit, False otherwise
    """
    if not isinstance(file_size, (int, float)) or file_size < 0:
        return False

    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes


def normalize_phone_number(phone: str, country_code: str = '+254') -> Optional[str]:
    """
    Normalize phone number to international format.

    Args:
        phone: Phone number to normalize
        country_code: Default country code (default: '+254' for Kenya)

    Returns:
        Normalized phone number or None if invalid
    """
    if not phone or not isinstance(phone, str):
        return None

    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone)

    # Handle different formats
    if cleaned.startswith('+'):
        return cleaned
    elif cleaned.startswith('254'):
        return f'+{cleaned}'
    elif cleaned.startswith('0'):
        return f'{country_code}{cleaned[1:]}'
    elif len(cleaned) == 9:  # Assuming 9-digit local number
        return f'{country_code}{cleaned}'

    return None


def validate_json_structure(data: Any, required_fields: List[str], optional_fields: List[str] = None) -> Dict[str, Any]:
    """
    Validate JSON data structure.

    Args:
        data: Data to validate
        required_fields: List of required field names
        optional_fields: List of optional field names

    Returns:
        Dictionary with validation results
    """
    if not isinstance(data, dict):
        return {
            'is_valid': False,
            'errors': ['Data must be a JSON object'],
            'missing_fields': [],
            'extra_fields': []
        }

    errors = []
    missing_fields = []
    extra_fields = []

    # Check required fields
    for field in required_fields:
        if field not in data:
            missing_fields.append(field)
            errors.append(f'Missing required field: {field}')

    # Check for extra fields
    allowed_fields = set(required_fields + (optional_fields or []))
    for field in data.keys():
        if field not in allowed_fields:
            extra_fields.append(field)

    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'missing_fields': missing_fields,
        'extra_fields': extra_fields
    }


def clean_html(text: str) -> str:
    """
    Remove HTML tags from text.

    Args:
        text: Text that may contain HTML

    Returns:
        Text with HTML tags removed
    """
    if not isinstance(text, str):
        return ''

    # Remove HTML tags
    clean_text = re.sub(r'<[^>]+>', '', text)

    # Decode common HTML entities
    html_entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    }

    for entity, char in html_entities.items():
        clean_text = clean_text.replace(entity, char)

    return clean_text.strip()


def validate_slug(slug: str) -> bool:
    """
    Validate URL slug format.

    Args:
        slug: Slug to validate

    Returns:
        True if slug is valid, False otherwise
    """
    if not slug or not isinstance(slug, str):
        return False

    # Slug should only contain lowercase letters, numbers, and hyphens
    # Should not start or end with hyphen
    slug_pattern = r'^[a-z0-9]+(?:-[a-z0-9]+)*$'
    return bool(re.match(slug_pattern, slug))


def generate_slug(text: str) -> str:
    """
    Generate a URL-friendly slug from text.

    Args:
        text: Text to convert to slug

    Returns:
        Generated slug
    """
    if not isinstance(text, str):
        return ''

    # Convert to lowercase
    slug = text.lower()

    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)

    # Remove leading/trailing hyphens
    slug = slug.strip('-')

    return slug


def get_password_strength_label(score: int) -> str:
    """
    Get password strength label based on score.

    Args:
        score: Password strength score

    Returns:
        Strength label
    """
    if score <= 1:
        return 'Very Weak'
    elif score == 2:
        return 'Weak'
    elif score == 3:
        return 'Fair'
    elif score == 4:
        return 'Good'
    else:
        return 'Strong'
