"""
Validators for Mizizzi E-commerce platform.
Contains validation classes for different entities.
"""
from .validation_utils import *
from .models import User, Product, Category, Brand, Address, AddressType
from flask import current_app
import re
from sqlalchemy import func
from werkzeug.datastructures import FileStorage
import imghdr

class ValidationError(Exception):
    """Custom exception for validation errors."""
    def __init__(self, message, field=None, code=None):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(self.message)

class BaseValidator:
    """Base validator class with common validation methods."""

    def __init__(self, data, context=None):
        self.data = data
        self.context = context or {}
        self.errors = {}

    def validate(self):
        """Validate the data. Should be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement validate method")

    def is_valid(self):
        """Check if data is valid."""
        self.validate()
        return len(self.errors) == 0

    def add_error(self, field, message, code=None):
        """Add an error for a specific field."""
        if field not in self.errors:
            self.errors[field] = []

        self.errors[field].append({
            'message': message,
            'code': code
        })

    def get_errors(self):
        """Get all validation errors."""
        return self.errors

class UserValidator(BaseValidator):
    """Validator for user data."""

    def validate(self):
        """Validate user data."""
        self.validate_name()
        self.validate_email()
        self.validate_password()
        self.validate_phone()
        self.validate_role()

        return len(self.errors) == 0

    def validate_name(self):
        """Validate user name."""
        name = self.data.get('name')

        if not name:
            self.add_error('name', 'Name is required', 'required')
            return

        if not is_valid_string(name, min_length=2, max_length=100):
            self.add_error('name', 'Name must be between 2 and 100 characters', 'invalid_length')

    def validate_email(self):
        """Validate user email."""
        email = self.data.get('email')

        if not email:
            self.add_error('email', 'Email is required', 'required')
            return

        if not is_valid_email(email):
            self.add_error('email', 'Invalid email format', 'invalid_format')
            return

        # Check if email already exists (for new users)
        if 'user_id' not in self.context:
            user = User.query.filter(func.lower(User.email) == func.lower(email)).first()
            if user:
                self.add_error('email', 'Email already registered', 'already_exists')
        else:
            # For existing users, check if email belongs to another user
            user = User.query.filter(
                func.lower(User.email) == func.lower(email),
                User.id != self.context['user_id']
            ).first()
            if user:
                self.add_error('email', 'Email already registered', 'already_exists')

    def validate_password(self):
        """Validate user password."""
        # Skip password validation for updates if not provided
        if 'user_id' in self.context and 'password' not in self.data:
            return

        password = self.data.get('password')

        if not password:
            self.add_error('password', 'Password is required', 'required')
            return

        if not is_strong_password(password):
            self.add_error('password',
                'Password must be at least 8 characters and include uppercase, lowercase, digit, and special character',
                'weak_password')

    def validate_phone(self):
        """Validate user phone number."""
        phone = self.data.get('phone')

        # Phone is optional
        if not phone:
            return

        if not is_valid_kenyan_phone(phone):
            self.add_error('phone', 'Invalid Kenyan phone number format', 'invalid_format')

    def validate_role(self):
        """Validate user role."""
        role = self.data.get('role')

        # Role is optional for regular registration
        if not role:
            return

        # Check if role is valid
        valid_roles = ['user', 'admin', 'moderator']
        if role not in valid_roles:
            self.add_error('role', 'Invalid role', 'invalid_choice')

class LoginValidator(BaseValidator):
    """Validator for login data."""

    def validate(self):
        """Validate login data."""
        self.validate_email()
        self.validate_password()

        return len(self.errors) == 0

    def validate_email(self):
        """Validate email."""
        email = self.data.get('email')

        if not email:
            self.add_error('email', 'Email is required', 'required')

    def validate_password(self):
        """Validate password."""
        password = self.data.get('password')

        if not password:
            self.add_error('password', 'Password is required', 'required')

class AddressValidator(BaseValidator):
    """Validator for address data."""

    def validate(self):
        """Validate address data."""
        self.validate_first_name()
        self.validate_last_name()
        self.validate_address_line1()
        self.validate_city()
        self.validate_state()
        self.validate_postal_code()
        self.validate_country()
        self.validate_phone()
        self.validate_address_type()

        return len(self.errors) == 0

    def validate_first_name(self):
        """Validate first name."""
        first_name = self.data.get('first_name')

        if not first_name:
            self.add_error('first_name', 'First name is required', 'required')
        elif not is_valid_string(first_name, min_length=2, max_length=100):
            self.add_error('first_name', 'First name must be between 2 and 100 characters', 'invalid_length')

    def validate_last_name(self):
        """Validate last name."""
        last_name = self.data.get('last_name')

        if not last_name:
            self.add_error('last_name', 'Last name is required', 'required')
        elif not is_valid_string(last_name, min_length=2, max_length=100):
            self.add_error('last_name', 'Last name must be between 2 and 100 characters', 'invalid_length')

    def validate_address_line1(self):
        """Validate address line 1."""
        address_line1 = self.data.get('address_line1')

        if not address_line1:
            self.add_error('address_line1', 'Address line 1 is required', 'required')
        elif not is_valid_string(address_line1, min_length=5, max_length=255):
            self.add_error('address_line1', 'Address line 1 must be between 5 and 255 characters', 'invalid_length')

    def validate_city(self):
        """Validate city."""
        city = self.data.get('city')

        if not city:
            self.add_error('city', 'City is required', 'required')
        elif not is_valid_string(city, min_length=2, max_length=100):
            self.add_error('city', 'City must be between 2 and 100 characters', 'invalid_length')

    def validate_state(self):
        """Validate state."""
        state = self.data.get('state')

        if not state:
            self.add_error('state', 'State is required', 'required')
        elif not is_valid_string(state, min_length=2, max_length=100):
            self.add_error('state', 'State must be between 2 and 100 characters', 'invalid_length')

    def validate_postal_code(self):
        """Validate postal code."""
        postal_code = self.data.get('postal_code')

        if not postal_code:
            self.add_error('postal_code', 'Postal code is required', 'required')
        elif not is_valid_string(postal_code, min_length=2, max_length=20):
            self.add_error('postal_code', 'Postal code must be between 2 and 20 characters', 'invalid_length')

    def validate_country(self):
        """Validate country."""
        country = self.data.get('country')

        if not country:
            self.add_error('country', 'Country is required', 'required')
        elif not is_valid_string(country, min_length=2, max_length=100):
            self.add_error('country', 'Country must be between 2 and 100 characters', 'invalid_length')

    def validate_phone(self):
        """Validate phone."""
        phone = self.data.get('phone')

        if not phone:
            self.add_error('phone', 'Phone is required', 'required')
        elif not is_valid_string(phone, min_length=2, max_length=20):
            self.add_error('phone', 'Phone must be between 2 and 20 characters', 'invalid_length')

    def validate_address_type(self):
        """Validate address type."""
        address_type = self.data.get('address_type')

        if not address_type:
            self.add_error('address_type', 'Address type is required', 'required')
        elif not is_valid_string(address_type, min_length=2, max_length=20):
            self.add_error('address_type', 'Address type must be between 2 and 20 characters', 'invalid_length')

class ProductValidator(BaseValidator):
    """Validator for product data."""

    def validate(self):
        """Validate product data."""
        self.validate_name()
        self.validate_slug()
        self.validate_description()
        self.validate_price()
        self.validate_stock()
        self.validate_category()
        self.validate_brand()
        self.validate_images()
        self.validate_sku()
        self.validate_dimensions()
        self.validate_meta()

        return len(self.errors) == 0

    def validate_name(self):
        """Validate product name."""
        name = self.data.get('name')

        if not name:
            self.add_error('name', 'Product name is required', 'required')
            return

        if not is_valid_string(name, min_length=3, max_length=200):
            self.add_error('name', 'Product name must be between 3 and 200 characters', 'invalid_length')

    def validate_slug(self):
        """Validate product slug."""
        slug = self.data.get('slug')

        if not slug:
            self.add_error('slug', 'Product slug is required', 'required')
            return

        # Check slug format (lowercase, hyphens, alphanumeric)
        if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', slug):
            self.add_error('slug', 'Slug must contain only lowercase letters, numbers, and hyphens', 'invalid_format')
            return

        # Check if slug already exists (for new products)
        if 'product_id' not in self.context:
            product = Product.query.filter_by(slug=slug).first()
            if product:
                self.add_error('slug', 'Slug already exists', 'already_exists')
        else:
            # For existing products, check if slug belongs to another product
            product = Product.query.filter(
                Product.slug == slug,
                Product.id != self.context['product_id']
            ).first()
            if product:
                self.add_error('slug', 'Slug already exists', 'already_exists')

    def validate_description(self):
        """Validate product description."""
        description = self.data.get('description')

        # Description is optional
        if not description:
            return

        # Sanitize HTML content
        sanitized = sanitize_html(description)
        if sanitized != description:
            self.add_error('description', 'Description contains potentially unsafe HTML', 'unsafe_html')

    def validate_price(self):
        """Validate product price."""
        price = self.data.get('price')

        if price is None:
            self.add_error('price', 'Price is required', 'required')
            return

        if not is_valid_number(price, min_value=0):
            self.add_error('price', 'Price must be a positive number', 'invalid_value')

        # Validate sale price if provided
        sale_price = self.data.get('sale_price')
        if sale_price is not None:
            if not is_valid_number(sale_price, min_value=0):
                self.add_error('sale_price', 'Sale price must be a positive number', 'invalid_value')
            elif float(sale_price) >= float(price):
                self.add_error('sale_price', 'Sale price must be less than regular price', 'invalid_value')

    def validate_stock(self):
        """Validate product stock."""
        stock = self.data.get('stock')

        # Stock is optional, defaults to 0
        if stock is None:
            return

        if not is_valid_integer(stock, min_value=0):
            self.add_error('stock', 'Stock must be a non-negative integer', 'invalid_value')

    def validate_category(self):
        """Validate product category."""
        category_id = self.data.get('category_id')

        if not category_id:
            self.add_error('category_id', 'Category is required', 'required')
            return

        category = Category.query.get(category_id)
        if not category:
            self.add_error('category_id', 'Invalid category', 'invalid_choice')

    def validate_brand(self):
        """Validate product brand."""
        brand_id = self.data.get('brand_id')

        # Brand is optional
        if not brand_id:
            return

        brand = Brand.query.get(brand_id)
        if not brand:
            self.add_error('brand_id', 'Invalid brand', 'invalid_choice')

    def validate_images(self):
        """Validate product images."""
        image_urls = self.data.get('image_urls')

        # Images are optional
        if not image_urls:
            return

        if not isinstance(image_urls, list):
            self.add_error('image_urls', 'Image URLs must be a list', 'invalid_type')
            return

        for url in image_urls:
            if not is_valid_url(url):
                self.add_error('image_urls', 'Invalid image URL format', 'invalid_format')
                break

        # Validate thumbnail URL if provided
        thumbnail_url = self.data.get('thumbnail_url')
        if thumbnail_url and not is_valid_url(thumbnail_url):
            self.add_error('thumbnail_url', 'Invalid thumbnail URL format', 'invalid_format')

    def validate_sku(self):
        """Validate product SKU."""
        sku = self.data.get('sku')

        # SKU is optional
        if not sku:
            return

        if not is_valid_string(sku, min_length=3, max_length=50):
            self.add_error('sku', 'SKU must be between 3 and 50 characters', 'invalid_length')
            return

        # Check if SKU already exists (for new products)
        if 'product_id' not in self.context:
            product = Product.query.filter_by(sku=sku).first()
            if product:
                self.add_error('sku', 'SKU already exists', 'already_exists')
        else:
            # For existing products, check if SKU belongs to another product
            product = Product.query.filter(
                Product.sku == sku,
                Product.id != self.context['product_id']
            ).first()
            if product:
                self.add_error('sku', 'SKU already exists', 'already_exists')

    def validate_dimensions(self):
        """Validate product dimensions."""
        dimensions = self.data.get('dimensions')

        # Dimensions are optional
        if not dimensions:
            return

        if not isinstance(dimensions, dict):
            self.add_error('dimensions', 'Dimensions must be an object', 'invalid_type')
            return

        required_keys = ['length', 'width', 'height']
        for key in required_keys:
            if key not in dimensions:
                self.add_error('dimensions', f'Dimensions must include {key}', 'missing_field')
                return

            if not is_valid_number(dimensions[key], min_value=0):
                self.add_error('dimensions', f'{key.capitalize()} must be a positive number', 'invalid_value')

        # Validate weight if provided
        weight = self.data.get('weight')
        if weight is not None and not is_valid_number(weight, min_value=0):
            self.add_error('weight', 'Weight must be a positive number', 'invalid_value')

    def validate_meta(self):
        """Validate product meta data."""
        meta_title = self.data.get('meta_title')
        meta_description = self.data.get('meta_description')

        # Meta data is optional
        if meta_title and not is_valid_string(meta_title, max_length=200):
            self.add_error('meta_title', 'Meta title must be less than 200 characters', 'invalid_length')

        if meta_description and not is_valid_string(meta_description, max_length=500):
            self.add_error('meta_description', 'Meta description must be less than 500 characters', 'invalid_length')

class ProductVariantValidator(BaseValidator):
    """Validator for product variant data."""

    def validate(self):
        """Validate product variant data."""
        self.validate_product()
        self.validate_sku()
        self.validate_attributes()
        self.validate_stock()
        self.validate_price()
        self.validate_images()

        return len(self.errors) == 0

    def validate_product(self):
        """Validate product ID."""
        product_id = self.data.get('product_id')

        if not product_id:
            self.add_error('product_id', 'Product ID is required', 'required')
            return

        product = Product.query.get(product_id)
        if not product:
            self.add_error('product_id', 'Invalid product', 'invalid_choice')

    def validate_sku(self):
        """Validate variant SKU."""
        sku = self.data.get('sku')

        # SKU is optional for variants
        if not sku:
            return

        if not is_valid_string(sku, min_length=3, max_length=50):
            self.add_error('sku', 'SKU must be between 3 and 50 characters', 'invalid_length')
            return

        # Check if SKU already exists
        from .models import ProductVariant

        if 'variant_id' not in self.context:
            variant = ProductVariant.query.filter_by(sku=sku).first()
            if variant:
                self.add_error('sku', 'SKU already exists', 'already_exists')
        else:
            # For existing variants, check if SKU belongs to another variant
            variant = ProductVariant.query.filter(
                ProductVariant.sku == sku,
                ProductVariant.id != self.context['variant_id']
            ).first()
            if variant:
                self.add_error('sku', 'SKU already exists', 'already_exists')

    def validate_attributes(self):
        """Validate variant attributes (color, size)."""
        color = self.data.get('color')
        size = self.data.get('size')

        # At least one attribute should be provided
        if not color and not size:
            self.add_error('attributes', 'At least one attribute (color or size) is required', 'required')
            return

        if color and not is_valid_string(color, max_length=50):
            self.add_error('color', 'Color must be less than 50 characters', 'invalid_length')

        if size and not is_valid_string(size, max_length=20):
            self.add_error('size', 'Size must be less than 20 characters', 'invalid_length')

    def validate_stock(self):
        """Validate variant stock."""
        stock = self.data.get('stock')

        # Stock is optional, defaults to 0
        if stock is None:
            return

        if not is_valid_integer(stock, min_value=0):
            self.add_error('stock', 'Stock must be a non-negative integer', 'invalid_value')

    def validate_price(self):
        """Validate variant price."""
        price = self.data.get('price')

        # Price is optional for variants
        if price is None:
            return

        if not is_valid_number(price, min_value=0):
            self.add_error('price', 'Price must be a positive number', 'invalid_value')

    def validate_images(self):
        """Validate variant images."""
        image_urls = self.data.get('image_urls')

        # Images are optional
        if not image_urls:
            return

        if not isinstance(image_urls, list):
            self.add_error('image_urls', 'Image URLs must be a list', 'invalid_type')
            return

        for url in image_urls:
            if not is_valid_url(url):
                self.add_error('image_urls', 'Invalid image URL format', 'invalid_format')
                break

class CartItemValidator(BaseValidator):
    """Validator for cart item data."""

    def validate(self):
        """Validate cart item data."""
        self.validate_product()
        self.validate_variant()
        self.validate_quantity()

        return len(self.errors) == 0

    def validate_product(self):
        """Validate product ID."""
        product_id = self.data.get('product_id')

        if not product_id:
            self.add_error('product_id', 'Product ID is required', 'required')
            return

        product = Product.query.get(product_id)
        if not product:
            self.add_error('product_id', 'Invalid product', 'invalid_choice')
            return

        # Check if product is in stock
        if product.stock <= 0:
            self.add_error('product_id', 'Product is out of stock', 'out_of_stock')

    def validate_variant(self):
        """Validate variant ID if provided."""
        variant_id = self.data.get('variant_id')
        product_id = self.data.get('product_id')

        # Variant is optional
        if not variant_id:
            return

        from .models import ProductVariant

        variant = ProductVariant.query.get(variant_id)
        if not variant:
            self.add_error('variant_id', 'Invalid variant', 'invalid_choice')
            return

        # Check if variant belongs to the specified product
        if variant.product_id != int(product_id):
            self.add_error('variant_id', 'Variant does not belong to the specified product', 'invalid_choice')
            return

        # Check if variant is in stock
        if variant.stock <= 0:
            self.add_error('variant_id', 'Variant is out of stock', 'out_of_stock')

    def validate_quantity(self):
        """Validate item quantity."""
        quantity = self.data.get('quantity')

        if quantity is None:
            self.add_error('quantity', 'Quantity is required', 'required')
            return

        if not is_valid_integer(quantity, min_value=1):
            self.add_error('quantity', 'Quantity must be a positive integer', 'invalid_value')
            return

        # Check if quantity exceeds available stock
        product_id = self.data.get('product_id')
        variant_id = self.data.get('variant_id')

        if product_id:
            from .models import Product, ProductVariant

            if variant_id:
                variant = ProductVariant.query.get(variant_id)
                if variant and int(quantity) > variant.stock:
                    self.add_error('quantity', f'Quantity exceeds available stock ({variant.stock})', 'exceeds_stock')
            else:
                product = Product.query.get(product_id)
                if product and int(quantity) > product.stock:
                    self.add_error('quantity', f'Quantity exceeds available stock ({product.stock})', 'exceeds_stock')

class OrderValidator(BaseValidator):
    """Validator for order data."""

    def validate(self):
        """Validate order data."""
        self.validate_payment_method()
        self.validate_shipping_address()
        self.validate_billing_address()
        self.validate_shipping_method()
        self.validate_coupon()

        return len(self.errors) == 0

    def validate_payment_method(self):
        """Validate payment method."""
        payment_method = self.data.get('payment_method')

        if not payment_method:
            self.add_error('payment_method', 'Payment method is required', 'required')
            return

        valid_methods = ['mpesa', 'card', 'cash_on_delivery']
        if payment_method not in valid_methods:
            self.add_error('payment_method', 'Invalid payment method', 'invalid_choice')

    def validate_shipping_address(self):
        """Validate shipping address."""
        shipping_address_id = self.data.get('shipping_address_id')
        shipping_address = self.data.get('shipping_address')

        if not shipping_address_id and not shipping_address:
            self.add_error('shipping_address', 'Shipping address is required', 'required')
            return

        if shipping_address_id:
            # Validate existing address
            address = Address.query.get(shipping_address_id)
            if not address:
                self.add_error('shipping_address_id', 'Invalid address ID', 'invalid_choice')
                return

            # Check if address belongs to the current user
            if 'user_id' in self.context and address.user_id != self.context['user_id']:
                self.add_error('shipping_address_id', 'Address does not belong to the current user', 'unauthorized')
                return

            # Check if address can be used for shipping
            if address.address_type not in [AddressType.SHIPPING, AddressType.BOTH]:
                self.add_error('shipping_address_id', 'Selected address cannot be used for shipping', 'invalid_type')

        elif shipping_address:
            # Validate new address
            address_validator = AddressValidator(shipping_address)
            if not address_validator.is_valid():
                for field, errors in address_validator.get_errors().items():
                    for error in errors:
                        self.add_error(f'shipping_address.{field}', error['message'], error['code'])

    def validate_billing_address(self):
        """Validate billing address."""
        billing_address_id = self.data.get('billing_address_id')
        billing_address = self.data.get('billing_address')
        same_as_shipping = self.data.get('same_as_shipping')

        if same_as_shipping:
            return

        if not billing_address_id and not billing_address:
            self.add_error('billing_address', 'Billing address is required', 'required')
            return

        if billing_address_id:
            # Validate existing address
            address = Address.query.get(billing_address_id)
            if not address:
                self.add_error('billing_address_id', 'Invalid address ID', 'invalid_choice')
                return

            # Check if address belongs to the current user
            if 'user_id' in self.context and address.user_id != self.context['user_id']:
                self.add_error('billing_address_id', 'Address does not belong to the current user', 'unauthorized')
                return

            # Check if address can be used for billing
            if address.address_type not in [AddressType.BILLING, AddressType.BOTH]:
                self.add_error('billing_address_id', 'Selected address cannot be used for billing', 'invalid_type')

        elif billing_address:
            # Validate new address
            address_validator = AddressValidator(billing_address)
            if not address_validator.is_valid():
                for field, errors in address_validator.get_errors().items():
                    for error in errors:
                        self.add_error(f'billing_address.{field}', error['message'], error['code'])

    def validate_shipping_method(self):
        """Validate shipping method."""
        shipping_method = self.data.get('shipping_method')

        # Shipping method is optional
        if not shipping_method:
            return

        valid_methods = ['standard', 'express', 'same_day']
        if shipping_method not in valid_methods:
            self.add_error('shipping_method', 'Invalid shipping method', 'invalid_choice')

    def validate_coupon(self):
        """Validate coupon if provided."""
        coupon_code = self.data.get('coupon_code')

        # Coupon is optional
        if not coupon_code:
            return

        from .models import Coupon
        from datetime import datetime

        coupon = Coupon.query.filter_by(code=coupon_code, is_active=True).first()
        if not coupon:
            self.add_error('coupon_code', 'Invalid coupon code', 'invalid_code')
            return

        # Check if coupon is valid
        now = datetime.utcnow()
        if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
            self.add_error('coupon_code', 'Coupon is not valid at this time', 'expired')
            return

        # Check if coupon has reached usage limit
        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            self.add_error('coupon_code', 'Coupon usage limit reached', 'limit_reached')
            return

class PaymentValidator(BaseValidator):
    """Validator for payment data."""

    def validate(self):
        """Validate payment data."""
        self.validate_order()
        self.validate_amount()
        self.validate_payment_method()
        self.validate_transaction_id()

        return len(self.errors) == 0

    def validate_order(self):
        """Validate order ID."""
        order_id = self.data.get('order_id')

        if not order_id:
            self.add_error('order_id', 'Order ID is required', 'required')
            return

        from .models import Order

        order = Order.query.get(order_id)
        if not order:
            self.add_error('order_id', 'Invalid order', 'invalid_choice')
            return

        # Check if order belongs to the current user
        if 'user_id' in self.context and order.user_id != self.context['user_id']:
            self.add_error('order_id', 'Order does not belong to the current user', 'unauthorized')

    def validate_amount(self):
        """Validate payment amount."""
        amount = self.data.get('amount')

        if amount is None:
            self.add_error('amount', 'Amount is required', 'required')
            return

        if not is_valid_number(amount, min_value=0):
            self.add_error('amount', 'Amount must be a positive number', 'invalid_value')
            return

        # Check if amount matches order total
        order_id = self.data.get('order_id')
        if order_id:
            from .models import Order

            order = Order.query.get(order_id)
            if order and float(amount) != float(order.total_amount):
                self.add_error('amount', 'Amount does not match order total', 'amount_mismatch')

    def validate_payment_method(self):
        """Validate payment method."""
        payment_method = self.data.get('payment_method')

        if not payment_method:
            self.add_error('payment_method', 'Payment method is required', 'required')
            return

        valid_methods = ['mpesa', 'card', 'cash_on_delivery']
        if payment_method not in valid_methods:
            self.add_error('payment_method', 'Invalid payment method', 'invalid_choice')

    def validate_transaction_id(self):
        """Validate transaction ID."""
        transaction_id = self.data.get('transaction_id')
        payment_method = self.data.get('payment_method')

        if not transaction_id:
            self.add_error('transaction_id', 'Transaction ID is required', 'required')
            return

        # Validate M-Pesa transaction code format
        if payment_method == 'mpesa' and not is_valid_mpesa_code(transaction_id):
            self.add_error('transaction_id', 'Invalid M-Pesa transaction code format', 'invalid_format')
            return

        # Check if transaction ID already exists
        from .models import Payment

        payment = Payment.query.filter_by(transaction_id=transaction_id).first()
        if payment:
            self.add_error('transaction_id', 'Transaction ID already used', 'already_exists')

class ReviewValidator(BaseValidator):
    """Validator for review data."""

    def validate(self):
        """Validate review data."""
        self.validate_product()
        self.validate_rating()
        self.validate_title()
        self.validate_comment()
        self.validate_images()

        return len(self.errors) == 0

    def validate_product(self):
        """Validate product ID."""
        product_id = self.data.get('product_id')

        if not product_id:
            self.add_error('product_id', 'Product ID is required', 'required')
            return

        product = Product.query.get(product_id)
        if not product:
            self.add_error('product_id', 'Invalid product', 'invalid_choice')
            return

        # Check if user has already reviewed this product
        if 'user_id' in self.context and 'review_id' not in self.context:
            from .models import Review

            review = Review.query.filter_by(
                user_id=self.context['user_id'],
                product_id=product_id
            ).first()

            if review:
                self.add_error('product_id', 'You have already reviewed this product', 'already_reviewed')

    def validate_rating(self):
        """Validate rating."""
        rating = self.data.get('rating')

        if rating is None:
            self.add_error('rating', 'Rating is required', 'required')
            return

        if not is_valid_integer(rating, min_value=1, max_value=5):
            self.add_error('rating', 'Rating must be between 1 and 5', 'invalid_value')

    def validate_title(self):
        """Validate review title."""
        title = self.data.get('title')

        # Title is optional
        if not title:
            return

        if not is_valid_string(title, max_length=200):
            self.add_error('title', 'Title must be less than 200 characters', 'invalid_length')

    def validate_comment(self):
        """Validate review comment."""
        comment = self.data.get('comment')

        # Comment is optional
        if not comment:
            return

        # Sanitize comment
        sanitized = sanitize_string(comment)
        if sanitized != comment:
            self.add_error('comment', 'Comment contains potentially unsafe content', 'unsafe_content')

    def validate_images(self):
        """Validate review images."""
        images = self.data.get('images')

        # Images are optional
        if not images:
            return

        if not isinstance(images, list):
            self.add_error('images', 'Images must be a list', 'invalid_type')
            return

        for url in images:
            if not is_valid_url(url):
                self.add_error('images', 'Invalid image URL format', 'invalid_format')
                break

