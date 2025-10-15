"""
Payment validation schemas using Marshmallow.
Provides comprehensive validation for payment-related data.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from decimal import Decimal, InvalidOperation
import re
from typing import Dict, Any


class PesapalPaymentSchema(Schema):
    """Schema for validating Pesapal payment requests"""

    order_id = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=50),
        error_messages={'required': 'Order ID is required'}
    )

    amount = fields.Decimal(
        required=True,
        validate=validate.Range(min=Decimal('0.01'), max=Decimal('999999.99')),
        error_messages={'required': 'Amount is required'}
    )

    currency = fields.Str(
        missing='KES',
        validate=validate.OneOf(['KES', 'USD', 'EUR', 'GBP']),
        error_messages={'invalid': 'Invalid currency code'}
    )

    email = fields.Email(
        required=True,
        error_messages={'required': 'Email is required', 'invalid': 'Invalid email format'}
    )

    phone_number = fields.Str(
        validate=validate.Length(min=10, max=15),
        allow_none=True
    )

    first_name = fields.Str(
        validate=validate.Length(min=1, max=50),
        allow_none=True
    )

    last_name = fields.Str(
        validate=validate.Length(min=1, max=50),
        allow_none=True
    )

    description = fields.Str(
        validate=validate.Length(min=1, max=100),
        allow_none=True
    )

    callback_url = fields.Url(
        allow_none=True,
        error_messages={'invalid': 'Invalid callback URL format'}
    )

    notification_id = fields.Str(
        validate=validate.Length(min=1, max=50),
        allow_none=True
    )

    @validates('phone_number')
    def validate_phone_number(self, value):
        """Validate phone number format"""
        if value:
            # Remove any non-digit characters for validation
            digits_only = re.sub(r'\D', '', value)
            if not re.match(r'^254\d{9}$', digits_only):
                raise ValidationError('Phone number must be in format 254XXXXXXXXX')

    @validates('amount')
    def validate_amount_precision(self, value):
        """Validate amount has max 2 decimal places"""
        if value and value.as_tuple().exponent < -2:
            raise ValidationError('Amount cannot have more than 2 decimal places')


class PesapalCallbackSchema(Schema):
    """Schema for validating Pesapal callback data"""

    pesapal_transaction_tracking_id = fields.Str(
        required=True,
        validate=validate.Length(min=10, max=100),
        error_messages={'required': 'Transaction tracking ID is required'}
    )

    pesapal_merchant_reference = fields.Str(
        validate=validate.Length(min=1, max=100),
        allow_none=True
    )

    pesapal_notification_type = fields.Str(
        validate=validate.OneOf(['CHANGE', 'CANCELLATION']),
        allow_none=True
    )


class MpesaPaymentSchema(Schema):
    """Schema for validating M-PESA payment requests"""

    phone_number = fields.Str(
        required=True,
        validate=validate.Length(min=12, max=13),
        error_messages={'required': 'Phone number is required'}
    )

    amount = fields.Decimal(
        required=True,
        validate=validate.Range(min=Decimal('1.00'), max=Decimal('70000.00')),
        error_messages={'required': 'Amount is required'}
    )

    order_id = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=50),
        error_messages={'required': 'Order ID is required'}
    )

    description = fields.Str(
        validate=validate.Length(min=1, max=100),
        allow_none=True
    )

    @validates('phone_number')
    def validate_mpesa_phone_number(self, value):
        """Validate M-PESA phone number format"""
        if not re.match(r'^254[17]\d{8}$', value):
            raise ValidationError('Phone number must be in format 254XXXXXXXXX (Safaricom or Airtel)')

    @validates('amount')
    def validate_mpesa_amount_precision(self, value):
        """Validate M-PESA amount has max 2 decimal places"""
        if value and value.as_tuple().exponent < -2:
            raise ValidationError('Amount cannot have more than 2 decimal places')


class MpesaCallbackSchema(Schema):
    """Schema for validating M-PESA callback data"""

    Body = fields.Dict(required=True)

    @validates('Body')
    def validate_callback_body(self, value):
        """Validate M-PESA callback body structure"""
        if 'stkCallback' not in value:
            raise ValidationError('Missing stkCallback in callback body')

        stk_callback = value['stkCallback']
        required_fields = ['CheckoutRequestID', 'ResultCode', 'ResultDesc']

        for field in required_fields:
            if field not in stk_callback:
                raise ValidationError(f'Missing {field} in stkCallback')


class PaymentStatusSchema(Schema):
    """Schema for payment status responses"""

    transaction_id = fields.Str(required=True)
    status = fields.Str(
        required=True,
        validate=validate.OneOf([
            'initiated', 'pending', 'completed', 'failed',
            'cancelled', 'expired', 'refunded'
        ])
    )
    amount = fields.Decimal(required=True)
    currency = fields.Str(required=True)
    created_at = fields.DateTime(required=True)
    updated_at = fields.DateTime(allow_none=True)
    receipt_number = fields.Str(allow_none=True)
    error_message = fields.Str(allow_none=True)
