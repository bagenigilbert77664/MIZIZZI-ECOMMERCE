"""
Updated Model Classes for Mizizzi E-Commerce Backend with Reservation System
"""
from ..configuration.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.sql import func
from sqlalchemy import Enum as SQLEnum, ARRAY
import enum
from datetime import datetime, timedelta
import datetime as dt  # Import datetime module as dt to avoid confusion

# ----------------------
# Enums for standardization
# ----------------------
class UserRole(enum.Enum):
   USER = "user"
   ADMIN = "admin"
   MODERATOR = "moderator"


class OrderStatus(enum.Enum):
   PENDING = 'pending'
   PROCESSING = 'processing'
   SHIPPED = 'shipped'
   DELIVERED = 'delivered'
   CANCELLED = 'cancelled'
   REFUNDED = 'refunded'

class PaymentStatus(enum.Enum):
   PENDING = 'pending'
   PAID = 'paid'
   FAILED = 'failed'
   REFUNDED = 'refunded'

class CouponType(enum.Enum):
   PERCENTAGE = "percentage"
   FIXED = "fixed"

class AddressType(enum.Enum):
   SHIPPING = "shipping"
   BILLING = "billing"
   BOTH = "both"

class ReservationStatus(enum.Enum):
   ACTIVE = "active"
   EXPIRED = "expired"
   COMPLETED = "completed"
   CANCELLED = "cancelled"


# ----------------------
# User Model
# ----------------------
class User(db.Model):
   __tablename__ = 'users'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   email = db.Column(db.String(100), unique=True, nullable=False, index=True)
   password_hash = db.Column(db.String(200), nullable=False)
   role = db.Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
   phone = db.Column(db.String(20))
   address = db.Column(db.JSON)
   avatar_url = db.Column(db.String(255))
   is_active = db.Column(db.Boolean, default=True)
   created_at = db.Column(db.DateTime, default=func.now())
   last_login = db.Column(db.DateTime)

   # Add verification fields
   email_verified = db.Column(db.Boolean, default=False)
   phone_verified = db.Column(db.Boolean, default=False)
   verification_code = db.Column(db.String(10))
   verification_code_expires = db.Column(db.DateTime)
   is_deleted = db.Column(db.Boolean, default=False)
   deleted_at = db.Column(db.DateTime)
   is_google_user = db.Column(db.Boolean, default=False)

   # Relationships with cascade deletes
   orders = db.relationship('Order', backref='user', lazy=True, cascade="all, delete-orphan")
   reviews = db.relationship('Review', backref='user', lazy=True, cascade="all, delete-orphan")
   cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade="all, delete-orphan")
   wishlist_items = db.relationship('WishlistItem', backref='user', lazy=True, cascade="all, delete-orphan")
   carts = db.relationship('Cart', back_populates='user', lazy=True, cascade="all, delete-orphan")
   reservations = db.relationship('InventoryReservation', backref='user', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f"<User {self.email}>"

   def to_dict(self):
       return {
           'id': self.id,
           'name': self.name,
           'email': self.email,
           'role': self.role.value,
           'phone': self.phone,
           'address': self.address,
           'avatar_url': self.avatar_url,
           'is_active': self.is_active,
           'created_at': self.created_at.isoformat() if self.created_at else None,
           'last_login': self.last_login.isoformat() if self.last_login else None,
           'email_verified': self.email_verified,
           'phone_verified': self.phone_verified,
       }

   def set_password(self, password: str):
       self.password_hash = generate_password_hash(password)

   def verify_password(self, password: str) -> bool:
       return check_password_hash(self.password_hash, password)

   def set_verification_code(self, code: str, is_phone: bool = False):
       """Set verification code and expiry time (10 minutes from now)"""
       self.verification_code = code
       # Set expiry time to 10 minutes from now
       self.verification_code_expires = datetime.utcnow() + dt.timedelta(minutes=10)

   def verify_verification_code(self, code: str, is_phone: bool = False) -> bool:
       """Verify the provided code against stored code and check if it's still valid"""
       if not self.verification_code or not self.verification_code_expires:
           return False

       # Check if code has expired
       if datetime.utcnow() > self.verification_code_expires:
           return False

       # Check if code matches
       return self.verification_code == code

# ----------------------
# ADDRESS Model
# ----------------------

class Address(db.Model):
   __tablename__ = 'addresses'

   id = db.Column(db.Integer, primary_key=True)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
   first_name = db.Column(db.String(100), nullable=False)
   last_name = db.Column(db.String(100), nullable=False)
   address_line1 = db.Column(db.String(255), nullable=False)
   address_line2 = db.Column(db.String(255))
   city = db.Column(db.String(100), nullable=False)
   state = db.Column(db.String(100), nullable=False)
   postal_code = db.Column(db.String(20), nullable=False)
   country = db.Column(db.String(100), nullable=False)
   phone = db.Column(db.String(20), nullable=False)
   alternative_phone = db.Column(db.String(20))
   address_type = db.Column(db.Enum(AddressType), default=AddressType.BOTH, nullable=False)
   is_default = db.Column(db.Boolean, default=False)
   additional_info = db.Column(db.Text)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   # Relationship with User
   user = db.relationship('User', backref=db.backref('addresses', lazy=True, cascade="all, delete-orphan"))

   def __repr__(self):
       return f"<Address {self.id} for User {self.user_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'user_id': self.user_id,
           'first_name': self.first_name,
           'last_name': self.last_name,
           'address_line1': self.address_line1,
           'address_line2': self.address_line2,
           'city': self.city,
           'state': self.state,
           'postal_code': self.postal_code,
           'country': self.country,
           'phone': self.phone,
           'alternative_phone': self.alternative_phone,
           'address_type': self.address_type.value,
           'is_default': self.is_default,
           'additional_info': self.additional_info,
           'created_at': self.created_at.isoformat(),
           'updated_at': self.updated_at.isoformat()
       }

