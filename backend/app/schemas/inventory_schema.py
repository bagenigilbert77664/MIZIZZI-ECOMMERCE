"""
Inventory schemas for Mizizzi E-commerce platform.
"""
from marshmallow import Schema, fields, post_dump
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from ..configuration.extensions import ma
from ..models.models import Inventory, Product, ProductVariant

class InventorySchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Inventory
        include_fk = True

    # Add calculated fields
    available_quantity = fields.Method("get_available_quantity")
    is_in_stock = fields.Method("get_is_in_stock")
    is_low_stock = fields.Method("get_is_low_stock")
    product_name = fields.Method("get_product_name")
    product_sku = fields.Method("get_product_sku")
    variant_info = fields.Method("get_variant_info")

    def get_available_quantity(self, obj):
        return max(0, obj.stock_level - obj.reserved_quantity)

    def get_is_in_stock(self, obj):
        return obj.available_quantity > 0

    def get_is_low_stock(self, obj):
        return 0 < obj.available_quantity <= obj.low_stock_threshold

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
        return None

    def get_product_sku(self, obj):
        if obj.product:
            return obj.product.sku
        return None

    def get_variant_info(self, obj):
        if obj.variant:
            return {
                "id": obj.variant.id,
                "color": obj.variant.color,
                "size": obj.variant.size,
                "sku": obj.variant.sku
            }
        return None

inventory_schema = InventorySchema()
inventories_schema = InventorySchema(many=True)
