# # """Email templates and functions for order-related communications.
# # Shared between user and admin order routes."""

# # import os
# # import json
# # import logging
# # from datetime import datetime
# # from flask import current_app
# # import requests

# # # Setup logger
# # logger = logging.getLogger(__name__)

# # def send_email(to, subject, template):
# #     """Send email using Brevo API directly since we know it works."""
# #     try:
# #         logger.info(f"[v0] Starting email send process to: {to}")
# #         logger.info(f"[v0] Email subject: {subject}")

# #         # Get the Brevo API key from configuration
# #         brevo_api_key = current_app.config.get('BREVO_API_KEY', 'REDACTED-BREVO-KEY')

# #         if not brevo_api_key:
# #             logger.error("[v0] BREVO_API_KEY not configured")
# #             return False

# #         logger.info(f"[v0] Using Brevo API key: {brevo_api_key[:10]}...")

# #         url = "https://api.brevo.com/v3/smtp/email"

# #         # Prepare the payload for Brevo API
# #         payload = {
# #             "sender": {
# #                 "name": "MIZIZZI",
# #                 "email": "REDACTED-SENDER-EMAIL"  # Use the verified sender email
# #             },
# #             "to": [{"email": to}],
# #             "subject": subject,
# #             "htmlContent": template,
# #             "headers": {
# #                 "X-Priority": "1",
# #                 "X-MSMail-Priority": "High",
# #                 "Importance": "High"
# #             }
# #         }

# #         headers = {
# #             "accept": "application/json",
# #             "content-type": "application/json",
# #             "api-key": brevo_api_key
# #         }

# #         logger.info(f"[v0] Sending email via Brevo API to {to}")
# #         logger.info(f"[v0] Payload prepared with sender: REDACTED-SENDER-EMAIL")
# #         logger.info(f"[v0] Email payload: sender={payload['sender']}, to={payload['to']}, subject={payload['subject']}")

# #         response = requests.post(url, json=payload, headers=headers, timeout=30)  # Increased timeout to 30 seconds

# #         logger.info(f"[v0] Brevo API response status: {response.status_code}")
# #         logger.info(f"[v0] Brevo API response headers: {dict(response.headers)}")

# #         if response.status_code >= 200 and response.status_code < 300:
# #             logger.info(f"[v0] ✅ Email sent successfully via Brevo API to {to}. Status: {response.status_code}")
# #             try:
# #                 response_data = response.json()
# #                 logger.info(f"[v0] Brevo response data: {response_data}")
# #                 if 'messageId' in response_data:
# #                     logger.info(f"[v0] Brevo Message ID: {response_data['messageId']}")
# #             except:
# #                 logger.info(f"[v0] Brevo response text: {response.text}")
# #             return True
# #         else:
# #             logger.error(f"[v0] ❌ Failed to send email via Brevo API to {to}. Status: {response.status_code}")
# #             logger.error(f"[v0] Error response: {response.text}")
# #             try:
# #                 error_data = response.json()
# #                 logger.error(f"[v0] Brevo error details: {error_data}")
# #             except:
# #                 logger.error(f"[v0] Could not parse error response as JSON")
# #             return False

# #     except requests.exceptions.Timeout:
# #         logger.error(f"[v0] ❌ Timeout sending email to {to}")
# #         return False
# #     except requests.exceptions.RequestException as e:
# #         logger.error(f"[v0] ❌ Request exception sending email: {str(e)}", exc_info=True)
# #         return False
# #     except Exception as e:
# #         logger.error(f"[v0] Exception in send_email function: {str(e)}", exc_info=True)
# #         return False

# # def send_order_confirmation_email(order_id, to_email, customer_name):
# #     """Send an order confirmation email to the customer with actual ordered products."""
# #     try:
# #         logger.info(f"[v0] 🚀 Starting order confirmation email process")
# #         logger.info(f"[v0] Order ID: {order_id}")
# #         logger.info(f"[v0] Recipient email: {to_email}")
# #         logger.info(f"[v0] Customer name: {customer_name}")

# #         try:
# #             from ...models.models import Order, Product, ProductVariant, Category
# #             logger.info(f"[v0] ✅ Models imported successfully")
# #         except Exception as import_error:
# #             logger.error(f"[v0] ❌ Failed to import models: {str(import_error)}", exc_info=True)
# #             return False

# #         try:
# #             order = Order.query.get(order_id)
# #             if not order:
# #                 logger.error(f"[v0] ❌ Order not found: {order_id}")
# #                 return False
# #             logger.info(f"[v0] ✅ Order found: #{order.order_number}, Total: KSh {order.total_amount}")
# #         except Exception as order_error:
# #             logger.error(f"[v0] ❌ Error fetching order: {str(order_error)}", exc_info=True)
# #             return False

# #         try:
# #             if not order.items or len(order.items) == 0:
# #                 logger.error(f"[v0] ❌ Order {order_id} has no items")
# #                 return False
# #             logger.info(f"[v0] ✅ Order has {len(order.items)} items")
# #         except Exception as items_error:
# #             logger.error(f"[v0] ❌ Error checking order items: {str(items_error)}", exc_info=True)
# #             return False

# #         # Format the date
# #         order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')

# #         # Get order items with product details
# #         order_items_html = ""
# #         subtotal = 0

# #         logger.info(f"[v0] Processing {len(order.items)} items for order {order_id}")

# #         for idx, item in enumerate(order.items):
# #             try:
# #                 logger.info(f"[v0] Processing item {idx + 1}/{len(order.items)}: Product ID {item.product_id}")
                
