"""
Cart schemas for Mizizzi E-commerce platform.
Provides serialization for cart and cart items.
"""
from marshmallow import Schema, fields, post_dump
from ..configuration.extensions import ma
from ..models.models import Cart, CartItem, Product, ProductVariant, ShippingMethod, PaymentMethod, Address

class CartItemSchema(ma.SQLAlchemyAutoSchema):
    """Schema for cart items."""

    class Meta:
        model = CartItem
        include_fk = True
        load_instance = True

    # Add product details
    product_name = fields.String(dump_only=True)
    product_slug = fields.String(dump_only=True)
    product_image = fields.String(dump_only=True)
    variant_name = fields.String(dump_only=True)
    subtotal = fields.Float(dump_only=True)

    @post_dump(pass_many=True)
    def add_product_details(self, data, many, **kwargs):
        """Add product details to cart items."""
        if many:
            for item in data:
                self._add_product_details_to_item(item)
        else:
            self._add_product_details_to_item(data)

        return data

    def _add_product_details_to_item(self, item):
        """Add product details to a single cart item."""
        product = Product.query.get(item['product_id'])

        if product:
            item['product_name'] = product.name
            item['product_slug'] = product.slug
            item['product_image'] = product.thumbnail_url or (product.image_urls[0] if product.image_urls else None)

            # Calculate subtotal
            item['subtotal'] = float(item['price']) * item['quantity']

        if 'variant_id' in item and item['variant_id']:
            variant = ProductVariant.query.get(item['variant_id'])

            if variant:
                variant_name = []

                if variant.color:
                    variant_name.append(variant.color)

                if variant.size:
                    variant_name.append(variant.size)

                item['variant_name'] = ' / '.join(variant_name)

                # Override product image with variant image if available
                if variant.image_url:
                    item['product_image'] = variant.image_url

class CartSchema(ma.SQLAlchemyAutoSchema):
    """Schema for cart."""

    class Meta:
        model = Cart
        include_fk = True
        load_instance = True

    # Add shipping and payment method details
    shipping_method_name = fields.String(dump_only=True)
    payment_method_name = fields.String(dump_only=True)
    items_count = fields.Integer(dump_only=True)

    # Add address details
    shipping_address = fields.Nested(lambda: AddressSchema(), dump_only=True)
    billing_address = fields.Nested(lambda: AddressSchema(), dump_only=True)

    @post_dump
    def add_method_details(self, data, **kwargs):
        """Add shipping and payment method details to cart."""
        # Add shipping method details
        if 'shipping_method_id' in data and data['shipping_method_id']:
            shipping_method = ShippingMethod.query.get(data['shipping_method_id'])

            if shipping_method:
                data['shipping_method_name'] = shipping_method.name

        # Add payment method details
        if 'payment_method_id' in data and data['payment_method_id']:
            payment_method = PaymentMethod.query.get(data['payment_method_id'])

            if payment_method:
                data['payment_method_name'] = payment_method.name

        # Add shipping address details
        if 'shipping_address_id' in data and data['shipping_address_id']:
            address = Address.query.get(data['shipping_address_id'])
            if address:
                data['shipping_address'] = AddressSchema().dump(address)
            else:
                data['shipping_address'] = None

        # Add billing address details
        if 'billing_address_id' in data and data['billing_address_id']:
            address = Address.query.get(data['billing_address_id'])
            if address:
                data['billing_address'] = AddressSchema().dump(address)
            else:
                data['billing_address'] = None

        # Add items count
        if 'id' in data:
            data['items_count'] = CartItem.query.filter_by(cart_id=data['id']).count()

        return data

class CouponSchema(ma.SQLAlchemyAutoSchema):
    """Schema for coupons."""

    class Meta:
        from ..models.models import Coupon
        model = Coupon
        include_fk = True
        load_instance = True

class AddressSchema(ma.Schema):
    """Schema for address serialization."""

    id = fields.Integer(dump_only=True)
    first_name = fields.String(dump_only=True)
    last_name = fields.String(dump_only=True)
    address_line1 = fields.String(dump_only=True)
    address_line2 = fields.String(dump_only=True)
    city = fields.String(dump_only=True)
    state = fields.String(dump_only=True)
    postal_code = fields.String(dump_only=True)
    country = fields.String(dump_only=True)
    phone = fields.String(dump_only=True)

# Initialize schemas
cart_schema = CartSchema()
cart_item_schema = CartItemSchema()
cart_items_schema = CartItemSchema(many=True)
coupon_schema = CouponSchema()
