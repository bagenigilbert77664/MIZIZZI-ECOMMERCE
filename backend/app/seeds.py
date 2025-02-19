# seeds.py
import os
import uuid
import json
from datetime import datetime
from slugify import slugify
from app import create_app
from app.extensions import db
from app.models import (
    Category, Brand, Product, ProductVariant, Order, OrderItem, CartItem,
    WishlistItem, Review, Coupon, Payment, User
)

# Create and push an application context
app = create_app()
app.app_context().push()

def clear_data():
    """Clear product, category, and brand data."""
    # Order is important if there are foreign key constraints
    db.session.query(ProductVariant).delete()
    db.session.query(Product).delete()
    db.session.query(Brand).delete()
    db.session.query(Category).delete()
    db.session.commit()
    print("Existing product data cleared.")

def seed_categories():
    """Seed main product categories."""
    jewelry = Category(
        name="Jewelry",
        slug="jewelry",
        description="Beautiful jewelry pieces",
        is_featured=True
    )
    fashion = Category(
        name="Fashion",
        slug="fashion",
        description="Stylish and trendy clothing and accessories",
        is_featured=True
    )
    accessories = Category(
        name="Accessories",
        slug="accessories",
        description="Fashionable accessories to complete your look",
        is_featured=True
    )
    db.session.add_all([jewelry, fashion, accessories])
    db.session.commit()
    print("Categories seeded.")
    return {"jewelry": jewelry, "fashion": fashion, "accessories": accessories}

def seed_brands():
    """Seed some sample brands."""
    luxury_brand = Brand(
        name="Luxury Brand",
        slug="luxury-brand",
        description="High-end luxury products",
        is_featured=True
    )
    fashion_brand = Brand(
        name="Fashion Brand",
        slug="fashion-brand",
        description="Trendy and affordable fashion",
        is_featured=False
    )
    db.session.add_all([luxury_brand, fashion_brand])
    db.session.commit()
    print("Brands seeded.")
    return {"luxury": luxury_brand, "fashion": fashion_brand}

def seed_flash_sales_products(categories, brands):
    """Seed flash sales products."""
    flash_products = [
        {
            "name": "18K Gold Plated Crystal Necklace",
            "price": 4999,            # original price
            "sale_price": 1999,         # flash sale price
            "stock": 50,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=300&h=225&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=300&h=225&q=80",
            "is_sale": True,
            "is_featured": False,
            "meta_title": "18K Gold Plated Crystal Necklace",
            "meta_description": "Flash Sale: Limited time offer on 18K Gold Plated Crystal Necklace."
        },
        {
            "name": "Sterling Silver Diamond Stud Earrings",
            "price": 5999,
            "sale_price": 2999,
            "stock": 30,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&h=225&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&h=225&q=80",
            "is_sale": True,
            "is_featured": False,
            "meta_title": "Sterling Silver Diamond Stud Earrings",
            "meta_description": "Flash Sale: Save big on Sterling Silver Diamond Stud Earrings."
        },
        {
            "name": "Floral Summer Maxi Dress",
            "price": 2999,
            "sale_price": 1499,
            "stock": 100,
            "category": "fashion",
            "brand": "fashion",
            "image_urls": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=300&h=225&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=300&h=225&q=80",
            "is_sale": True,
            "is_featured": False,
            "meta_title": "Floral Summer Maxi Dress",
            "meta_description": "Flash Sale: Get this Floral Summer Maxi Dress at an unbeatable price."
        },
        {
            "name": "Pearl Drop Necklace Set",
            "price": 7999,
            "sale_price": 3999,
            "stock": 40,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=300&h=225&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=300&h=225&q=80",
            "is_sale": True,
            "is_featured": False,
            "meta_title": "Pearl Drop Necklace Set",
            "meta_description": "Flash Sale: Exclusive offer on Pearl Drop Necklace Set."
        },
        {
            "name": "Elegant Evening Gown",
            "price": 9999,
            "sale_price": 4999,
            "stock": 75,
            "category": "fashion",
            "brand": "fashion",
            "image_urls": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&h=225&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&h=225&q=80",
            "is_sale": True,
            "is_featured": False,
            "meta_title": "Elegant Evening Gown",
            "meta_description": "Flash Sale: Elegant Evening Gown now available at a discount."
        },
        {
            "name": "Rose Gold Bracelet Set",
            "price": 4999,
            "sale_price": 2499,
            "stock": 60,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=300&h=225&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=300&h=225&q=80",
            "is_sale": True,
            "is_featured": False,
            "meta_title": "Rose Gold Bracelet Set",
            "meta_description": "Flash Sale: Save on Rose Gold Bracelet Set."
        },
    ]
    for prod in flash_products:
        product = Product(
            name=prod["name"],
            slug=slugify(prod["name"]),
            description=prod.get("meta_description", ""),
            price=prod["price"],
            sale_price=prod["sale_price"],
            stock=prod["stock"],
            category_id=categories[prod["category"]].id,
            brand_id=brands[prod["brand"]].id,
            image_urls=prod["image_urls"],
            thumbnail_url=prod["thumbnail_url"],
            sku=f"SKU-{uuid.uuid4().hex[:8]}",
            weight=0.5,  # example weight
            dimensions=json.dumps({"length": 10, "width": 5, "height": 2}),
            is_sale=prod["is_sale"],
            is_featured=prod["is_featured"],
            meta_title=prod["meta_title"],
            meta_description=prod["meta_description"],
        )
        db.session.add(product)
    db.session.commit()
    print("Flash sales products seeded.")