# #                 # Get product details from database
# #                 product = Product.query.get(item.product_id)
# #                 if not product:
# #                     logger.warning(f"[v0] ⚠️ Product {item.product_id} not found for order item {item.id}")
# #                     # Add fallback row for missing product
# #                     order_items_html += f"""
# #                     <tr>
# #                         <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
# #                             <div style="display: flex; align-items: center;">
# #                                 <img src="/placeholder.svg?height=70&width=70" alt="Product Image Not Available"
# #                                      style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px; margin-right: 15px; border: 1px solid #e0e0e0;">
# #                                 <div style="display: inline-block; vertical-align: top;">
# #                                     <div style="font-weight: 600; color: #1A1A1A; margin-bottom: 5px; font-size: 15px;">
# #                                         Product (Details Unavailable)
# #                                     </div>
# #                                 </div>
# #                             </div>
# #                         </td>
# #                         <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">{item.quantity}</td>
# #                         <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {item.price:,.2f}</td>
# #                         <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {item.total:,.2f}</td>
# #                     </tr>
# #                     """
# #                     subtotal += item.price * item.quantity
# #                     continue

# #                 logger.info(f"[v0] ✅ Product found: {product.name}, ID: {product.id}")

# #                 # Get variant information if available
# #                 variant_info = ""
# #                 variant_name = ""
# #                 if item.variant_id:
# #                     variant = ProductVariant.query.get(item.variant_id)
# #                     if variant:
# #                         variant_details = []
# #                         if variant.color:
# #                             variant_details.append(variant.color)
# #                         if variant.size:
# #                             variant_details.append(variant.size)
# #                         variant_name = " - " + ", ".join(variant_details) if variant_details else ""
# #                         variant_info = f"""
# #                         <div class="product-variant" style="color: #666; font-size: 13px; margin-top: 4px;">
# #                             {variant.color or ''} {variant.size or ''}
# #                         </div>
# #                         """

# #                 # Get product collection/category if available
# #                 collection_info = ""
# #                 if hasattr(product, 'category_id') and product.category_id:
# #                     category = Category.query.get(product.category_id)
# #                     if category:
# #                         collection_info = f"""
# #                         <div style="font-size: 13px; color: #777; font-style: italic;">
# #                             {category.name}
# #                         </div>
# #                         """

# #                 # Calculate item total
# #                 item_total = item.price * item.quantity
# #                 subtotal += item_total

# #                 # Get product image
# #                 product_image = product.thumbnail_url or "/placeholder.svg?height=70&width=70"
# #                 if not product_image and hasattr(product, 'image_urls') and product.image_urls:
# #                     if isinstance(product.image_urls, list) and len(product.image_urls) > 0:
# #                         product_image = product.image_urls[0]
# #                     elif isinstance(product.image_urls, str):
# #                         try:
# #                             image_list = json.loads(product.image_urls)
# #                             if image_list and len(image_list) > 0:
# #                                 product_image = image_list[0]
# #                         except Exception as img_err:
# #                             logger.error(f"[v0] Error parsing image_urls JSON: {str(img_err)}")
# #                             product_image = "/placeholder.svg?height=70&width=70"

# #                 # Format price with commas for thousands
# #                 formatted_price = "{:,.2f}".format(item.price)
# #                 formatted_total = "{:,.2f}".format(item_total)

# #                 # Add the item to the email HTML
# #                 order_items_html += f"""
# #                 <tr>
# #                     <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
# #                         <div style="display: flex; align-items: center;">
# #                             <img src="{product_image}" alt="{product.name}"
# #                                  style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px; margin-right: 15px; border: 1px solid #e0e0e0;">
# #                             <div style="display: inline-block; vertical-align: top;">
# #                                 <div style="font-weight: 600; color: #1A1A1A; margin-bottom: 5px; font-size: 15px;">
# #                                     {product.name}{variant_name}
# #                                 </div>
# #                                 {collection_info}
# #                                 {variant_info}
# #                             </div>
# #                         </div>
# #                     </td>
# #                     <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">{item.quantity}</td>
# #                     <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {formatted_price}</td>
# #                     <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">KSh {formatted_total}</td>
# #                 </tr>
# #                 """
# #                 logger.info(f"[v0] ✅ Item {idx + 1} processed successfully")
                
# #             except Exception as item_error:
# #                 logger.error(f"[v0] ❌ Error processing item {idx + 1}: {str(item_error)}", exc_info=True)
# #                 # Continue with next item
# #                 continue

# #         if not order_items_html:
# #             logger.error(f"[v0] ❌ No items HTML generated for order {order_id}")
# #             return False

# #         logger.info(f"[v0] ✅ Generated HTML for all items, subtotal: KSh {subtotal:,.2f}")

# #         # Calculate totals
# #         shipping_cost = order.shipping_cost or 0
# #         tax_amount = round(subtotal * 0.16)  # 16% VAT
# #         total = order.total_amount

# #         # Format totals with commas for thousands
# #         formatted_subtotal = "{:,.2f}".format(subtotal)
# #         formatted_shipping = "{:,.2f}".format(shipping_cost)
# #         formatted_tax = "{:,.2f}".format(tax_amount)
# #         formatted_total = "{:,.2f}".format(total)

# #         # Parse shipping address
# #         shipping_address = {}
# #         if isinstance(order.shipping_address, str):
# #             try:
# #                 shipping_address = json.loads(order.shipping_address)
# #             except json.JSONDecodeError:
# #                 logger.error(f"[v0] Failed to parse shipping_address as JSON for order {order_id}")
# #                 shipping_address = {}
# #         else:
# #             shipping_address = order.shipping_address or {}

# #         # Format payment method for display
# #         payment_method = order.payment_method
# #         if payment_method == "mpesa":
# #             payment_method = "M-Pesa"
# #         elif payment_method == "airtel":
# #             payment_method = "Airtel Money"
# #         elif payment_method == "card":
# #             payment_method = "Credit/Debit Card"
# #         elif payment_method == "cash_on_delivery":
# #             payment_method = "Cash on Delivery"
# #         else:
# #             payment_method = payment_method.replace("_", " ").title()

# #         logger.info(f"[v0] ✅ All order data prepared, generating HTML template")

