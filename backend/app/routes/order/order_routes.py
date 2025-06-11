"""
Order management routes for Mizizzi E-commerce platform.
Handles orders, payments, reviews, and wishlists.
"""
# Standard Libraries
import os
import json
import uuid
import secrets
import re
import random
import string
import logging
from datetime import datetime, timedelta
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response, url_for, redirect
from flask_cors import cross_origin
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt
)

# Database & ORM
from sqlalchemy import or_, desc, func
from ...configuration.extensions import db, ma, mail, cache, cors

# Models
from ...models.models import (
    User, UserRole, Product, ProductVariant, Review,
    CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
    OrderStatus, PaymentStatus, CouponType, Address, Category
)

# Schemas
from ...schemas.schemas import (
    product_schema, review_schema, reviews_schema, cart_item_schema,
    order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
    coupon_schema, payment_schema, payments_schema
)

# Validations & Decorators
from ...validations.validation import (
    validate_order_creation, validate_order_status_update,
    validate_payment_creation, validate_mpesa_payment,
    validate_review_creation, validate_review_update,
    admin_required
)

# HTTP Requests
import requests

# Flask Mail
from flask_mail import Message  # Make sure flask-mail is installed: pip install Flask-Mail

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
order_routes = Blueprint('order_routes', __name__)

# Helper Functions
def get_pagination_params():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def paginate_response(query, schema, page, per_page):
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": schema.dump(paginated.items),
        "pagination": {
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total_pages": paginated.pages,
            "total_items": paginated.total
        }
    }