# ----------------------
# Cart Model
# ----------------------
class Cart(db.Model):
   __tablename__ = 'carts'

   id = db.Column(db.Integer, primary_key=True)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Nullable for guest carts
   guest_id = db.Column(db.String(36), nullable=True, index=True)  # UUID for guest carts
   is_active = db.Column(db.Boolean, default=True)
   subtotal = db.Column(db.Float, default=0.0)
   tax = db.Column(db.Float, default=0.0)
   shipping = db.Column(db.Float, default=0.0)
   discount = db.Column(db.Float, default=0.0)
   total = db.Column(db.Float, default=0.0)
   coupon_code = db.Column(db.String(50))
   shipping_method_id = db.Column(db.Integer, db.ForeignKey('shipping_methods.id'))
   payment_method_id = db.Column(db.Integer, db.ForeignKey('payment_methods.id'))
   shipping_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'))
   billing_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'))
   same_as_shipping = db.Column(db.Boolean, default=True)
   requires_shipping = db.Column(db.Boolean, default=True)
   notes = db.Column(db.Text)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
   last_activity = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
   expires_at = db.Column(db.DateTime)  # New field for cart expiration

   # Relationships
   user = db.relationship('User', back_populates='carts', foreign_keys=[user_id])
   items = db.relationship('CartItem', backref='cart', lazy=True, cascade="all, delete-orphan")
   shipping_address = db.relationship('Address', foreign_keys=[shipping_address_id])
   billing_address = db.relationship('Address', foreign_keys=[billing_address_id])
   shipping_method = db.relationship('ShippingMethod')
   payment_method = db.relationship('PaymentMethod')
   reservations = db.relationship('InventoryReservation', backref='cart', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       if self.user_id:
           return f"<Cart {self.id} for User {self.user_id}>"
       else:
           return f"<Guest Cart {self.id} ({self.guest_id})>"

   def update_totals(self):
       """Update cart totals based on items, shipping, and discounts."""
       from sqlalchemy import func

       # Calculate subtotal from cart items
       result = db.session.query(func.sum(CartItem.price * CartItem.quantity)).filter(
           CartItem.cart_id == self.id
       ).first()

       self.subtotal = result[0] or 0.0

       # Calculate tax (if applicable)
       tax_rate = 0.0  # This could be configurable or based on location
       self.tax = self.subtotal * tax_rate

       # Calculate shipping cost (if applicable)
       if self.shipping_method_id and self.requires_shipping:
           shipping_method = ShippingMethod.query.get(self.shipping_method_id)
           if shipping_method:
               self.shipping = shipping_method.cost
       else:
           self.shipping = 0.0

       # Apply discount if coupon is applied
       if self.coupon_code:
           coupon = Coupon.query.filter_by(code=self.coupon_code, is_active=True).first()
           if coupon:
               if coupon.type == CouponType.PERCENTAGE:
                   self.discount = self.subtotal * (coupon.value / 100)
                   if coupon.max_discount and self.discount > coupon.max_discount:
                       self.discount = coupon.max_discount
               else:  # Fixed amount
                   self.discount = coupon.value
       else:
           self.discount = 0.0

       # Calculate total
       self.total = self.subtotal + self.tax + self.shipping - self.discount

       # Ensure total is not negative
       if self.total < 0:
           self.total = 0.0

   def to_dict(self):
       """Convert cart to dictionary for API responses."""
       return {
           'id': self.id,
           'user_id': self.user_id,
           'guest_id': self.guest_id,
           'is_guest': self.guest_id is not None,
           'is_active': self.is_active,
           'subtotal': self.subtotal,
           'tax': self.tax,
           'shipping': self.shipping,
           'discount': self.discount,
           'total': self.total,
           'coupon_code': self.coupon_code,
           'shipping_method_id': self.shipping_method_id,
           'payment_method_id': self.payment_method_id,
           'shipping_address_id': self.shipping_address_id,
           'billing_address_id': self.billing_address_id,
           'same_as_shipping': self.same_as_shipping,
           'requires_shipping': self.requires_shipping,
           'notes': self.notes,
           'created_at': self.created_at.isoformat() if self.created_at else None,
           'updated_at': self.updated_at.isoformat() if self.updated_at else None,
           'last_activity': self.last_activity.isoformat() if self.last_activity else None,
           'expires_at': self.expires_at.isoformat() if self.expires_at else None
       }

   def get_item_count(self):
       """Get the total number of items in the cart."""
       from sqlalchemy import func

       result = db.session.query(func.sum(CartItem.quantity)).filter(
           CartItem.cart_id == self.id
       ).first()

       return result[0] or 0

   def has_digital_products(self):
       """Check if the cart contains any digital products."""
       for item in self.items:
           product = Product.query.get(item.product_id)
           if product and product.is_digital:
               return True
       return False

   def has_physical_products(self):
       """Check if the cart contains any physical products."""
       for item in self.items:
           product = Product.query.get(item.product_id)
           if product and not product.is_digital:
               return True
       return False

   def get_weight(self):
       """Calculate the total weight of the cart."""
       total_weight = 0.0
       for item in self.items:
           product = Product.query.get(item.product_id)
           if product and product.weight:
               total_weight += product.weight * item.quantity
       return total_weight

   def is_empty(self):
       """Check if the cart is empty."""
       return len(self.items) == 0

   def update_expiration(self, minutes=30):
       """Update the cart expiration time."""
       self.expires_at = datetime.utcnow() + timedelta(minutes=minutes)
       return self.expires_at

   def is_expired(self):
       """Check if the cart has expired."""
       if not self.expires_at:
           return False
       return datetime.utcnow() > self.expires_at

   def release_all_reservations(self):
       """Release all inventory reservations for this cart."""
       for reservation in self.reservations:
           if reservation.status == ReservationStatus.ACTIVE:
               inventory = Inventory.query.filter_by(
                   product_id=reservation.product_id,
                   variant_id=reservation.variant_id
               ).first()

               if inventory:
                   inventory.release_stock(reservation.quantity)

               reservation.status = ReservationStatus.CANCELLED

       db.session.commit()
       return True

   def merge_with_user_cart(self, user_id):
       """
       Merge this guest cart with a user's cart.
       Used when a guest logs in and has items in their cart.

       Args:
           user_id: The ID of the user to merge with

       Returns:
           The user's cart with merged items
       """
       # Find user's active cart or create one
       user_cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

       if not user_cart:
           # Create new cart for user
           user_cart = Cart(user_id=user_id, is_active=True)
           db.session.add(user_cart)
           db.session.commit()

       # Get all items from guest cart
       guest_items = CartItem.query.filter_by(cart_id=self.id).all()

       # Transfer items to user cart
       for guest_item in guest_items:
           # Check if item already exists in user cart
           existing_item = CartItem.query.filter_by(
               cart_id=user_cart.id,
               product_id=guest_item.product_id,
               variant_id=guest_item.variant_id
           ).first()

           if existing_item:
               # Update quantity
               existing_item.quantity += guest_item.quantity
           else:
               # Create new cart item
               new_item = CartItem(
                   cart_id=user_cart.id,
                   user_id=user_id,
                   product_id=guest_item.product_id,
                   variant_id=guest_item.variant_id,
                   quantity=guest_item.quantity,
                   price=guest_item.price
               )
               db.session.add(new_item)

       # Transfer other cart properties
       if self.coupon_code and not user_cart.coupon_code:
           user_cart.coupon_code = self.coupon_code

       if self.shipping_method_id and not user_cart.shipping_method_id:
           user_cart.shipping_method_id = self.shipping_method_id

       if self.payment_method_id and not user_cart.payment_method_id:
           user_cart.payment_method_id = self.payment_method_id

       if self.notes and not user_cart.notes:
           user_cart.notes = self.notes

       # Transfer reservations
       for reservation in self.reservations:
           if reservation.status == ReservationStatus.ACTIVE:
               # Check if there's already a reservation for this product in the user cart
               existing_reservation = InventoryReservation.query.filter_by(
                   cart_id=user_cart.id,
                   product_id=reservation.product_id,
                   variant_id=reservation.variant_id,
                   status=ReservationStatus.ACTIVE
               ).first()

               if existing_reservation:
                   # Update quantity
                   existing_reservation.quantity += reservation.quantity
                   existing_reservation.expires_at = datetime.utcnow() + timedelta(minutes=30)
               else:
                   # Create new reservation
                   new_reservation = InventoryReservation(
                       cart_id=user_cart.id,
                       user_id=user_id,
                       product_id=reservation.product_id,
                       variant_id=reservation.variant_id,
                       quantity=reservation.quantity,
                       status=ReservationStatus.ACTIVE,
                       expires_at=datetime.utcnow() + timedelta(minutes=30)
                   )
                   db.session.add(new_reservation)

               # Mark old reservation as cancelled
               reservation.status = ReservationStatus.CANCELLED

       # Update cart totals
       user_cart.update_totals()
       user_cart.update_expiration()

       # Mark guest cart as inactive
       self.is_active = False

       db.session.commit()

       return user_cart

# ----------------------
# CartItem Model
# ----------------------
class CartItem(db.Model):
   __tablename__ = 'cart_items'

   id = db.Column(db.Integer, primary_key=True)
   cart_id = db.Column(db.Integer, db.ForeignKey('carts.id'), nullable=False)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Nullable for guest cart items
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'))
   quantity = db.Column(db.Integer, nullable=False, default=1)
   price = db.Column(db.Float, nullable=False)  # Store the price at the time of adding to cart
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   # Relationships
   product = db.relationship('Product')
   variant = db.relationship('ProductVariant')

   def __repr__(self):
       return f"<CartItem {self.id} for Cart {self.cart_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'cart_id': self.cart_id,
           'user_id': self.user_id,
           'product_id': self.product_id,
           'variant_id': self.variant_id,
           'quantity': self.quantity,
           'price': self.price,
           'subtotal': self.price * self.quantity,
           'created_at': self.created_at.isoformat() if self.created_at else None,
           'updated_at': self.updated_at.isoformat() if self.updated_at else None
       }