# #         try:
# #             html_content = f"""<!DOCTYPE html>
# # <html lang="en">
# # <head>
# #     <meta charset="UTF-8">
# #     <meta name="viewport" content="width=device-width, initial-scale=1.0">
# #     <title>Order Confirmation - MIZIZZI</title>
# #     <style>
# #         @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap');
# #         body, html {{
# #             margin: 0;
# #             padding: 0;
# #             font-family: 'Montserrat', sans-serif;
# #             color: #333333;
# #             background-color: #f9f9f9;
# #         }}
# #         .email-container {{
# #             max-width: 650px;
# #             margin: 0 auto;
# #             background-color: #ffffff;
# #             box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
# #         }}
# #         .email-header {{
# #             background-color: #1A1A1A;
# #             color: #D4AF37;
# #             padding: 30px 20px;
# #             text-align: center;
# #             border-bottom: 3px solid #D4AF37;
# #         }}
# #         .email-header h1 {{
# #             font-family: 'Playfair Display', serif;
# #             font-weight: 700;
# #             font-size: 28px;
# #             margin: 0;
# #             letter-spacing: 1px;
# #         }}
# #         .email-header p {{
# #             margin: 10px 0 0;
# #             font-size: 14px;
# #             letter-spacing: 1px;
# #             color: #f0f0f0;
# #         }}
# #         .email-body {{
# #             padding: 40px 30px;
# #             color: #333;
# #         }}
# #         .greeting {{
# #             font-size: 18px;
# #             margin-bottom: 25px;
# #             color: #1A1A1A;
# #         }}
# #         .thank-you-message {{
# #             font-size: 16px;
# #             line-height: 1.6;
# #             margin-bottom: 30px;
# #             color: #333;
# #         }}
# #         .order-summary {{
# #             background-color: #f9f9f9;
# #             border-left: 4px solid #D4AF37;
# #             border-radius: 4px;
# #             padding: 25px;
# #             margin-bottom: 30px;
# #         }}
# #         .order-summary h3 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             margin-bottom: 20px;
# #             color: #1A1A1A;
# #             font-size: 20px;
# #             border-bottom: 1px solid #e0e0e0;
# #             padding-bottom: 10px;
# #         }}
# #         .order-summary p {{
# #             margin: 8px 0;
# #             font-size: 15px;
# #         }}
# #         .order-summary p strong {{
# #             color: #1A1A1A;
# #             font-weight: 600;
# #         }}
# #         .order-items {{
# #             width: 100%;
# #             border-collapse: collapse;
# #             margin-bottom: 30px;
# #         }}
# #         .order-items th {{
# #             background-color: #f0f0f0;
# #             padding: 12px 15px;
# #             text-align: left;
# #             font-weight: 600;
# #             color: #1A1A1A;
# #             font-size: 14px;
# #             border-bottom: 2px solid #D4AF37;
# #         }}
# #         .order-items td {{
# #             padding: 15px;
# #             border-bottom: 1px solid #e0e0e0;
# #             vertical-align: top;
# #         }}
# #         .order-totals {{
# #             width: 100%;
# #             margin-top: 20px;
# #             border-collapse: collapse;
# #         }}
# #         .order-totals td {{
# #             padding: 10px 15px;
# #             font-size: 15px;
# #         }}
# #         .order-totals .total-label {{
# #             text-align: right;
# #             color: #666;
# #         }}
# #         .order-totals .total-value {{
# #             text-align: right;
# #             width: 120px;
# #             font-weight: 500;
# #         }}
# #         .order-totals .total-row {{
# #             font-weight: 700;
# #             font-size: 18px;
# #             color: #1A1A1A;
# #             border-top: 2px solid #D4AF37;
# #         }}
# #         .order-totals .total-row .total-value {{
# #             color: #D4AF37;
# #             font-weight: 700;
# #         }}
# #         .shipping-info {{
# #             background-color: #f9f9f9;
# #             border-left: 4px solid #1A1A1A;
# #             border-radius: 4px;
# #             padding: 25px;
# #             margin-bottom: 30px;
# #         }}
# #         .shipping-info h3 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             margin-bottom: 20px;
# #             color: #1A1A1A;
# #             font-size: 20px;
# #             border-bottom: 1px solid #e0e0e0;
# #             padding-bottom: 10px;
# #         }}
# #         .address-details {{
# #             line-height: 1.6;
# #             font-size: 15px;
# #         }}
# #         .btn {{
# #             display: inline-block;
# #             background-color: #D4AF37;
# #             color: #1A1A1A;
# #             text-decoration: none;
# #             padding: 14px 30px;
# #             border-radius: 4px;
# #             font-weight: 600;
# #             margin: 30px 0;
# #             text-align: center;
# #             text-transform: uppercase;
# #             letter-spacing: 1px;
# #             font-size: 14px;
# #             transition: background-color 0.3s;
# #         }}
# #         .btn:hover {{
# #             background-color: #C4A32F;
# #         }}
# #         .email-footer {{
# #             background-color: #1A1A1A;
# #             padding: 30px 20px;
# #             text-align: center;
# #             font-size: 13px;
# #             color: #f0f0f0;
# #         }}
# #         .footer-links {{
# #             margin: 15px 0;
# #         }}
# #         .footer-links a {{
# #             color: #D4AF37;
# #             text-decoration: none;
# #             margin: 0 10px;
# #         }}
# #         .social-links {{
# #             margin: 20px 0;
# #         }}
# #         .social-links a {{
# #             display: inline-block;
# #             margin: 0 10px;
# #             color: #D4AF37;
# #             text-decoration: none;
# #         }}
# #         .divider {{
# #             height: 1px;
# #             background-color: #D4AF37;
# #             opacity: 0.3;
# #             margin: 15px 0;
# #         }}
# #         .payment-method {{
# #             display: inline-block;
# #             background-color: #f0f0f0;
# #             padding: 6px 12px;
# #             border-radius: 4px;
# #             font-weight: 500;
# #             font-size: 14px;
# #             color: #1A1A1A;
# #         }}
# #         @media only screen and (max-width: 650px) {{
# #             .email-container {{
# #                 width: 100% !important;
# #             }}
# #             .email-body {{
# #                 padding: 25px 15px;
# #             }}
# #             .order-items {{
# #                 font-size: 14px;
# #             }}
# #             .product-image {{
# #                 width: 60px;
# #                 height: 60px;
# #             }}
# #         }}
# #     </style>
# # </head>
# # <body>
# #     <div class="email-container">
# #         <div class="email-header">
# #             <h1>MIZIZZI</h1>
# #             <p>LUXURY SHOPPING EXPERIENCE</p>
# #         </div>
# #         <div class="email-body">
# #             <div class="greeting">Hello {customer_name},</div>
# #             <div class="thank-you-message">
# #                 Thank you for your order with MIZIZZI. We're delighted to confirm that we've received your order and it's being prepared with the utmost care and attention to detail.
# #             </div>
# #             <div class="order-summary">
# #                 <h3>Order Details</h3>
# #                 <p><strong>Order Number:</strong> {order.order_number}</p>
# #                 <p><strong>Order Date:</strong> {order_date}</p>
# #                 <p><strong>Payment Method:</strong> <span class="payment-method">{payment_method}</span></p>
# #             </div>
# #             <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 20px;">Your Selected Items</h3>
# #             <table class="order-items">
# #                 <thead>
# #                     <tr>
# #                         <th style="width: 50%;">Item</th>
# #                         <th style="width: 15%; text-align: center;">Qty</th>
# #                         <th style="width: 15%; text-align: right;">Price</th>
# #                         <th style="width: 20%; text-align: right;">Total</th>
# #                     </tr>
# #                 </thead>
# #                 <tbody>
# # {order_items_html}
# #                 </tbody>
# #             </table>
# #             <table class="order-totals">
# #                 <tr>
# #                     <td class="total-label">Subtotal:</td>
# #                     <td class="total-value">KSh {formatted_subtotal}</td>
# #                 </tr>
# #                 <tr>
# #                     <td class="total-label">Shipping:</td>
# #                     <td class="total-value">KSh {formatted_shipping}</td>
# #                 </tr>
# #                 <tr>
# #                     <td class="total-label">Tax (16%):</td>
# #                     <td class="total-value">KSh {formatted_tax}</td>
# #                 </tr>
# #                 <tr class="total-row">
# #                     <td class="total-label">Total:</td>
# #                     <td class="total-value">KSh {formatted_total}</td>
# #                 </tr>
# #             </table>
# #             <div class="shipping-info">
# #                 <h3>Shipping Information</h3>
# #                 <div class="address-details">
# #                     <p><strong>Shipping Address:</strong></p>
# #                     <p>
# #                         {shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}<br>
# #                         {shipping_address.get('address_line1', '')}<br>
# #                         {shipping_address.get('address_line2', '') + '<br>' if shipping_address.get('address_line2') else ''}
# #                         {shipping_address.get('city', '')}, {shipping_address.get('state', '')}<br>
# #                         {shipping_address.get('postal_code', '')}<br>
# #                         {shipping_address.get('country', '')}<br>
# #                         Phone: {shipping_address.get('phone', '')}
# #                     </p>
# #                 </div>
# #                 <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
# #                 <p><strong>Shipping Method:</strong> {order.shipping_method or 'Standard Delivery'}</p>
# #             </div>
# #             <div style="text-align: center;">
# #                 <a href="https://www.mizizzi.com/orders/{order.id}" class="btn">VIEW ORDER DETAILS</a>
# #             </div>
# #             <p style="margin-top: 30px; line-height: 1.6;">
# #                 We'll send you another email when your order ships. If you have any questions about your order, please contact our dedicated customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
# #             </p>
# #             <p style="line-height: 1.6;">
# #                 Thank you for choosing MIZIZZI for your luxury shopping experience.
# #             </p>
# #             <p style="margin-top: 30px; font-weight: 500;">
# #                 Warm regards,<br>
# #                 <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
# #             </p>
# #         </div>
# #         <div class="email-footer">
# #             <div class="social-links">
# #                 <a href="https://www.facebook.com/mizizzi">Facebook</a>
# #                 <a href="https://www.instagram.com/mizizzi">Instagram</a>
# #                 <a href="https://www.twitter.com/mizizzi">Twitter</a>
# #             </div>
# #             <div class="divider"></div>
# #             <div class="footer-links">
# #                 <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
# #                 <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
# #                 <a href="https://www.mizizzi.com/returns">Returns Policy</a>
# #             </div>
# #             <p style="margin-top: 20px;">
# #                 &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
# #             </p>
# #             <p style="font-size: 12px; margin-top: 15px; color: #999;">
# #                 This email was sent to {to_email} regarding your recent purchase.<br>
# #                 Please do not reply to this email as it is automatically generated.
# #             </p>
# #         </div>
# #     </div>
# # </body>
# # </html>
# #             """
# #             logger.info(f"[v0] ✅ HTML template generated successfully, length: {len(html_content)} characters")
# #         except Exception as html_error:
# #             logger.error(f"[v0] ❌ Error generating HTML template: {str(html_error)}", exc_info=True)
# #             return False

