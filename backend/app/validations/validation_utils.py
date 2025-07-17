"""
Validation utilities for Mizizzi E-commerce platform.
Contains reusable validation functions and helpers.
"""
import re
import phonenumbers
import string
import json
import html
from datetime import datetime
from email_validator import validate_email, EmailNotValidError
from flask import current_app
from werkzeug.security import check_password_hash

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
           return False
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