# ----------------------
# Category Model
# ----------------------
class Category(db.Model):
   __tablename__ = 'categories'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
   description = db.Column(db.Text)
   image_url = db.Column(db.String(255))
   banner_url = db.Column(db.String(255))
   parent_id = db.Column(db.Integer, db.ForeignKey('categories.id'), index=True)
   is_featured = db.Column(db.Boolean, default=False)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   # Relationships
   subcategories = db.relationship(
       'Category',
       backref=db.backref('parent', remote_side=[id]),
       cascade="all, delete-orphan",
       lazy='joined'
   )
   products = db.relationship('Product', back_populates='category', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f"<Category {self.name}>"

   def __str__(self):
       return self.name

   def to_dict(self, include_subcategories=False):
       data = {
           'id': self.id,
           'name': self.name,
           'slug': self.slug,
           'description': self.description,
           'image_url': self.image_url,
           'banner_url': self.banner_url,
           'parent_id': self.parent_id,
           'is_featured': self.is_featured,
           'created_at': self.created_at.isoformat() if self.created_at else None,
           'updated_at': self.updated_at.isoformat() if self.updated_at else None,
       }

       if include_subcategories:
           data['subcategories'] = [
               sub.to_dict(include_subcategories=True) for sub in self.subcategories
           ]

       return data



# ----------------------
# Product Model (Single model with flags for flash sales, luxury deals, or regular products)
# ----------------------
class Product(db.Model):
   __tablename__ = 'products'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(255), nullable=False)
   slug = db.Column(db.String(255), nullable=False, unique=True)
   description = db.Column(db.Text, nullable=True)
   price = db.Column(db.Numeric(10, 2), nullable=False)
   sale_price = db.Column(db.Numeric(10, 2), nullable=True)
   stock = db.Column(db.Integer, default=0)
   category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
   brand_id = db.Column(db.Integer, db.ForeignKey('brands.id'), nullable=True)
   image_urls = db.Column(ARRAY(db.String), default=[])
   thumbnail_url = db.Column(db.String(255), nullable=True)
   image_urls = db.Column(db.String(1024), nullable=True) # Modified to TEXT for SQLite compatibility
   thumbnail_url = db.Column(db.String(255), nullable=True)
   is_featured = db.Column(db.Boolean, default=False)
   is_new = db.Column(db.Boolean, default=False)
   is_sale = db.Column(db.Boolean, default=False)
   is_flash_sale = db.Column(db.Boolean, default=False)
   is_luxury_deal = db.Column(db.Boolean, default=False)
   is_active = db.Column(db.Boolean, default=True)  # Add this line
   sku = db.Column(db.String(100), nullable=True)
   weight = db.Column(db.Float, nullable=True)
   dimensions = db.Column(db.JSON, nullable=True)
   meta_title = db.Column(db.String(255), nullable=True)
   meta_description = db.Column(db.Text, nullable=True)
   short_description = db.Column(db.Text, nullable=True)
   specifications = db.Column(db.JSON, nullable=True)
   warranty_info = db.Column(db.Text, nullable=True)
   shipping_info = db.Column(db.Text, nullable=True)
   availability_status = db.Column(db.String(50), nullable=True)
   min_order_quantity = db.Column(db.Integer, default=1)
   max_order_quantity = db.Column(db.Integer, nullable=True)
   related_products = db.Column(ARRAY(db.Integer), default=[])
   cross_sell_products = db.Column(ARRAY(db.Integer), default=[])
   up_sell_products = db.Column(ARRAY(db.Integer), default=[])
   discount_percentage = db.Column(db.Float, nullable=True)
   tax_rate = db.Column(db.Float, nullable=True)
   tax_class = db.Column(db.String(100), nullable=True)
   barcode = db.Column(db.String(100), nullable=True)
   manufacturer = db.Column(db.String(255), nullable=True)
   country_of_origin = db.Column(db.String(100), nullable=True)
   is_digital = db.Column(db.Boolean, default=False)
   download_link = db.Column(db.String(255), nullable=True)
   download_expiry_days = db.Column(db.Integer, nullable=True)
   is_taxable = db.Column(db.Boolean, default=True)
   is_shippable = db.Column(db.Boolean, default=True)
   requires_shipping = db.Column(db.Boolean, default=True)
   is_gift_card = db.Column(db.Boolean, default=False)
   gift_card_value = db.Column(db.Numeric(10, 2), nullable=True)
   is_customizable = db.Column(db.Boolean, default=False)
   customization_options = db.Column(db.JSON, nullable=True)
   seo_keywords = db.Column(ARRAY(db.String), default=[])
   canonical_url = db.Column(db.String(255), nullable=True)
   condition = db.Column(db.String(50), nullable=True)
   video_url = db.Column(db.String(255), nullable=True)
   is_visible = db.Column(db.Boolean, default=True)
   is_searchable = db.Column(db.Boolean, default=True)
   is_comparable = db.Column(db.Boolean, default=True)
   is_preorder = db.Column(db.Boolean, default=False)
   preorder_release_date = db.Column(db.DateTime, nullable=True)
   preorder_message = db.Column(db.Text, nullable=True)
   badge_text = db.Column(db.String(100), nullable=True)
   badge_color = db.Column(db.String(50), nullable=True)
   sort_order = db.Column(db.Integer, nullable=True)
   # Fix: Use func.now() instead of datetime.now(datetime.timezone.utc)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   # Relationships
   category = db.relationship('Category', back_populates='products')
   brand = db.relationship('Brand', back_populates='products')
   variants = db.relationship('ProductVariant', backref='product', cascade='all, delete-orphan')
   reviews = db.relationship('Review', backref='product', cascade='all, delete-orphan')
   images = db.relationship('ProductImage', backref='product', cascade='all, delete-orphan')
   # Fix: Remove the backref that's causing the conflict
   inventory_items = db.relationship('Inventory', foreign_keys='Inventory.product_id', cascade='all, delete-orphan')

   def __repr__(self):
       return f'<Product {self.name}>'

   def to_dict(self):
       """Convert product to dictionary for API responses"""
       return {
           'id': self.id,
           'name': self.name,
           'slug': self.slug,
           'description': self.description,
           'price': float(self.price) if self.price else None,
           'sale_price': float(self.sale_price) if self.sale_price else None,
           'stock': self.stock,
           'category_id': self.category_id,
           'brand_id': self.brand_id,
           'image_urls': self.image_urls,
           'thumbnail_url': self.thumbnail_url,
           'is_featured': self.is_featured,
           'is_new': self.is_new,
           'is_sale': self.is_sale,
           'is_flash_sale': self.is_flash_sale,
           'is_luxury_deal': self.is_luxury_deal,
           'is_active': self.is_active,  # Add this line
           'created_at': self.created_at.isoformat() if self.created_at else None,
           'updated_at': self.updated_at.isoformat() if self.updated_at else None
       }