# #         logger.info(f"[v0] 📧 About to send order confirmation email via Brevo")

# #         try:
# #             email_result = send_email(to_email, f"Order Confirmation #{order.order_number} - MIZIZZI", html_content)

# #             if email_result:
# #                 logger.info(f"[v0] ✅ Order confirmation email sent successfully for order {order_id}")
# #             else:
# #                 logger.error(f"[v0] ❌ Order confirmation email failed for order {order_id}")

# #             return email_result
# #         except Exception as send_error:
# #             logger.error(f"[v0] ❌ Exception sending email: {str(send_error)}", exc_info=True)
# #             return False

# #     except Exception as e:
# #         logger.error(f"[v0] ❌ Exception in send_order_confirmation_email: {str(e)}", exc_info=True)
# #         return False

# # def send_order_status_update_email(order_id, to_email, customer_name):
# #     """Send an email notification when order status changes."""
# #     try:
# #         # Import models here to avoid circular imports
# #         from ...models.models import Order, OrderStatus

# #         # Get order details
# #         order = Order.query.get(order_id)
# #         if not order:
# #             logger.error(f"Order not found: {order_id}")
# #             return False

# #         # Format the date
# #         order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
# #         update_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')

# #         # Define status descriptions and actions based on status
# #         status_info = {
# #             OrderStatus.PENDING: {
# #                 "title": "Order Received",
# #                 "description": "Your order has been received and is awaiting processing.",
# #                 "color": "#0088cc",
# #                 "next_step": "Our team will begin processing your order soon."
# #             },
# #             OrderStatus.PROCESSING: {
# #                 "title": "Order Processing",
# #                 "description": "Your order is now being processed and prepared for shipping.",
# #                 "color": "#ff9900",
# #                 "next_step": "Once your items are packed, they'll be handed over to our delivery team."
# #             },
# #             OrderStatus.SHIPPED: {
# #                 "title": "Order Shipped",
# #                 "description": "Your order has been shipped and is on its way to you!",
# #                 "color": "#9933cc",
# #                 "next_step": "Our delivery agent will contact you shortly to arrange delivery."
# #             },
# #             OrderStatus.DELIVERED: {
# #                 "title": "Order Delivered",
# #                 "description": "Your order has been delivered successfully.",
# #                 "color": "#33cc33",
# #                 "next_step": "We hope you enjoy your purchase! If you have any issues, please contact our support team."
# #             },
# #             OrderStatus.CANCELLED: {
# #                 "title": "Order Cancelled",
# #                 "description": "Your order has been cancelled as requested.",
# #                 "color": "#cc3333",
# #                 "next_step": "If you didn't request this cancellation or have questions, please contact our support team."
# #             },
# #             OrderStatus.REFUNDED: {
# #                 "title": "Order Refunded",
# #                 "description": "A refund has been processed for your order.",
# #                 "color": "#999999",
# #                 "next_step": "The refund should appear in your account within 3-5 business days."
# #             }
# #         }

