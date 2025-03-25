# schemas.py
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from marshmallow import Schema
from marshmallow import fields
from .models import (
    User, Category, Product, ProductVariant, Brand, Review, CartItem,
    Order, OrderItem, WishlistItem, Coupon, Payment
)
from .models import Address,AddressType
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
# address Schema
# ----------------------

class AddressSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Address
        load_instance = True
        include_fk = True

    id = auto_field()
    user_id = auto_field()
    first_name = auto_field()
    last_name = auto_field()
    address_line1 = auto_field()
    address_line2 = auto_field()
    city = auto_field()
    state = auto_field()
    postal_code = auto_field()
    country = auto_field()
    phone = auto_field()
    alternative_phone = auto_field()
    address_type = fields.Method("get_address_type")
    is_default = auto_field()
    created_at = auto_field()
    updated_at = auto_field()

    def get_address_type(self, obj):
        return obj.address_type.value

address_schema = AddressSchema()
addresses_schema = AddressSchema(many=True)

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
    id = fields.Int()
    product_id = fields.Int()
    variant_id = fields.Int(allow_none=True)
    quantity = fields.Int()
    price = fields.Float()
    total = fields.Float()
    product = fields.Dict()

cart_item_schema = CartItemSchema()
cart_items_schema = CartItemSchema(many=True)


# ----------------------
# OrderItem Schema
# ----------------------
class OrderItemSchema(Schema):
    id = fields.Int(dump_only=True)
    order_id = fields.Int()
    product_id = fields.Int()
    variant_id = fields.Int()
    quantity = fields.Int()
    price = fields.Float()
    total = fields.Float()

class OrderSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int()
    order_number = fields.Str()
    status = fields.Str()
    total_amount = fields.Float()
    shipping_address = fields.Dict()
    billing_address = fields.Dict()
    payment_method = fields.Str()
    payment_status = fields.Str()
    shipping_method = fields.Str()
    shipping_cost = fields.Float()
    tracking_number = fields.Str()
    notes = fields.Str()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    items = fields.List(fields.Nested(OrderItemSchema))

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