# ----------------------
# ProductVariant Modela
# ----------------------
class ProductVariant(db.Model):
   __tablename__ = 'product_variants'

   id = db.Column(db.Integer, primary_key=True)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   color = db.Column(db.String(100), nullable=True)
   size = db.Column(db.String(100), nullable=True)
   price = db.Column(db.Numeric(10, 2), nullable=False)
   sale_price = db.Column(db.Numeric(10, 2), nullable=True)  # Add this line
   stock = db.Column(db.Integer, default=0)
   sku = db.Column(db.String(100), nullable=True)
   image_url = db.Column(db.String(255), nullable=True)
   # Fix: Use func.now() instead of datetime.now(datetime.timezone.utc)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   def __repr__(self):
       return f'<ProductVariant {self.id} of Product {self.product_id}>'

   def to_dict(self):
       """Convert variant to dictionary for API responses"""
       return {
           'id': self.id,
           'product_id': self.product_id,
           'color': self.color,
           'size': self.size,
           'price': float(self.price) if self.price else None,
           'sale_price': float(self.sale_price) if self.sale_price else None,  # Add this line
           'stock': self.stock,
           'sku': self.sku,
           'image_url': self.image_url
       }


# ----------------------
# ProductImage Model
# ----------------------

class ProductImage(db.Model):
   __tablename__ = 'product_images'

   id = db.Column(db.Integer, primary_key=True)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   filename = db.Column(db.String(255), nullable=False)
   original_name = db.Column(db.String(255), nullable=True)
   url = db.Column(db.String(255), nullable=False)
   size = db.Column(db.Integer, nullable=True)  # Size in bytes
   is_primary = db.Column(db.Boolean, default=False)
   sort_order = db.Column(db.Integer, default=0)
   alt_text = db.Column(db.String(255), nullable=True)
   uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
   # Fix: Use func.now() instead of datetime.now(datetime.timezone.utc)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   def __repr__(self):
       return f'<ProductImage {self.filename} for Product {self.product_id}>'

   def to_dict(self):
       """Convert image to dictionary for API responses"""
       return {
           'id': self.id,
           'product_id': self.product_id,
           'filename': self.filename,
           'url': self.url,
           'is_primary': self.is_primary,
           'alt_text': self.alt_text,
           'created_at': self.created_at.isoformat() if self.created_at else None
       }