# #         # Get status info
# #         current_status = order.status
# #         status_data = status_info.get(current_status, {
# #             "title": f"Order Status: {current_status.value.capitalize()}",
# #             "description": f"Your order status has been updated to {current_status.value}.",
# #             "color": "#666666",
# #             "next_step": "Please contact our support team if you have any questions."
# #         })

# #         # Create tracking info HTML if available
# #         tracking_html = ""
# #         if order.tracking_number and current_status == OrderStatus.SHIPPED:
# #             tracking_html = f"""
# #     <div class="tracking-info">
# #         <h4>Tracking Information</h4>
# #         <p><strong>Tracking Number:</strong> {order.tracking_number}</p>
# #         <p><strong>Shipping Method:</strong> {order.shipping_method or 'Standard Delivery'}</p>
# #         <p><a href="https://www.mizizzi.com/track-order/{order.id}">Track your package</a></p>
# #     </div>
# #     """

# #         # Create an attractive HTML email template with premium luxury design for status updates
# #         html_content = f"""<!DOCTYPE html>
# # <html lang="en">
# # <head>
# #     <meta charset="UTF-8">
# #     <meta name="viewport" content="width=device-width, initial-scale=1.0">
# #     <title>Order Status Update - MIZIZZI</title>
# #     <style>
# #         @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap');
# #         body, html {{
# #             margin: 0;
# #             padding: 0;
# #             font-family: 'Montserrat', sans-serif;
# #             color: #333333;
# #             background-color: #f9f9f9;
# #         }}
# #         .email-container {{
# #             max-width: 650px;
# #             margin: 0 auto;
# #             background-color: #ffffff;
# #             box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
# #         }}
# #         .email-header {{
# #             background-color: {status_data["color"]};
# #             color: #ffffff;
# #             padding: 30px 20px;
# #             text-align: center;
# #             border-bottom: 3px solid #D4AF37;
# #         }}
# #         .email-header h1 {{
# #             font-family: 'Playfair Display', serif;
# #             font-weight: 700;
# #             font-size: 28px;
# #             margin: 0;
# #             letter-spacing: 1px;
# #         }}
# #         .email-header p {{
# #             margin: 10px 0 0;
# #             font-size: 14px;
# #             letter-spacing: 1px;
# #         }}
# #         .email-body {{
# #             padding: 40px 30px;
# #             color: #333;
# #         }}
# #         .greeting {{
# #             font-size: 18px;
# #             margin-bottom: 25px;
# #             color: #1A1A1A;
# #         }}
# #         .status-message {{
# #             font-size: 16px;
# #             line-height: 1.6;
# #             margin-bottom: 30px;
# #             color: #333;
# #         }}
# #         .order-summary {{
# #             background-color: #f9f9f9;
# #             border-left: 4px solid {status_data["color"]};
# #             border-radius: 4px;
# #             padding: 25px;
# #             margin-bottom: 30px;
# #         }}
# #         .order-summary h3 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             margin-bottom: 20px;
# #             color: #1A1A1A;
# #             font-size: 20px;
# #             border-bottom: 1px solid #e0e0e0;
# #             padding-bottom: 10px;
# #         }}
# #         .order-summary p {{
# #             margin: 8px 0;
# #             font-size: 15px;
# #         }}
# #         .order-summary p strong {{
# #             color: #1A1A1A;
# #             font-weight: 600;
# #         }}
# #         .status-badge {{
# #             display: inline-block;
# #             background-color: {status_data["color"]};
# #             color: white;
# #             padding: 8px 15px;
# #             border-radius: 20px;
# #             font-size: 14px;
# #             margin-bottom: 15px;
# #             font-weight: 500;
# #             letter-spacing: 1px;
# #         }}
# #         .next-steps {{
# #             background-color: #f9f9f9;
# #             border-left: 4px solid {status_data["color"]};
# #             padding: 25px;
# #             margin: 30px 0;
# #             border-radius: 4px;
# #         }}
# #         .next-steps h4 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             color: #1A1A1A;
# #             font-size: 18px;
# #         }}
# #         .next-steps p {{
# #             margin: 10px 0 0;
# #             line-height: 1.6;
# #             font-size: 15px;
# #         }}
# #         .btn {{
# #             display: inline-block;
# #             background-color: {status_data["color"]};
# #             color: #ffffff;
# #             text-decoration: none;
# #             padding: 14px 30px;
# #             border-radius: 4px;
# #             font-weight: 600;
# #             margin: 30px 0;
# #             text-align: center;
# #             text-transform: uppercase;
# #             letter-spacing: 1px;
# #             font-size: 14px;
# #         }}
# #         .tracking-info {{
# #             background-color: #f0f7ff;
# #             border: 1px solid #b3d7ff;
# #             border-radius: 5px;
# #             padding: 25px;
# #             margin: 30px 0;
# #         }}
# #         .tracking-info h4 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             color: #1A1A1A;
# #             font-size: 18px;
# #         }}
# #         .tracking-info p {{
# #             margin: 10px 0;
# #             line-height: 1.6;
# #             font-size: 15px;
# #         }}
# #         .tracking-info a {{
# #             color: {status_data["color"]};
# #             text-decoration: none;
# #             font-weight: 500;
# #         }}
# #         .email-footer {{
# #             background-color: #1A1A1A;
# #             padding: 30px 20px;
# #             text-align: center;
# #             font-size: 13px;
# #             color: #f0f0f0;
# #         }}
# #         .footer-links {{
# #             margin: 15px 0;
# #         }}
# #         .footer-links a {{
# #             color: #D4AF37;
# #             text-decoration: none;
# #             margin: 0 10px;
# #         }}
# #         .social-links {{
# #             margin: 20px 0;
# #         }}
# #         .social-links a {{
# #             display: inline-block;
# #             margin: 0 10px;
# #             color: #D4AF37;
# #             text-decoration: none;
# #         }}
# #         .divider {{
# #             height: 1px;
# #             background-color: #D4AF37;
# #             opacity: 0.3;
# #             margin: 15px 0;
# #         }}
# #         @media only screen and (max-width: 650px) {{
# #             .email-container {{
# #                 width: 100% !important;
# #             }}
# #             .email-body {{
# #                 padding: 25px 15px;
# #             }}
# #         }}
# #     </style>
# # </head>
# # <body>
# #     <div class="email-container">
# #         <div class="email-header">
# #             <h1>{status_data["title"]}</h1>
# #             <p>MIZIZZI LUXURY SHOPPING</p>
# #         </div>
# #         <div class="email-body">
# #             <div class="greeting">Hello {customer_name},</div>
# #             <div class="status-message">
# #                 {status_data["description"]}
# #             </div>
# #             <div class="order-summary">
# #                 <span class="status-badge">{order.status.value.upper()}</span>
# #                 <h3>Order Details</h3>
# #                 <p><strong>Order Number:</strong> {order.order_number}</p>
# #                 <p><strong>Order Date:</strong> {order_date}</p>
# #                 <p><strong>Status Updated:</strong> {update_date}</p>
# #                 <p><strong>Total Amount:</strong> KSh {order.total_amount:,.2f}</p>
# #             </div>
# # {tracking_html}
# #             <div class="next-steps">
# #                 <h4>What's Next?</h4>
# #                 <p>{status_data["next_step"]}</p>
# #             </div>
# #             <div style="text-align: center;">
# #                 <a href="https://www.mizizzi.com/orders/{order.id}" class="btn">VIEW ORDER DETAILS</a>
# #             </div>
# #             <p style="margin-top: 30px; line-height: 1.6;">
# #                 If you have any questions about your order, please contact our dedicated customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
# #             </p>
# #             <p style="margin-top: 30px; font-weight: 500;">
# #                 Warm regards,<br>
# #                 <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
# #             </p>
# #         </div>
# #         <div class="email-footer">
# #             <div class="social-links">
# #                 <a href="https://www.facebook.com/mizizzi">Facebook</a>
# #                 <a href="https://www.instagram.com/mizizzi">Instagram</a>
# #                 <a href="https://www.twitter.com/mizizzi">Twitter</a>
# #             </div>
# #             <div class="divider"></div>
# #             <div class="footer-links">
# #                 <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
# #                 <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
# #                 <a href="https://www.mizizzi.com/returns">Returns Policy</a>
# #             </div>
# #             <p style="margin-top: 20px;">
# #                 &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
# #             </p>
# #         </div>
# #     </div>
# # </body>
# # </html>
# #         """

