from app import create_app, db
from app.models import (
    User, Category, Brand, Product, ProductVariant,
    Order, OrderItem, CartItem, WishlistItem, Review,
    Coupon, Newsletter, Payment
)
from datetime import datetime, timedelta, UTC
import json

def seed_database():
    """Seed the database with initial data"""

    print("Starting database seeding...")

    # First, clear existing data in the correct order
    print("Clearing existing data...")
    try:
        # Delete in order of dependencies
        Payment.query.delete()
        OrderItem.query.delete()
        Order.query.delete()
        CartItem.query.delete()
        WishlistItem.query.delete()
        Review.query.delete()
        ProductVariant.query.delete()
        Product.query.delete()
        Category.query.delete()
        Brand.query.delete()
        Coupon.query.delete()
        Newsletter.query.delete()
        User.query.delete()

        db.session.commit()
        print("Existing data cleared successfully")
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing data: {str(e)}")
        raise

    # Create test admin user
    print("Creating admin user...")
    admin_user = User(
        name="Admin User",
        email="admin@mizizzi.com",
        role="admin",
        is_active=True
    )
    admin_user.set_password("admin123")
    db.session.add(admin_user)

    # Create brands
    print("Creating brands...")
    brands = [
        {
            "name": "Nike",
            "slug": "nike",
            "description": "Just Do It",
            "logo_url": "/brands/nike-logo.png",
            "website": "https://www.nike.com",
            "is_featured": True
        },
        {
            "name": "Adidas",
            "slug": "adidas",
            "description": "Impossible is Nothing",
            "logo_url": "/brands/adidas-logo.png",
            "website": "https://www.adidas.com",
            "is_featured": True
        },
        {
            "name": "Puma",
            "slug": "puma",
            "description": "Forever Faster",
            "logo_url": "/brands/puma-logo.png",
            "website": "https://www.puma.com",
            "is_featured": True
        }
    ]

    created_brands = {}
    for brand_data in brands:
        brand = Brand(**brand_data)
        db.session.add(brand)
        db.session.flush()
        created_brands[brand.slug] = brand

    # Create categories
    print("Creating categories...")
    categories = [
        {
            "name": "Men",
            "slug": "men",
            "description": "Men's Fashion Collection",
            "image_url": "/categories/men.jpg",
            "banner_url": "/categories/men-banner.jpg",
            "is_featured": True,
            "subcategories": [
                {
                    "name": "Clothing",
                    "slug": "men-clothing",
                    "description": "Men's Clothing Collection",
                    "image_url": "/categories/men-clothing.jpg",
                    "subcategories": [
                        {
                            "name": "T-Shirts",
                            "slug": "men-tshirts",
                            "description": "Men's T-Shirts Collection",
                            "image_url": "/categories/men-tshirts.jpg"
                        },
                        {
                            "name": "Shirts",
                            "slug": "men-shirts",
                            "description": "Men's Shirts Collection",
                            "image_url": "/categories/men-shirts.jpg"
                        },
                        {
                            "name": "Pants",
                            "slug": "men-pants",
                            "description": "Men's Pants Collection",
                            "image_url": "/categories/men-pants.jpg"
                        }
                    ]
                },
                {
                    "name": "Shoes",
                    "slug": "men-shoes",
                    "description": "Men's Shoes Collection",
                    "image_url": "/categories/men-shoes.jpg",
                    "subcategories": [
                        {
                            "name": "Sneakers",
                            "slug": "men-sneakers",
                            "description": "Men's Sneakers Collection",
                            "image_url": "/categories/men-sneakers.jpg"
                        },
                        {
                            "name": "Formal",
                            "slug": "men-formal-shoes",
                            "description": "Men's Formal Shoes Collection",
                            "image_url": "/categories/men-formal-shoes.jpg"
                        }
                    ]
                }
            ]
        },
        {
            "name": "Women",
            "slug": "women",
            "description": "Women's Fashion Collection",
            "image_url": "/categories/women.jpg",
            "banner_url": "/categories/women-banner.jpg",
            "is_featured": True,
            "subcategories": [
                {
                    "name": "Clothing",
                    "slug": "women-clothing",
                    "description": "Women's Clothing Collection",
                    "image_url": "/categories/women-clothing.jpg",
                    "subcategories": [
                        {
                            "name": "Dresses",
                            "slug": "women-dresses",
                            "description": "Women's Dresses Collection",
                            "image_url": "/categories/women-dresses.jpg"
                        },
                        {
                            "name": "Tops",
                            "slug": "women-tops",
                            "description": "Women's Tops Collection",
                            "image_url": "/categories/women-tops.jpg"
                        },
                        {
                            "name": "Pants",
                            "slug": "women-pants",
                            "description": "Women's Pants Collection",
                            "image_url": "/categories/women-pants.jpg"
                        }
                    ]
                },
                {
                    "name": "Shoes",
                    "slug": "women-shoes",
                    "description": "Women's Shoes Collection",
                    "image_url": "/categories/women-shoes.jpg",
                    "subcategories": [
                        {
                            "name": "Sneakers",
                            "slug": "women-sneakers",
                            "description": "Women's Sneakers Collection",
                            "image_url": "/categories/women-sneakers.jpg"
                        },
                        {
                            "name": "Heels",
                            "slug": "women-heels",
                            "description": "Women's Heels Collection",
                            "image_url": "/categories/women-heels.jpg"
                        }
                    ]
                }
            ]
        }
    ]

    created_categories = {}

    def create_category(category_data, parent=None):
        subcategories = category_data.pop('subcategories', [])
        category = Category(**category_data)
        if parent:
            category.parent_id = parent.id
        db.session.add(category)
        db.session.flush()
        created_categories[category.slug] = category

        for subcategory_data in subcategories:
            create_category(subcategory_data, category)

    for category_data in categories:
        create_category(category_data)

    # Create products
    print("Creating products...")
    products = [
        {
            "name": "Nike Dri-FIT Running T-Shirt",
            "slug": "nike-dri-fit-running-tshirt",
            "description": "Stay cool and dry during your runs with this Nike Dri-FIT technology t-shirt.",
            "price": 29.99,
            "sale_price": 24.99,
            "stock": 100,
            "category_slug": "men-tshirts",
            "brand_slug": "nike",
            "image_urls": [
                "/products/nike-dri-fit-1.jpg",
                "/products/nike-dri-fit-2.jpg",
                "/products/nike-dri-fit-3.jpg"
            ],
            "thumbnail_url": "/products/nike-dri-fit-thumb.jpg",
            "sku": "NK-TS-001",
            "weight": 0.2,
            "dimensions": {
                "length": 30,
                "width": 20,
                "height": 2
            },
            "is_featured": True,
            "is_new": True,
            "is_sale": True,
            "meta_title": "Nike Dri-FIT Running T-Shirt | MIZIZZI",
            "meta_description": "Stay cool and dry during your runs with this Nike Dri-FIT technology t-shirt.",
            "variants": [
                {
                    "sku": "NK-TS-001-BL-S",
                    "color": "Black",
                    "size": "S",
                    "stock": 20,
                    "price": 29.99
                },
                {
                    "sku": "NK-TS-001-BL-M",
                    "color": "Black",
                    "size": "M",
                    "stock": 30,
                    "price": 29.99
                },
                {
                    "sku": "NK-TS-001-BL-L",
                    "color": "Black",
                    "size": "L",
                    "stock": 25,
                    "price": 29.99
                }
            ]
        }
    ]

    for product_data in products:
        variants = product_data.pop('variants', [])
        category_slug = product_data.pop('category_slug')
        brand_slug = product_data.pop('brand_slug', None)

        category = created_categories.get(category_slug)
        if not category:
            raise ValueError(f"Category with slug {category_slug} not found")
        product_data['category_id'] = category.id

        if brand_slug:
            brand = created_brands.get(brand_slug)
            if not brand:
                raise ValueError(f"Brand with slug {brand_slug} not found")
            product_data['brand_id'] = brand.id

        product = Product(**product_data)
        db.session.add(product)
        db.session.flush()

        for variant_data in variants:
            variant = ProductVariant(product_id=product.id, **variant_data)
            db.session.add(variant)

    # Create coupons
    print("Creating coupons...")
    coupons = [
        {
            "code": "WELCOME10",
            "type": "percentage",
            "value": 10.0,
            "min_purchase": 50.0,
            "start_date": datetime.now(UTC),
            "end_date": datetime.now(UTC) + timedelta(days=30),
            "usage_limit": 100,
            "is_active": True
        }
    ]

    for coupon_data in coupons:
        coupon = Coupon(**coupon_data)
        db.session.add(coupon)

    try:
        print("Committing changes to database...")
        db.session.commit()
        print("Database seeded successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"Error seeding database: {str(e)}")
        raise

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        seed_database()