# ----------------------
# Brand Model
# ----------------------
class Brand(db.Model):
   __tablename__ = 'brands'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   slug = db.Column(db.String(100), unique=True, nullable=False)
   description = db.Column(db.Text)
   logo_url = db.Column(db.String(255))
   website = db.Column(db.String(255))
   is_featured = db.Column(db.Boolean, default=False)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   # Relationships
   products = db.relationship('Product', back_populates='brand', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f"<Brand {self.name}>"

   def to_dict(self):
       return {
           'id': self.id,
           'name': self.name,
           'slug': self.slug,
           'description': self.description,
           'logo_url': self.logo_url,
           'website': self.website,
           'is_featured': self.is_featured
       }


# ----------------------
# Order Model
# ----------------------
class Order(db.Model):
   __tablename__ = 'orders'

   id = db.Column(db.Integer, primary_key=True)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
   order_number = db.Column(db.String(50), unique=True, nullable=False)
   status = db.Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
   total_amount = db.Column(db.Float, nullable=False)
   shipping_address = db.Column(db.JSON, nullable=False)
   billing_address = db.Column(db.JSON, nullable=False)
   payment_method = db.Column(db.String(50))
   payment_status = db.Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
   shipping_method = db.Column(db.String(50))
   shipping_cost = db.Column(db.Float, default=0.0)
   tracking_number = db.Column(db.String(100))
   notes = db.Column(db.Text)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
   payments = db.relationship('Payment', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f"<Order {self.order_number} for User {self.user_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'user_id': self.user_id,
           'order_number': self.order_number,
           'status': self.status.value,
           'total_amount': self.total_amount,
           'shipping_address': self.shipping_address,
           'billing_address': self.billing_address,
           'payment_method': self.payment_method,
           'payment_status': self.payment_status.value,
           'shipping_method': self.shipping_method,
           'shipping_cost': self.shipping_cost,
           'tracking_number': self.tracking_number,
           'notes': self.notes,
           'created_at': self.created_at.isoformat(),
           'updated_at': self.updated_at.isoformat(),
           'items': [item.to_dict() for item in self.items],
           'payments': [payment.to_dict() for payment in self.payments]
       }


# ----------------------
# OrderItem Model
# ----------------------
class OrderItem(db.Model):
   __tablename__ = 'order_items'

   id = db.Column(db.Integer, primary_key=True)
   order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'))
   quantity = db.Column(db.Integer, nullable=False)
   price = db.Column(db.Float, nullable=False)
   total = db.Column(db.Float, nullable=False)

   def __repr__(self):
       return f"<OrderItem {self.id} for Order {self.order_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'order_id': self.order_id,
           'product_id': self.product_id,
           'variant_id': self.variant_id,
           'quantity': self.quantity,
           'price': self.price,
           'total': self.total
       }