# #         # Send the email
# #         return send_email(to_email, f"Order Status Update: {status_data['title']} - #{order.order_number}", html_content)

# #     except Exception as e:
# #         logger.error(f"Error sending order status update email: {str(e)}", exc_info=True)
# #         return False

# # def send_order_cancellation_email(order_id, to_email, customer_name, cancellation_reason=None):
# #     """Send an email notification when an order is cancelled."""
# #     try:
# #         # Import models here to avoid circular imports
# #         from ...models.models import Order

# #         # Get order details
# #         order = Order.query.get(order_id)
# #         if not order:
# #             logger.error(f"Order not found: {order_id}")
# #             return False

# #         # Format the date
# #         order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
# #         cancellation_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')

# #         # Create cancellation reason HTML
# #         reason_html = ""
# #         if cancellation_reason:
# #             reason_html = f"""
# #             <div class="cancellation-reason">
# #                 <h4>Cancellation Reason</h4>
# #                 <p>{cancellation_reason}</p>
# #             </div>
# #             """

# #         # Create HTML email template for cancellation
# #         html_content = f"""<!DOCTYPE html>
# # <html lang="en">
# # <head>
# #     <meta charset="UTF-8">
# #     <meta name="viewport" content="width=device-width, initial-scale=1.0">
# #     <title>Order Cancellation - MIZIZZI</title>
# #     <style>
# #         @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap');
# #         body, html {{
# #             margin: 0;
# #             padding: 0;
# #             font-family: 'Montserrat', sans-serif;
# #             color: #333333;
# #             background-color: #f9f9f9;
# #         }}
# #         .email-container {{
# #             max-width: 650px;
# #             margin: 0 auto;
# #             background-color: #ffffff;
# #             box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
# #         }}
# #         .email-header {{
# #             background-color: #cc3333;
# #             color: #ffffff;
# #             padding: 30px 20px;
# #             text-align: center;
# #             border-bottom: 3px solid #D4AF37;
# #         }}
# #         .email-header h1 {{
# #             font-family: 'Playfair Display', serif;
# #             font-weight: 700;
# #             font-size: 28px;
# #             margin: 0;
# #             letter-spacing: 1px;
# #         }}
# #         .email-body {{
# #             padding: 40px 30px;
# #             color: #333;
# #         }}
# #         .greeting {{
# #             font-size: 18px;
# #             margin-bottom: 25px;
# #             color: #1A1A1A;
# #         }}
# #         .cancellation-message {{
# #             font-size: 16px;
# #             line-height: 1.6;
# #             margin-bottom: 30px;
# #             color: #333;
# #         }}
# #         .order-summary {{
# #             background-color: #f9f9f9;
# #             border-left: 4px solid #cc3333;
# #             border-radius: 4px;
# #             padding: 25px;
# #             margin-bottom: 30px;
# #         }}
# #         .cancellation-reason {{
# #             background-color: #fff3f3;
# #             border: 1px solid #ffcdd2;
# #             border-radius: 4px;
# #             padding: 20px;
# #             margin: 20px 0;
# #         }}
# #         .cancellation-reason h4 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             color: #c62828;
# #             font-size: 16px;
# #         }}
# #         .email-footer {{
# #             background-color: #1A1A1A;
# #             padding: 30px 20px;
# #             text-align: center;
# #             font-size: 13px;
# #             color: #f0f0f0;
# #         }}
# #     </style>
# # </head>
# # <body>
# #     <div class="email-container">
# #         <div class="email-header">
# #             <h1>Order Cancelled</h1>
# #         </div>
# #         <div class="email-body">
# #             <div class="greeting">Hello {customer_name},</div>
# #             <div class="cancellation-message">
# #                 We're writing to inform you that your order has been cancelled.
# #             </div>
# #             <div class="order-summary">
# #                 <h3>Order Details</h3>
# #                 <p><strong>Order Number:</strong> {order.order_number}</p>
# #                 <p><strong>Order Date:</strong> {order_date}</p>
# #                 <p><strong>Cancelled Date:</strong> {cancellation_date}</p>
# #                 <p><strong>Total Amount:</strong> KSh {order.total_amount:,.2f}</p>
# #             </div>
# #             {reason_html}
# #             <p style="margin-top: 30px; line-height: 1.6;">
# #                 If you have any questions about this cancellation, please contact our customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
# #             </p>
# #             <p style="margin-top: 30px; font-weight: 500;">
# #                 Warm regards,<br>
# #                 <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
# #             </p>
# #         </div>
# #         <div class="email-footer">
# #             <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
# #         </div>
# #     </div>
# # </body>
# # </html>
# #         """

