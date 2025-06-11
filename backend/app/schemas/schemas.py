"""
Schemas for Mizizzi E-commerce platform.
Provides serialization for models.
"""
from marshmallow import Schema, fields, post_dump, post_load
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from ..configuration.extensions import ma
from ..models.models import (
    User, Category, Product, ProductVariant, Brand, Review,
    Order, OrderItem, WishlistItem, Coupon, Payment, Address, AddressType, PaymentMethod, ShippingMethod,
    ProductImage, Newsletter
)

# Import cart schemas from cart_schema.py
from .cart_schema import (
    cart_schema, cart_item_schema, cart_items_schema, coupon_schema
)

# ----------------------
# User Schema
# ----------------------
class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ('password_hash',)

user_schema = UserSchema()
users_schema = UserSchema(many=True)

# ----------------------
# Category Schema
# ----------------------
class CategorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Category
        load_instance = True
        include_relationships = True

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

# ----------------------
# Brand Schema
# ----------------------
class BrandSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Brand
        load_instance = True

brand_schema = BrandSchema()
brands_schema = BrandSchema(many=True)

# ----------------------
# Product Variant Schema
# ----------------------
class ProductVariantSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ProductVariant
        include_fk = True

product_variant_schema = ProductVariantSchema()
product_variants_schema = ProductVariantSchema(many=True)

# ----------------------
# Product Schema
# ----------------------
class ProductSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Product
        load_instance = True
        include_relationships = True

    variants = fields.Nested(ProductVariantSchema, many=True)
    category = fields.Nested(CategorySchema, dump_only=True)
    brand = fields.Nested(BrandSchema, dump_only=True)
    images = fields.Nested('ProductImageSchema', many=True, dump_only=True)

    # Computed fields
    effective_price = fields.Method("get_effective_price")
    discount_percentage = fields.Method("get_discount_percentage")

    def get_effective_price(self, obj):
        """Get the effective price (sale price if available, otherwise regular price)"""
        return float(obj.sale_price) if obj.sale_price else float(obj.price)

    def get_discount_percentage(self, obj):
        """Calculate discount percentage"""
        if obj.sale_price and obj.price:
            return round(((float(obj.price) - float(obj.sale_price)) / float(obj.price)) * 100, 2)
        return 0

product_schema = ProductSchema()
products_schema = ProductSchema(many=True)

# ----------------------
# Review Schema
# ----------------------
class ReviewSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Review
        load_instance = True
        include_relationships = True

    user = fields.Nested(UserSchema, dump_only=True)

review_schema = ReviewSchema()
reviews_schema = ReviewSchema(many=True)

# ----------------------
# AddressType Schema
# ----------------------
class AddressTypeSchema(Schema):  # Using regular Schema for Enum
    value = fields.String()
    name = fields.String()

    @staticmethod
    def get_all_types():
        return [
            {"value": address_type.value, "name": address_type.name}
            for address_type in AddressType
        ]

address_type_schema = AddressTypeSchema()
address_types_schema = AddressTypeSchema(many=True)

# ----------------------
# Address Schema
# ----------------------
class AddressSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Address
        include_fk = True

    address_type = fields.Method("get_address_type")

    def get_address_type(self, obj):
        return obj.address_type.value if obj.address_type else None

address_schema = AddressSchema()
addresses_schema = AddressSchema(many=True)

# ----------------------
# Order Item Schema
# ----------------------
class OrderItemSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = OrderItem
        include_fk = True

order_item_schema = OrderItemSchema()
order_items_schema = OrderItemSchema(many=True)

# ----------------------
# Order Schema
# ----------------------
class OrderSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Order
        load_instance = True
        include_relationships = True

    status = fields.Method("get_status")
    payment_status = fields.Method("get_payment_status")
    items = fields.Nested(OrderItemSchema, many=True)

    def get_status(self, obj):
        return obj.status.value if obj.status else None

    def get_payment_status(self, obj):
        return obj.payment_status.value if obj.payment_status else None

order_schema = OrderSchema()
orders_schema = OrderSchema(many=True)

# ----------------------
# Wishlist Item Schema
# ----------------------
class WishlistItemSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = WishlistItem
        include_fk = True

wishlist_item_schema = WishlistItemSchema()
wishlist_items_schema = WishlistItemSchema(many=True)

# ----------------------
# Payment Schema
# ----------------------
class PaymentSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Payment
        include_fk = True

    status = fields.Method("get_status")

    def get_status(self, obj):
        return obj.status.value if obj.status else None

payment_schema = PaymentSchema()
payments_schema = PaymentSchema(many=True)

# ----------------------
# ShippingMethod Schema
# ----------------------
class ShippingMethodSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ShippingMethod
        include_fk = True

    cost = fields.Float()  # Ensure cost is serialized as a float

shipping_method_schema = ShippingMethodSchema()
shipping_methods_schema = ShippingMethodSchema(many=True)

# ----------------------
# PaymentMethod Schema
# ----------------------
class PaymentMethodSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = PaymentMethod
        include_fk = True

payment_method_schema = PaymentMethodSchema()
payment_methods_schema = PaymentMethodSchema(many=True)

# ----------------------
# Newsletter Schema
# ----------------------
class NewsletterSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Newsletter
        include_fk = True

newsletter_schema = NewsletterSchema()
newsletters_schema = NewsletterSchema(many=True)

# ----------------------
# ProductImage Schema
# ----------------------
class ProductImageSchema(Schema):
    id = fields.Int()
    url = fields.Str()
    filename = fields.Str()
    is_primary = fields.Bool()
    sort_order = fields.Int()
    alt_text = fields.Str()

product_image_schema = ProductImageSchema()
product_images_schema = ProductImageSchema(many=True)

# Define coupons_schema (plural) since it's being imported elsewhere
from .cart_schema import CouponSchema
coupons_schema = CouponSchema(many=True)

# Note: Cart schemas are imported from cart_schema.py at the top of this file
# This avoids duplication while maintaining backward compatibility