def seed_luxury_deals_products(categories, brands):
    """Seed luxury deals products."""
    luxury_products = [
        {
            "name": "Diamond Tennis Bracelet",
            "price": 299999,
            "sale_price": 99999,
            "stock": 20,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=300&h=300&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=300&h=300&q=80",
            "is_sale": True,
            "is_featured": True,
            "meta_title": "Diamond Tennis Bracelet",
            "meta_description": "Luxury Deal: Save up to 67% on our Diamond Tennis Bracelet."
        },
        {
            "name": "Sapphire and Diamond Ring",
            "price": 249999,
            "sale_price": 79999,
            "stock": 15,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&h=300&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&h=300&q=80",
            "is_sale": True,
            "is_featured": True,
            "meta_title": "Sapphire and Diamond Ring",
            "meta_description": "Luxury Deal: Save up to 68% on Sapphire and Diamond Ring."
        },
        {
            "name": "Pearl Drop Necklace",
            "price": 149999,
            "sale_price": 44999,
            "stock": 25,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&h=300&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&h=300&q=80",
            "is_sale": True,
            "is_featured": True,
            "meta_title": "Pearl Drop Necklace",
            "meta_description": "Luxury Deal: Save up to 70% on Pearl Drop Necklace."
        },
        {
            "name": "Designer Evening Gown",
            "price": 299999,
            "sale_price": 89999,
            "stock": 10,
            "category": "fashion",
            "brand": "fashion",
            "image_urls": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&h=300&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&h=300&q=80",
            "is_sale": True,
            "is_featured": True,
            "meta_title": "Designer Evening Gown",
            "meta_description": "Luxury Deal: Save up to 70% on Designer Evening Gown."
        },
        {
            "name": "Crystal Chandelier Earrings",
            "price": 99999,
            "sale_price": 34999,
            "stock": 12,
            "category": "jewelry",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&h=300&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&h=300&q=80",
            "is_sale": True,
            "is_featured": True,
            "meta_title": "Crystal Chandelier Earrings",
            "meta_description": "Luxury Deal: Save up to 65% on Crystal Chandelier Earrings."
        },
        {
            "name": "Gold Link Watch",
            "price": 499999,
            "sale_price": 149999,
            "stock": 8,
            "category": "accessories",
            "brand": "luxury",
            "image_urls": [
                "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=300&h=300&q=80"
            ],
            "thumbnail_url": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=300&h=300&q=80",
            "is_sale": True,
            "is_featured": True,
            "meta_title": "Gold Link Watch",
            "meta_description": "Luxury Deal: Save up to 70% on Gold Link Watch."
        },
    ]
    for prod in luxury_products:
        product = Product(
            name=prod["name"],
            slug=slugify(prod["name"]),
            description=prod.get("meta_description", ""),
            price=prod["price"],
            sale_price=prod["sale_price"],
            stock=prod["stock"],
            category_id=categories[prod["category"]].id,
            brand_id=brands[prod["brand"]].id,
            image_urls=prod["image_urls"],
            thumbnail_url=prod["thumbnail_url"],
            sku=f"SKU-{uuid.uuid4().hex[:8]}",
            weight=1.0,
            dimensions=json.dumps({"length": 20, "width": 10, "height": 5}),
            is_sale=prod["is_sale"],
            is_featured=prod["is_featured"],
            meta_title=prod["meta_title"],
            meta_description=prod["meta_description"],
        )
        db.session.add(product)
    db.session.commit()
    print("Luxury deals products seeded.")

def seed_all():
    """Run all seed functions."""
    clear_data()
    categories_dict = seed_categories()
    brands_dict = seed_brands()
    seed_flash_sales_products(categories_dict, brands_dict)
    seed_luxury_deals_products(categories_dict, brands_dict)
    print("Seeding complete.")

if __name__ == '__main__':
    seed_all()