# #         # Send the email
# #         return send_email(to_email, f"Order Cancelled - #{order.order_number}", html_content)

# #     except Exception as e:
# #         logger.error(f"Error sending order cancellation email: {str(e)}", exc_info=True)
# #         return False

# # def send_order_refund_email(order_id, to_email, customer_name, refund_amount, refund_reason=None):
# #     """Send an email notification when a refund is processed."""
# #     try:
# #         # Import models here to avoid circular imports
# #         from ...models.models import Order

# #         # Get order details
# #         order = Order.query.get(order_id)
# #         if not order:
# #             logger.error(f"Order not found: {order_id}")
# #             return False

# #         # Format the date
# #         order_date = order.created_at.strftime('%B %d, %Y at %I:%M %p')
# #         refund_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')

# #         # Format refund amount
# #         formatted_refund = "{:,.2f}".format(refund_amount)

# #         # Create refund reason HTML
# #         reason_html = ""
# #         if refund_reason:
# #             reason_html = f"""
# #             <div class="refund-reason">
# #                 <h4>Refund Reason</h4>
# #                 <p>{refund_reason}</p>
# #             </div>
# #             """

# #         # Create HTML email template for refund
# #         html_content = f"""<!DOCTYPE html>
# # <html lang="en">
# # <head>
# #     <meta charset="UTF-8">
# #     <meta name="viewport" content="width=device-width, initial-scale=1.0">
# #     <title>Refund Processed - MIZIZZI</title>
# #     <style>
# #         @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap');
# #         body, html {{
# #             margin: 0;
# #             padding: 0;
# #             font-family: 'Montserrat', sans-serif;
# #             color: #333333;
# #             background-color: #f9f9f9;
# #         }}
# #         .email-container {{
# #             max-width: 650px;
# #             margin: 0 auto;
# #             background-color: #ffffff;
# #             box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
# #         }}
# #         .email-header {{
# #             background-color: #4caf50;
# #             color: #ffffff;
# #             padding: 30px 20px;
# #             text-align: center;
# #             border-bottom: 3px solid #D4AF37;
# #         }}
# #         .email-header h1 {{
# #             font-family: 'Playfair Display', serif;
# #             font-weight: 700;
# #             font-size: 28px;
# #             margin: 0;
# #             letter-spacing: 1px;
# #         }}
# #         .email-body {{
# #             padding: 40px 30px;
# #             color: #333;
# #         }}
# #         .greeting {{
# #             font-size: 18px;
# #             margin-bottom: 25px;
# #             color: #1A1A1A;
# #         }}
# #         .refund-message {{
# #             font-size: 16px;
# #             line-height: 1.6;
# #             margin-bottom: 30px;
# #             color: #333;
# #         }}
# #         .order-summary {{
# #             background-color: #f9f9f9;
# #             border-left: 4px solid #4caf50;
# #             border-radius: 4px;
# #             padding: 25px;
# #             margin-bottom: 30px;
# #         }}
# #         .refund-reason {{
# #             background-color: #f0f7ff;
# #             border: 1px solid #b3d7ff;
# #             border-radius: 4px;
# #             padding: 20px;
# #             margin: 20px 0;
# #         }}
# #         .refund-reason h4 {{
# #             font-family: 'Playfair Display', serif;
# #             margin-top: 0;
# #             color: #1976d2;
# #             font-size: 16px;
# #         }}
# #         .email-footer {{
# #             background-color: #1A1A1A;
# #             padding: 30px 20px;
# #             text-align: center;
# #             font-size: 13px;
# #             color: #f0f0f0;
# #         }}
# #     </style>
# # </head>
# # <body>
# #     <div class="email-container">
# #         <div class="email-header">
# #             <h1>Refund Processed</h1>
# #         </div>
# #         <div class="email-body">
# #             <div class="greeting">Hello {customer_name},</div>
# #             <div class="refund-message">
# #                 We're pleased to inform you that your refund has been processed successfully.
# #             </div>
# #             <div class="order-summary">
# #                 <h3>Refund Details</h3>
# #                 <p><strong>Order Number:</strong> {order.order_number}</p>
# #                 <p><strong>Order Date:</strong> {order_date}</p>
# #                 <p><strong>Refund Date:</strong> {refund_date}</p>
# #                 <p><strong>Refund Amount:</strong> KSh {formatted_refund}</p>
# #             </div>
# #             {reason_html}
# #             <p style="margin-top: 30px; line-height: 1.6;">
# #                 The refund should appear in your account within 3-5 business days. If you have any questions about this refund, please contact our customer service team at <a href="mailto:support@mizizzi.com" style="color: #D4AF37; text-decoration: none;">support@mizizzi.com</a> or call us at <strong>+254 700 123 456</strong>.
# #             </p>
# #             <p style="margin-top: 30px; font-weight: 500;">
# #                 Warm regards,<br>
# #                 <span style="font-family: 'Playfair Display', serif; font-size: 18px; color: #D4AF37;">The MIZIZZI Team</span>
# #             </p>
# #         </div>
# #         <div class="email-footer">
# #             <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
# #         </div>
# #     </div>
# # </body>
# # </html>
# #         """