def send_email(to, subject, template):
    """Send email using Brevo API directly since we know it works."""
    try:
        # Get the Brevo API key from configuration
        brevo_api_key = current_app.config.get('BREVO_API_KEY', 'REDACTED-BREVO-KEY')

        if not brevo_api_key:
            logger.error("BREVO_API_KEY not configured")
            return False

        url = "https://api.brevo.com/v3/smtp/email"

        # Prepare the payload for Brevo API
        payload = {
            "sender": {
                "name": "MIZIZZI",
                "email": "REDACTED-SENDER-EMAIL"  # Use the verified sender email
            },
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": template,
            "headers": {
                "X-Priority": "1",
                "X-MSMail-Priority": "High",
                "Importance": "High"
            }
        }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": brevo_api_key
        }

        logger.info(f"Sending email via Brevo API to {to}")
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Email sent via Brevo API. Status: {response.status_code}")
            return True
        else:
            logger.error(f"Failed to send email via Brevo API. Status: {response.status_code}. Response: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

def send_order_confirmation_email(order_id, to_email, customer_name):
    """Send an order confirmation email to the customer with actual ordered products."""
    try:
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found: {order_id}")
            return False

        # Format the date
        order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')

        # Get order items with product details
        order_items_html = ""
        subtotal = 0

        # Log the number of items for debugging
        logger.info(f"Processing {len(order.items)} items for order {order_id}")

        # Check if order has valid items
        if not order.items:
            logger.error(f"No items found for order {order_id}")
            order_items_html = """
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #cc3333;">
                    <div style="font-weight: bold; margin-bottom: 10px;">Order Item Data Error</div>
                    <div>We apologize, but there was an issue displaying your order items.</div>
                    <div>Our team has been notified and will contact you shortly with the correct information.</div>
                </td>
            </tr>
            """
        else:
            # Fetch all order items with their product details
            for item in order.items:
                # Get product details from database
                product = Product.query.get(item.product_id)
                if not product:
                    logger.warning(f"Product {item.product_id} not found for order item {item.id}")
                    # Add fallback row for missing product
                    order_items_html += f"""
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                            <div style="display: flex; align-items: center;">
                                <img src="/placeholder.svg?height=70&width=70" alt="Product Image Not Available"
                                     style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px; margin-right: 15px; border: 1px solid #e0e0e0;">
                                <div style="display: inline-block; vertical-align: top;">
                                    <div style="font-weight: 600; color: #1A1A1A; margin-bottom: 5px; font-size: 15px;">
                                        Order Item #{item.id} (Product Details Unavailable)
                                    </div>
                                    <div style="font-size: 13px; color: #777; font-style: italic;">
                                        Our team will contact you with the correct product information.
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">{item.quantity}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {item.price:,.2f}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {item.total:,.2f}</td>
                    </tr>
                    """
                    # Still add to subtotal even if product details are missing
                    subtotal += item.price * item.quantity
                    continue

                logger.info(f"Processing product: {product.name}, ID: {product.id}")

                # Get variant information if available
                variant_info = ""
                variant_name = ""
                if item.variant_id:
                    variant = ProductVariant.query.get(item.variant_id)
                    if variant:
                        variant_details = []
                        if variant.color:
                            variant_details.append(variant.color)
                        if variant.size:
                            variant_details.append(variant.size)
                        variant_name = " - " + ", ".join(variant_details) if variant_details else ""
                        variant_info = f"""
                        <div class="product-variant" style="color: #666; font-size: 13px; margin-top: 4px;">
                            {variant.color or ''} {variant.size or ''}
                        </div>
                        """

                # Get product collection/category if available
                collection_info = ""
                if hasattr(product, 'category_id') and product.category_id:
                    category = Category.query.get(product.category_id)
                    if category:
                        collection_info = f"""
                        <div style="font-size: 13px; color: #777; font-style: italic;">
                            {category.name}
                        </div>
                        """

                # Calculate item total
                item_total = item.price * item.quantity
                subtotal += item_total

                # Get product image
                product_image = product.thumbnail_url or "/placeholder.svg?height=70&width=70"
                if not product_image and hasattr(product, 'image_urls') and product.image_urls:
                    if isinstance(product.image_urls, list) and len(product.image_urls) > 0:
                        product_image = product.image_urls[0]
                    elif isinstance(product.image_urls, str):
                        try:
                            image_list = json.loads(product.image_urls)
                            if image_list and len(image_list) > 0:
                                product_image = image_list[0]
                        except Exception as img_err:
                            logger.error(f"Error parsing image_urls JSON: {str(img_err)}")
                            product_image = "/placeholder.svg?height=70&width=70"

                # Format price with commas for thousands
                formatted_price = "{:,.2f}".format(item.price)
                formatted_total = "{:,.2f}".format(item_total)

                # Add the item to the email HTML
                order_items_html += f"""
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                        <div style="display: flex; align-items: center;">
                            <img src="{product_image}" alt="{product.name}"
                                 style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px; margin-right: 15px; border: 1px solid #e0e0e0;">
                            <div style="display: inline-block; vertical-align: top;">
                                <div style="font-weight: 600; color: #1A1A1A; margin-bottom: 5px; font-size: 15px;">{product.name}{variant_name}</div>
                                {collection_info}
                                {variant_info}
                            </div>
                        </div>
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">{item.quantity}</td>
                    <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {formatted_price}</td>
                    <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {formatted_total}</td>
                </tr>
                """

        # If no items were processed, log an error and notify support
        if not order_items_html:
            logger.error(f"No items found in order data for order {order_id}. Items data: {order.items}")
            order_items_html = """
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; background-color: #fff3f3; border: 1px solid #ffcdd2;">
                    <div style="color: #c62828; font-weight: bold; margin-bottom: 10px; font-size: 16px;">
                        Order Item Data Error
                    </div>
                    <div style="color: #333; margin-bottom: 10px;">
                        We apologize, but there was an issue displaying your order items.
                    </div>
                    <div style="color: #333;">
                        Our customer service team has been notified and will contact you shortly with the correct information.
                    </div>
                </td>
            </tr>
            """

            # Alert customer service about the order data issue
            try:
                support_email = current_app.config.get('SUPPORT_EMAIL', 'support@mizizzi.com')
                alert_subject = f"URGENT: Order Data Issue - Order #{order.order_number}"
                alert_body = f"""
                <p>There was an issue with order item data for Order #{order.order_number} (ID: {order_id}).</p>
                <p>Customer: {customer_name} ({to_email})</p>
                <p>Order Date: {order.created_at}</p>
                <p>Total Amount: KSh {order.total_amount:,.2f}</p>
                <p>Please contact the customer immediately with the correct order information.</p>
                """
                send_email(support_email, alert_subject, alert_body)
            except Exception as alert_error:
                logger.error(f"Failed to send order data issue alert: {str(alert_error)}")

        # Calculate totals
        shipping_cost = order.shipping_cost or 0
        tax_amount = round(subtotal * 0.16)  # 16% VAT
        total = order.total_amount

        # Format totals with commas for thousands
        formatted_subtotal = "{:,.2f}".format(subtotal)
        formatted_shipping = "{:,.2f}".format(shipping_cost)
        formatted_tax = "{:,.2f}".format(tax_amount)
        formatted_total = "{:,.2f}".format(total)

        # Parse shipping address
        shipping_address = {}
        if isinstance(order.shipping_address, str):
            try:
                shipping_address = json.loads(order.shipping_address)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse shipping_address as JSON for order {order_id}")
                shipping_address = {}
        else:
            shipping_address = order.shipping_address or {}

        # Format payment method for display
        payment_method = order.payment_method
        if payment_method == "mpesa":
            payment_method = "M-Pesa"
        elif payment_method == "airtel":
            payment_method = "Airtel Money"
        elif payment_method == "card":
            payment_method = "Credit/Debit Card"
        elif payment_method == "cash_on_delivery":
            payment_method = "Cash on Delivery"
        else:
            payment_method = payment_method.replace("_", " ").title()

        # Create an attractive HTML email template with premium luxury design
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - MIZIZZI</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap');

        body, html {{
            margin: 0;
            padding: 0;
            font-family: 'Montserrat', sans-serif;
            color: #333333;
            background-color: #f9f9f9;
        }}

        .email-container {{
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }}

        .email-header {{
            background-color: #1A1A1A;
            color: #D4AF37;
            padding: 30px 20px;
            text-align: center;
            border-bottom: 3px solid #D4AF37;
        }}

        .email-header h1 {{
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            font-size: 28px;
            margin: 0;
            letter-spacing: 1px;
        }}

        .email-header p {{
            margin: 10px 0 0;
            font-size: 14px;
            letter-spacing: 1px;
            color: #f0f0f0;
        }}

        .email-body {{
            padding: 40px 30px;
            color: #333;
        }}

        .greeting {{
            font-size: 18px;
            margin-bottom: 25px;
            color: #1A1A1A;
        }}

        .thank-you-message {{
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #333;
        }}

        .order-summary {{
            background-color: #f9f9f9;
            border-left: 4px solid #D4AF37;
            border-radius: 4px;
            padding: 25px;
            margin-bottom: 30px;
        }}

        .order-summary h3 {{
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            margin-bottom: 20px;
            color: #1A1A1A;
            font-size: 20px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 10px;
        }}

        .order-summary p {{
            margin: 8px 0;
            font-size: 15px;
        }}

        .order-summary p strong {{
            color: #1A1A1A;
            font-weight: 600;
        }}

        .order-items {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }}

        .order-items th {{
            background-color: #f0f0f0;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            color: #1A1A1A;
            font-size: 14px;
            border-bottom: 2px solid #D4AF37;
        }}

        .order-items td {{
            padding: 15px;
            border-bottom: 1px solid #e0e0e0;
            vertical-align: top;
        }}

        .product-image {{
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 4px;
            margin-right: 15px;
            border: 1px solid #e0e0e0;
        }}

        .product-details {{
            display: inline-block;
            vertical-align: top;
        }}

        .product-name {{
            font-weight: 600;
            color: #1A1A1A;
            margin-bottom: 5px;
            font-size: 15px;
        }}

        .product-variant {{
            color: #666;
            font-size: 13px;
            margin-top: 4px;
        }}

        .order-totals {{
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
        }}

        .order-totals td {{
            padding: 10px 15px;
            font-size: 15px;
        }}

        .order-totals .total-label {{
            text-align: right;
            color: #666;
        }}

        .order-totals .total-value {{
            text-align: right;
            width: 120px;
            font-weight: 500;
        }}

        .order-totals .total-row {{
            font-weight: 700;
            font-size: 18px;
            color: #1A1A1A;
            border-top: 2px solid #D4AF37;
        }}

        .order-totals .total-row .total-value {{
            color: #D4AF37;
            font-weight: 700;
        }}

        .shipping-info {{
            background-color: #f9f9f9;
            border-left: 4px solid #1A1A1A;
            border-radius: 4px;
            padding: 25px;
            margin-bottom: 30px;
        }}

        .shipping-info h3 {{
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            margin-bottom: 20px;
            color: #1A1A1A;
            font-size: 20px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 10px;
        }}

        .address-details {{
            line-height: 1.6;
            font-size: 15px;
        }}

        .btn {{
            display: inline-block;
            background-color: #D4AF37;
            color: #1A1A1A;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 4px;
            font-weight: 600;
            margin: 30px 0;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 14px;
            transition: background-color 0.3s;
        }}

        .btn:hover {{
            background-color: #C4A32F;
        }}

        .email-footer {{
            background-color: #1A1A1A;
            padding: 30px 20px;
            text-align: center;
            font-size: 13px;
            color: #f0f0f0;
        }}

        .footer-links {{
            margin: 15px 0;
        }}

        .footer-links a {{
            color: #D4AF37;
            text-decoration: none;
            margin: 0 10px;
        }}

        .social-links {{
            margin: 20px 0;
        }}

        .social-links a {{
            display: inline-block;
            margin: 0 10px;
            color: #D4AF37;
            text-decoration: none;
        }}

        .divider {{
            height: 1px;
            background-color: #D4AF37;
            opacity: 0.3;
            margin: 15px 0;
        }}

        .payment-method {{
            display: inline-block;
            background-color: #f0f0f0;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: 500;
            font-size: 14px;
            color: #1A1A1A;
        }}

        @media only screen and (max-width: 650px) {{
            .email-container {{
                width: 100% !important;
            }}

            .email-body {{
                padding: 25px 15px;
            }}

            .order-items {{
                font-size: 14px;
            }}

            .product-image {{
                width: 60px;
                height: 60px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>MIZIZZI</h1>
            <p>LUXURY SHOPPING EXPERIENCE</p>
        </div>

        <div class="email-body">
            <div class="greeting">Hello {customer_name},</div>

            <div class="thank-you-message">
                Thank you for your order with MIZIZZI. We're delighted to confirm that we've received your order and it's being prepared with the utmost care and attention to detail.
            </div>

            <div class="order-summary">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Order Date:</strong> {order_date}</p>
                <p><strong>Payment Method:</strong> <span class="payment-method">{payment_method}</span></p>
            </div>

            <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 20px;">Your Selected Items</h3>

            <table class="order-items">
                <thead>
                    <tr>
                        <th style="width: 50%;">Item</th>
                        <th style="width: 15%; text-align: center;">Qty</th>
                        <th style="width: 15%; text-align: right;">Price</th>
                        <th style="width: 20%; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order_items_html}
                </tbody>
            </table>

            <table class="order-totals">
                <tr>
                    <td class="total-label">Subtotal:</td>
                    <td class="total-value">KSh {formatted_subtotal}</td>
                </tr>
                <tr>
                    <td class="total-label">Shipping:</td>
                    <td class="total-value">KSh {formatted_shipping}</td>
                </tr>
                <tr>
                    <td class="total-label">Tax (16%):</td>
                    <td class="total-value">KSh {formatted_tax}</td>
                </tr>
                <tr class="total-row">
                    <td class="total-label">Total:</td>
                    <td class="total-value">KSh {formatted_total}</td>
                </tr>
            </table>

            <div class="shipping-info">
                <h3>Shipping Information</h3>
                <div class="address-details">
                    <p><strong>Shipping Address:</strong></p>
                    <p>
                        {shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}<br>
                        {shipping_address.get('address_line1', '')}<br>
                        {shipping_address.get('address_line2', '') + '<br>' if shipping_address.get('address_line2') else ''}
                        {shipping_address.get('city', '')}, {shipping_address.get('state', '')}<br>
                        {shipping_address.get('postal_code', '')}<br>
                        {shipping_address.get('country', '')}<br>
                        Phone: {shipping_address.get('phone', '')}
                    </p>
                </div>

                <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
                <p><strong>Shipping Method:</strong> {order.shipping_method or 'Standard Delivery'}</p>
            </div>

            <div style="text-align: center;">
                <a href="https://www.mizizzi.com/orders/{order.id}" class="btn">VIEW ORDER DETAILS</a>
            </div>

            <p style="margin-top: 30px; line-height: 1.6;">
                We'll send you another email when your order ships. If you have any questions about your order, please contact our dedicated customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
            </p>

            <p style="line-height: 1.6;">
                Thank you for choosing MIZIZZI for your luxury shopping experience.
            </p>

            <p style="margin-top: 30px; font-weight: 500;">
                Warm regards,<br>
                <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
            </p>
        </div>

        <div class="email-footer">
            <div class="social-links">
                <a href="https://www.facebook.com/mizizzi">Facebook</a>
                <a href="https://www.instagram.com/mizizzi">Instagram</a>
                <a href="https://www.twitter.com/mizizzi">Twitter</a>
            </div>

            <div class="divider"></div>

            <div class="footer-links">
                <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
                <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
                <a href="https://www.mizizzi.com/returns">Returns Policy</a>
            </div>

            <p style="margin-top: 20px;">
                &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
            </p>

            <p style="font-size: 12px; margin-top: 15px; color: #999;">
                This email was sent to {to_email} regarding your recent purchase.<br>
                Please do not reply to this email as it is automatically generated.
            </p>
        </div>
    </div>
</body>
</html>
"""

        # Send the email
        return send_email(to_email, f"Order Confirmation #{order.order_number} - MIZIZZI", html_content)

    except Exception as e:
        logger.error(f"Error sending order confirmation email: {str(e)}", exc_info=True)
        return False

def send_order_status_update_email(order_id, to_email, customer_name):
    """Send an email notification when order status changes."""
    try:
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found: {order_id}")
            return False

        # Format the date
        order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
        update_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')

        # Define status descriptions and actions based on status
        status_info = {
            OrderStatus.PENDING: {
                "title": "Order Received",
                "description": "Your order has been received and is awaiting processing.",
                "color": "#0088cc",
                "next_step": "Our team will begin processing your order soon."
            },
            OrderStatus.PROCESSING: {
                "title": "Order Processing",
                "description": "Your order is now being processed and prepared for shipping.",
                "color": "#ff9900",
                "next_step": "Once your items are packed, they'll be handed over to our delivery team."
            },
            OrderStatus.SHIPPED: {
                "title": "Order Shipped",
                "description": "Your order has been shipped and is on its way to you!",
                "color": "#9933cc",
                "next_step": "Our delivery agent will contact you shortly to arrange delivery."
            },
            OrderStatus.DELIVERED: {
                "title": "Order Delivered",
                "description": "Your order has been delivered successfully.",
                "color": "#33cc33",
                "next_step": "We hope you enjoy your purchase! If you have any issues, please contact our support team."
            },
            OrderStatus.CANCELLED: {
                "title": "Order Cancelled",
                "description": "Your order has been cancelled as requested.",
                "color": "#cc3333",
                "next_step": "If you didn't request this cancellation or have questions, please contact our support team."
            },
            OrderStatus.REFUNDED: {
                "title": "Order Refunded",
                "description": "A refund has been processed for your order.",
                "color": "#999999",
                "next_step": "The refund should appear in your account within 3-5 business days."
            }
        }

        # Get status info
        current_status = order.status
        status_data = status_info.get(current_status, {
            "title": f"Order Status: {current_status.value.capitalize()}",
            "description": f"Your order status has been updated to {current_status.value}.",
            "color": "#666666",
            "next_step": "Please contact our support team if you have any questions."
        })

        # Create tracking info HTML if available
        tracking_html = ""
        if order.tracking_number and current_status == OrderStatus.SHIPPED:
            tracking_html = f"""
    <div class="tracking-info">
        <h4>Tracking Information</h4>
        <p><strong>Tracking Number:</strong> {order.tracking_number}</p>
        <p><strong>Shipping Method:</strong> {order.shipping_method or 'Standard Delivery'}</p>
        <p><a href="https://www.mizizzi.com/track-order/{order.id}">Track your package</a></p>
    </div>
    """

        # Create an attractive HTML email template with premium luxury design for status updates
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Update - MIZIZZI</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap');

        body, html {{
            margin: 0;
            padding: 0;
            font-family: 'Montserrat', sans-serif;
            color: #333333;
            background-color: #f9f9f9;
        }}

        .email-container {{
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }}

        .email-header {{
            background-color: {status_data["color"]};
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
            border-bottom: 3px solid #D4AF37;
        }}

        .email-header h1 {{
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            font-size: 28px;
            margin: 0;
            letter-spacing: 1px;
        }}

        .email-header p {{
            margin: 10px 0 0;
            font-size: 14px;
            letter-spacing: 1px;
        }}

        .email-body {{
            padding: 40px 30px;
            color: #333;
        }}

        .greeting {{
            font-size: 18px;
            margin-bottom: 25px;
            color: #1A1A1A;
        }}

        .status-message {{
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #333;
        }}

        .order-summary {{
            background-color: #f9f9f9;
            border-left: 4px solid {status_data["color"]};
            border-radius: 4px;
            padding: 25px;
            margin-bottom: 30px;
        }}

        .order-summary h3 {{
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            margin-bottom: 20px;
            color: #1A1A1A;
            font-size: 20px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 10px;
        }}

        .order-summary p {{
            margin: 8px 0;
            font-size: 15px
        }}

        .order-summary p strong {{
            color: #1A1A1A;
            font-weight: 600;
        }}

        .status-badge {{
            display: inline-block;
            background-color: {status_data["color"]};
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 15px;
            font-weight: 500;
            letter-spacing: 1px;
        }}

        .next-steps {{
            background-color: #f9f9f9;
            border-left: 4px solid {status_data["color"]};
            padding: 25px;
            margin: 30px 0;
            border-radius: 4px;
        }}

        .next-steps h4 {{
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            color: #1A1A1A;
            font-size: 18px;
        }}

        .next-steps p {{
            margin: 10px 0 0;
            line-height: 1.6;
            font-size: 15px;
        }}

        .btn {{
            display: inline-block;
            background-color: {status_data["color"]};
            color: #ffffff;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 4px;
            font-weight: 600;
            margin: 30px 0;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 14px;
        }}

        .tracking-info {{
            background-color: #f0f7ff;
            border: 1px solid #b3d7ff;
            border-radius: 5px;
            padding: 25px;
            margin: 30px 0;
        }}

        .tracking-info h4 {{
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            color: #1A1A1A;
            font-size: 18px;
        }}

        .tracking-info p {{
            margin: 10px 0;
            line-height: 1.6;
            font-size: 15px;
        }}

        .tracking-info a {{
            color: {status_data["color"]};
            text-decoration: none;
            font-weight: 500;
        }}

        .email-footer {{
            background-color: #1A1A1A;
            padding: 30px 20px;
            text-align: center;
            font-size: 13px;
            color: #f0f0f0;
        }}

        .footer-links {{
            margin: 15px 0;
        }}

        .footer-links a {{
            color: #D4AF37;
            text-decoration: none;
            margin: 0 10px;
        }}

        .social-links {{
            margin: 20px 0;
        }}

        .social-links a {{
            display: inline-block;
            margin: 0 10px;
            color: #D4AF37;
            text-decoration: none;
        }}

        .divider {{
            height: 1px;
            background-color: #D4AF37;
            opacity: 0.3;
            margin: 15px 0;
        }}

        @media only screen and (max-width: 650px) {{
            .email-container {{
                width: 100% !important;
            }}

            .email-body {{
                padding: 25px 15px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>{status_data["title"]}</h1>
            <p>MIZIZZI LUXURY SHOPPING</p>
        </div>

        <div class="email-body">
            <div class="greeting">Hello {customer_name},</div>

            <div class="status-message">
                {status_data["description"]}
            </div>

            <div class="order-summary">
                <span class="status-badge">{order.status.value.upper()}</span>
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Order Date:</strong> {order_date}</p>
                <p><strong>Status Updated:</strong> {update_date}</p>
                <p><strong>Total Amount:</strong> KSh {order.total_amount:,.2f}</p>
            </div>

            {tracking_html}

            <div class="next-steps">
                <h4>What's Next?</h4>
                <p>{status_data["next_step"]}</p>
            </div>

            <div style="text-align: center;">
                <a href="https://www.mizizzi.com/orders/{order.id}" class="btn">VIEW ORDER DETAILS</a>
            </div>

            <p style="margin-top: 30px; line-height: 1.6;">
                If you have any questions about your order, please contact our dedicated customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
            </p>

            <p style="margin-top: 30px; font-weight: 500;">
                Warm regards,<br>
                <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
            </p>
        </div>

        <div class="email-footer">
            <div class="social-links">
                <a href="https://www.facebook.com/mizizzi">Facebook</a>
                <a href="https://www.instagram.com/mizizzi">Instagram</a>
                <a href="https://www.twitter.com/mizizzi">Twitter</a>
            </div>

            <div class="divider"></div>

            <div class="footer-links">
                <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
                <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
                <a href="https://www.mizizzi.com/returns">Returns Policy</a>
            </div>

            <p style="margin-top: 20px;">
                &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
"""

        # Send the email
        return send_email(to_email, f"Order Status Update: {status_data['title']} - #{order.order_number}", html_content)

    except Exception as e:
        logger.error(f"Error sending order status update email: {str(e)}", exc_info=True)
        return False

# ----------------------
# Order Routes with Validation
# ----------------------

@order_routes.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_user_orders():
    """Get user's orders with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        page, per_page = get_pagination_params()

        # Get filter parameters
        status = request.args.get('status')
        include_items = request.args.get('include_items', 'false').lower() == 'true'

        # Build query
        query = Order.query.filter_by(user_id=current_user_id)

        # Apply filters
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass  # Invalid status, ignore filter

        # Order by creation date, newest first
        query = query.order_by(Order.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format response
        orders = []
        for order in paginated.items:
            order_dict = {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value,
                'total_amount': order.total_amount,
                'payment_method': order.payment_method,
                'payment_status': order.payment_status.value,
                'shipping_method': order.shipping_method,
                'shipping_cost': order.shipping_cost,
                'tracking_number': order.tracking_number,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'items_count': len(order.items),
                'items': []  # Initialize items array
            }

            # Include order items with product details if requested
            if include_items:
                for item in order.items:
                    item_dict = {
                        'id': item.id,
                        'product_id': item.product_id,
                        'variant_id': item.variant_id,
                        'quantity': item.quantity,
                        'price': item.price,
                        'total': item.total,
                        'product': None,
                        'variant': None
                    }

                    # Add product details
                    product = Product.query.get(item.product_id)
                    if product:
                        item_dict['product'] = {
                            'id': product.id,
                            'name': product.name,
                            'slug': product.slug,
                            'thumbnail_url': product.thumbnail_url
                        }

                    # Add variant details if applicable
                    if item.variant_id:
                        variant = ProductVariant.query.get(item.variant_id)
                        if variant:
                            item_dict['variant'] = {
                                'id': variant.id,
                                'color': variant.color,
                                'size': variant.size
                            }

                    order_dict['items'].append(item_dict)

            orders.append(order_dict)

        return jsonify({
            "items": orders,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        logger.error(f"Get user orders error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@order_routes.route('/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order(order_id):
    """Get order by ID with enhanced debugging."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        logger.info(f"Fetching order {order_id} for user {current_user_id}")

        order = Order.query.get(order_id)

        if not order:
            logger.warning(f"Order {order_id} not found in database")
            return jsonify({"error": f"Order with ID {order_id} not found"}), 404

        # Ensure order belongs to current user or user is admin
        user = User.query.get(current_user_id)
        if str(order.user_id) != current_user_id and user.role != UserRole.ADMIN:
            logger.warning(f"User {current_user_id} attempted to access order {order_id} belonging to user {order.user_id}")
            return jsonify({"error": "Unauthorized"}), 403

        logger.info(f"Successfully found order {order_id}")

        # Get order details with items and product information
        order_dict = {
            'id': order.id,
            'user_id': order.user_id,
            'order_number': order.order_number,
            'status': order.status.value,
            'total_amount': order.total_amount,
            'shipping_address': order.shipping_address,
            'billing_address': order.billing_address,
            'payment_method': order.payment_method,
            'payment_status': order.payment_status.value,
            'shipping_method': order.shipping_method,
            'shipping_cost': order.shipping_cost,
            'tracking_number': order.tracking_number,
            'notes': order.notes,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
            'items': []
        }

        # Add items with product details
        for item in order.items:
            item_dict = {
                'id': item.id,
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'quantity': item.quantity,
                'price': item.price,
                'total': item.total,
                'product': None,
                'variant': None
            }

            # Add product details
            product = Product.query.get(item.product_id)
            if product:
                item_dict['product'] = {
                    'id': product.id,
                    'name': product.name,
                    'slug': product.slug,
                    'thumbnail_url': product.thumbnail_url
                }

            # Add variant details if applicable
            if item.variant_id:
                variant = ProductVariant.query.get(item.variant_id)
                if variant:
                    item_dict['variant'] = {
                        'id': variant.id,
                        'color': variant.color,
                        'size': variant.size
                    }

            order_dict['items'].append(item_dict)

        logger.info(f"Returning order data for order {order_id}")
        return jsonify(order_dict), 200

    except Exception as e:
        logger.error(f"Get order error for order {order_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@order_routes.route('/orders', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_order_creation(lambda: get_jwt_identity())
def create_order():
    """Create a new order with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Process shipping and billing addresses
        shipping_address = None
        billing_address = None

        # Get shipping address
        if 'shipping_address_id' in data:
            address = Address.query.get(data['shipping_address_id'])
            shipping_address = address.to_dict() if address else None
        elif 'shipping_address' in data:
            # Handle both string and dict formats
            if isinstance(data['shipping_address'], str):
                try:
                    shipping_address = json.loads(data['shipping_address'])
                except (json.JSONDecodeError, TypeError) as e:
                    # If we can't parse it as JSON, log the error and return an error response
                    logger.error(f"Failed to parse shipping_address as JSON: {str(e)}")
                    return jsonify({"error": "Invalid shipping address format"}), 400
            else:
                shipping_address = data['shipping_address']

        # Get billing address
        if data.get('same_as_shipping', False):
            billing_address = shipping_address
        elif 'billing_address_id' in data:
            address = Address.query.get(data['billing_address_id'])
            billing_address = address.to_dict() if address else None
        elif 'billing_address' in data:
            # Handle both string and dict formats
            if isinstance(data['billing_address'], str):
                try:
                    billing_address = json.loads(data['billing_address'])
                except (json.JSONDecodeError, TypeError) as e:
                    # If we can't parse it as JSON, log the error and return an error response
                    logger.error(f"Failed to parse billing_address as JSON: {str(e)}")
                    return jsonify({"error": "Invalid billing address format"}), 400
            else:
                billing_address = data['billing_address']

        # Ensure shipping_address and billing_address are properly serialized
        if shipping_address and isinstance(shipping_address, dict):
            shipping_address = json.dumps(shipping_address)

        if billing_address and isinstance(billing_address, dict):
            billing_address = json.dumps(billing_address)

        # Get cart items
        cart_items = CartItem.query.filter_by(user_id=current_user_id).all()

        if not cart_items:
            return jsonify({"error": "Cart is empty"}), 400

        # Calculate total amount
        total_amount = 0
        order_items = []

        for cart_item in cart_items:
            product = Product.query.get(cart_item.product_id)
            if not product:
                continue

            variant = None
            if cart_item.variant_id:
                variant = ProductVariant.query.get(cart_item.variant_id)

            price = variant.price if variant and variant.price else (product.sale_price or product.price)

            # Convert price to float if it's a Decimal
            if hasattr(price, 'to_eng_string'):
                price = float(price)

            item_total = price * cart_item.quantity
            total_amount += item_total

            order_items.append({
                "product_id": cart_item.product_id,
                "variant_id": cart_item.variant_id,
                "quantity": cart_item.quantity,
                "price": price,
                "total": item_total
            })

        # Apply shipping cost
        shipping_cost = float(data.get('shipping_cost', 0))
        total_amount += shipping_cost

        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount = 0

        if coupon_code:
            coupon = Coupon.query.filter_by(code=coupon_code, is_active=True).first()
            if coupon:
                # Check if coupon is valid
                now = datetime.utcnow()
                if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
                    return jsonify({"error": "Coupon is not valid at this time"}), 400

                # Check if coupon has reached usage limit
                if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
                    return jsonify({"error": "Coupon usage limit reached"}), 400

                # Apply discount
                if coupon.type == CouponType.PERCENTAGE:
                    discount = total_amount * (float(coupon.value) / 100)
                    if coupon.max_discount and discount > float(coupon.max_discount):
                        discount = float(coupon.max_discount)
                else:  # Fixed amount
                    discount = float(coupon.value)

                total_amount -= discount

                # Increment coupon usage
                coupon.used_count += 1

        # Generate order number in Jumia format (8-digit numerical format)
        # Format: YYMMDDHH (Year, Month, Day, Hour) + 2 random digits
        current_time = datetime.utcnow()
        time_part = current_time.strftime("%y%m%d%H")
        random_part = ''.join(random.choices(string.digits, k=2))
        order_number = f"{time_part}{random_part}"

        # Ensure shipping_address and billing_address are properly serialized
        if shipping_address and isinstance(shipping_address, dict):
            shipping_address = json.dumps(shipping_address)

        if billing_address and isinstance(billing_address, dict):
            billing_address = json.dumps(billing_address)

        # Create order
        new_order = Order(
            user_id=current_user_id,
            order_number=order_number,
            status=OrderStatus.PENDING,
            total_amount=total_amount,
            shipping_address=shipping_address,
            billing_address=billing_address,
            payment_method=data['payment_method'],
            payment_status=PaymentStatus.PENDING,
            shipping_method=data.get('shipping_method'),
            shipping_cost=shipping_cost,
            notes=data.get('notes')
        )

        db.session.add(new_order)
        db.session.flush()  # Get the order ID

        # Create order items
        for item_data in order_items:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item_data['product_id'],
                variant_id=item_data['variant_id'],
                quantity=item_data['quantity'],
                price=item_data['price'],
                total=item_data['total']
            )
            db.session.add(order_item)

        # Clear cart
        CartItem.query.filter_by(user_id=current_user_id).delete()

        db.session.commit()

        # Send order confirmation email immediately
        try:
            # Get user email and name
            user = User.query.get(current_user_id)
            if user and user.email:
                # Get customer name from user or shipping address
                customer_name = user.name if hasattr(user, 'name') and user.name else "Valued Customer"
                if shipping_address and isinstance(shipping_address, str):
                    try:
                        address_data = json.loads(shipping_address)
                        if address_data.get('first_name'):
                            customer_name = f"{address_data.get('first_name')} {address_data.get('last_name', '')}"
                    except:
                        pass

                # Send the confirmation email with the order ID
                email_sent = send_order_confirmation_email(
                    order_id=new_order.id,
                    to_email=user.email,
                    customer_name=customer_name
                )

                if email_sent:
                    logger.info(f"Order confirmation email sent successfully for order {new_order.id} to {user.email}")
                else:
                    logger.warning(f"Failed to send order confirmation email for order {new_order.id} to {user.email}")
            else:
                logger.warning(f"Could not send order confirmation email: User {current_user_id} has no email")
        except Exception as email_error:
            logger.error(f"Failed to send order confirmation email: {str(email_error)}", exc_info=True)
            # Continue even if email fails

        return jsonify({
            "message": "Order created successfully",
            "order": {
                'id': new_order.id,
                'order_number': new_order.order_number,
                'status': new_order.status.value,
                'total_amount': new_order.total_amount,
                'created_at': new_order.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Order creation error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create order", "details": str(e)}), 500

@order_routes.route('/orders/<int:order_id>/cancel', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def cancel_order(order_id):
    """Cancel an order."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user
        if str(order.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Check if order can be cancelled
        if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
            return jsonify({"error": "Order cannot be cancelled at this stage"}), 400

        # Update order status
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()

        # Add cancellation reason if provided
        data = request.get_json()
        if data and 'reason' in data:
            order.notes = f"Cancellation reason: {data['reason']}"

        db.session.commit()

        # Send cancellation email
        try:
            user = User.query.get(order.user_id)
            if user and user.email:
                # Get customer name
                customer_name = user.name if hasattr(user, 'name') and user.name else "Valued Customer"

                # Send status update email
                send_order_status_update_email(
                    order_id=order.id,
                    to_email=user.email,
                    customer_name=customer_name
                )
        except Exception as email_error:
            logger.error(f"Failed to send cancellation email: {str(email_error)}")
            # Continue even if email fails

        return jsonify({
            "message": "Order cancelled successfully",
            "order": {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Cancel order error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to cancel order", "details": str(e)}), 500

@order_routes.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_order_status(order_id):
    """Update order status."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json()

        # Basic validation
        if not data or 'status' not in data:
            return jsonify({"error": "Status is required"}), 400

        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        # Check if user is admin
        if user.role != UserRole.ADMIN:
            return jsonify({"error": "Unauthorized"}), 403

        order = Order.query.get_or_404(order_id)

        # Validate status transition
        try:
            new_status = OrderStatus(data['status'])

            if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                return jsonify({"error": "Cannot change status of a cancelled order"}), 400

            if order.status == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                return jsonify({"error": "Cannot change status of a delivered order"}), 400

            # Update order status
            order.status = new_status
            order.updated_at = datetime.utcnow()

            # Add tracking number if provided
            if 'tracking_number' in data:
                order.tracking_number = data['tracking_number']

            # Add notes if provided
            if 'notes' in data:
                order.notes = data['notes']

            db.session.commit()

            # Send order status update email
            try:
                # Get user email
                customer = User.query.get(order.user_id)
                if customer and customer.email:
                    # Get customer name
                    customer_name = customer.name if hasattr(customer, 'name') and customer.name else "Valued Customer"

                    # Send status update email
                    send_order_status_update_email(
                        order_id=order.id,
                        to_email=customer.email,
                        customer_name=customer_name
                    )
                    logger.info(f"Order status update email sent for order {order.id} to {customer.email}")
                else:
                    logger.warning(f"Could not send order status update email: User {order.user_id} has no email")
            except Exception as email_error:
                logger.error(f"Failed to send order status update email: {str(email_error)}")
                # Continue even if email fails

            return jsonify({
                "message": "Order status updated successfully",
                "order": {
                    'id': order.id,
                    'order_number': order.order_number,
                    'status': order.status.value
                }
            }), 200

        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update order status error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

@order_routes.route('/orders/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order_stats():
    """Get order statistics for the current user."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers
