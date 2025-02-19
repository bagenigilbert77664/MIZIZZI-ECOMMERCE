# schemas.py
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from marshmallow import fields
from .models import (
    User, Category, Product, ProductVariant, Brand, Review, CartItem,
    Order, OrderItem, WishlistItem, Coupon, Payment
)

# ----------------------
# User Schema
# ----------------------
class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True  # Include foreign key fields if needed

    # You can customize individual fields if needed.
    id = auto_field()
    name = auto_field()
    email = auto_field()
    role = fields.Method("get_role")
    phone = auto_field()
    address = auto_field()
    avatar_url = auto_field()
    is_active = auto_field()
    created_at = auto_field()
    last_login = auto_field()

    def get_role(self, obj):
        return obj.role.value  # since role is an Enum

user_schema = UserSchema()
users_schema = UserSchema(many=True)

# ----------------------
# Category Schema
# ----------------------
class CategorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Category
        load_instance = True
        include_fk = True

    id = auto_field()
    name = auto_field()
    slug = auto_field()
    description = auto_field()
    image_url = auto_field()
    banner_url = auto_field()
    parent_id = auto_field()
    is_featured = auto_field()
    created_at = auto_field()
    updated_at = auto_field()

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

# ----------------------
# ProductVariant Schema
# ----------------------
class ProductVariantSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ProductVariant
        load_instance = True
        include_fk = True

    id = auto_field()
    product_id = auto_field()
    sku = auto_field()
    color = auto_field()
    size = auto_field()
    stock = auto_field()
    price = auto_field()
    image_urls = auto_field()

product_variant_schema = ProductVariantSchema()
product_variants_schema = ProductVariantSchema(many=True)

# ----------------------
# Product Schema
# ----------------------
class ProductSchema(SQLAlchemyAutoSchema):
    # Nest the product variants
    variants = fields.Nested(ProductVariantSchema, many=True)

    class Meta:
        model = Product
        load_instance = True
        include_fk = True

    id = auto_field()
    name = auto_field()
    slug = auto_field()
    description = auto_field()
    price = auto_field()
    sale_price = auto_field()
    stock = auto_field()
    category_id = auto_field()
    brand_id = auto_field()
    image_urls = auto_field()
    thumbnail_url = auto_field()
    sku = auto_field()
    weight = auto_field()
    dimensions = auto_field()
    is_featured = auto_field()
    is_new = auto_field()
    is_sale = auto_field()
    meta_title = auto_field()
    meta_description = auto_field()
    created_at = auto_field()
    updated_at = auto_field()

product_schema = ProductSchema()
products_schema = ProductSchema(many=True)

# ----------------------
# Brand Schema
# ----------------------
class BrandSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Brand
        load_instance = True

    id = auto_field()
    name = auto_field()
    slug = auto_field()
    description = auto_field()
    logo_url = auto_field()
    website = auto_field()
    is_featured = auto_field()

brand_schema = BrandSchema()
brands_schema = BrandSchema(many=True)

# ----------------------
# Review Schema
# ----------------------
class ReviewSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Review
        load_instance = True
        include_fk = True

    id = auto_field()
    user_id = auto_field()
    product_id = auto_field()
    rating = auto_field()
    title = auto_field()
    comment = auto_field()
    images = auto_field()
    is_verified_purchase = auto_field()
    created_at = auto_field()
    updated_at = auto_field()

review_schema = ReviewSchema()
reviews_schema = ReviewSchema(many=True)

# ----------------------
# CartItem Schema
# ----------------------
class CartItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CartItem
        load_instance = True
        include_fk = True

    id = auto_field()
    user_id = auto_field()
    product_id = auto_field()
    variant_id = auto_field()
    quantity = auto_field()
    created_at = auto_field()

cart_item_schema = CartItemSchema()
cart_items_schema = CartItemSchema(many=True)

# ----------------------
# OrderItem Schema
# ----------------------
class OrderItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = OrderItem
        load_instance = True
        include_fk = True

    id = auto_field()
    order_id = auto_field()
    product_id = auto_field()
    variant_id = auto_field()
    quantity = auto_field()
    price = auto_field()
    total = auto_field()

order_item_schema = OrderItemSchema()
order_items_schema = OrderItemSchema(many=True)

# ----------------------
# Order Schema
# ----------------------
class OrderSchema(SQLAlchemyAutoSchema):
    items = fields.Nested(OrderItemSchema, many=True)

    class Meta:
        model = Order
        load_instance = True
        include_fk = True

    id = auto_field()
    user_id = auto_field()
    order_number = auto_field()
    status = fields.Method("get_status")
    total_amount = auto_field()
    shipping_address = auto_field()
    billing_address = auto_field()
    payment_method = auto_field()
    payment_status = fields.Method("get_payment_status")
    shipping_method = auto_field()
    shipping_cost = auto_field()
    tracking_number = auto_field()
    notes = auto_field()
    created_at = auto_field()
    updated_at = auto_field()

    def get_status(self, obj):
        return obj.status.value

    def get_payment_status(self, obj):
        return obj.payment_status.value

order_schema = OrderSchema()
orders_schema = OrderSchema(many=True)

# ----------------------
# Coupon Schema
# ----------------------
class CouponSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Coupon
        load_instance = True

    id = auto_field()
    code = auto_field()
    type = fields.Method("get_type")
    value = auto_field()
    min_purchase = auto_field()
    max_discount = auto_field()
    start_date = auto_field()
    end_date = auto_field()
    usage_limit = auto_field()
    used_count = auto_field()
    is_active = auto_field()

    def get_type(self, obj):
        return obj.type.value

coupon_schema = CouponSchema()
coupons_schema = CouponSchema(many=True)

# ----------------------
# Payment Schema
# ----------------------
class PaymentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Payment
        load_instance = True
        include_fk = True

    id = auto_field()
    order_id = auto_field()
    amount = auto_field()
    payment_method = auto_field()
    transaction_id = auto_field()
    transaction_data = auto_field()
    status = fields.Method("get_status")
    created_at = auto_field()
    completed_at = auto_field()

    def get_status(self, obj):
        return obj.status.value

payment_schema = PaymentSchema()
payments_schema = PaymentSchema(many=True)

# ----------------------
# WishlistItem Schema
# ----------------------
class WishlistItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = WishlistItem
        load_instance = True
        include_fk = True

    id = auto_field()
    user_id = auto_field()
    product_id = auto_field()
    created_at = auto_field()

wishlist_item_schema = WishlistItemSchema()
wishlist_items_schema = WishlistItemSchema(many=True)