# #         # Send the email
# #         return send_email(to_email, f"Refund Processed - #{order.order_number}", html_content)

# #     except Exception as e:
# #         logger.error(f"Error sending order refund email: {str(e)}", exc_info=True)
# #         return False

# # def log_admin_activity(admin_id, action, details=None):
# #     """Log admin activity for audit trail."""
# #     try:
# #         # Import models here to avoid circular imports
# #         from ...models.models import AdminActivityLog
# #         from ...configuration.extensions import db

# #         activity_log = AdminActivityLog(
# #             admin_id=admin_id,
# #             action=action,
# #             details=details or {},
# #             timestamp=datetime.utcnow()
# #         )

# #         db.session.add(activity_log)
# #         db.session.commit()

# #         logger.info(f"Admin activity logged: {admin_id} - {action}")
# #         return True

# #     except Exception as e:
# #         logger.error(f"Error logging admin activity: {str(e)}")
# #         return False

# # def send_webhook_notification(webhook_url, event_type, data):
# #     """Send webhook notification for order events."""
# #     try:
# #         payload = {
# #             "event_type": event_type,
# #             "timestamp": datetime.utcnow().isoformat(),
# #             "data": data
# #         }

# #         headers = {
# #             "Content-Type": "application/json",
# #             "User-Agent": "MIZIZZI-Webhook/1.0"
# #         }
# a
# #         response = requests.post(webhook_url, json=payload, headers=headers, timeout=10)

# #         if response.status_code == 200:
# #             logger.info(f"Webhook notification sent successfully: {event_type}")
# #             return True
# #         else:
# #             logger.warning(f"Webhook notification failed: {response.status_code}")
# #             return False

# #     except Exception as e:
# #         logger.error(f"Error sending webhook notification: {str(e)}")
# #         return False

# # def handle_order_completion(order_id):
# #     """Handle order completion tasks like inventory updates and notifications."""
# #     try:
# #         # Import models here to avoid circular imports
# #         from ...models.models import Order, Product, Inventory
# #         from ...configuration.extensions import db

# #         order = Order.query.get(order_id)
# #         if not order:
# #             logger.error(f"Order not found for completion: {order_id}")
# #             return False

# #         # Update inventory for each order item
# #         for item in order.items:
# #             product = Product.query.get(item.product_id)
# #             if product:
# #                 # Update product stock
# #                 if product.stock_quantity >= item.quantity:
# #                     product.stock_quantity -= item.quantity

# #                     # Update inventory record
# #                     inventory = Inventory.query.filter_by(product_id=product.id).first()
# #                     if inventory:
# #                         inventory.available_quantity = product.stock_quantity
# #                         inventory.reserved_quantity = max(0, inventory.reserved_quantity - item.quantity)
# #                         inventory.last_updated = datetime.utcnow()

# #                     logger.info(f"Updated inventory for product {product.id}: -{item.quantity}")
# #                 else:
# #                     logger.warning(f"Insufficient stock for product {product.id}")

# #         db.session.commit()
# #         logger.info(f"Order completion handled successfully: {order_id}")
# #         return True

# #     except Exception as e:
# #         logger.error(f"Error handling order completion: {str(e)}")
# #         db.session.rollback()
# #         return False
