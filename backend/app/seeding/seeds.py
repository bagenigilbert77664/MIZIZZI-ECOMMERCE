from backend.app import create_app
from backend.app.configuration.extensions import db
from backend.app.models.models import (
    User, Category, Brand, Product, ProductVariant, ProductImage,
    UserRole, CouponType, Coupon, Newsletter, CartItem, Cart,
    ShippingMethod, ShippingZone, PaymentMethod, Address, AddressType,
    Review, Inventory, ProductCompatibility, Promotion
)
from datetime import datetime, timedelta
import random

def seed_database():
    print("Starting database seeding...")

    # Clear existing data in reverse order of dependencies
    db.session.query(ProductCompatibility).delete()
    db.session.query(Inventory).delete()
    db.session.query(CartItem).delete()
    db.session.query(Cart).delete()
    db.session.query(ProductVariant).delete()
    db.session.query(ProductImage).delete()
    db.session.query(Review).delete()
    db.session.query(Product).delete()
    db.session.query(Brand).delete()
    db.session.query(Category).delete()
    db.session.query(Coupon).delete()
    db.session.query(Promotion).delete()
    db.session.query(Newsletter).delete()
    db.session.query(PaymentMethod).delete()
    db.session.query(ShippingMethod).delete()
    db.session.query(ShippingZone).delete()
    db.session.query(Address).delete()
    db.session.query(User).delete()
    db.session.commit()

    # Create users
    print("Creating users...")
    admin = User(
        name="Admin User",
        email="mizizzi@gmail.com",
        role=UserRole.ADMIN,
        phone="+254700000000",
        address={"street": "123 Admin St", "city": "Nairobi", "country": "Kenya"},
        avatar_url="/https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=600",
        is_active=True,
        created_at=datetime.now(),
        last_login=datetime.now()
    )
    admin.set_password("junior2020")
    db.session.add(admin)

    user = User(
        name="Gilbert Bageni",
        email="gilbert@example.com",
        role=UserRole.USER,
        phone="+254700000001",
        address={"street": "456 User St", "city": "Nairobi", "country": "Kenya"},
        avatar_url="/https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=600",
        is_active=True,
        created_at=datetime.now(),
        last_login=datetime.now()
    )
    user.set_password("password123")
    db.session.add(user)

    moderator = User(
        name="Moderator User",
        email="moderator@mizizzi.com",
        role=UserRole.MODERATOR,
        phone="+254700000002",
        address={"street": "789 Mod St", "city": "Nairobi", "country": "Kenya"},
        avatar_url="/placeholder.svg?height=200&width=200",
        is_active=True,
        created_at=datetime.now(),
        last_login=datetime.now()
    )
    moderator.set_password("moderator123")
    db.session.add(moderator)

    # Add more regular users
    for i in range(1, 6):
        regular_user = User(
            name=f"User {i}",
            email=f"user{i}@example.com",
            role=UserRole.USER,
            phone=f"+25470000{1000+i}",
            address={"street": f"{i*100} User St", "city": "Nairobi", "country": "Kenya"},
            avatar_url=f"/placeholder.svg?height=200&width=200&query=user{i}",
            is_active=True,
            created_at=datetime.now(),
            last_login=datetime.now()
        )
        regular_user.set_password(f"password{i}")
        db.session.add(regular_user)

    db.session.commit()
    print("Users created successfully")

    # Create addresses for users
    print("Creating addresses...")
    user_ids = [u.id for u in User.query.all()]

    for user_id in user_ids:
        # Shipping address
        shipping_address = Address(
            user_id=user_id,
            first_name="First",
            last_name="Last",
            address_line1=f"{random.randint(100, 999)} Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code=f"{random.randint(10000, 99999)}",
            country="Kenya",
            phone=f"+2547{random.randint(1000000, 9999999)}",
            address_type=AddressType.SHIPPING,
            is_default=True,
            created_at=datetime.now()
        )
        db.session.add(shipping_address)

        # Billing address
        billing_address = Address(
            user_id=user_id,
            first_name="First",
            last_name="Last",
            address_line1=f"{random.randint(100, 999)} Billing St",
            city="Nairobi",
            state="Nairobi",
            postal_code=f"{random.randint(10000, 99999)}",
            country="Kenya",
            phone=f"+2547{random.randint(1000000, 9999999)}",
            address_type=AddressType.BILLING,
            is_default=True,
            created_at=datetime.now()
        )
        db.session.add(billing_address)

    db.session.commit()
    print("Addresses created successfully")

    # Create categories
    print("Creating categories...")
    categories = [
        {
            "name": "Jewelry",
            "slug": "jewelry",
            "description": "Exquisite jewelry pieces including necklaces, earrings, bracelets, and rings",
            "image_url": "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1200&h=300&fit=crop",
            "is_featured": True
        },
        {
            "name": "Fashion",
            "slug": "fashion",
            "description": "Trendy fashion items including dresses, tops, bottoms, and outerwear",
            "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=300&fit=crop",
            "is_featured": True
        },
        {
            "name": "Home & Living",
            "slug": "home-living",
            "description": "Modern home decor, furniture, kitchenware, and bedding for contemporary living",
            "image_url": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&h=300&fit=crop",
            "is_featured": True
        },
        {
            "name": "Beauty & Personal Care",
            "slug": "beauty-personal-care",
            "description": "High-quality skincare, makeup, fragrances, and personal care essentials",
            "image_url": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&h=300&fit=crop",
            "is_featured": True
        },
        {
            "name": "Sports & Fitness",
            "slug": "sports-fitness",
            "description": "Premium sports equipment, activewear, and fitness accessories for active lifestyles",
            "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=300&fit=crop",
            "is_featured": True
        },
        {
            "name": "Accessories",
            "slug": "accessories",
            "description": "Stylish accessories including bags, shoes, watches, and sunglasses",
            "image_url": "https://images.unsplash.com/photo-1523779105320-d1cd346ff52b?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1523779105320-d1cd346ff52b?w=1200&h=300&fit=crop",
            "is_featured": True
        },
        {
            "name": "Electronics",
            "slug": "electronics",
            "description": "Cutting-edge electronics including earbuds, speakers, and smart devices",
            "image_url": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&h=300&fit=crop",
            "is_featured": False
        }
    ]

    # Subcategories
    subcategories = [
        {
            "name": "Watches",
            "slug": "watches",
            "description": "Stylish and functional watches for all occasions",
            "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "accessories"
        },
        {
            "name": "Necklaces",
            "slug": "necklaces",
            "description": "Elegant necklaces for all occasions",
            "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "jewelry"
        },
        {
            "name": "Earrings",
            "slug": "earrings",
            "description": "Beautiful earrings for all occasions",
            "image_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "jewelry"
        },
        {
            "name": "Sunglasses",
            "slug": "sunglasses",
            "description": "Stylish sunglasses for all occasions",
            "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "accessories"
        },
        {
            "name": "Bracelets",
            "slug": "bracelets",
            "description": "Elegant bracelets for all occasions",
            "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "jewelry"
        },
        {
            "name": "Rings",
            "slug": "rings",
            "description": "Beautiful rings for all occasions",
            "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "jewelry"
        },
        {
            "name": "Dresses",
            "slug": "dresses",
            "description": "Elegant dresses for all occasions",
            "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "fashion"
        },
        {
            "name": "Bags",
            "slug": "bags",
            "description": "Stylish and functional bags for all occasions",
            "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "accessories"
        },
        {
            "name": "Shoes",
            "slug": "shoes",
            "description": "Stylish and comfortable shoes for all occasions",
            "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "fashion"
        },
        {
            "name": "Activewear",
            "slug": "activewear",
            "description": "Performance clothing for sports and fitness activities",
            "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "sports-fitness"
        },
        {
            "name": "Skincare",
            "slug": "skincare",
            "description": "Premium skincare products for all skin types",
            "image_url": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "beauty-personal-care"
        },
        {
            "name": "Home Decor",
            "slug": "home-decor",
            "description": "Beautiful decor items to enhance your living space",
            "image_url": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&h=300&fit=crop",
            "is_featured": False,
            "parent_slug": "home-living"
        }
    ]

    category_objects = {}

    # Add main categories
    for category_data in categories:
        category = Category(**category_data)
        db.session.add(category)
        db.session.flush()  # To get the ID
        category_objects[category.slug] = category

    # Add subcategories
    for subcategory_data in subcategories:
        parent_slug = subcategory_data.pop("parent_slug")
        parent_id = category_objects[parent_slug].id
        subcategory = Category(**subcategory_data, parent_id=parent_id)
        db.session.add(subcategory)
        db.session.flush()
        category_objects[subcategory.slug] = subcategory

    db.session.commit()
    print("Categories created successfully")

    # Create brands
    print("Creating brands...")
    brands = [
        {
            "name": "Pandora",
            "slug": "pandora",
            "description": "Luxury jewelry brand known for its customizable charm bracelets",
            "logo_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100&h=100&fit=crop",
            "website": "https://www.pandora.net",
            "is_featured": True
        },
        {
            "name": "Swarovski",
            "slug": "swarovski",
            "description": "Austrian producer of crystal glass and related luxury products",
            "logo_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=100&h=100&fit=crop",
            "website": "https://www.swarovski.com",
            "is_featured": True
        },
        {
            "name": "Zara",
            "slug": "zara",
            "description": "Spanish apparel retailer specializing in fast fashion",
            "logo_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100&h=100&fit=crop",
            "website": "https://www.zara.com",
            "is_featured": True
        },
        {
            "name": "H&M",
            "slug": "hm",
            "description": "Swedish multinational clothing retailer known for fast-fashion clothing",
            "logo_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100&h=100&fit=crop",
            "website": "https://www.hm.com",
            "is_featured": True
        },
        {
            "name": "Cartier",
            "slug": "cartier",
            "description": "French luxury goods conglomerate specializing in jewelry and watches",
            "logo_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=100&h=100&fit=crop",
            "website": "https://www.cartier.com",
            "is_featured": True
        },
        {
            "name": "Tiffany & Co",
            "slug": "tiffany",
            "description": "American luxury jewelry and specialty retailer",
            "logo_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100&h=100&fit=crop",
            "website": "https://www.tiffany.com",
            "is_featured": True
        },
        {
            "name": "Apple",
            "slug": "apple",
            "description": "American multinational technology company specializing in consumer electronics",
            "logo_url": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100&h=100&fit=crop",
            "website": "https://www.apple.com",
            "is_featured": True
        },
        {
            "name": "Samsung",
            "slug": "samsung",
            "description": "South Korean multinational electronics company",
            "logo_url": "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop",
            "website": "https://www.samsung.com",
            "is_featured": True
        },
        {
            "name": "Nike",
            "slug": "nike",
            "description": "American multinational corporation engaged in the design, development, manufacturing, and worldwide marketing and sales of footwear, apparel, equipment, accessories, and services",
            "logo_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop",
            "website": "https://www.nike.com",
            "is_featured": True
        },
        {
            "name": "Adidas",
            "slug": "adidas",
            "description": "German multinational corporation that designs and manufactures shoes, clothing and accessories",
            "logo_url": "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=100&h=100&fit=crop",
            "website": "https://www.adidas.com",
            "is_featured": True
        },
        {
            "name": "Lululemon",
            "slug": "lululemon",
            "description": "Canadian athletic apparel retailer",
            "logo_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&h=100&fit=crop",
            "website": "https://www.lululemon.com",
            "is_featured": False
        },
        {
            "name": "Dyson",
            "slug": "dyson",
            "description": "British technology company that designs and manufactures household appliances",
            "logo_url": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=100&h=100&fit=crop",
            "website": "https://www.dyson.com",
            "is_featured": False
        }
    ]

    brand_objects = {}

    for brand_data in brands:
        brand = Brand(**brand_data)
        db.session.add(brand)
        db.session.flush()  # To get the ID
        brand_objects[brand.slug] = brand

    db.session.commit()
    print("Brands created successfully")

    # Create shipping zones and methods
    print("Creating shipping zones and methods...")

    # Create shipping zones
    kenya_zone = ShippingZone(
        name="Kenya",
        country="Kenya",
        all_regions=True,
        is_active=True
    )
    db.session.add(kenya_zone)

    east_africa_zone = ShippingZone(
        name="East Africa",
        country="Multiple",
        all_regions=False,
        available_regions="Uganda,Tanzania,Rwanda,Burundi",
        is_active=True
    )
    db.session.add(east_africa_zone)

    international_zone = ShippingZone(
        name="International",
        country="Multiple",
        all_regions=True,
        is_active=True
    )
    db.session.add(international_zone)

    db.session.flush()

    # Create shipping methods
    shipping_methods = [
        {
            "shipping_zone_id": kenya_zone.id,
            "name": "Standard Delivery",
            "description": "Delivery within 3-5 business days",
            "cost": 500.0,
            "estimated_days": "3-5 days",
            "is_active": True
        },
        {
            "shipping_zone_id": kenya_zone.id,
            "name": "Express Delivery",
            "description": "Delivery within 1-2 business days",
            "cost": 1000.0,
            "estimated_days": "1-2 days",
            "is_active": True
        },
        {
            "shipping_zone_id": east_africa_zone.id,
            "name": "East Africa Shipping",
            "description": "Delivery within 5-7 business days",
            "cost": 2000.0,
            "estimated_days": "5-7 days",
            "is_active": True
        },
        {
            "shipping_zone_id": international_zone.id,
            "name": "International Standard",
            "description": "Delivery within 10-15 business days",
            "cost": 5000.0,
            "estimated_days": "10-15 days",
            "is_active": True
        },
        {
            "shipping_zone_id": international_zone.id,
            "name": "International Express",
            "description": "Delivery within 5-7 business days",
            "cost": 8000.0,
            "estimated_days": "5-7 days",
            "is_active": True
        }
    ]

    for method_data in shipping_methods:
        shipping_method = ShippingMethod(**method_data)
        db.session.add(shipping_method)

    db.session.commit()
    print("Shipping zones and methods created successfully")

    # Create payment methods
    print("Creating payment methods...")

    payment_methods = [
        {
            "name": "Credit/Debit Card",
            "code": "card",
            "description": "Pay securely with your credit or debit card",
            "instructions": "Enter your card details at checkout",
            "is_active": True
        },
        {
            "name": "M-Pesa",
            "code": "mpesa",
            "description": "Pay using M-Pesa mobile money",
            "instructions": "Enter your phone number at checkout and confirm payment on your phone",
            "countries": "Kenya",
            "is_active": True
        },
        {
            "name": "PayPal",
            "code": "paypal",
            "description": "Pay securely with PayPal",
            "instructions": "You will be redirected to PayPal to complete your payment",
            "is_active": True
        },
        {
            "name": "Bank Transfer",
            "code": "bank_transfer",
            "description": "Pay by bank transfer",
            "instructions": "Transfer the total amount to our bank account and use your order number as reference",
            "is_active": True
        }
    ]

    for method_data in payment_methods:
        payment_method = PaymentMethod(**method_data)
        db.session.add(payment_method)

    db.session.commit()
    print("Payment methods created successfully")

    # Create products - Flash Sales
    print("Creating flash sale products...")
    flash_sales_products = [
        {
            "name": "Premium Leather Messenger Bag",
            "slug": "premium-leather-messenger-bag",
            "description": "Handcrafted premium leather messenger bag with multiple compartments and adjustable strap. Perfect for daily use or business trips.",
            "price": 39999,
            "sale_price": 29999,
            "stock": 50,
            "category_id": category_objects["bags"].id,
            "brand_id": brand_objects["zara"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&h=300&fit=crop",
            "sku": "BAG-001",
            "weight": 1.2,
            "dimensions": {"length": 40, "width": 30, "height": 10},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": True,
            "is_luxury_deal": False
        },
        {
            "name": "Minimalist Analog Watch",
            "slug": "minimalist-analog-watch",
            "description": "Elegant minimalist analog watch with genuine leather strap and stainless steel case. Water-resistant up to 30 meters.",
            "price": 59999,
            "sale_price": 49999,
            "stock": 30,
            "category_id": category_objects["watches"].id,
            "brand_id": brand_objects["swarovski"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&h=300&fit=crop",
            "sku": "WAT-001",
            "weight": 0.2,
            "dimensions": {"length": 4, "width": 4, "height": 1},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": True,
            "is_luxury_deal": False
        },
        {
            "name": "Diamond Stud Earrings",
            "slug": "diamond-stud-earrings",
            "description": "Beautiful diamond stud earrings set in 18k white gold. Perfect for everyday wear or special occasions.",
            "price": 24999,
            "sale_price": 19999,
            "stock": 20,
            "category_id": category_objects["earrings"].id,
            "brand_id": brand_objects["pandora"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop",
            "sku": "EAR-001",
            "weight": 0.01,
            "dimensions": {"length": 0.5, "width": 0.5, "height": 0.5},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": True,
            "is_luxury_deal": False
        },
        {
            "name": "Gold Chain Necklace",
            "slug": "gold-chain-necklace",
            "description": "Elegant 18k gold chain necklace featuring a delicate design perfect for any occasion. This timeless piece adds sophistication to both casual and formal outfits.",
            "price": 17999,
            "sale_price": 14999,
            "stock": 25,
            "category_id": category_objects["necklaces"].id,
            "brand_id": brand_objects["tiffany"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
            "sku": "NEC-001",
            "weight": 0.05,
            "dimensions": {"length": 45, "width": 0.2, "height": 0.2},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": True,
            "is_luxury_deal": False
        },
        {
            "name": "Pearl Drop Earrings",
            "slug": "pearl-drop-earrings",
            "description": "Elegant pearl drop earrings with sterling silver hooks. Perfect for adding a touch of sophistication to any outfit.",
            "price": 12999,
            "sale_price": 9999,
            "stock": 15,
            "category_id": category_objects["earrings"].id,
            "brand_id": brand_objects["pandora"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop",
            "sku": "EAR-002",
            "weight": 0.02,
            "dimensions": {"length": 2, "width": 1, "height": 0.5},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": True,
            "is_luxury_deal": False
        },
        {
            "name": "Designer Sunglasses",
            "slug": "designer-sunglasses",
            "description": "Premium designer sunglasses with UV protection and polarized lenses. Stylish and functional for everyday wear.",
            "price": 19999,
            "sale_price": 15999,
            "stock": 40,
            "category_id": category_objects["sunglasses"].id,
            "brand_id": brand_objects["zara"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&h=300&fit=crop",
            "sku": "SUN-001",
            "weight": 0.1,
            "dimensions": {"length": 14, "width": 5, "height": 4},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": True,
            "is_luxury_deal": False
        }
    ]

    # Create products - Luxury Deals
    print("Creating luxury deal products...")
    luxury_deals_products = [
        {
            "name": "Diamond Tennis Bracelet",
            "slug": "diamond-tennis-bracelet",
            "description": "Exquisite diamond tennis bracelet featuring 3 carats of round brilliant diamonds set in 18k white gold. A timeless piece of luxury jewelry.",
            "price": 299999,
            "sale_price": 99999,
            "stock": 5,
            "category_id": category_objects["bracelets"].id,
            "brand_id": brand_objects["cartier"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
            "sku": "BRA-001",
            "weight": 0.05,
            "dimensions": {"length": 18, "width": 0.5, "height": 0.2},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": False,
            "is_luxury_deal": True
        },
        {
            "name": "Sapphire and Diamond Ring",
            "slug": "sapphire-and-diamond-ring",
            "description": "Stunning sapphire and diamond ring featuring a 2-carat blue sapphire surrounded by brilliant-cut diamonds set in platinum.",
            "price": 249999,
            "sale_price": 79999,
            "stock": 3,
            "category_id": category_objects["rings"].id,
            "brand_id": brand_objects["tiffany"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
            "sku": "RIN-001",
            "weight": 0.02,
            "dimensions": {"length": 2, "width": 2, "height": 1},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": False,
            "is_luxury_deal": True
        },
        {
            "name": "Pearl Drop Necklace",
            "slug": "pearl-drop-necklace",
            "description": "Elegant pearl drop necklace featuring a large South Sea pearl pendant on an 18k gold chain. A statement piece for special occasions.",
            "price": 149999,
            "sale_price": 44999,
            "stock": 7,
            "category_id": category_objects["necklaces"].id,
            "brand_id": brand_objects["pandora"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
            "sku": "NEC-002",
            "weight": 0.03,
            "dimensions": {"length": 45, "width": 0.2, "height": 0.2},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": False,
            "is_luxury_deal": True
        },
        {
            "name": "Designer Evening Gown",
            "slug": "designer-evening-gown",
            "description": "Exquisite designer evening gown made from premium silk with hand-embroidered details. Perfect for galas and formal events.",
            "price": 299999,
            "sale_price": 89999,
            "stock": 2,
            "category_id": category_objects["dresses"].id,
            "brand_id": brand_objects["zara"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
            "sku": "DRE-001",
            "weight": 1.5,
            "dimensions": {"length": 150, "width": 50, "height": 5},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": False,
            "is_luxury_deal": True
        },
        {
            "name": "Crystal Chandelier Earrings",
            "slug": "crystal-chandelier-earrings",
            "description": "Stunning crystal chandelier earrings featuring Swarovski crystals set in white gold. Perfect for adding glamour to any evening look.",
            "price": 99999,
            "sale_price": 34999,
            "stock": 10,
            "category_id": category_objects["earrings"].id,
            "brand_id": brand_objects["swarovski"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop",
            "sku": "EAR-003",
            "weight": 0.03,
            "dimensions": {"length": 5, "width": 2, "height": 0.5},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": False,
            "is_luxury_deal": True
        },
        {
            "name": "Gold Link Watch",
            "slug": "gold-link-watch",
            "description": "Luxury gold link watch with Swiss movement and sapphire crystal face. A timeless accessory for the discerning individual.",
            "price": 499999,
            "sale_price": 149999,
            "stock": 4,
            "category_id": category_objects["watches"].id,
            "brand_id": brand_objects["cartier"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&h=300&fit=crop",
            "sku": "WAT-002",
            "weight": 0.15,
            "dimensions": {"length": 22, "width": 4, "height": 1},
            "is_featured": True,
            "is_new": False,
            "is_sale": True,
            "is_flash_sale": False,
            "is_luxury_deal": True
        }
    ]

    # Create products - Regular Products
    print("Creating regular products...")
    regular_products = [
        {
            "name": "Premium Leather Messenger Bag (Classic)",
            "slug": "premium-leather-messenger-bag-classic",
            "description": "Handcrafted premium leather messenger bag with multiple compartments and adjustable strap. Perfect for daily use or business trips.",
            "price": 29999,
            "sale_price": None,
            "stock": 50,
            "category_id": category_objects["bags"].id,
            "brand_id": brand_objects["zara"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop",
            "sku": "BAG-002",
            "weight": 1.2,
            "dimensions": {"length": 40, "width": 30, "height": 10},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Minimalist Analog Watch (Classic)",
            "slug": "minimalist-analog-watch-classic",
            "description": "Elegant minimalist analog watch with genuine leather strap and stainless steel case. Water-resistant up to 30 meters.",
            "price": 49999,
            "sale_price": None,
            "stock": 30,
            "category_id": category_objects["watches"].id,
            "brand_id": brand_objects["swarovski"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop",
            "sku": "WAT-003",
            "weight": 0.2,
            "dimensions": {"length": 4, "width": 4, "height": 1},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Wireless Noise-Canceling Earbuds",
            "slug": "wireless-noise-canceling-earbuds",
            "description": "Premium wireless earbuds with active noise cancellation, touch controls, and long battery life. Perfect for music lovers on the go.",
            "price": 19999,
            "sale_price": None,
            "stock": 100,
            "category_id": category_objects["electronics"].id,
            "brand_id": brand_objects["apple"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop",
            "sku": "ELE-001",
            "weight": 0.05,
            "dimensions": {"length": 5, "width": 5, "height": 2},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Smart Home Speaker System",
            "slug": "smart-home-speaker-system",
            "description": "Intelligent home speaker system with voice control, multi-room audio capabilities, and smart home integration. Perfect for modern homes.",
            "price": 14999,
            "sale_price": None,
            "stock": 75,
            "category_id": category_objects["electronics"].id,
            "brand_id": brand_objects["samsung"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&h=300&fit=crop",
            "sku": "ELE-002",
            "weight": 1.0,
            "dimensions": {"length": 15, "width": 15, "height": 20},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Advanced Fitness Smartwatch",
            "slug": "advanced-fitness-smartwatch",
            "description": "Feature-rich fitness smartwatch with heart rate monitoring, GPS tracking, and water resistance. Perfect for fitness enthusiasts.",
            "price": 9999,
            "sale_price": None,
            "stock": 120,
            "category_id": category_objects["watches"].id,
            "brand_id": brand_objects["apple"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop",
            "sku": "WAT-004",
            "weight": 0.05,
            "dimensions": {"length": 4, "width": 4, "height": 1},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Premium Running Shoes",
            "slug": "premium-running-shoes",
            "description": "High-performance running shoes with responsive cushioning, breathable mesh upper, and durable outsole for maximum comfort and support.",
            "price": 12999,
            "sale_price": None,
            "stock": 80,
            "category_id": category_objects["shoes"].id,
            "brand_id": brand_objects["nike"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
            "sku": "SHO-001",
            "weight": 0.5,
            "dimensions": {"length": 30, "width": 15, "height": 10},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Athletic Performance Hoodie",
            "slug": "athletic-performance-hoodie",
            "description": "Premium athletic hoodie made from moisture-wicking fabric with thermal insulation. Perfect for workouts or casual wear.",
            "price": 8999,
            "sale_price": None,
            "stock": 65,
            "category_id": category_objects["activewear"].id,
            "brand_id": brand_objects["adidas"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&h=300&fit=crop",
            "sku": "APP-001",
            "weight": 0.4,
            "dimensions": {"length": 70, "width": 50, "height": 3},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Luxury Scented Candle Set",
            "slug": "luxury-scented-candle-set",
            "description": "Set of three premium scented candles made from natural soy wax with essential oils. Perfect for creating a relaxing atmosphere.",
            "price": 7999,
            "sale_price": None,
            "stock": 40,
            "category_id": category_objects["home-decor"].id,
            "brand_id": None,
            "thumbnail_url": "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=300&h=300&fit=crop",
            "sku": "HOM-001",
            "weight": 1.2,
            "dimensions": {"length": 20, "width": 20, "height": 10},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Professional Skincare Set",
            "slug": "professional-skincare-set",
            "description": "Complete skincare set including cleanser, toner, serum, and moisturizer made with premium natural ingredients for radiant skin.",
            "price": 14999,
            "sale_price": None,
            "stock": 30,
            "category_id": category_objects["skincare"].id,
            "brand_id": None,
            "thumbnail_url": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop",
            "sku": "SKN-001",
            "weight": 0.8,
            "dimensions": {"length": 25, "width": 20, "height": 10},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Premium Yoga Mat",
            "slug": "premium-yoga-mat",
            "description": "High-quality yoga mat made from eco-friendly materials with excellent grip and cushioning for comfortable practice.",
            "price": 6999,
            "sale_price": None,
            "stock": 50,
            "category_id": category_objects["sports-fitness"].id,
            "brand_id": brand_objects["adidas"].id,
            "thumbnail_url": "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=300&h=300&fit=crop",
            "sku": "SPO-001",
            "weight": 1.0,
            "dimensions": {"length": 180, "width": 60, "height": 0.5},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        }
    ]

    # Add products to database
    print("Adding products to database...")
    product_objects = {}

    # Process each product category separately
    for product_data in flash_sales_products:
        product = Product(**product_data)
        db.session.add(product)
        db.session.flush()  # Get the product ID
        product_objects[product.slug] = product

    for product_data in luxury_deals_products:
        product = Product(**product_data)
        db.session.add(product)
        db.session.flush()
        product_objects[product.slug] = product

    for product_data in regular_products:
        product = Product(**product_data)
        db.session.add(product)
        db.session.flush()
        product_objects[product.slug] = product

    # Commit products before creating variants and images
    db.session.commit()
    print("Products created successfully")

    # Create product images for all products
    print("Creating product images...")

    # Define image data for products
    product_images_data = {
        "premium-leather-messenger-bag": [
            "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1607164073832-02e6e752ca9b?w=800&h=800&fit=crop"
        ],
        "minimalist-analog-watch": [
            "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800&h=800&fit=crop"
        ],
        "diamond-stud-earrings": [
            "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop"
        ],
        "gold-chain-necklace": [
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop"
        ],
        "pearl-drop-earrings": [
            "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&h=800&fit=crop"
        ],
        "designer-sunglasses": [
            "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&h=800&fit=crop"
        ],
        "diamond-tennis-bracelet": [
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop"
        ],
        "sapphire-and-diamond-ring": [
            "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop"
        ],
        "premium-running-shoes": [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop"
        ],
        "athletic-performance-hoodie": [
            "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1565693413579-8a400a3da7cc?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop"
        ],
        "wireless-noise-canceling-earbuds": [
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1608156639585-b3a032e88587?w=800&h=800&fit=crop"
        ],
        "smart-home-speaker-system": [
            "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1558089687-f282ffcbc0d4?w=800&h=800&fit=crop"
        ],
        "advanced-fitness-smartwatch": [
            "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1617043786394-ae546fb6c0dc?w=800&h=800&fit=crop"
        ],
        "luxury-scented-candle-set": [
            "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1636103952204-0b738c225264?w=800&h=800&fit=crop"
        ],
        "professional-skincare-set": [
            "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1570194065650-d99fb4d8a609?w=800&h=800&fit=crop"
        ],
        "premium-yoga-mat": [
            "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=800&fit=crop",

        ]
    }

    # Add images for all products
    for slug, product in product_objects.items():
        # Get image URLs for this product or use a default set
        image_urls = product_images_data.get(slug, [
            f"https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&h=800&fit=crop&q={product.id}",
            f"https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&h=800&fit=crop&q={product.id+1}",
            f"https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&h=800&fit=crop&q={product.id+2}"
        ])

        # Create product images
        for i, image_url in enumerate(image_urls):
            product_image = ProductImage(
                product_id=product.id,
                filename=f"{slug}-image-{i+1}.jpg",
                original_name=f"{slug}-image-{i+1}.jpg",
                url=image_url,
                size=None,  # Size in bytes, could be calculated if needed
                is_primary=(i == 0),  # First image is primary
                sort_order=i,
                alt_text=f"{product.name} - Image {i+1}"
            )
            db.session.add(product_image)

    db.session.commit()
    print("Product images created successfully")

    # Now create variants for specific products
    print("Creating product variants...")

    # Gold Chain Necklace variants
    gold_chain_product = product_objects.get("gold-chain-necklace")
    if gold_chain_product:
        variants = [
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-16",
                "color": "Yellow Gold",
                "size": '16"',
                "stock": 5,
                "price": gold_chain_product.price,
                "sale_price": gold_chain_product.sale_price,
                "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop"
            },
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-18",
                "color": "Yellow Gold",
                "size": '18"',
                "stock": 8,
                "price": gold_chain_product.price,
                "sale_price": gold_chain_product.sale_price,
                "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop"
            },
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-20",
                "color": "White Gold",
                "size": '20"',
                "stock": 6,
                "price": gold_chain_product.price + 2000,
                "sale_price": gold_chain_product.sale_price + 2000 if gold_chain_product.sale_price else None,
                "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop"
            },
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-24",
                "color": "Rose Gold",
                "size": '24"',
                "stock": 4,
                "price": gold_chain_product.price + 5000,
                "sale_price": gold_chain_product.sale_price + 5000 if gold_chain_product.sale_price else None,
                "image_url": "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop"
            }
        ]

        for variant_data in variants:
            variant = ProductVariant(**variant_data)
            db.session.add(variant)

    # Running Shoes variants
    running_shoes_product = product_objects.get("premium-running-shoes")
    if running_shoes_product:
        variants = [
            {
                "product_id": running_shoes_product.id,
                "sku": f"{running_shoes_product.sku}-8-BLK",
                "color": "Black",
                "size": "8",
                "stock": 15,
                "price": running_shoes_product.price,
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop"
            },
            {
                "product_id": running_shoes_product.id,
                "sku": f"{running_shoes_product.sku}-9-BLK",
                "color": "Black",
                "size": "9",
                "stock": 20,
                "price": running_shoes_product.price,
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop"
            },
            {
                "product_id": running_shoes_product.id,
                "sku": f"{running_shoes_product.sku}-10-BLK",
                "color": "Black",
                "size": "10",
                "stock": 18,
                "price": running_shoes_product.price,
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop"
            },
            {
                "product_id": running_shoes_product.id,
                "sku": f"{running_shoes_product.sku}-8-RED",
                "color": "Red",
                "size": "8",
                "stock": 12,
                "price": running_shoes_product.price,
                "image_url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop"
            },
            {
                "product_id": running_shoes_product.id,
                "sku": f"{running_shoes_product.sku}-9-RED",
                "color": "Red",
                "size": "9",
                "stock": 15,
                "price": running_shoes_product.price,
                "image_url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop"
            }
        ]

        for variant_data in variants:
            variant = ProductVariant(**variant_data)
            db.session.add(variant)

    # Athletic Hoodie variants
    hoodie_product = product_objects.get("athletic-performance-hoodie")
    if hoodie_product:
        variants = [
            {
                "product_id": hoodie_product.id,
                "sku": f"{hoodie_product.sku}-S-BLK",
                "color": "Black",
                "size": "S",
                "stock": 10,
                "price": hoodie_product.price,
                "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop"
            },
            {
                "product_id": hoodie_product.id,
                "sku": f"{hoodie_product.sku}-M-BLK",
                "color": "Black",
                "size": "M",
                "stock": 15,
                "price": hoodie_product.price,
                "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop"
            },
            {
                "product_id": hoodie_product.id,
                "sku": f"{hoodie_product.sku}-L-BLK",
                "color": "Black",
                "size": "L",
                "stock": 15,
                "price": hoodie_product.price,
                "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop"
            },
            {
                "product_id": hoodie_product.id,
                "sku": f"{hoodie_product.sku}-S-GRY",
                "color": "Gray",
                "size": "S",
                "stock": 8,
                "price": hoodie_product.price,
                "image_url": "https://images.unsplash.com/photo-1565693413579-8a400a3da7cc?w=800&h=800&fit=crop"
            },
            {
                "product_id": hoodie_product.id,
                "sku": f"{hoodie_product.sku}-M-GRY",
                "color": "Gray",
                "size": "M",
                "stock": 12,
                "price": hoodie_product.price,
                "image_url": "https://images.unsplash.com/photo-1565693413579-8a400a3da7cc?w=800&h=800&fit=crop"
            },
            {
                "product_id": hoodie_product.id,
                "sku": f"{hoodie_product.sku}-L-GRY",
                "color": "Gray",
                "size": "L",
                "stock": 10,
                "price": hoodie_product.price,
                "image_url": "https://images.unsplash.com/photo-1565693413579-8a400a3da7cc?w=800&h=800&fit=crop"
            }
        ]

        for variant_data in variants:
            variant = ProductVariant(**variant_data)
            db.session.add(variant)

    # Minimalist Analog Watch variants
    watch_product = product_objects.get("minimalist-analog-watch")
    if watch_product:
        variants = [
            {
                "product_id": watch_product.id,
                "sku": f"{watch_product.sku}-BLK-LTH",
                "color": "Black",
                "size": "One Size",
                "stock": 10,
                "price": watch_product.price,
                "sale_price": watch_product.sale_price,
                "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&h=800&fit=crop"
            },
            {
                "product_id": watch_product.id,
                "sku": f"{watch_product.sku}-BRN-LTH",
                "color": "Brown",
                "size": "One Size",
                "stock": 8,
                "price": watch_product.price,
                "sale_price": watch_product.sale_price,
                "image_url": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=800&fit=crop"
            },
            {
                "product_id": watch_product.id,
                "sku": f"{watch_product.sku}-SLV-MTL",
                "color": "Silver",
                "size": "One Size",
                "stock": 12,
                "price": watch_product.price + 10000,
                "sale_price": watch_product.sale_price + 10000 if watch_product.sale_price else None,
                "image_url": "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800&h=800&fit=crop"
            }
        ]

        for variant_data in variants:
            variant = ProductVariant(**variant_data)
            db.session.add(variant)

    # Diamond Stud Earrings variants
    earrings_product = product_objects.get("diamond-stud-earrings")
    if earrings_product:
        variants = [
            {
                "product_id": earrings_product.id,
                "sku": f"{earrings_product.sku}-WG",
                "color": "White Gold",
                "size": "One Size",
                "stock": 7,
                "price": earrings_product.price,
                "sale_price": earrings_product.sale_price,
                "image_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=800&h=800&fit=crop"
            },
            {
                "product_id": earrings_product.id,
                "sku": f"{earrings_product.sku}-YG",
                "color": "Yellow Gold",
                "size": "One Size",
                "stock": 5,
                "price": earrings_product.price,
                "sale_price": earrings_product.sale_price,
                "image_url": "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&h=800&fit=crop"
            },
            {
                "product_id": earrings_product.id,
                "sku": f"{earrings_product.sku}-RG",
                "color": "Rose Gold",
                "size": "One Size",
                "stock": 8,
                "price": earrings_product.price + 5000,
                "sale_price": earrings_product.sale_price + 5000 if earrings_product.sale_price else None,
                "image_url": "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop"
            }
        ]

        for variant_data in variants:
            variant = ProductVariant(**variant_data)
            db.session.add(variant)

    # Create inventory records for products and variants
    print("Creating inventory records...")

    # For products without variants, create inventory records
    for product in Product.query.all():
        # Check if product has variants
        has_variants = db.session.query(ProductVariant).filter_by(product_id=product.id).count() > 0

        if not has_variants:
            inventory = Inventory(
                product_id=product.id,
                variant_id=None,
                stock_level=product.stock,
                reserved_quantity=0,
                low_stock_threshold=5,
                sku=product.sku,
                location="Main Warehouse"
            )
            db.session.add(inventory)

    # For products with variants, create inventory records for each variant
    for variant in ProductVariant.query.all():
        inventory = Inventory(
            product_id=variant.product_id,
            variant_id=variant.id,
            stock_level=variant.stock,
            reserved_quantity=0,
            low_stock_threshold=3,
            sku=variant.sku,
            location="Main Warehouse"
        )
        db.session.add(inventory)

    db.session.commit()
    print("Inventory records created successfully")

    # Create coupons
    print("Creating coupons...")
    coupons = [
        {
            "code": "WELCOME10",
            "type": CouponType.PERCENTAGE,
            "value": 10.0,
            "min_purchase": 5000.0,
            "max_discount": 5000.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=30),
            "usage_limit": 1000,
            "used_count": 0,
            "is_active": True
        },
        {
            "code": "FLASH20",
            "type": CouponType.PERCENTAGE,
            "value": 20.0,
            "min_purchase": 10000.0,
            "max_discount": 10000.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=7),
            "usage_limit": 500,
            "used_count": 0,
            "is_active": True
        },
        {
            "code": "FREESHIP",
            "type": CouponType.FIXED,
            "value": 500.0,
            "min_purchase": 5000.0,
            "max_discount": 500.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=60),
            "usage_limit": 2000,
            "used_count": 0,
            "is_active": True
        },
        {
            "code": "SUMMER25",
            "type": CouponType.PERCENTAGE,
            "value": 25.0,
            "min_purchase": 15000.0,
            "max_discount": 15000.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=90),
            "usage_limit": 1500,
            "used_count": 0,
            "is_active": True
        },
        {
            "code": "NEWUSER",
            "type": CouponType.PERCENTAGE,
            "value": 15.0,
            "min_purchase": 3000.0,
            "max_discount": 7500.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=45),
            "usage_limit": 1000,
            "used_count": 0,
            "is_active": True
        }
    ]

    for coupon_data in coupons:
        coupon = Coupon(**coupon_data)
        db.session.add(coupon)

    # Create promotions
    print("Creating promotions...")
    promotions = [
        {
            "name": "Summer Sale",
            "description": "Enjoy up to 30% off on selected summer items",
            "discount_type": CouponType.PERCENTAGE,
            "discount_value": 30.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=30),
            "is_active": True,
            "min_order_value": 0.0,
            "max_discount": None,
            "product_ids": ",".join([str(product_objects["premium-running-shoes"].id),
                                    str(product_objects["athletic-performance-hoodie"].id)])
        },
        {
            "name": "Jewelry Special",
            "description": "Get 15% off on all jewelry items",
            "discount_type": CouponType.PERCENTAGE,
            "discount_value": 15.0,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=14),
            "is_active": True,
            "min_order_value": 0.0,
            "max_discount": 20000.0,
            "category_ids": ",".join([str(category_objects["jewelry"].id)])
        }
    ]

    for promotion_data in promotions:
        promotion = Promotion(**promotion_data)
        db.session.add(promotion)

    # Create newsletter subscribers
    print("Creating newsletter subscribers...")
    newsletters = [
        {"email": "subscriber1@example.com", "name": "John Doe", "is_subscribed": True},
        {"email": "subscriber2@example.com", "name": "Jane Smith", "is_subscribed": True},
        {"email": "subscriber3@example.com", "name": "Robert Johnson", "is_subscribed": True},
        {"email": "subscriber4@example.com", "name": "Emily Davis", "is_subscribed": True},
        {"email": "subscriber5@example.com", "name": "Michael Wilson", "is_subscribed": True},
        {"email": "unsubscribed@example.com", "name": "Former User", "is_subscribed": False}
    ]

    for newsletter_data in newsletters:
        newsletter = Newsletter(**newsletter_data)
        db.session.add(newsletter)

    # Create reviews for products
    print("Creating product reviews...")

    # Get user IDs for reviews
    user_ids = [u.id for u in User.query.all()]

    # Create reviews for some products
    products_to_review = ["gold-chain-necklace", "premium-running-shoes", "minimalist-analog-watch",
                         "wireless-noise-canceling-earbuds", "diamond-stud-earrings"]

    for product_slug in products_to_review:
        product = product_objects.get(product_slug)
        if product:
            # Create 3-5 reviews for each product
            for i in range(random.randint(3, 5)):
                user_id = random.choice(user_ids)
                rating = random.randint(3, 5)  # Mostly positive reviews

                review = Review(
                    user_id=user_id,
                    product_id=product.id,
                    rating=rating,
                    title=f"Great {product.name}" if rating >= 4 else f"Decent {product.name}",
                    comment=f"I {'really love' if rating == 5 else 'like' if rating == 4 else 'think'} this product. {'Highly recommended!' if rating == 5 else 'Good value for money.' if rating == 4 else 'It\'s okay but could be better.'}",
                    is_verified_purchase=random.choice([True, False]),
                    created_at=datetime.now() - timedelta(days=random.randint(1, 30))
                )
                db.session.add(review)

    # Create a few carts with items
    print("Creating carts and cart items...")

    for user_id in user_ids[:3]:  # Create carts for first 3 users
        cart = Cart(
            user_id=user_id,
            is_active=True,
            created_at=datetime.now()
        )
        db.session.add(cart)
        db.session.flush()

        # Add 2-4 random products to each cart
        product_ids = random.sample([p.id for p in Product.query.all()], random.randint(2, 4))

        for product_id in product_ids:
            product = Product.query.get(product_id)

            # Check if product has variants
            variants = ProductVariant.query.filter_by(product_id=product_id).all()

            if variants:
                # Add a random variant
                variant = random.choice(variants)
                cart_item = CartItem(
                    cart_id=cart.id,
                    user_id=user_id,
                    product_id=product_id,
                    variant_id=variant.id,
                    quantity=random.randint(1, 3),
                    price=variant.price
                )
            else:
                # Add the product without variant
                cart_item = CartItem(
                    cart_id=cart.id,
                    user_id=user_id,
                    product_id=product_id,
                    quantity=random.randint(1, 3),
                    price=product.price
                )

            db.session.add(cart_item)

        # Update cart totals
        cart.update_totals()

    # Commit all changes
    db.session.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_database()