# ----------------------
# WishlistItem Model
# ----------------------
class WishlistItem(db.Model):
   __tablename__ = 'wishlist_items'

   id = db.Column(db.Integer, primary_key=True)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   created_at = db.Column(db.DateTime, default=func.now())

   def __repr__(self):
       return f"<WishlistItem {self.id} for User {self.user_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'user_id': self.user_id,
           'product_id': self.product_id,
           'created_at': self.created_at.isoformat()
       }


# ----------------------
# Review Model
# ----------------------
class Review(db.Model):
   __tablename__ = 'reviews'

   id = db.Column(db.Integer, primary_key=True)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   rating = db.Column(db.Integer, nullable=False)
   title = db.Column(db.String(200))
   comment = db.Column(db.Text)
   images = db.Column(db.JSON)  # List of image URLs
   is_verified_purchase = db.Column(db.Boolean, default=False)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   def __repr__(self):
       return f"<Review {self.id} for Product {self.product_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'user_id': self.user_id,
           'product_id': self.product_id,
           'rating': self.rating,
           'title': self.title,
           'comment': self.comment,
           'images': self.images,
           'is_verified_purchase': self.is_verified_purchase,
           'created_at': self.created_at.isoformat(),
           'updated_at': self.updated_at.isoformat()
       }


# ----------------------
# Coupon Model
# ----------------------
class Coupon(db.Model):
   __tablename__ = 'coupons'

   id = db.Column(db.Integer, primary_key=True)
   code = db.Column(db.String(50), unique=True, nullable=False)
   type = db.Column(SQLEnum(CouponType), nullable=False)  # percentage or fixed
   value = db.Column(db.Float, nullable=False)
   min_purchase = db.Column(db.Float)
   max_discount = db.Column(db.Float)
   start_date = db.Column(db.DateTime)
   end_date = db.Column(db.DateTime)
   usage_limit = db.Column(db.Integer)
   used_count = db.Column(db.Integer, default=0)
   is_active = db.Column(db.Boolean, default=True)

   def __repr__(self):
       return f"<Coupon {self.code}>"

   def to_dict(self):
       return {
           'id': self.id,
           'code': self.code,
           'type': self.type.value,
           'value': self.value,
           'min_purchase': self.min_purchase,
           'max_discount': self.max_discount,
           'start_date': self.start_date.isoformat() if self.start_date else None,
           'end_date': self.end_date.isoformat() if self.end_date else None,
           'usage_limit': self.usage_limit,
           'used_count': self.used_count,
           'is_active': self.is_active
       }

# Add the Promotion model after the Coupon model

# ----------------------
# Promotion Model
# ----------------------
class Promotion(db.Model):
   __tablename__ = 'promotions'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   description = db.Column(db.Text)
   discount_type = db.Column(SQLEnum(CouponType), nullable=False)  # percentage or fixed
   discount_value = db.Column(db.Float, nullable=False)
   start_date = db.Column(db.DateTime, nullable=False)
   end_date = db.Column(db.DateTime)
   is_active = db.Column(db.Boolean, default=True)
   min_order_value = db.Column(db.Float)
   max_discount = db.Column(db.Float)
   product_ids = db.Column(db.Text)  # Comma-separated list of product IDs
   category_ids = db.Column(db.Text)  # Comma-separated list of category IDs
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   def __repr__(self):
       return f"<Promotion {self.name}>"

   def to_dict(self):
       return {
           'id': self.id,
           'name': self.name,
           'description': self.description,
           'discount_type': self.discount_type.value,
           'discount_value': self.discount_value,
           'start_date': self.start_date.isoformat() if self.start_date else None,
           'end_date': self.end_date.isoformat() if self.end_date else None,
           'is_active': self.is_active,
           'min_order_value': self.min_order_value,
           'max_discount': self.max_discount,
           'product_ids': self.product_ids.split(',') if self.product_ids else [],
           'category_ids': self.category_ids.split(',') if self.category_ids else []
       }


