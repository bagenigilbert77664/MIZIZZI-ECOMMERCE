"""Email templates and functions for order-related communications.
Shared between user and admin order routes."""

import os
import json
import logging
from datetime import datetime, timedelta
import requests
from flask import current_app

# Setup logger
logger = logging.getLogger(__name__)

def send_email(to_email, subject, html_content):
    """Send an email using Brevo API."""
    try:
        import requests
        
        # Get Brevo API key from environment
        api_key = current_app.config.get('BREVO_API_KEY')
        if not api_key:
            logger.error("BREVO_API_KEY not configured")
            return False
        
        # Brevo API endpoint
        url = "https://api.brevo.com/v3/smtp/email"
        
        # Email payload
        payload = {
            "sender": {
                "name": "MIZIZZI",
                "email": "REDACTED-SENDER-EMAIL"
            },
            "to": [
                {
                    "email": to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }
        
        # Headers
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key
        }
        
        # Send request
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in [200, 201]:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Failed to send email. Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}", exc_info=True)
        return False

def send_order_confirmation_email(order_id, to_email, customer_name):
    """Send an order confirmation email to the customer with actual ordered products."""
    try:
        # Import models here to avoid circular imports
        from ...models.models import Order, Product, ProductVariant, Category, ProductImage

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
                    <strong>Order Item Data Error</strong><br>
                    We apologize, but there was an issue displaying your order items.<br>
                    Our team has been notified and will contact you shortly.
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
                    subtotal += item.price * item.quantity
                    continue
                
                logger.info(f"Processing product: {product.name}, ID: {product.id}")
                
                # Get product images
                product_images = ProductImage.query.filter_by(product_id=product.id).order_by(ProductImage.sort_order).all()

                product_image = "https://via.placeholder.com/100x100/f5f5f5/D4AF37?text=MIZIZZI"
                
                if product_images and len(product_images) > 0:
                    product_image = product_images[0].url
                    logger.info(f"Using ProductImage URL: {product_image}")
                else:
                    logger.warning(f"No ProductImage records found for product {product.id}, using placeholder")
                
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
                        variant_info = f"<br><span style='color: #888; font-size: 13px;'>{variant.color or ''} {variant.size or ''}</span>"
                
                # Get product collection/category if available
                collection_info = ""
                if hasattr(product, 'category_id') and product.category_id:
                    category = Category.query.get(product.category_id)
                    if category:
                        collection_info = f"<br><span style='font-size: 13px; color: #888;'>{category.name}</span>"
                
                # Calculate item total
                item_total = item.price * item.quantity
                subtotal += item_total
                
                # Format price with commas for thousands
                formatted_price = "{:,.2f}".format(item.price)
                formatted_total = "{:,.2f}".format(item_total)
                
                # Add the item to the email HTML
                order_items_html += f"""
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #e8e8e8;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td width="100" style="padding-right: 15px;">
                                    <img src="{product_image}" alt="{product.name}" width="100" height="100" style="display: block; border-radius: 8px; border: 1px solid #e8e8e8;">
                                </td>
                                <td style="vertical-align: top;">
                                    <strong style="font-size: 15px; color: #1a1a1a;">{product.name}{variant_name}</strong>
                                    {collection_info}
                                    {variant_info}
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid #e8e8e8; text-align: center; color: #666;">{item.quantity}</td>
                    <td style="padding: 15px; border-bottom: 1px solid #e8e8e8; text-align: right; color: #1a1a1a; font-weight: 500;">KSh {formatted_price}</td>
                    <td style="padding: 15px; border-bottom: 1px solid #e8e8e8; text-align: right; color: #1a1a1a; font-weight: 600;">KSh {formatted_total}</td>
                </tr>
                """
        
        # Calculate totals
        shipping_cost = order.shipping_cost or 0
        total = order.total_amount
        
        # Format totals with commas for thousands
        formatted_subtotal = "{:,.2f}".format(subtotal)
        formatted_shipping = "{:,.2f}".format(shipping_cost)
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
        
        from datetime import timedelta
        estimated_delivery_date = (datetime.now() + timedelta(days=3)).strftime('%B %d, %Y')

        # Determine journey step styling
        current_status = order.status
        journey_step_1_bg, journey_step_1_border, journey_step_1_circle_bg, journey_step_1_circle_text, journey_step_1_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
        journey_step_2_bg, journey_step_2_border, journey_step_2_circle_bg, journey_step_2_circle_text, journey_step_2_text = "#fff", "#eee", "#FF6600", "#fff", "#333"
        journey_step_3_bg, journey_step_3_border, journey_step_3_circle_bg, journey_step_3_circle_text, journey_step_3_text = "#fff", "#eee", "#FF6600", "#fff", "#333"
        journey_step_4_bg, journey_step_4_border, journey_step_4_circle_bg, journey_step_4_circle_text, journey_step_4_text = "#fff", "#eee", "#FF6600", "#fff", "#333"

        if current_status == 'PROCESSING':
            journey_step_2_bg, journey_step_2_border, journey_step_2_circle_bg, journey_step_2_circle_text, journey_step_2_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
        elif current_status == 'SHIPPED':
            journey_step_2_bg, journey_step_2_border, journey_step_2_circle_bg, journey_step_2_circle_text, journey_step_2_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
            journey_step_3_bg, journey_step_3_border, journey_step_3_circle_bg, journey_step_3_circle_text, journey_step_3_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
        elif current_status == 'DELIVERED':
            journey_step_2_bg, journey_step_2_border, journey_step_2_circle_bg, journey_step_2_circle_text, journey_step_2_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
            journey_step_3_bg, journey_step_3_border, journey_step_3_circle_bg, journey_step_3_circle_text, journey_step_3_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
            journey_step_4_bg, journey_step_4_border, journey_step_4_circle_bg, journey_step_4_circle_text, journey_step_4_text = "#FF6600", "#FF6600", "#fff", "#FF6600", "#fff"
        
        # Create an email-client-safe HTML template using tables
        html_content = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Order Confirmation - MIZIZZI</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; padding: 40px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #FF6600 0%, #F15A22 100%); padding: 40px 30px; text-align: center;">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" style="max-width: 180px; height: auto; display: block; margin: 0 auto 10px auto;" />
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">LUXURY SHOPPING</p>
                        </td>
                    </tr>
                    
                    <!-- Success Banner -->
                    <tr>
                        <td style="background-color: #FF6600; padding: 40px 30px; text-align: center; color: #ffffff;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <div style="width: 80px; height: 80px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-block; line-height: 80px; font-size: 40px; margin-bottom: 20px;">✓</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h2 style="margin: 0 0 15px 0; font-size: 28px; font-weight: 600; color: #ffffff;">Order Confirmed</h2>
                                        <p style="margin: 0; font-size: 16px; color: #ffffff; line-height: 1.6;">Thank you for choosing MIZIZZI. Your luxury experience begins now. We've curated every detail to perfection.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <!-- Greeting -->
                            <h3 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 500; color: #333;">Hello {customer_name},</h3>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #666; line-height: 1.6;">We're absolutely delighted to confirm your order. Each piece has been meticulously selected to embody the essence of luxury and sophistication. Your items are being prepared with the utmost care, and we'll keep you informed at every exquisite step of the journey.</p>
                            
                            <!-- Order Details Card -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff; border: 2px solid #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h4 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #FF6600; border-bottom: 2px solid #FF6600; padding-bottom: 10px;">📦 Order Details</h4>
                                        
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <span style="font-size: 16px; color: #666;">Order Number</span>
                                                </td>
                                                <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <strong style="font-size: 16px; color: #333;">{order.order_number}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <span style="font-size: 16px; color: #666;">Placed On</span>
                                                </td>
                                                <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <strong style="font-size: 16px; color: #333;">{order_date}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <span style="font-size: 16px; color: #666;">Payment</span>
                                                </td>
                                                <td align="right" style="padding: 12px 0;">
                                                    <span style="display: inline-block; background-color: #FF6600; color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">{payment_method}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Expected Arrival -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 30px; text-align: center; color: #ffffff;">
                                        <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">📅 Delivery Status</p>
                                        <p style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">Your order will arrive soon</p>
                                        <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">We'll keep you updated at every step. For the finest experience, we partner with premium carriers.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Journey Timeline -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 2px solid #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h4 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #FF6600;">🚚 Your Journey</h4>
                                        
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                 <!-- CHANGE: Fixed circle centering using table-based layout for email compatibility -->
                                                <td width="25%" align="center" style="padding: 15px; background-color: {journey_step_1_bg}; border: 2px solid {journey_step_1_border}; border-radius: 8px;">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="50" height="50" style="margin: 0 auto 10px;">
                                                        <tr>
                                                            <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {journey_step_1_circle_bg}; color: {journey_step_1_circle_text}; border-radius: 50%; font-weight: 600; font-size: 18px;">
                                                                1
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: {journey_step_1_text};">Confirmed</p>
                                                </td>
                                                <td width="25%" align="center" style="padding: 15px; background-color: {journey_step_2_bg}; border: 2px solid {journey_step_2_border}; border-radius: 8px;">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="50" height="50" style="margin: 0 auto 10px;">
                                                        <tr>
                                                            <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {journey_step_2_circle_bg}; color: {journey_step_2_circle_text}; border-radius: 50%; font-weight: 600; font-size: 18px;">
                                                                2
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: {journey_step_2_text};">Preparing</p>
                                                </td>
                                                <td width="25%" align="center" style="padding: 15px; background-color: {journey_step_3_bg}; border: 2px solid {journey_step_3_border}; border-radius: 8px;">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="50" height="50" style="margin: 0 auto 10px;">
                                                        <tr>
                                                            <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {journey_step_3_circle_bg}; color: {journey_step_3_circle_text}; border-radius: 50%; font-weight: 600; font-size: 18px;">
                                                                3
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: {journey_step_3_text};">Shipped</p>
                                                </td>
                                                <td width="25%" align="center" style="padding: 15px; background-color: {journey_step_4_bg}; border: 2px solid {journey_step_4_border}; border-radius: 8px;">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="50" height="50" style="margin: 0 auto 10px;">
                                                        <tr>
                                                            <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {journey_step_4_circle_bg}; color: {journey_step_4_circle_text}; border-radius: 50%; font-weight: 600; font-size: 18px;">
                                                                4
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: {journey_step_4_text};">Delivered</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Products Table -->
                            <h4 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #333; border-bottom: 3px solid #FF6600; padding-bottom: 10px;">Your Selections</h4>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 2px solid #FF6600; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                                <thead>
                                    <tr style="background-color: #FF6600; color: #fff;">
                                        <th style="padding: 15px; text-align: left; font-size: 14px; font-weight: 500; text-transform: uppercase;">Item</th>
                                        <th style="padding: 15px; text-align: center; font-size: 14px; font-weight: 500; text-transform: uppercase;">Qty</th>
                                        <th style="padding: 15px; text-align: right; font-size: 14px; font-weight: 500; text-transform: uppercase;">Unit Price</th>
                                        <th style="padding: 15px; text-align: right; font-size: 14px; font-weight: 500; text-transform: uppercase;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order_items_html}
                                </tbody>
                            </table>
                            
                            <!-- Order Summary -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff; border: 2px solid #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <span style="font-size: 16px; color: #666;">Subtotal</span>
                                                </td>
                                                <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <strong style="font-size: 16px; color: #333;">KSh {formatted_subtotal}</strong>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <span style="font-size: 16px; color: #666;">Shipping</span>
                                                </td>
                                                <td align="right" style="padding: 12px 0; border-bottom: 1px solid #eee;">
                                                    <strong style="font-size: 16px; color: #333;">KSh {formatted_shipping}</strong>
                                                </td>
                                            </tr>
                                             Removed VAT row 
                                            <tr>
                                                <td style="padding: 15px 0 0 0;">
                                                    <strong style="font-size: 20px; color: #FF6600;">Total</strong>
                                                </td>
                                                <td align="right" style="padding: 15px 0 0 0;">
                                                    <strong style="font-size: 22px; color: #FF6600;">KSh {formatted_total}</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Shipping Address -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff; border: 2px solid #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h4 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #FF6600; border-bottom: 2px solid #FF6600; padding-bottom: 10px;">📍 Delivery Address</h4>
                                        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #333;"><strong>{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}</strong></p>
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #333;">{shipping_address.get('address_line1', '')}</p>
                                            {f"<p style='margin: 0 0 8px 0; font-size: 16px; color: #333;'>{shipping_address.get('address_line2', '')}</p>" if shipping_address.get('address_line2') else ''}
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #333;">{shipping_address.get('city', '')}, {shipping_address.get('state', '')}</p>
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #333;">{shipping_address.get('postal_code', '')}</p>
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #333;">{shipping_address.get('country', '')}</p>
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #333;"><strong>Phone:</strong> {shipping_address.get('phone', '')}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://www.mizizzi.com/orders/{order.id}" style="display: inline-block; background-color: #FF6600; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; text-transform: uppercase;">Track Your Order</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Trust Badges -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 2px solid #FF6600; border-bottom: 2px solid #FF6600; padding: 30px 0; margin-bottom: 30px;">
                                <tr>
                                    <td width="33%" align="center" style="padding: 15px;">
                                        <div style="width: 60px; height: 60px; background-color: #FF6600; color: #fff; border-radius: 50%; display: inline-block; line-height: 60px; font-size: 24px; margin-bottom: 15px;">🔒</div>
                                        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">Secure Checkout</p>
                                        <p style="margin: 0; font-size: 13px; color: #666;">Advanced encryption protects your data at every step</p>
                                    </td>
                                    <td width="33%" align="center" style="padding: 15px;">
                                        <div style="width: 60px; height: 60px; background-color: #FF6600; color: #fff; border-radius: 50%; display: inline-block; line-height: 60px; font-size: 24px; margin-bottom: 15px;">✓</div>
                                        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">Authentic Luxury</p>
                                        <p style="margin: 0; font-size: 13px; color: #666;">Guaranteed genuine products from premier collections</p>
                                    </td>
                                    <td width="33%" align="center" style="padding: 15px;">
                                        <div style="width: 60px; height: 60px; background-color: #FF6600; color: #fff; border-radius: 50%; display: inline-block; line-height: 60px; font-size: 24px; margin-bottom: 15px;">↩️</div>
                                        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">Hassle-Free Returns</p>
                                        <p style="margin: 0; font-size: 13px; color: #666;">30 days, no questions asked, with complimentary labels</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Support Section -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff; border: 2px solid #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <h4 style="margin: 0 0 15px 0; font-size: 20px; font-weight: 600; color: #FF6600;">We're Here to Help</h4>
                                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #666; line-height: 1.6;">Your satisfaction is our priority. Our team is ready to assist with any questions about your order, from styling advice to delivery details. We're just a message away.</p>
                                        <p style="margin: 0 0 10px 0;"><a href="mailto:support@mizizzi.com" style="color: #FF6600; text-decoration: none; font-size: 16px; font-weight: 500;">✉️ support@mizizzi.com</a></p>
                                        <p style="margin: 0;"><a href="tel:+254700123456" style="color: #FF6600; text-decoration: none; font-size: 16px; font-weight: 500;">📞 +254 700 123 456</a></p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- FAQ Section -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff; border: 2px solid #FF6600; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <h4 style="margin: 0 0 25px 0; font-size: 20px; font-weight: 600; color: #FF6600; text-align: center;">Frequently Asked Questions</h4>
                                        
                                        <div style="background-color: #f8f9fa; border-left: 4px solid #FF6600; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
                                            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #333;">When will my order ship?</p>
                                            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">Most orders ship within 1-2 business days. You'll receive a confirmation email once it's on its way, complete with tracking details.</p>
                                        </div>
                                        
                                        <div style="background-color: #f8f9fa; border-left: 4px solid #FF6600; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
                                            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #333;">What is your return policy?</p>
                                            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">We offer free returns within 30 days. Items must be unused and in original packaging for a full refund. Contact us for a seamless process.</p>
                                        </div>
                                        
                                        <div style="background-color: #f8f9fa; border-left: 4px solid #FF6600; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
                                            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #333;">How do I track my order?</p>
                                            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">Click the 'Track Your Order' button above or log in to your account for real-time updates and estimated arrival times.</p>
                                        </div>
                                        
                                        <div style="background-color: #f8f9fa; border-left: 4px solid #FF6600; padding: 20px; border-radius: 4px;">
                                            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #333;">Do you offer gift wrapping?</p>
                                            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">Yes, complimentary luxury gift wrapping is available at checkout. Add a personal message for that special touch.</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Care Instructions -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 2px solid #FF6600; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <h4 style="margin: 0 0 25px 0; font-size: 20px; font-weight: 600; color: #FF6600; text-align: center;">Care Instructions for Your Luxury Items</h4>
                                        
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="50" style="vertical-align: top; padding-right: 15px;">
                                                    <div style="width: 40px; height: 40px; background-color: #FF6600; color: #fff; border-radius: 50%; display: inline-block; line-height: 40px; text-align: center; font-size: 18px;">🧵</div>
                                                </td>
                                                <td style="padding-bottom: 20px;">
                                                    <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">Store in a cool, dry place away from direct sunlight to preserve fabric integrity and color vibrancy.</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50" style="vertical-align: top; padding-right: 15px;">
                                                    <div style="width: 40px; height: 40px; background-color: #FF6600; color: #fff; border-radius: 50%; display: inline-block; line-height: 40px; text-align: center; font-size: 18px;">✨</div>
                                                </td>
                                                <td style="padding-bottom: 20px;">
                                                    <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">For delicate items, professional dry cleaning is recommended to maintain the exquisite craftsmanship.</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50" style="vertical-align: top; padding-right: 15px;">
                                                    <div style="width: 40px; height: 40px; background-color: #FF6600; color: #fff; border-radius: 50%; display: inline-block; line-height: 40px; text-align: center; font-size: 18px;">♻️</div>
                                                </td>
                                                <td>
                                                    <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">We prioritize sustainability—recycle packaging responsibly and explore our eco-luxury collection next.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #333; padding: 40px 30px; color: #ccc;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 30px;">
                                        <a href="https://www.facebook.com/mizizzi" style="display: inline-block; width: 50px; height: 50px; background-color: #FF6600; border-radius: 50%; margin: 0 10px; text-decoration: none; color: #fff; line-height: 50px; font-size: 20px;">f</a>
                                        <a href="https://www.instagram.com/mizizzi" style="display: inline-block; width: 50px; height: 50px; background-color: #FF6600; border-radius: 50%; margin: 0 10px; text-decoration: none; color: #fff; line-height: 50px; font-size: 20px;">📷</a>
                                        <a href="https://www.twitter.com/mizizzi" style="display: inline-block; width: 50px; height: 50px; background-color: #FF6600; border-radius: 50%; margin: 0 10px; text-decoration: none; color: #fff; line-height: 50px; font-size: 20px;">🐦</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0; border-top: 1px solid #555; border-bottom: 1px solid #555;">
                                        <a href="https://www.mizizzi.com/terms" style="color: #ccc; text-decoration: none; margin: 0 15px; font-size: 14px;">Terms & Conditions</a>
                                        <a href="https://www.mizizzi.com/privacy" style="color: #ccc; text-decoration: none; margin: 0 15px; font-size: 14px;">Privacy Policy</a>
                                        <a href="https://www.mizizzi.com/returns" style="color: #ccc; text-decoration: none; margin: 0 15px; font-size: 14px;">Returns</a>
                                        <a href="https://www.mizizzi.com/help" style="color: #ccc; text-decoration: none; margin: 0 15px; font-size: 14px;">Help Center</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 20px;">
                                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #ccc;">© {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                                        <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5;">This email was sent to {to_email} regarding your recent purchase.<br>Please do not reply to this email as it is automatically generated. For inquiries, reach out to our support team.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
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
        # Import models here to avoid circular imports
        from ...models.models import Order, OrderStatus
        
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found: {order_id}")
            return False
        
        # Format the date
        order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
        
        if order.status == OrderStatus.PROCESSING:
            # Create detailed processing email matching confirmation design
            return send_processing_status_email(order, to_email, customer_name, order_date)
        elif order.status == OrderStatus.SHIPPED:
            # Create detailed shipped email with purple theme
            return send_shipped_status_email(order, to_email, customer_name, order_date)
        elif order.status == OrderStatus.DELIVERED:
            # Create detailed delivered email with green success theme
            return send_delivered_status_email(order, to_email, customer_name, order_date)
        elif order.status == OrderStatus.CANCELLED:
            # Create detailed cancelled email with red theme
            return send_cancelled_status_email(order, to_email, customer_name, order_date)
        elif order.status == OrderStatus.RETURNED: # Added check for RETURNED status
            # Create detailed return status email
            return send_return_status_email(order_id, to_email, customer_name) # Call the new function
        
        # For other statuses, use the existing simple template
        update_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')
        
        # Define status descriptions and actions based on status
        status_info = {
            OrderStatus.PENDING: {
                "title": "Order Received",
                "description": "Your order has been received and is awaiting processing.",
                "color": "#0088cc",
                "next_step": "Our team will begin processing your order soon."
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
        html_content = f"""<!DOCTYPE html>
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
        /* Added logo image styling */
        .email-header img {{
            max-width: 180px;
            height: auto;
            display: block;
            margin: 0 auto 10px auto;
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
            font-size: 15px;
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
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" />
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


def send_processing_status_email(order, to_email, customer_name, order_date):
    """Send detailed processing status email matching the confirmation email design."""
    try:
        # Calculate journey step colors based on PROCESSING status
        step1_color = "#FF6600"  # Confirmed - completed
        step2_color = "#FF6600"  # Processing - current (orange)
        step3_color = "#E5E7EB"  # Shipped - not yet
        step4_color = "#E5E7EB"  # Delivered - not yet
        
        step1_text_color = "#FFFFFF"
        step2_text_color = "#FFFFFF"
        step3_text_color = "#9CA3AF"
        step4_text_color = "#9CA3AF"
        
        # Get order items
        items_html = ""
        for item in order.items:
            product = item.product
            image_url = product.images[0].url if product.images else "/placeholder.svg?height=80&width=80"
            
            items_html += f"""
                <tr>
                    <td style="padding: 20px; border-bottom: 1px solid #E5E7EB;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td width="80" style="padding-right: 15px;">
                                    <img src="{image_url}" alt="{product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; display: block;">
                                </td>
                                <td style="vertical-align: top;">
                                    <div style="font-weight: 600; font-size: 16px; color: #1F2937; margin-bottom: 4px;">{product.name}</div>
                                    <div style="font-size: 14px; color: #6B7280; margin-bottom: 8px;">{product.category.name if product.category else ''}</div>
                                    {f'<div style="font-size: 14px; color: #6B7280;">Size: {item.variant.size}</div>' if item.variant and item.variant.size else ''}
                                    {f'<div style="font-size: 14px; color: #6B7280;">Color: {item.variant.color}</div>' if item.variant and item.variant.color else ''}
                                </td>
                                <td width="60" style="text-align: center; vertical-align: top; color: #6B7280; font-size: 14px;">
                                    {item.quantity}
                                </td>
                                <td width="120" style="text-align: right; vertical-align: top; color: #6B7280; font-size: 14px;">
                                    KSh {item.price:,.2f}
                                </td>
                                <td width="120" style="text-align: right; vertical-align: top; font-weight: 600; color: #1F2937; font-size: 14px;">
                                    KSh {item.total:,.2f}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            """
        
        # Create email-safe HTML using tables
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Processing - MIZIZZI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #FFFFFF; max-width: 600px;">
                    
                    <tr>
                        <td style="background-color: #FF6600; padding: 40px 30px; text-align: center;">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" style="max-width: 180px; height: auto; display: block; margin: 0 auto 8px auto;" />
                            <div style="font-size: 14px; color: #FFFFFF; letter-spacing: 3px; text-transform: uppercase;">LUXURY SHOPPING</div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #FF6600; padding: 50px 30px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px;">
                                            <tr>
                                                <td align="center" valign="middle" style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%;">
                                                    <div style="font-size: 40px; line-height: 1; text-align: center;">⚙️</div>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="font-size: 32px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px;">Order Processing</div>
                                        <!-- Simplified message text to be friendlier and more engaging -->
                                        <div style="font-size: 16px; color: #FFFFFF; line-height: 1.6; max-width: 500px; margin: 0 auto;">
                                            Great news! We're now preparing your order with care. You'll love what's coming your way!
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <!-- Greeting -->
                            <div style="font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 20px;">Hello {customer_name},</div>
                            
                            <!-- Message -->
                            <!-- Rewrote message in simpler, friendlier English -->
                            <div style="font-size: 15px; color: #4B5563; line-height: 1.7; margin-bottom: 30px;">
                                Good news! Your order is now being prepared. Our team is carefully getting everything ready and checking each item to make sure it's perfect. We'll keep you updated every step of the way!
                            </div>
                            
                            <!-- Order Details Box -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px; border: 2px solid #FF6600; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px; background-color: #FFF7ED;">
                                        <div style="font-size: 18px; font-weight: 600; color: #FF6600; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #FF6600;">
                                            📦 Order Details
                                        </div>
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Order Number</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">{order.order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Placed On</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">{order_date}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Payment</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">{order.payment_method or 'Cash on Delivery'}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Delivery Info -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #F9FAFB; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 12px;">🎁 Expected Delivery</div>
                                        <div style="font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 8px;">
                                            Your order will arrive soon
                                        </div>
                                        <div style="font-size: 13px; color: #6B7280; line-height: 1.6;">
                                            We're working diligently to prepare your items. You'll receive a shipping confirmation with tracking details once your order is on its way.
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Your Journey -->
                            <div style="margin-bottom: 30px;">
                                <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 20px;">🚚 Your Journey</div>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <div style="width: 48px; height: 48px; background-color: {step1_color}; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                                <div style="font-size: 20px; font-weight: 700; color: {step1_text_color}; line-height: 48px;">1</div>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 600; color: #1F2937;">Confirmed</div>
                                        </td>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <div style="width: 48px; height: 48px; background-color: {step2_color}; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                                <div style="font-size: 20px; font-weight: 700; color: {step2_text_color}; line-height: 48px;">2</div>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 600; color: #FF6600;">Processing</div>
                                        </td>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <div style="width: 48px; height: 48px; background-color: {step3_color}; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                                <div style="font-size: 20px; font-weight: 700; color: {step3_text_color}; line-height: 48px;">3</div>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 600; color: #9CA3AF;">Shipped</div>
                                        </td>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <div style="width: 48px; height: 48px; background-color: {step4_color}; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                                <div style="font-size: 20px; font-weight: 700; color: {step4_text_color}; line-height: 48px;">4</div>
                                            </div>
                                            <div style="font-size: 13px; font-weight: 600; color: #9CA3AF;">Delivered</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Your Selections -->
                            <div style="margin-bottom: 30px;">
                                <div style="font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 20px;">Your Selections</div>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                                    <!-- Table Header -->
                                    <tr style="background-color: #F9FAFB;">
                                        <td style="padding: 12px 20px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Item</td>
                                        <td width="60" style="padding: 12px 20px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</td>
                                        <td width="120" style="padding: 12px 20px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Unit Price</td>
                                        <td width="120" style="padding: 12px 20px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Subtotal</td>
                                    </tr>
                                    
                                    <!-- Order Items -->
                                    {items_html}
                                    
                                    <!-- Order Summary -->
                                    <tr>
                                        <td colspan="4" style="padding: 20px; background-color: #F9FAFB;">
                                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #6B7280; text-align: right;">Subtotal</td>
                                                    <td width="120" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">KSh {order.subtotal:,.2f}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #6B7280; text-align: right;">Shipping</td>
                                                    <td width="120" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">KSh {order.shipping_cost:,.2f}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #1F2937; text-align: right;">Total</td>
                                                    <td width="120" style="padding: 12px 0 0; font-size: 18px; font-weight: 700; color: #FF6600; text-align: right;">KSh {order.total_amount:,.2f}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Support Section -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 40px; background-color: #F9FAFB; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 12px;">We're Here to Help</div>
                                        <div style="font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 16px;">
                                            Your satisfaction is our priority. Our team is ready to assist with any questions about your order, from styling advice to delivery details. We're just a message away.
                                        </div>
                                        <div style="font-size: 14px; color: #4B5563; line-height: 1.6;">
                                            📧 <a href="mailto:support@mizizzi.com" style="color: #FF6600; text-decoration: none; font-weight: 600;">support@mizizzi.com</a><br>
                                            📞 <span style="font-weight: 600; color: #1F2937;">+254 700 123 456</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1F2937; padding: 40px 30px; text-align: center;">
                            <div style="font-size: 14px; color: #9CA3AF; margin-bottom: 20px;">
                                <a href="https://www.mizizzi.com/terms" style="color: #FF6600; text-decoration: none; margin: 0 10px;">Terms & Conditions</a>
                                <a href="https://www.mizizzi.com/privacy" style="color: #FF6600; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                                <a href="https://www.mizizzi.com/returns" style="color: #FF6600; text-decoration: none; margin: 0 10px;">Returns</a>
                                <a href="https://www.mizizzi.com/help" style="color: #FF6600; text-decoration: none; margin: 0 10px;">Help Center</a>
                            </div>
                            <div style="font-size: 13px; color: #6B7280; margin-top: 20px;">
                                © 2025 MIZIZZI. All rights reserved.
                            </div>
                            <div style="font-size: 12px; color: #6B7280; margin-top: 12px;">
                                This email was sent to <a href="mailto:{to_email}" style="color: #FF6600; text-decoration: none;">{to_email}</a> regarding your recent purchase.
                            </div>
                            <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">
                                Please do not reply to this email as it is automatically generated. For inquiries, reach out to our support team.
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        # Send the email
        return send_email(to_email, f"Order Processing - #{order.order_number} - MIZIZZI", html_content)
        
    except Exception as e:
        logger.error(f"Error sending processing status email: {str(e)}", exc_info=True)
        return False


def send_shipped_status_email(order, to_email, customer_name, order_date):
    """Send detailed shipped status email with purple theme matching the confirmation email design."""
    try:
        step1_color = "#9333EA"  # Confirmed - completed (purple)
        step2_color = "#9333EA"  # Processing - completed (purple)
        step3_color = "#9333EA"  # Shipped - current (purple)
        step4_color = "#E5E7EB"  # Delivered - not yet
        
        step1_text_color = "#FFFFFF"
        step2_text_color = "#FFFFFF"
        step3_text_color = "#FFFFFF"
        step4_text_color = "#9CA3AF"
        
        # Get order items
        items_html = ""
        for item in order.items:
            product = item.product
            image_url = product.images[0].url if product.images else "/placeholder.svg?height=80&width=80"
            
            items_html += f"""
                <tr>
                    <td style="padding: 20px; border-bottom: 1px solid #E5E7EB;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td width="80" style="padding-right: 15px;">
                                    <img src="{image_url}" alt="{product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; display: block;">
                                </td>
                                <td style="vertical-align: top;">
                                    <div style="font-weight: 600; font-size: 16px; color: #1F2937; margin-bottom: 4px;">{product.name}</div>
                                    <div style="font-size: 14px; color: #6B7280; margin-bottom: 8px;">{product.category.name if product.category else ''}</div>
                                    {f'<div style="font-size: 14px; color: #6B7280;">Size: {item.variant.size}</div>' if item.variant and item.variant.size else ''}
                                    {f'<div style="font-size: 14px; color: #6B7280;">Color: {item.variant.color}</div>' if item.variant and item.variant.color else ''}
                                </td>
                                <td width="60" style="text-align: center; vertical-align: top; color: #6B7280; font-size: 14px;">
                                    {item.quantity}
                                </td>
                                <td width="120" style="text-align: right; vertical-align: top; color: #6B7280; font-size: 14px;">
                                    KSh {item.price:,.2f}
                                </td>
                                <td width="120" style="text-align: right; vertical-align: top; font-weight: 600; color: #1F2937; font-size: 14px;">
                                    KSh {item.total:,.2f}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            """
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Shipped - MIZIZZI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #FFFFFF; max-width: 600px;">
                    
                    <tr>
                        <td style="background-color: #9333EA; padding: 40px 30px; text-align: center;">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" style="max-width: 180px; height: auto; display: block; margin: 0 auto 8px auto;" />
                            <div style="font-size: 14px; color: #FFFFFF; letter-spacing: 3px; text-transform: uppercase;">LUXURY SHOPPING</div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #9333EA; padding: 50px 30px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px;">
                                            <tr>
                                                <td align="center" valign="middle" style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%;">
                                                    <div style="font-size: 40px; line-height: 1; text-align: center;">📦</div>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="font-size: 32px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px;">Order Shipped!</div>
                                        <div style="font-size: 16px; color: #FFFFFF; line-height: 1.6; max-width: 500px; margin: 0 auto;">
                                            Exciting news! Your order is on its way to you. Get ready to receive something amazing!
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <div style="font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 20px;">Hello {customer_name},</div>
                            
                            <div style="font-size: 15px; color: #4B5563; line-height: 1.7; margin-bottom: 30px;">
                                Great news! Your order has been shipped and is now on its way to you. Our delivery partner will contact you soon to arrange the perfect delivery time. We can't wait for you to receive your items!
                            </div>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px; border: 2px solid #9333EA; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px; background-color: #FAF5FF;">
                                        <div style="font-size: 18px; font-weight: 600; color: #9333EA; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #9333EA;">
                                            📦 Order Details
                                        </div>
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Order Number</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">{order.order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Placed On</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">{order_date}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Payment</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">{order.payment_method or 'Cash on Delivery'}</td>
                                            </tr>
                                            {f'''<tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Tracking Number</td>
                                                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #9333EA; text-align: right;">{order.tracking_number}</td>
                                            </tr>''' if order.tracking_number else ''}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #F9FAFB; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 12px;">🚚 Delivery Information</div>
                                        <div style="font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 8px;">
                                            Your order is on its way!
                                        </div>
                                        <div style="font-size: 13px; color: #6B7280; line-height: 1.6;">
                                            Our delivery partner will reach out to you shortly to confirm the delivery details. Please keep your phone handy!
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="margin-bottom: 30px;">
                                <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 20px;">🚚 Your Journey</div>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td align="center" valign="middle" style="width: 48px; height: 48px; background-color: {step1_color}; border-radius: 50%;">
                                                        <div style="font-size: 20px; font-weight: 700; color: {step1_text_color}; line-height: 1;">1</div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div style="font-size: 13px; font-weight: 600; color: #1F2937; margin-top: 8px;">Confirmed</div>
                                        </td>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td align="center" valign="middle" style="width: 48px; height: 48px; background-color: {step2_color}; border-radius: 50%;">
                                                        <div style="font-size: 20px; font-weight: 700; color: {step2_text_color}; line-height: 1;">2</div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div style="font-size: 13px; font-weight: 600; color: #1F2937; margin-top: 8px;">Processing</div>
                                        </td>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td align="center" valign="middle" style="width: 48px; height: 48px; background-color: {step3_color}; border-radius: 50%;">
                                                        <div style="font-size: 20px; font-weight: 700; color: {step3_text_color}; line-height: 1;">3</div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div style="font-size: 13px; font-weight: 600; color: #9333EA; margin-top: 8px;">Shipped</div>
                                        </td>
                                        <td width="25%" align="center" style="padding: 10px;">
                                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td align="center" valign="middle" style="width: 48px; height: 48px; background-color: {step4_color}; border-radius: 50%;">
                                                        <div style="font-size: 20px; font-weight: 700; color: {step4_text_color}; line-height: 1;">4</div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div style="font-size: 13px; font-weight: 600; color: #9CA3AF; margin-top: 8px;">Delivered</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="margin-bottom: 30px;">
                                <div style="font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 20px;">Your Selections</div>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                                    <tr style="background-color: #F9FAFB;">
                                        <td style="padding: 12px 20px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">ITEM</td>
                                        <td width="60" style="padding: 12px 20px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">QTY</td>
                                        <td width="120" style="padding: 12px 20px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">UNIT PRICE</td>
                                        <td width="120" style="padding: 12px 20px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">SUBTOTAL</td>
                                    </tr>
                                    {items_html}
                                    <tr>
                                        <td colspan="4" style="padding: 20px; background-color: #F9FAFB;">
                                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #6B7280; text-align: right;">Subtotal</td>
                                                    <td width="120" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">KSh {order.total_amount:,.2f}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #6B7280; text-align: right;">Shipping</td>
                                                    <td width="120" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1F2937; text-align: right;">KSh 0.00</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 12px 0 0; font-size: 16px; font-weight: 600; color: #1F2937; text-align: right;">Total</td>
                                                    <td width="120" style="padding: 12px 0 0; font-size: 18px; font-weight: 700; color: #9333EA; text-align: right;">KSh {order.total_amount:,.2f}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #FAF5FF; border-radius: 8px; overflow: hidden; border: 1px solid #E9D5FF;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 12px;">💬 Need Help?</div>
                                        <div style="font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 12px;">
                                            Our support team is here for you! Whether you have questions about your order or need assistance, we're just a message away.
                                        </div>
                                        <div style="font-size: 14px; color: #6B7280; line-height: 1.6;">
                                            📧 <a href="mailto:support@mizizzi.com" style="color: #9333EA; text-decoration: none;">support@mizizzi.com</a><br>
                                            📞 <a href="tel:+254700123456" style="color: #9333EA; text-decoration: none;">+254 700 123 456</a>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #E5E7EB;">
                                <div style="font-size: 14px; color: #6B7280; margin-bottom: 20px;">Thank you for shopping with MIZIZZI!</div>
                                <div style="font-size: 13px; color: #9CA3AF;">
                                    <a href="https://www.mizizzi.com/terms" style="color: #9333EA; text-decoration: none; margin: 0 10px;">Terms & Conditions</a>
                                    <a href="https://www.mizizzi.com/privacy" style="color: #9333EA; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                                    <a href="https://www.mizizzi.com/returns" style="color: #9333EA; text-decoration: none; margin: 0 10px;">Returns</a>
                                    <a href="https://www.mizizzi.com/help" style="color: #9333EA; text-decoration: none; margin: 0 10px;">Help Center</a>
                                </div>
                                <div style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">
                                    © 2025 MIZIZZI. All rights reserved.
                                </div>
                            </div>
                            
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        # Send the email
        return send_email(to_email, f"Your Order Has Shipped! - #{order.order_number}", html_content)
        
    except Exception as e:
        logger.error(f"Error sending shipped status email: {str(e)}", exc_info=True)
        return False


def send_delivered_status_email(order, to_email, customer_name, order_date):
    """Send a detailed delivered status email with green success theme matching the confirmation design."""
    try:
        from ...models.models import ProductVariant
        
        # Calculate journey step colors - all steps completed for delivered
        step1_bg = "#10B981"  # Green
        step1_color = "#FFFFFF"
        step2_bg = "#10B981"  # Green
        step2_color = "#FFFFFF"
        step3_bg = "#10B981"  # Green
        step3_color = "#FFFFFF"
        step4_bg = "#10B981"  # Green - Delivered is active
        step4_color = "#FFFFFF"
        
        step1_label_color = "#1F2937"
        step2_label_color = "#10B981"  # Green for active
        step3_label_color = "#10B981"  # Green for active
        step4_label_color = "#10B981"  # Green for active (current step)
        
        # Build order items HTML
        items_html = ""
        for item in order.items:
            product = item.product
            variant = item.variant
            
            # Get product image
            image_url = product.images[0].url if product.images else "/placeholder.svg?height=80&width=80"
            
            # Get variant details
            variant_color = variant.color if variant else None
            variant_size = variant.size if variant else None
            variant_info = ""
            if variant_color or variant_size:
                variant_parts = []
                if variant_color:
                    variant_parts.append(variant_color)
                if variant_size:
                    variant_parts.append(variant_size)
                variant_info = " - ".join(variant_parts)
            
            items_html += f"""
            <tr>
                <td style="padding: 20px; border-bottom: 1px solid #E5E7EB;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td width="80" style="padding-right: 15px;">
                                <img src="{image_url}" alt="{product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; display: block;">
                            </td>
                            <td style="vertical-align: top;">
                                <div style="font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 5px;">{product.name}</div>
                                <div style="font-size: 14px; color: #6B7280; margin-bottom: 3px;">{product.category.name if product.category else ''}</div>
                                {f'<div style="font-size: 14px; color: #6B7280;">{variant_info}</div>' if variant_info else ''}
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="padding: 20px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 15px;">{item.quantity}</td>
                <td style="padding: 20px; text-align: right; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 15px;">KSh {item.price:,.2f}</td>
                <td style="padding: 20px; text-align: right; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-weight: 600; font-size: 15px;">KSh {item.total:,.2f}</td>
            </tr>
            """
        
        # Create the HTML email
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Delivered - MIZIZZI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; max-width: 600px;">
                    
                    <tr>
                        <td style="background-color: #10B981; padding: 40px 30px; text-align: center;">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" style="max-width: 180px; height: auto; display: block; margin: 0 auto 8px auto;" />
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: #FFFFFF; letter-spacing: 3px; text-transform: uppercase;">LUXURY SHOPPING</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #10B981; padding: 60px 30px; text-align: center;">
                            <table width="100" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 30px auto;">
                                <tr>
                                    <td align="center" valign="middle" style="width: 100px; height: 100px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%;">
                                        <div style="font-size: 50px; line-height: 100px;">✓</div>
                                    </td>
                                </tr>
                            </table>
                            <h2 style="margin: 0; font-size: 32px; font-weight: 700; color: #FFFFFF;">Order Delivered!</h2>
                            <p style="margin: 20px 0 0 0; font-size: 16px; color: #FFFFFF; line-height: 1.6;">Your order has arrived! We hope you love what you ordered. Enjoy your new items!</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #1F2937; line-height: 1.6;">Hello {customer_name},</p>
                            <p style="margin: 0 0 20px 0; font-size: 15px; color: #4B5563; line-height: 1.6;">Great news! Your order has been successfully delivered. We hope everything arrived in perfect condition and that you're thrilled with your purchase.</p>
                            <p style="margin: 0; font-size: 15px; color: #4B5563; line-height: 1.6;">Thank you for choosing MIZIZZI. We'd love to hear about your experience!</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border: 2px solid #10B981; border-radius: 8px; padding: 25px;">
                                <tr>
                                    <td>
                                        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #10B981;">📦 Order Details</h3>
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Order Number</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #1F2937; font-weight: 600; text-align: right;">{order.order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Placed On</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #1F2937; text-align: right;">{order_date}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Payment</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #1F2937; text-align: right;">{order.payment_method.replace('_', ' ').title() if order.payment_method else 'Cash on Delivery'}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1F2937;">🚚 Your Journey</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td width="25%" align="center" style="padding: 10px;">
                                        <table cellpadding="0" cellspacing="0" border="0" align="center">
                                            <tr>
                                                <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {step1_bg}; border-radius: 50%;">
                                                    <span style="font-size: 20px; font-weight: 700; color: {step1_color}; line-height: 50px;">1</span>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="margin-top: 10px; font-size: 13px; font-weight: 600; color: {step1_label_color};">Confirmed</div>
                                    </td>
                                    <td width="25%" align="center" style="padding: 10px;">
                                        <table cellpadding="0" cellspacing="0" border="0" align="center">
                                            <tr>
                                                <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {step2_bg}; border-radius: 50%;">
                                                    <span style="font-size: 20px; font-weight: 700; color: {step2_color}; line-height: 50px;">2</span>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="margin-top: 10px; font-size: 13px; font-weight: 600; color: {step2_label_color};">Processing</div>
                                    </td>
                                    <td width="25%" align="center" style="padding: 10px;">
                                        <table cellpadding="0" cellspacing="0" border="0" align="center">
                                            <tr>
                                                <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {step3_bg}; border-radius: 50%;">
                                                    <span style="font-size: 20px; font-weight: 700; color: {step3_color}; line-height: 50px;">3</span>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="margin-top: 10px; font-size: 13px; font-weight: 600; color: {step3_label_color};">Shipped</div>
                                    </td>
                                    <td width="25%" align="center" style="padding: 10px;">
                                        <table cellpadding="0" cellspacing="0" border="0" align="center">
                                            <tr>
                                                <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: {step4_bg}; border-radius: 50%;">
                                                    <span style="font-size: 20px; font-weight: 700; color: {step4_color}; line-height: 50px;">4</span>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="margin-top: 10px; font-size: 13px; font-weight: 600; color: {step4_label_color};">Delivered</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1F2937;">Your Selections</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                                <tr style="background-color: #F9FAFB;">
                                    <th style="padding: 15px 20px; text-align: left; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">ITEM</th>
                                    <th style="padding: 15px 20px; text-align: center; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">QTY</th>
                                    <th style="padding: 15px 20px; text-align: right; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">UNIT PRICE</th>
                                    <th style="padding: 15px 20px; text-align: right; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">SUBTOTAL</th>
                                </tr>
                                {items_html}
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="padding: 10px 0; font-size: 15px; color: #6B7280; text-align: right;">Subtotal</td>
                                    <td style="padding: 10px 0; font-size: 15px; color: #1F2937; font-weight: 600; text-align: right; width: 150px;">KSh {order.total_amount:,.2f}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; font-size: 15px; color: #6B7280; text-align: right;">Shipping</td>
                                    <td style="padding: 10px 0; font-size: 15px; color: #1F2937; font-weight: 600; text-align: right;">KSh 0.00</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0 0 0; border-top: 2px solid #E5E7EB; font-size: 17px; color: #1F2937; font-weight: 700; text-align: right;">Total</td>
                                    <td style="padding: 15px 0 0 0; font-size: 17px; color: #10B981; font-weight: 700; text-align: right;">KSh {order.total_amount:,.2f}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDF4; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #10B981;">💚 Love Your Purchase?</h4>
                                        <p style="margin: 0; font-size: 14px; color: #4B5563; line-height: 1.6;">We'd love to hear your feedback! Share your experience and help other shoppers discover amazing products.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1F2937;">📞 We're Here to Help</h4>
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #4B5563; line-height: 1.6;">Have questions or need assistance? Our support team is here to help.</p>
                                        <p style="margin: 0; font-size: 14px; color: #4B5563;">
                                            <a href="mailto:support@mizizzi.com" style="color: #10B981; text-decoration: none; font-weight: 600;">support@mizizzi.com</a> | 
                                            <a href="tel:+254700123456" style="color: #10B981; text-decoration: none; font-weight: 600;">+254 700 123 456</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #1F2937; padding: 30px; text-align: center;">
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #9CA3AF;">
                                <a href="https://www.mizizzi.com/terms" style="color: #10B981; text-decoration: none; margin: 0 10px;">Terms & Conditions</a>
                                <a href="https://www.mizizzi.com/privacy" style="color: #10B981; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                                <a href="https://www.mizizzi.com/returns" style="color: #10B981; text-decoration: none; margin: 0 10px;">Returns</a>
                                <a href="https://www.mizizzi.com/help" style="color: #10B981; text-decoration: none; margin: 0 10px;">Help Center</a>
                            </p>
                            <p style="margin: 15px 0 0 0; font-size: 13px; color: #6B7280;">© 2025 MIZIZZI. All rights reserved.</p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6B7280;">This email was sent to {to_email}</p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        # Send the email
        return send_email(to_email, f"Order Delivered - #{order.order_number} - MIZIZZI", html_content)
        
    except Exception as e:
        logger.error(f"Error sending delivered status email: {str(e)}", exc_info=True)
        return False


def send_cancelled_status_email(order, to_email, customer_name, order_date):
    """Send a detailed cancelled status email matching the design of other status emails."""
    try:
        # Get order items with product details
        order_items_html = ""
        for item in order.items:
            product = item.product
            image_url = product.images[0].url if product.images else "/placeholder.svg?height=80&width=80"
            variant_info = ""
            if item.variant:
                size = item.variant.size if item.variant.size else ""
                color = item.variant.color if item.variant.color else ""
                if color or size:
                    variant_info = f"<div style='color: #666; font-size: 13px; margin-top: 4px;'>{color} {size}</div>"
            
            order_items_html += f"""
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid #eee;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                            <td width="80" style="padding-right: 15px;">
                                <img src="{image_url}" alt="{product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; display: block;">
                            </td>
                            <td>
                                <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">{product.name}</div>
                                <div style="color: #666; font-size: 14px;">{product.category.name if product.category else ''}</div>
                                {variant_info}
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="padding: 15px; text-align: center; border-bottom: 1px solid #eee;">{item.quantity}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #eee; white-space: nowrap;">KSh {item.price:,.2f}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #eee; white-space: nowrap; font-weight: 600;">KSh {item.total:,.2f}</td>
            </tr>
            """
        
        # Create HTML email template
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Cancelled - MIZIZZI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                    <tr>
                        <td style="background-color: #EF4444; padding: 40px 20px; text-align: center;">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" style="max-width: 180px; height: auto; display: block; margin: 0 auto 10px auto;" />
                            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;">LUXURY SHOPPING</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #EF4444; padding: 60px 20px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100" align="center" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" valign="middle" style="width: 100px; height: 100px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%;">
                                        <div style="font-size: 48px; line-height: 100px; color: #991B1B;">✕</div>
                                    </td>
                                </tr>
                            </table>
                            <h2 style="margin: 30px 0 20px 0; color: #ffffff; font-size: 32px; font-weight: 700;">Order Cancelled</h2>
                            <p style="margin: 0; color: #ffffff; font-size: 16px; line-height: 1.6; max-width: 500px; margin: 0 auto;">Your order has been cancelled. If you have any questions or didn't request this, we're here to help!</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">Hello {customer_name},</p>
                            <p style="margin: 0 0 30px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
                                We wanted to let you know that your order has been cancelled. If you requested this cancellation, no further action is needed. If you didn't request this or have any questions, please reach out to our support team - we're always happy to help!
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; border: 2px solid #EF4444; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px; background-color: #FEF2F2;">
                                        <h3 style="margin: 0 0 15px 0; color: #EF4444; font-size: 18px; font-weight: 600;">📦 Order Details</h3>
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Number</td>
                                                <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600; text-align: right;">#{order.order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666; font-size: 14px;">Placed On</td>
                                                <td style="padding: 8px 0; color: #1a1a1a; text-align: right;">{order_date}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666; font-size: 14px;">Payment</td>
                                                <td style="padding: 8px 0; color: #1a1a1a; text-align: right;">{order.payment_method.replace('_', ' ').title() if order.payment_method else 'N/A'}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="margin: 40px 0;">
                                <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">📦 Your Selections</h3>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                                    <tr style="background-color: #f9f9f9;">
                                        <th style="padding: 12px 15px; text-align: left; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">ITEM</th>
                                        <th style="padding: 12px 15px; text-align: center; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">QTY</th>
                                        <th style="padding: 12px 15px; text-align: right; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">UNIT PRICE</th>
                                        <th style="padding: 12px 15px; text-align: right; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">SUBTOTAL</th>
                                    </tr>
                                    {order_items_html}
                                </table>
                                
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px;">
                                    <tr>
                                        <td style="padding: 10px 0; text-align: right; color: #666;">Subtotal</td>
                                        <td style="padding: 10px 0; text-align: right; font-weight: 600; width: 150px;">KSh {order.total_amount:,.2f}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; text-align: right; color: #666;">Shipping</td>
                                        <td style="padding: 10px 0; text-align: right; font-weight: 600;">KSh 0.00</td>
                                    </tr>
                                    <tr style="border-top: 2px solid #EF4444;">
                                        <td style="padding: 15px 0; text-align: right; font-size: 18px; font-weight: 700; color: #1a1a1a;">Total</td>
                                        <td style="padding: 15px 0; text-align: right; font-size: 18px; font-weight: 700; color: #EF4444;">KSh {order.total_amount:,.2f}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0; background-color: #FEF2F2; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <h3 style="margin: 0 0 10px 0; color: #EF4444; font-size: 16px; font-weight: 600;">💬 Need Help?</h3>
                                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                            If you have questions about this cancellation or need assistance, our support team is here to help. Reach out anytime!
                                        </p>
                                        <p style="margin: 15px 0 0 0; font-size: 14px;">
                                            <a href="mailto:support@mizizzi.com" style="color: #EF4444; text-decoration: none; font-weight: 600;">📧 support@mizizzi.com</a><br>
                                            <a href="tel:+254700123456" style="color: #EF4444; text-decoration: none; font-weight: 600;">📞 +254 700 123 456</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                            <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 14px;">Thank you for shopping with MIZIZZI</p>
                            <p style="margin: 0; color: #999; font-size: 12px;">© {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        # Send the email
        return send_email(to_email, f"Order Cancelled - #{order.order_number}", html_content)
        
    except Exception as e:
        logger.error(f"Error sending cancelled status email: {str(e)}", exc_info=True)
        return False


def send_order_cancellation_email(order_id, to_email, customer_name, cancellation_reason=None):
    """Send an email notification when an order is cancelled."""
    try:
        # Import models here to avoid circular imports
        from ...models.models import Order
        
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found: {order_id}")
            return False
        
        # Format the date
        order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
        cancellation_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')
        
        # Create cancellation reason HTML
        reason_html = ""
        if cancellation_reason:
            reason_html = f"""
            <div class="cancellation-reason">
                <h4>Cancellation Reason</h4>
                <p>{cancellation_reason}</p>
            </div>
            """
        
        # Create HTML email template for cancellation
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Cancellation - MIZIZZI</title>
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
            background-color: #cc3333;
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
            border-bottom: 3px solid #D4AF37;
        }}
        /* Added logo image styling */
        .email-header img {{
            max-width: 180px;
            height: auto;
            display: block;
            margin: 0 auto 10px auto;
        }}
        .email-header h1 {{
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            font-size: 28px;
            margin: 0;
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
        .cancellation-message {{
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #333;
        }}
        .order-summary {{
            background-color: #f9f9f9;
            border-left: 4px solid #cc3333;
            border-radius: 4px;
            padding: 25px;
            margin-bottom: 30px;
        }}
        .cancellation-reason {{
            background-color: #fff3f3;
            border: 1px solid #ffcdd2;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
        }}
        .cancellation-reason h4 {{
            font-family: 'Playfair Display', serif;
            margin-top: 0;
            color: #c62828;
            font-size: 16px;
        }}
        .email-footer {{
            background-color: #1A1A1A;
            padding: 30px 20px;
            text-align: center;
            font-size: 13px;
            color: #f0f0f0;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" />
            <h1>Order Cancelled</h1>
        </div>
        <div class="email-body">
            <div class="greeting">Hello {customer_name},</div>
            <div class="cancellation-message">
                We're writing to inform you that your order has been cancelled.
            </div>
            <div class="order-summary">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Order Date:</strong> {order_date}</p>
                <p><strong>Cancelled Date:</strong> {cancellation_date}</p>
                <p><strong>Total Amount:</strong> KSh {order.total_amount:,.2f}</p>
            </div>
            {reason_html}
            <p style="margin-top: 30px; line-height: 1.6;">
                If you have any questions about this cancellation, please contact our customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
            </p>
            <p style="margin-top: 30px; font-weight: 500;">
                Warm regards,<br>
                <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
            </p>
        </div>
        <div class="email-footer">
            <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Send the email
        return send_email(to_email, f"Order Cancelled - #{order.order_number}", html_content)
        
    except Exception as e:
        logger.error(f"Error sending order cancellation email: {str(e)}", exc_info=True)
        return False


def send_order_refund_email(order_id, to_email, customer_name):
    """Send an email notification when a refund is processed."""
    try:
        # Import models here to avoid circular imports
        from ...models.models import Order
        
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found: {order_id}")
            return False
        
        # Format the date
        order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
        refund_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')
        
        # Format amounts
        formatted_total = "{:,.2f}".format(order.total_amount)
        
        # Create HTML email template
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed - MIZIZZI</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #f5f5f5;
            color: #1a1a1a;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}
        
        .email-wrapper {{
            background-color: #f5f5f5;
            padding: 40px 20px;
        }}
        
        .email-container {{
            max-width: 680px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }}
        
        .email-header {{
            background-color: #1a1a1a;
            padding: 40px;
            text-align: center;
        }}
        
        /* Added logo image styling */
        .email-header img {{
            max-width: 180px;
            height: auto;
            display: block;
            margin: 0 auto;
        }}
        
        .logo {{
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }}
        
        .tagline {{
            font-size: 12px;
            color: rgba(255,255,255,0.7);
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 500;
        }}
        
        .status-banner {{
            background-color: #999999;
            padding: 32px 40px;
            text-align: center;
            color: white;
        }}
        
        .status-icon {{
            width: 64px;
            height: 64px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            font-size: 32px;
        }}
        
        .status-title {{
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
        }}
        
        .status-subtitle {{
            font-size: 15px;
            opacity: 0.95;
            font-weight: 400;
        }}
        
        .email-body {{
            padding: 40px;
        }}
        
        .greeting {{
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
        }}
        
        .intro-text {{
            font-size: 15px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 32px;
        }}
        
        .info-card {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .info-card-title {{
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #999999;
        }}
        
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            align-items: center;
        }}
        
        .info-label {{
            font-size: 14px;
            color: #666;
            font-weight: 500;
        }}
        
        .info-value {{
            font-size: 14px;
            color: #1a1a1a;
            font-weight: 600;
        }}
        
        .payment-badge {{
            display: inline-block;
            background-color: #FF6600;
            color: #fff;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .support-section {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .support-title {{
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }}
        
        .support-text {{
            font-size: 14px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 16px;
        }}
        
        .support-contact {{
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
        }}
        
        .contact-item {{
            color: #FF6600;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
        }}
        
        .email-footer {{
            background-color: #1a1a1a;
            padding: 32px 40px;
            color: #999;
            text-align: center;
        }}
        
        .footer-links {{
            margin: 16px 0;
        }}
        
        .footer-link {{
            color: #999;
            text-decoration: none;
            margin: 0 12px;
            font-size: 13px;
        }}
        
        .footer-link:hover {{
            color: #FF6600;
        }}
        
        .copyright {{
            font-size: 13px;
            color: #666;
            margin-top: 16px;
        }}
        
        @media only screen and (max-width: 640px) {{
            .email-wrapper {{
                padding: 20px 10px;
            }}
            
            .email-body {{
                padding: 24px 20px;
            }}
            
            .info-card, .support-section {{
                padding: 20px 16px;
            }}
            
            .support-contact {{
                flex-direction: column;
                gap: 12px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="email-header">
                <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" />
                <div class="logo">MIZIZZI</div>
                <div class="tagline">LUXURY SHOPPING</div>
            </div>
            
            <div class="status-banner">
                <div class="status-icon">↩️</div>
                <div class="status-title">Refund Processed</div>
                <div class="status-subtitle">Your refund has been processed successfully</div>
            </div>
            
            <div class="email-body">
                <div class="greeting">Hello {customer_name},</div>
                <div class="intro-text">
                    We've processed your refund for order #{order.order_number}. The refund amount should appear in your account within 3-5 business days, depending on your payment provider.
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">Refund Details</div>
                    <div class="info-row">
                        <span class="info-label">Order Number</span>
                        <span class="info-value">{order.order_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Original Order Date</span>
                        <span class="info-value">{order_date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Refund Date</span>
                        <span class="info-value">{refund_date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Refund Amount</span>
                        <span class="info-value">KSh {formatted_total}</span>
                    </div>
                </div>
                
                <div class="support-section">
                    <div class="support-title">Questions About Your Refund?</div>
                    <div class="support-text">
                        If you have any questions about this refund or need assistance, our customer service team is here to help.
                    </div>
                    <div class="support-contact">
                        <a href="mailto:support@mizizzi.com" class="contact-item">support@mizizzi.com</a>
                        <a href="tel:+254700000000" class="contact-item">+254 700 000 000</a>
                    </div>
                </div>
            </div>
            
            <div class="email-footer">
                <div class="footer-links">
                    <a href="https://mizizzi.com/returns" class="footer-link">Returns Policy</a>
                    <a href="https://mizizzi.com/faq" class="footer-link">FAQ</a>
                    <a href="https://mizizzi.com/contact" class="footer-link">Contact Us</a>
                </div>
                <div class="copyright">
                    &copy; 2025 MIZIZZI. All rights reserved.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        return send_email(to_email, f"Refund Processed - #{order.order_number}", html_content)
        
    except Exception as e:
        logger.error(f"Error sending refund email: {str(e)}", exc_info=True)
        return False


def log_admin_activity(admin_id, action, details=None):
    """Log admin activity for audit trail."""
    try:
        # Import models here to avoid circular imports
        from ...models.models import AdminActivityLog
        from ...configuration.extensions import db
        
        activity_log = AdminActivityLog(
            admin_id=admin_id,
            action=action,
            details=details or {},
            timestamp=datetime.utcnow()
        )
        
        db.session.add(activity_log)
        db.session.commit()
        
        logger.info(f"Admin activity logged: {admin_id} - {action}")
        return True
        
    except Exception as e:
        logger.error(f"Error logging admin activity: {str(e)}")
        return False

def send_webhook_notification(webhook_url, event_type, data):
    """Send webhook notification for order events."""
    try:
        payload = {
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "MIZIZZI-Webhook/1.0"
        }
        
        response = requests.post(webhook_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Webhook notification sent successfully: {event_type}")
            return True
        else:
            logger.warning(f"Webhook notification failed: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending webhook notification: {str(e)}")
        return False

def handle_order_completion(order_id):
    """Handle order completion tasks like inventory updates and notifications."""
    try:
        # Import models here to avoid circular imports
        from ...models.models import Order, Product, Inventory
        from ...configuration.extensions import db
        
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found for completion: {order_id}")
            return False
        
        # Update inventory for each order item
        for item in order.items:
            product = Product.query.get(item.product_id)
            if product:
                # Update product stock
                if product.stock_quantity >= item.quantity:
                    product.stock_quantity -= item.quantity
                    
                    # Update inventory record
                    inventory = Inventory.query.filter_by(product_id=product.id).first()
                    if inventory:
                        inventory.available_quantity = product.stock_quantity
                        inventory.reserved_quantity = max(0, inventory.reserved_quantity - item.quantity)
                        inventory.last_updated = datetime.utcnow()
                    
                    logger.info(f"Updated inventory for product {product.id}: -{item.quantity}")
                else:
                    logger.warning(f"Insufficient stock for product {product.id}")
        
        db.session.commit()
        logger.info(f"Order completion handled successfully: {order_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error handling order completion: {str(e)}")
        db.session.rollback()
        return False

# Placeholder for the EmailTemplate class if it's intended to be a class
# If it's meant to be standalone functions, this class definition might not be needed.
# Assuming the updates are for methods within a class that is not fully provided.
class EmailTemplateService:

    def generate_order_confirmation_email(self, order, customer_name: str, customer_email: str):
        """Generate order confirmation email HTML"""
        try:
            # Format dates
            order_date = order.created_at.strftime("%B %d, %Y at %I:%M %p")
            estimated_delivery = order.created_at + timedelta(days=3)
            estimated_delivery_date = estimated_delivery.strftime("%B %d, %Y")
            
            # Format payment method
            payment_method = order.payment_method.replace('_', ' ').title() if order.payment_method else 'Cash on Delivery'
            
            # Format amounts
            formatted_subtotal = f"{order.subtotal:,.2f}"
            formatted_shipping = f"{order.shipping_cost:,.2f}"
            formatted_tax = f"{order.tax:,.2f}"
            formatted_total = f"{order.total_amount:,.2f}"
            
            # Get shipping address
            shipping_address = order.shipping_address or {}
            
            # Generate order items HTML
            order_items_html = ""
            for item in order.items:
                product_name = item.product.name if item.product else "Product"
                product_image = item.product.images[0].url if item.product and item.product.images else "/placeholder.svg?height=80&width=80" # Assuming Image model has a 'url' attribute
                category = item.product.category.name if item.product and item.product.category else ""
                
                formatted_price = f"{item.price:,.2f}"
                formatted_subtotal_item = f"{item.total:,.2f}" # Changed item.subtotal to item.total
                
                order_items_html += f"""
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 20px;">
                                    <img src="{product_image}" alt="{product_name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
                                    <div>
                                        <div style="font-weight: 600; font-size: 16px; color: #1a1a1a; margin-bottom: 5px;">{product_name}</div>
                                        <div style="font-size: 14px; color: #666;">{category}</div>
                                    </div>
                                </div>
                            </td>
                            <td style="text-align: center; font-weight: 500; color: #333;">{item.quantity}</td>
                            <td style="text-align: right; font-weight: 500; color: #333;">KSh {formatted_price}</td>
                            <td style="text-align: right; font-weight: 600; color: #1a1a1a;">KSh {formatted_subtotal_item}</td>
                        </tr>
                """
            
            html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - MIZIZZI</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #f5f5f5;
            color: #1a1a1a;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}
        
        .email-wrapper {{
            background-color: #f5f5f5;
            padding: 40px 20px;
        }}
        
        .email-container {{
            max-width: 680px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }}
        
        .email-header {{
            background-color: #1a1a1a;
            padding: 40px;
            text-align: center;
        }}
        
        /* Added logo image styling */
        .email-header img {{
            max-width: 180px;
            height: auto;
            display: block;
            margin: 0 auto;
        }}
        
        .logo {{
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }}
        
        .tagline {{
            font-size: 12px;
            color: rgba(255,255,255,0.7);
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 500;
        }}
        
        .success-banner {{
            background-color: #FF6600;
            padding: 32px 40px;
            text-align: center;
            color: white;
        }}
        
        .success-icon {{
            width: 64px;
            height: 64px;
            background-color: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            font-size: 32px;
        }}
        
        .success-title {{
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
        }}
        
        .success-subtitle {{
            font-size: 15px;
            opacity: 0.95;
            font-weight: 400;
        }}
        
        .email-body {{
            padding: 40px;
        }}
        
        .greeting {{
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
        }}
        
        .intro-text {{
            font-size: 15px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 32px;
        }}
        
        .info-card {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .info-card-title {{
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #FF6600;
        }}
        
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            align-items: center;
        }}
        
        .info-label {{
            font-size: 14px;
            color: #666;
            font-weight: 500;
        }}
        
        .info-value {{
            font-size: 14px;
            color: #1a1a1a;
            font-weight: 600;
        }}
        
        .payment-badge {{
            display: inline-block;
            background-color: #FF6600;
            color: #fff;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .section-title {{
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #FF6600;
        }}
        
        .products-table {{
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            overflow: hidden;
        }}
        
        .products-table thead {{
            background-color: #f9f9f9;
        }}
        
        .products-table th {{
            padding: 16px 20px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #666;
        }}
        
        .products-table th:nth-child(2) {{
            text-align: center;
        }}
        
        .products-table th:nth-child(3),
        .products-table th:nth-child(4) {{
            text-align: right;
        }}
        
        .products-table td {{
            padding: 20px;
            border-top: 1px solid #f0f0f0;
            vertical-align: middle;
            background-color: #fff;
        }}
        
        .products-table td:nth-child(2) {{
            text-align: center;
        }}
        
        .products-table td:nth-child(3),
        .products-table td:nth-child(4) {{
            text-align: right;
        }}
        
        .order-summary {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .summary-row {{
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 15px;
            align-items: center;
        }}
        
        .summary-label {{
            color: #666;
            font-weight: 500;
        }}
        
        .summary-value {{
            color: #1a1a1a;
            font-weight: 600;
        }}
        
        .summary-total {{
            border-top: 2px solid #e5e5e5;
            margin-top: 12px;
            padding-top: 16px;
        }}
        
        .summary-total .summary-label {{
            font-size: 17px;
            font-weight: 700;
            color: #1a1a1a;
        }}
        
        .summary-total .summary-value {{
            font-size: 20px;
            font-weight: 700;
            color: #FF6600;
        }}
        
        .delivery-timeline {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .timeline-title {{
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 24px;
        }}
        
        .timeline-steps {{
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }}
        
        .timeline-step {{
            flex: 1;
            text-align: center;
            padding: 16px 8px;
            background: #fff;
            border-radius: 8px;
            border: 2px solid #e5e5e5;
        }}
        
        .timeline-step.active {{
            background: #FF6600;
            color: white;
            border-color: #FF6600;
        }}
        
        .step-number {{
            width: 40px;
            height: 40px;
            background-color: #e5e5e5;
            color: #666;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
            font-weight: 600;
            font-size: 16px;
        }}
        
        .timeline-step.active .step-number {{
            background-color: white;
            color: #FF6600;
        }}
        
        .step-label {{
            font-size: 13px;
            color: #666;
            font-weight: 600;
        }}
        
        .timeline-step.active .step-label {{
            color: white;
        }}
        
        .shipping-card {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .address-block {{
            background-color: #fff;
            border-radius: 6px;
            padding: 20px;
            margin-top: 16px;
            border: 1px solid #e5e5e5;
        }}
        
        .address-block p {{
            margin: 6px 0;
            font-size: 14px;
            color: #1a1a1a;
            line-height: 1.5;
        }}
        
        .delivery-estimate {{
            background-color: #FF6600;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            text-align: center;
            color: white;
        }}
        
        .delivery-estimate-title {{
            font-size: 14px;
            font-weight: 600;
            color: white;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .delivery-estimate-date {{
            font-size: 22px;
            color: white;
            font-weight: 700;
            margin-bottom: 8px;
        }}
        
        .delivery-estimate-note {{
            font-size: 13px;
            color: rgba(255,255,255,0.9);
            line-height: 1.5;
        }}
        
        .cta-section {{
            text-align: center;
            margin: 32px 0;
        }}
        
        .cta-button {{
            display: inline-block;
            background-color: #FF6600;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .support-section {{
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin-bottom: 32px;
            border: 1px solid #e5e5e5;
        }}
        
        .support-title {{
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }}
        
        .support-text {{
            font-size: 14px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 16px;
        }}
        
        .support-contact {{
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
        }}
        
        .contact-item {{
            color: #FF6600;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
        }}
        
        .email-footer {{
            background-color: #1a1a1a;
            padding: 32px 40px;
            color: #999;
            text-align: center;
        }}
        
        .footer-links {{
            margin: 16px 0;
        }}
        
        .footer-link {{
            color: #999;
            text-decoration: none;
            margin: 0 12px;
            font-size: 13px;
        }}
        
        .footer-link:hover {{
            color: #FF6600;
        }}
        
        .copyright {{
            font-size: 13px;
            color: #666;
            margin-top: 16px;
        }}
        
        @media only screen and (max-width: 640px) {{
            .email-wrapper {{
                padding: 20px 10px;
            }}
            
            .email-body {{
                padding: 24px 20px;
            }}
            
            .info-card, .support-section {{
                padding: 20px 16px;
            }}
            
            .support-contact {{
                flex-direction: column;
                gap: 12px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="email-header">
                <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" />
                <div class="logo">MIZIZZI</div>
                <div class="tagline">LUXURY SHOPPING</div>
            </div>
            
            <div class="success-banner">
                <div class="success-icon">✓</div>
                <div class="success-title">Order Confirmed</div>
                <div class="success-subtitle">Thank you for choosing MIZIZZI. Your luxury experience begins now.</div>
            </div>
            
            <div class="email-body">
                <div class="greeting">Hello {customer_name},</div>
                <div class="intro-text">
                    We're delighted to confirm your order. Each piece has been carefully selected and your items are being prepared with care. We'll keep you informed at every step of the journey.
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">Order Details</div>
                    <div class="info-row">
                        <span class="info-label">Order Number</span>
                        <span class="info-value">{order.order_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Placed On</span>
                        <span class="info-value">{order_date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Payment Method</span>
                        <span class="payment-badge">{payment_method}</span>
                    </div>
                </div>
                
                <div class="delivery-estimate">
                    <div class="delivery-estimate-title">Expected Arrival</div>
                    <div class="delivery-estimate-date">{estimated_delivery_date}</div>
                    <div class="delivery-estimate-note">Based on standard processing and shipping times</div>
                </div>
                
                <div class="delivery-timeline">
                    <div class="timeline-title">Order Journey</div>
                    <div class="timeline-steps">
                        <div class="timeline-step active">
                            <div class="step-number">1</div>
                            <div class="step-label">Confirmed</div>
                        </div>
                        <div class="timeline-step">
                            <div class="step-number">2</div>
                            <div class="step-label">Preparing</div>
                        </div>
                        <div class="timeline-step">
                            <div class="step-number">3</div>
                            <div class="step-label">Shipped</div>
                        </div>
                        <div class="timeline-step">
                            <div class="step-number">4</div>
                            <div class="step-label">Delivered</div>
                        </div>
                    </div>
                </div>
                
                <div class="section-title">Your Items</div>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order_items_html}
                    </tbody>
                </table>
                
                <div class="order-summary">
                    <div class="summary-row">
                        <span class="summary-label">Subtotal</span>
                        <span class="summary-value">KSh {formatted_subtotal}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Shipping</span>
                        <span class="summary-value">KSh {formatted_shipping}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Tax (16% VAT)</span>
                        <span class="summary-value">KSh {formatted_tax}</span>
                    </div>
                    <div class="summary-row summary-total">
                        <span class="summary-label">Total</span>
                        <span class="summary-value">KSh {formatted_total}</span>
                    </div>
                </div>
                
                <div class="shipping-card">
                    <div class="info-card-title">Delivery Address</div>
                    <div class="address-block">
                        <p><strong>{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}</strong></p>
                        <p>{shipping_address.get('address_line1', '')}</p>
                        {f"<p>{shipping_address.get('address_line2', '')}</p>" if shipping_address.get('address_line2') else ''}
                        <p>{shipping_address.get('city', '')}, {shipping_address.get('state', '')}</p>
                        <p>{shipping_address.get('postal_code', '')}</p>
                        <p>{shipping_address.get('country', '')}</p>
                        <p><strong>Phone:</strong> {shipping_address.get('phone', '')}</p>
                    </div>
                </div>
                
                <div class="cta-section">
                    <a href="https://mizizzi.com/orders/{order.order_number}" class="cta-button">Track Your Order</a>
                </div>
                
                <div class="support-section">
                    <div class="support-title">Need Help?</div>
                    <div class="support-text">
                        Our customer service team is here to assist you with any questions about your order.
                    </div>
                    <div class="support-contact">
                        <a href="mailto:support@mizizzi.com" class="contact-item">support@mizizzi.com</a>
                        <a href="tel:+254700000000" class="contact-item">+254 700 000 000</a>
                    </div>
                </div>
            </div>
            
            <div class="email-footer">
                <div class="footer-links">
                    <a href="https://mizizzi.com/shipping" class="footer-link">Shipping Policy</a>
                    <a href="https://mizizzi.com/returns" class="footer-link">Returns</a>
                    <a href="https://mizizzi.com/faq" class="footer-link">FAQ</a>
                    <a href="https://mizizzi.com/contact" class="footer-link">Contact Us</a>
                </div>
                <div class="copyright">
                    &copy; 2025 MIZIZZI. All rights reserved.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""
            # Send the email
            return send_email(customer_email, f"Order Confirmation #{order.order_number} - MIZIZZI", html_content)
        except Exception as e:
            logger.error(f"Error generating order confirmation email: {str(e)}", exc_info=True)
            return False

        except Exception as e:
            logger.error(f"Error generating order confirmation email: {str(e)}", exc_info=True)
            return False

        except Exception as e:
            logger.error(f"Error generating order confirmation email: {str(e)}", exc_info=True)
            return False

        except Exception as e:
            logger.error(f"Error generating order confirmation email: {str(e)}", exc_info=True)
            return False

# CHANGE: Adding new return status email function with table-based design matching other status emails
def send_return_status_email(order_id, to_email, customer_name):
    """Send an email notification when an order return is processed."""
    try:
        from ...models.models import Order, OrderItem
        
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order not found: {order_id}")
            return False
        
        order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
        return_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')
        
        items_html = ""
        for item in order.items:
            product = item.product
            image_url = product.images[0].url if product.images else "/placeholder.svg?height=80&width=80"
            variant_info = ""
            if item.variant:
                color = item.variant.color if item.variant else None
                size = item.variant.size if item.variant else None
                if color or size:
                    variant_info = f"<div style='font-size: 13px; color: #666; margin-top: 4px;'>{color or ''} {size or ''}</div>"
            
            items_html += f"""
            <tr>
                <td style='padding: 16px; border-bottom: 1px solid #e5e5e5;'>
                    <table cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td style='padding-right: 16px;'>
                                <img src='{image_url}' alt='{product.name}' style='width: 80px; height: 80px; object-fit: cover; border-radius: 8px; display: block;' />
                            </td>
                            <td>
                                <div style='font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px;'>{product.name}</div>
                                <div style='font-size: 13px; color: #999;'>{product.category.name if product.category else ''}</div>
                                {variant_info}
                            </td>
                        </tr>
                    </table>
                </td>
                <td style='padding: 16px; text-align: center; border-bottom: 1px solid #e5e5e5;'>
                    <span style='font-size: 14px; color: #666;'>{item.quantity}</span>
                </td>
                <td style='padding: 16px; text-align: right; border-bottom: 1px solid #e5e5e5;'>
                    <span style='font-size: 14px; color: #666;'>KSh {item.price:,.2f}</span>
                </td>
                <td style='padding: 16px; text-align: right; border-bottom: 1px solid #e5e5e5;'>
                    <span style='font-size: 15px; font-weight: 600; color: #1a1a1a;'>KSh {item.total:,.2f}</span>
                </td>
            </tr>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Return Processed - MIZIZZI</title>
            <style>
                body {{
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    background-color: #f5f5f5;
                }}
                .email-container {{
                    max-width: 650px;
                    margin: 0 auto;
                    background-color: #ffffff;
                }}
                .email-header {{
                    background-color: #FF8C00;
                    padding: 40px 20px;
                    text-align: center;
                }}
                /* Added logo image styling */
                .email-header img {{
                    max-width: 180px;
                    height: auto;
                    display: block;
                    margin: 0 auto 10px auto;
                }}
                .email-header h1 {{
                    margin: 0;
                    color: #ffffff;
                    font-size: 32px;
                    font-weight: 700;
                    letter-spacing: 2px;
                }}
                .email-header p {{
                    margin: 10px 0 0 0;
                    color: #ffffff;
                    font-size: 14px;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }}

            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" />
                    <h1>Order Return</h1>
                    <p>LUXURY SHOPPING</p>
                </div>
                
                <tr>
                    <td style="background-color: #EF4444; padding: 60px 20px; text-align: center;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100" align="center" style="margin: 0 auto;">
                            <tr>
                                <td align="center" valign="middle" style="width: 100px; height: 100px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%;">
                                    <div style="font-size: 48px; line-height: 100px; color: #991B1B;">✕</div>
                                </td>
                            </tr>
                        </table>
                        <h2 style="margin: 30px 0 20px 0; color: #ffffff; font-size: 32px; font-weight: 700;">Order Cancelled</h2>
                        <p style="margin: 0; color: #ffffff; font-size: 16px; line-height: 1.6; max-width: 500px; margin: 0 auto;">Your order has been cancelled. If you have any questions or didn't request this, we're here to help!</p>
                    </td>
                </tr>
                
                <tr>
                    <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Hello {customer_name},</p>
                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #666; line-height: 1.6;">
                            We've received your returned items and processed your refund. The refund amount will be credited back to your original payment method within 3-5 business days. Thank you for shopping with us!
                        </p>
                        
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF2F2; border: 2px solid #EF4444; border-radius: 8px; margin-bottom: 32px;">
                            <tr>
                                <td style="padding: 24px;">
                                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a; padding-bottom: 12px; border-bottom: 2px solid #EF4444;">📦 Return Details</p>
                                    
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                        <tr>
                                            <td style="padding: 8px 0;">
                                                <span style="font-size: 14px; color: #666;">Order Number</span>
                                            </td>
                                            <td align="right" style="padding: 8px 0;">
                                                <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">{order.order_number}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0;">
                                                <span style="font-size: 14px; color: #666;">Original Order Date</span>
                                            </td>
                                            <td align="right" style="padding: 8px 0;">
                                                <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">{order_date}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0;">
                                                <span style="font-size: 14px; color: #666;">Return Processed</span>
                                            </td>
                                            <td align="right" style="padding: 8px 0;">
                                                <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">{return_date}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0;">
                                                <span style="font-size: 14px; color: #666;">Payment Method</span>
                                            </td>
                                            <td align="right" style="padding: 8px 0;">
                                                <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">{order.payment_method.replace('_', ' ').title() if order.payment_method else 'N/A'}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                        
                        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">🛍️ Returned Items</p>
                        
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                            <tr style="background-color: #f9f9f9;">
                                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">ITEM</th>
                                <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">QTY</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">UNIT PRICE</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">SUBTOTAL</th>
                            </tr>
                            {items_html}
                        </table>
                        
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                            <tr>
                                <td align="right" style="padding: 8px 0;">
                                    <span style="font-size: 14px; color: #666;">Subtotal</span>
                                </td>
                                <td align="right" style="padding: 8px 0 8px 40px;">
                                    <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">KSh {order.total_amount:,.2f}</span>
                                </td>
                            </tr>
                            <tr>
                                <td align="right" style="padding: 8px 0;">
                                    <span style="font-size: 14px; color: #666;">Shipping</span>
                                </td>
                                <td align="right" style="padding: 8px 0 8px 40px;">
                                    <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">KSh 0.00</span>
                                </td>
                            </tr>
                            <tr>
                                <td align="right" style="padding: 16px 0 0 0; border-top: 2px solid #e5e5e5;">
                                    <span style="font-size: 16px; font-weight: 700; color: #1a1a1a;">Refund Amount</span>
                                </td>
                                <td align="right" style="padding: 16px 0 0 40px; border-top: 2px solid #e5e5e5;">
                                    <span style="font-size: 18px; font-weight: 700; color: #EF4444;">KSh {order.total_amount:,.2f}</span>
                                </td>
                            </tr>
                        </table>
                        
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; margin-bottom: 32px;">
                            <tr>
                                <td style="padding: 24px; text-align: center;">
                                    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">💬 Need Help?</p>
                                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #666; line-height: 1.6;">
                                        If you have any questions about your return or refund, we're here to help!
                                    </p>
                                    <p style="margin: 0;">
                                        <a href="mailto:support@mizizzi.com" style="color: #EF4444; text-decoration: none; font-weight: 600; font-size: 14px; margin: 0 12px;">support@mizizzi.com</a>
                                        <span style="color: #ccc;">|</span>
                                        <a href="tel:+254700123456" style="color: #EF4444; text-decoration: none; font-weight: 600; font-size: 14px; margin: 0 12px;">+254 700 123 456</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                
                <tr>
                    <td style="background-color: #1a1a1a; padding: 32px; text-align: center;">
                        <p style="margin: 0 0 16px 0;">
                            <a href="#" style="color: #999; text-decoration: none; font-size: 13px; margin: 0 12px;">Returns Policy</a>
                            <a href="#" style="color: #999; text-decoration: none; font-size: 13px; margin: 0 12px;">Privacy Policy</a>
                            <a href="#" style="color: #999; text-decoration: none; font-size: 13px; margin: 0 12px;">Help Center</a>
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #666;">© 2025 MIZIZZI. All rights reserved.</p>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">This email was sent to {to_email}</p>
                    </td>
                </tr>
            </div>
        </body>
        </html>
        """
        
        return send_email(to_email, f"Return Processed - #{order.order_number}", html_content)
        
    except Exception as e:
        logger.error(f"Error sending return status email: {str(e)}", exc_info=True)
        return False
