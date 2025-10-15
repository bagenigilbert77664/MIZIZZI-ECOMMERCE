"""
Inventory schema for serialization and deserialization.
"""
from marshmallow import Schema, fields, post_load
from datetime import datetime


class InventorySchema(Schema):
    """Schema for inventory serialization."""

    id = fields.Integer(dump_only=True)
    product_id = fields.Integer(required=True)
    variant_id = fields.Integer(allow_none=True)
    stock_level = fields.Integer(required=True)
    reserved_quantity = fields.Integer(default=0)
    available_quantity = fields.Integer(dump_only=True)
    reorder_level = fields.Integer(default=5)
    low_stock_threshold = fields.Integer(default=10)
    sku = fields.String(required=True)
    location = fields.String(allow_none=True)
    status = fields.String(dump_default='active')
    notes = fields.String(allow_none=True)
    last_updated = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

    # Additional computed fields
    is_in_stock = fields.Boolean(dump_only=True)
    is_low_stock = fields.Boolean(dump_only=True)

    @post_load
    def make_inventory(self, data, **kwargs):
        """Create inventory object from validated data."""
        return data


class InventoryUpdateSchema(Schema):
    """Schema for inventory updates."""

    stock_level = fields.Integer()
    reserved_quantity = fields.Integer()
    reorder_level = fields.Integer()
    low_stock_threshold = fields.Integer()
    location = fields.String()
    status = fields.String()
    notes = fields.String()


class InventoryReservationSchema(Schema):
    """Schema for inventory reservations."""

    product_id = fields.Integer(required=True)
    variant_id = fields.Integer(allow_none=True)
    quantity = fields.Integer(required=True)
    reservation_id = fields.String(allow_none=True)
    expires_at = fields.DateTime(allow_none=True)


class InventoryAvailabilitySchema(Schema):
    """Schema for inventory availability checks."""

    product_id = fields.Integer(required=True)
    variant_id = fields.Integer(allow_none=True)
    requested_quantity = fields.Integer(default=1)
    available_quantity = fields.Integer(dump_only=True)
    is_available = fields.Boolean(dump_only=True)
    can_fulfill = fields.Boolean(dump_only=True)
    status = fields.String(dump_only=True)
    is_low_stock = fields.Boolean(dump_only=True)
    last_updated = fields.DateTime(dump_only=True)


class CartValidationItemSchema(Schema):
    """Schema for cart validation items."""

    product_id = fields.Integer(required=True)
    variant_id = fields.Integer(allow_none=True)
    quantity = fields.Integer(required=True)


class CartValidationSchema(Schema):
    """Schema for cart validation."""

    items = fields.List(fields.Nested(CartValidationItemSchema), required=True)
    cart_id = fields.Integer(allow_none=True)
    guest_cart_id = fields.String(allow_none=True)


class BatchAvailabilityItemSchema(Schema):
    """Schema for batch availability check items."""

    product_id = fields.Integer(required=True)
    variant_id = fields.Integer(allow_none=True)
    quantity = fields.Integer(default=1)


class BatchAvailabilitySchema(Schema):
    """Schema for batch availability checks."""

    items = fields.List(fields.Nested(BatchAvailabilityItemSchema), required=True)


class InventoryTransactionSchema(Schema):
    """Schema for inventory transactions."""

    id = fields.Integer(dump_only=True)
    inventory_id = fields.Integer(required=True)
    transaction_type = fields.String(required=True)  # 'order', 'adjustment', 'return', etc.
    quantity = fields.Integer(required=True)
    previous_level = fields.Integer(required=True)
    new_level = fields.Integer(required=True)
    reference_id = fields.String(allow_none=True)  # Order ID, adjustment ID, etc.
    notes = fields.String(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    created_by = fields.Integer(allow_none=True)


# Schema instances for use in routes
inventory_schema = InventorySchema()
inventories_schema = InventorySchema(many=True)
inventory_update_schema = InventoryUpdateSchema()
inventory_reservation_schema = InventoryReservationSchema()
inventory_availability_schema = InventoryAvailabilitySchema()
cart_validation_schema = CartValidationSchema()
batch_availability_schema = BatchAvailabilitySchema()
inventory_transaction_schema = InventoryTransactionSchema()
inventory_transactions_schema = InventoryTransactionSchema(many=True)