# ----------------------
# Newsletter Model
# ----------------------
class Newsletter(db.Model):
   __tablename__ = 'newsletters'

   id = db.Column(db.Integer, primary_key=True)
   email = db.Column(db.String(100), unique=True, nullable=False)
   name = db.Column(db.String(100), nullable=True)
   is_subscribed = db.Column(db.Boolean, default=True)
   created_at = db.Column(db.DateTime, default=func.now())

   def __repr__(self):
       return f"<Newsletter {self.email}>"

   def to_dict(self):
       return {
           'id': self.id,
           'email': self.email,
           'name': self.name,
           'is_subscribed': self.is_subscribed,
           'created_at': self.created_at.isoformat()
       }


# ----------------------
# Payment Model
# ----------------------
class Payment(db.Model):
   __tablename__ = 'payments'

   id = db.Column(db.Integer, primary_key=True)
   order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
   amount = db.Column(db.Float, nullable=False)
   payment_method = db.Column(db.String(50), nullable=False)
   transaction_id = db.Column(db.String(100), unique=True)
   transaction_data = db.Column(db.JSON)
   status = db.Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
   created_at = db.Column(db.DateTime, default=func.now())
   completed_at = db.Column(db.DateTime)

   def __repr__(self):
       return f"<Payment {self.id} for Order {self.order_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'order_id': self.order_id,
           'amount': self.amount,
           'payment_method': self.payment_method,
           'transaction_id': self.transaction_id,
           'status': self.status.value,
           'created_at': self.created_at.isoformat(),
           'completed_at': self.completed_at.isoformat() if self.completed_at else None
       }

# Add ShippingMethod and ShippingZone models that are referenced in the Cart model

# ----------------------
# ShippingZone Model
# ----------------------
class ShippingZone(db.Model):
   __tablename__ = 'shipping_zones'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   country = db.Column(db.String(100), nullable=False)
   all_regions = db.Column(db.Boolean, default=False)
   available_regions = db.Column(db.Text)  # Comma-separated list of regions/states
   min_order_value = db.Column(db.Float)
   is_active = db.Column(db.Boolean, default=True)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   # Relationships
   shipping_methods = db.relationship('ShippingMethod', backref='shipping_zone', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f"<ShippingZone {self.name} for {self.country}>"

   def to_dict(self):
       return {
           'id': self.id,
           'name': self.name,
           'country': self.country,
           'all_regions': self.all_regions,
           'available_regions': self.available_regions.split(',') if self.available_regions else [],
           'min_order_value': self.min_order_value,
           'is_active': self.is_active
       }

# ----------------------
# ShippingMethod Model
# ----------------------
class ShippingMethod(db.Model):
   __tablename__ = 'shipping_methods'

   id = db.Column(db.Integer, primary_key=True)
   shipping_zone_id = db.Column(db.Integer, db.ForeignKey('shipping_zones.id'), nullable=False)
   name = db.Column(db.String(100), nullable=False)
   description = db.Column(db.Text)
   cost = db.Column(db.Float, nullable=False)
   min_order_value = db.Column(db.Float)
   max_weight = db.Column(db.Float)
   estimated_days = db.Column(db.String(50))  # e.g., "3-5 days"
   is_active = db.Column(db.Boolean, default=True)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   def __repr__(self):
       return f"<ShippingMethod {self.name} for Zone {self.shipping_zone_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'shipping_zone_id': self.shipping_zone_id,
           'name': self.name,
           'description': self.description,
           'cost': self.cost,
           'min_order_value': self.min_order_value,
           'max_weight': self.max_weight,
           'estimated_days': self.estimated_days,
           'is_active': self.is_active
       }

# ----------------------
# PaymentMethod Model
# ----------------------
class PaymentMethod(db.Model):
   __tablename__ = 'payment_methods'

   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   code = db.Column(db.String(50), nullable=False, unique=True)
   description = db.Column(db.Text)
   instructions = db.Column(db.Text)
   min_amount = db.Column(db.Float)
   max_amount = db.Column(db.Float)
   countries = db.Column(db.Text)  # Comma-separated list of country codes
   is_active = db.Column(db.Boolean, default=True)
   created_at = db.Column(db.DateTime, default=func.now())
   updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

   def __repr__(self):
       return f"<PaymentMethod {self.name}>"

   def to_dict(self):
       return {
           'id': self.id,
           'name': self.name,
           'code': self.code,
           'description': self.description,
           'instructions': self.instructions,
           'min_amount': self.min_amount,
           'max_amount': self.max_amount,
           'countries': self.countries.split(',') if self.countries else [],
           'is_active': self.is_active
       }

   def is_available_in_country(self, country_code):
       """Check if payment method is available in the specified country."""
       if not self.countries:
           return True  # Available in all countries if not specified

       country_list = self.countries.split(',')
       return country_code in country_list

# Add Inventory and ProductCompatibility models that are referenced in the cart validation

