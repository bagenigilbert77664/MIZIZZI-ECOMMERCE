"""
Cart schemas for serialization and validation.
"""
from marshmallow import Schema, fields, post_load, validates_schema, ValidationError
from app.models.models import Product, ProductVariant, Address, ShippingMethod, PaymentMethod, Coupon
from app import db


class CartItemSchema(Schema):
    """Schema for cart items"""
    id = fields.Integer(dump_only=True)
    cart_id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    product_id = fields.Integer(required=True)
    variant_id = fields.Integer(allow_none=True)
    quantity = fields.Integer(required=True, validate=lambda x: x > 0)
    price = fields.Float(dump_only=True)
    subtotal = fields.Float(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Nested product information
    product = fields.Method("get_product_info", dump_only=True)
    variant = fields.Method("get_variant_info", dump_only=True)

    def get_product_info(self, item):
        """Get basic product information"""
        try:
            product = db.session.get(Product, item['product_id'])
            if product:
                return {
                    'id': product.id,
                    'name': product.name,
                    'slug': product.slug,
                    'thumbnail_url': product.thumbnail_url,
                    'price': float(product.price) if product.price else None,
                    'sale_price': float(product.sale_price) if product.sale_price else None
                }
        except Exception:
            pass
        return None

    def get_variant_info(self, item):
        """Get variant information if applicable"""
        try:
            if item.get('variant_id'):
                variant = db.session.get(ProductVariant, item['variant_id'])
                if variant:
                    return {
                        'id': variant.id,
                        'color': variant.color,
                        'size': variant.size,
                        'price': float(variant.price) if variant.price else None,
                        'sale_price': float(variant.sale_price) if variant.sale_price else None
                    }
        except Exception:
            pass
        return None


class CartSchema(Schema):
    """Schema for cart"""
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    guest_id = fields.String(dump_only=True)
    is_guest = fields.Boolean(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    subtotal = fields.Float(dump_only=True)
    tax = fields.Float(dump_only=True)
    shipping = fields.Float(dump_only=True)
    discount = fields.Float(dump_only=True)
    total = fields.Float(dump_only=True)
    coupon_code = fields.String(dump_only=True)
    shipping_method_id = fields.Integer(dump_only=True)
    payment_method_id = fields.Integer(dump_only=True)
    shipping_address_id = fields.Integer(dump_only=True)
    billing_address_id = fields.Integer(dump_only=True)
    same_as_shipping = fields.Boolean(dump_only=True)
    requires_shipping = fields.Boolean(dump_only=True)
    notes = fields.String(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    last_activity = fields.DateTime(dump_only=True)
    expires_at = fields.DateTime(dump_only=True)

    # Nested information
    shipping_method = fields.Method("get_shipping_method", dump_only=True)
    payment_method = fields.Method("get_payment_method", dump_only=True)
    shipping_address = fields.Method("get_shipping_address", dump_only=True)
    billing_address = fields.Method("get_billing_address", dump_only=True)

    def get_shipping_method(self, data):
        """Get shipping method information"""
        try:
            if data.get('shipping_method_id'):
                shipping_method = db.session.get(ShippingMethod, data['shipping_method_id'])
                if shipping_method:
                    return {
                        'id': shipping_method.id,
                        'name': shipping_method.name,
                        'description': shipping_method.description,
                        'cost': float(shipping_method.cost),
                        'estimated_days': shipping_method.estimated_days
                    }
        except Exception:
            pass
        return None

    def get_payment_method(self, data):
        """Get payment method information"""
        try:
            if data.get('payment_method_id'):
                payment_method = db.session.get(PaymentMethod, data['payment_method_id'])
                if payment_method:
                    return {
                        'id': payment_method.id,
                        'name': payment_method.name,
                        'code': payment_method.code,
                        'description': payment_method.description
                    }
        except Exception:
            pass
        return None

    def get_shipping_address(self, data):
        """Get shipping address information"""
        try:
            if data.get('shipping_address_id'):
                address = db.session.get(Address, data['shipping_address_id'])
                if address:
                    return {
                        'id': address.id,
                        'first_name': address.first_name,
                        'last_name': address.last_name,
                        'address_line1': address.address_line1,
                        'address_line2': address.address_line2,
                        'city': address.city,
                        'state': address.state,
                        'postal_code': address.postal_code,
                        'country': address.country,
                        'phone': address.phone
                    }
        except Exception:
            pass
        return None

    def get_billing_address(self, data):
        """Get billing address information"""
        try:
            if data.get('billing_address_id'):
                address = db.session.get(Address, data['billing_address_id'])
                if address:
                    return {
                        'id': address.id,
                        'first_name': address.first_name,
                        'last_name': address.last_name,
                        'address_line1': address.address_line1,
                        'address_line2': address.address_line2,
                        'city': address.city,
                        'state': address.state,
                        'postal_code': address.postal_code,
                        'country': address.country,
                        'phone': address.phone
                    }
        except Exception:
            pass
        return None


class CouponSchema(Schema):
    """Schema for coupons"""
    id = fields.Integer(dump_only=True)
    code = fields.String(required=True)
    type = fields.String(dump_only=True)
    value = fields.Float(dump_only=True)
    min_purchase = fields.Float(dump_only=True)
    max_discount = fields.Float(dump_only=True)
    start_date = fields.DateTime(dump_only=True)
    end_date = fields.DateTime(dump_only=True)
    usage_limit = fields.Integer(dump_only=True)
    used_count = fields.Integer(dump_only=True)
    is_active = fields.Boolean(dump_only=True)


# Schema instances
cart_item_schema = CartItemSchema()
cart_items_schema = CartItemSchema(many=True)
cart_schema = CartSchema()
carts_schema = CartSchema(many=True)
coupon_schema = CouponSchema()
coupons_schema = CouponSchema(many=True)
