"""
M-PESA Integration Package for Mizizzi E-commerce Platform.
"""

from .direct_mpesa import (
    initiate_stk_push,
    query_stk_status,
    process_stk_callback,
    format_phone_number,
    validate_amount,
    generate_access_token,
    simulate_stk_push,
    simulate_callback,
    test_module,
    get_module_info,
    MpesaError
)

__version__ = "2.0.0"
__author__ = "Mizizzi Development Team"

__all__ = [
    'initiate_stk_push',
    'query_stk_status',
    'process_stk_callback',
    'format_phone_number',
    'validate_amount',
    'generate_access_token',
    'simulate_stk_push',
    'simulate_callback',
    'test_module',
    'get_module_info',
    'MpesaError'
]