# ----------------------
# Inventory Model
# ----------------------
class Inventory(db.Model):
   __tablename__ = 'inventory'

   id = db.Column(db.Integer, primary_key=True)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
   variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'), nullable=True, index=True)
   stock_level = db.Column(db.Integer, default=0)
   reserved_quantity = db.Column(db.Integer, default=0)
   reorder_level = db.Column(db.Integer, default=5)
   low_stock_threshold = db.Column(db.Integer, default=5)
   sku = db.Column(db.String(100))
   location = db.Column(db.String(100))
   status = db.Column(db.String(20), default='active')  # 'active', 'out_of_stock', 'discontinued'
   last_updated = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
   created_at = db.Column(db.DateTime, default=func.now())

   # Relationships
   product = db.relationship('Product')
   variant = db.relationship('ProductVariant')

   __table_args__ = (
       db.UniqueConstraint('product_id', 'variant_id', name='uix_inventory_product_variant'),
   )

   def __repr__(self):
       return f"<Inventory for Product {self.product_id} Variant {self.variant_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'product_id': self.product_id,
           'variant_id': self.variant_id,
           'stock_level': self.stock_level,
           'reserved_quantity': self.reserved_quantity,
           'available_quantity': self.stock_level - self.reserved_quantity,
           'reorder_level': self.reorder_level,
           'low_stock_threshold': self.low_stock_threshold,
           'sku': self.sku,
           'location': self.location,
           'status': self.status,
           'last_updated': self.last_updated.isoformat() if self.last_updated else None,
           'created_at': self.created_at.isoformat() if self.created_at else None
       }

   @property
   def available_quantity(self):
       """Calculate the available quantity (stock_level minus reserved_quantity)"""
       return max(0, self.stock_level - self.reserved_quantity)

   def is_in_stock(self):
       """Check if the product is in stock"""
       return self.available_quantity > 0

   def is_low_stock(self):
       """Check if the product is low in stock"""
       return 0 < self.available_quantity <= self.low_stock_threshold

   def update_status(self):
       """Update the status based on stock level"""
       if self.available_quantity <= 0:
           self.status = 'out_of_stock'
       else:
           self.status = 'active'
       return self.status

   def reserve_stock(self, quantity):
       """Reserve stock for a pending order"""
       if quantity <= 0:
           return False

       if quantity > self.available_quantity:
           return False

       self.reserved_quantity += quantity
       self.update_status()
       return True

   def release_stock(self, quantity):
       """Release previously reserved stock"""
       if quantity <= 0:
           return False

       self.reserved_quantity = max(0, self.reserved_quantity - quantity)
       self.update_status()
       return True

   def reduce_stock(self, quantity):
       """Reduce stock level (e.g., after a completed order)"""
       if quantity <= 0:
           return False

       if quantity > self.stock_level:
           return False

       self.stock_level -= quantity
       self.update_status()
       return True

   def increase_stock(self, quantity):
       """Increase stock level (e.g., after restocking)"""
       if quantity <= 0:
           return False

       self.stock_level += quantity
       self.update_status()
       return True

# ----------------------
# ProductCompatibility Model
# ----------------------
class ProductCompatibility(db.Model):
   __tablename__ = 'product_compatibility'

   id = db.Column(db.Integer, primary_key=True)
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   incompatible_product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
   required_product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
   is_incompatible = db.Column(db.Boolean, default=False)
   is_required = db.Column(db.Boolean, default=False)
   notes = db.Column(db.Text)

   # Relationships
   product = db.relationship('Product', foreign_keys=[product_id])
   incompatible_product = db.relationship('Product', foreign_keys=[incompatible_product_id])
   required_product = db.relationship('Product', foreign_keys=[required_product_id])

   def __repr__(self):
       if self.is_incompatible:
           return f"<Product {self.product_id} is incompatible with {self.incompatible_product_id}>"
       elif self.is_required:
           return f"<Product {self.product_id} requires {self.required_product_id}>"
       else:
           return f"<ProductCompatibility {self.id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'product_id': self.product_id,
           'incompatible_product_id': self.incompatible_product_id,
           'required_product_id': self.required_product_id,
           'is_incompatible': self.is_incompatible,
           'is_required': self.is_required,
           'notes': self.notes
       }

# ----------------------
# InventoryReservation Model
# ----------------------
class InventoryReservation(db.Model):
   __tablename__ = 'inventory_reservations'

   id = db.Column(db.Integer, primary_key=True)
   cart_id = db.Column(db.Integer, db.ForeignKey('carts.id'), nullable=False)
   user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Nullable for guest users
   product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
   variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'), nullable=True)
   quantity = db.Column(db.Integer, nullable=False)
   status = db.Column(SQLEnum(ReservationStatus), default=ReservationStatus.ACTIVE, nullable=False)
   created_at = db.Column(db.DateTime, default=func.now())
   expires_at = db.Column(db.DateTime, nullable=False)

   # Relationships
   product = db.relationship('Product')
   variant = db.relationship('ProductVariant')

   def __repr__(self):
       return f"<InventoryReservation {self.id} for Product {self.product_id}>"

   def to_dict(self):
       return {
           'id': self.id,
           'cart_id': self.cart_id,
           'user_id': self.user_id,
           'product_id': self.product_id,
           'variant_id': self.variant_id,
           'quantity': self.quantity,
           'status': self.status.value,
           'created_at': self.created_at.isoformat() if self.created_at else None,
           'expires_at': self.expires_at.isoformat() if self.expires_at else None
       }

   def is_expired(self):
       """Check if the reservation has expired."""
       return datetime.utcnow() > self.expires_at
