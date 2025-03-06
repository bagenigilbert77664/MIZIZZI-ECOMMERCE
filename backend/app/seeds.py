from app import db, create_app
from app.extensions import db
from app.models import (
    User, Category, Brand, Product, ProductVariant,
    UserRole, CouponType, Coupon, Newsletter
)
from datetime import datetime, timedelta

def seed_database():
    print("Starting database seeding...")

    # Clear existing data
    db.session.query(ProductVariant).delete()
    db.session.query(Product).delete()
    db.session.query(Brand).delete()
    db.session.query(Category).delete()
    db.session.query(User).delete()
    db.session.query(Coupon).delete()
    db.session.query(Newsletter).delete()
    db.session.commit()

    # Create admin user
    admin = User(
        name="Admin User",
        email="admin@mizizzi.com",
        role=UserRole.ADMIN,
        phone="+254700000000",
        address={"street": "123 Admin St", "city": "Nairobi", "country": "Kenya"},
        avatar_url="/placeholder.svg?height=200&width=200",
        is_active=True,
        created_at=datetime.now(),
        last_login=datetime.now()
    )
    admin.set_password("admin123")
    db.session.add(admin)

    # Create regular user
    user = User(
        name="Gilbert Bageni",
        email="gilbert@example.com",
        role=UserRole.USER,
        phone="+254700000001",
        address={"street": "456 User St", "city": "Nairobi", "country": "Kenya"},
        avatar_url="/placeholder.svg?height=200&width=200",
        is_active=True,
        created_at=datetime.now(),
        last_login=datetime.now()
    )
    user.set_password("password123")
    db.session.add(user)
    db.session.commit()
    print("Users created successfully")

    # Create categories
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
        },
        {
            "name": "Watches",
            "slug": "watches",
            "description": "Stylish and functional watches for all occasions",
            "image_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Necklaces",
            "slug": "necklaces",
            "description": "Elegant necklaces for all occasions",
            "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Earrings",
            "slug": "earrings",
            "description": "Beautiful earrings for all occasions",
            "image_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Sunglasses",
            "slug": "sunglasses",
            "description": "Stylish sunglasses for all occasions",
            "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Bracelets",
            "slug": "bracelets",
            "description": "Elegant bracelets for all occasions",
            "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Rings",
            "slug": "rings",
            "description": "Beautiful rings for all occasions",
            "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Dresses",
            "slug": "dresses",
            "description": "Elegant dresses for all occasions",
            "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&h=300&fit=crop",
            "is_featured": False
        },
        {
            "name": "Bags",
            "slug": "bags",
            "description": "Stylish and functional bags for all occasions",
            "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop",
            "banner_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&h=300&fit=crop",
            "is_featured": False
        }
    ]

    category_objects = {}

    for category_data in categories:
        category = Category(**category_data)
        db.session.add(category)
        db.session.flush()  # To get the ID
        category_objects[category.slug] = category

    db.session.commit()
    print("Categories created successfully")

    # Create brands
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

    # Create products - Flash Sales
    flash_sales_products = [
        {
            "name": "Premium Leather Messenger Bag",
            "slug": "premium-leather-messenger-bag",
            "description": "Handcrafted premium leather messenger bag with multiple compartments and adjustable strap. Perfect for daily use or business trips.",
            "price": 39999,
            "sale_price": 29999,
            "stock": 50,
            "category_id": category_objects["accessories"].id,
            "brand_id": brand_objects["zara"].id,
            "image_urls": ["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80"],
            "category_id": category_objects["accessories"].id,
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
            "image_urls": ["https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&q=80"],
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
            "image_urls": ["https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=500&q=80"],
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
            "image_urls": [
                "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop",
                "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop",
                "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop",
                "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop"
            ],
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
            "image_urls": ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80"],
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
            "image_urls": ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80"],
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
            "image_urls": ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop"],
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
            "image_urls": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop"],
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
            "image_urls": ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop"],
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
            "image_urls": ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop"],
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
            "image_urls": ["https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop"],
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
            "image_urls": ["https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&h=300&fit=crop"],
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

    # Create products - All Products
    all_products = [
        {
            "name": "Premium Leather Messenger Bag",
            "slug": "premium-leather-messenger-bag-all",
            "description": "Handcrafted premium leather messenger bag with multiple compartments and adjustable strap. Perfect for daily use or business trips.",
            "price": 29999,
            "sale_price": None,
            "stock": 50,
            "category_id": category_objects["bags"].id,
            "brand_id": brand_objects["zara"].id,
            "image_urls": ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80"],
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
            "name": "Minimalist Analog Watch",
            "slug": "minimalist-analog-watch-all",
            "description": "Elegant minimalist analog watch with genuine leather strap and stainless steel case. Water-resistant up to 30 meters.",
            "price": 49999,
            "sale_price": None,
            "stock": 30,
            "category_id": category_objects["watches"].id,
            "brand_id": brand_objects["swarovski"].id,
            "image_urls": ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80"],
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
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80"],
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
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&q=80"],
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
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80"],
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
            "name": "Designer Aviator Sunglasses",
            "slug": "designer-aviator-sunglasses",
            "description": "Classic aviator sunglasses with polarized lenses and premium metal frame. Stylish protection for your eyes.",
            "price": 15999,
            "sale_price": None,
            "stock": 60,
            "category_id": category_objects["sunglasses"].id,
            "brand_id": brand_objects["zara"].id,
            "image_urls": ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop",
            "sku": "SUN-002",
            "weight": 0.1,
            "dimensions": {"length": 14, "width": 5, "height": 4},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Handcrafted Leather Wallet",
            "slug": "handcrafted-leather-wallet",
            "description": "Premium handcrafted leather wallet with multiple card slots and bill compartments. A perfect blend of style and functionality.",
            "price": 7999,
            "sale_price": None,
            "stock": 90,
            "category_id": category_objects["accessories"].id,
            "brand_id": brand_objects["zara"].id,
            "image_urls": ["https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&h=300&fit=crop",
            "sku": "ACC-001",
            "weight": 0.1,
            "dimensions": {"length": 10, "width": 8, "height": 1},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Wireless Gaming Headphones",
            "slug": "wireless-gaming-headphones",
            "description": "High-performance wireless gaming headphones with surround sound, noise-canceling microphone, and long battery life.",
            "price": 24999,
            "sale_price": None,
            "stock": 45,
            "category_id": category_objects["electronics"].id,
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=300&h=300&fit=crop",
            "sku": "ELE-003",
            "weight": 0.3,
            "dimensions": {"length": 20, "width": 18, "height": 10},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Premium Camera Backpack",
            "slug": "premium-camera-backpack",
            "description": "Durable and spacious camera backpack with customizable compartments, weather resistance, and comfortable straps.",
            "price": 18999,
            "sale_price": None,
            "stock": 35,
            "category_id": category_objects["bags"].id,
            "brand_id": brand_objects["zara"].id,
            "image_urls": ["https://images.unsplash.com/photo-1547949003-9792a18a2601?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=300&h=300&fit=crop",
            "sku": "BAG-003",
            "weight": 1.5,
            "dimensions": {"length": 45, "width": 30, "height": 20},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Mechanical Keyboard",
            "slug": "mechanical-keyboard",
            "description": "Premium mechanical keyboard with customizable RGB lighting, programmable keys, and durable construction.",
            "price": 15999,
            "sale_price": None,
            "stock": 55,
            "category_id": category_objects["electronics"].id,
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=300&h=300&fit=crop",
            "sku": "ELE-004",
            "weight": 1.2,
            "dimensions": {"length": 44, "width": 14, "height": 4},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Vintage Style Backpack",
            "slug": "vintage-style-backpack",
            "description": "Stylish vintage-inspired backpack with multiple compartments, laptop sleeve, and durable canvas construction.",
            "price": 8999,
            "sale_price": None,
            "stock": 70,
            "category_id": category_objects["bags"].id,
            "brand_id": brand_objects["hm"].id,
            "image_urls": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop",
            "sku": "BAG-004",
            "weight": 0.8,
            "dimensions": {"length": 40, "width": 30, "height": 15},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Premium Wireless Mouse",
            "slug": "premium-wireless-mouse",
            "description": "Ergonomic wireless mouse with adjustable DPI, programmable buttons, and long battery life.",
            "price": 7999,
            "sale_price": None,
            "stock": 85,
            "category_id": category_objects["electronics"].id,
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=300&fit=crop",
            "sku": "ELE-005",
            "weight": 0.1,
            "dimensions": {"length": 12, "width": 7, "height": 4},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Luxury Diamond Necklace",
            "slug": "luxury-diamond-necklace",
            "description": "Exquisite diamond necklace featuring a stunning pendant with 2 carats of diamonds set in 18k white gold.",
            "price": 199999,
            "sale_price": None,
            "stock": 3,
            "category_id": category_objects["necklaces"].id,
            "brand_id": brand_objects["cartier"].id,
            "image_urls": ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
            "sku": "NEC-003",
            "weight": 0.03,
            "dimensions": {"length": 45, "width": 0.2, "height": 0.2},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Designer Leather Handbag",
            "slug": "designer-leather-handbag",
            "description": "Premium designer leather handbag with spacious interior, multiple compartments, and elegant hardware.",
            "price": 89999,
            "sale_price": None,
            "stock": 10,
            "category_id": category_objects["bags"].id,
            "brand_id": brand_objects["zara"].id,
            "image_urls": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop",
            "sku": "BAG-005",
            "weight": 0.8,
            "dimensions": {"length": 35, "width": 25, "height": 15},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Sapphire Stud Earrings",
            "slug": "sapphire-stud-earrings",
            "description": "Elegant sapphire stud earrings featuring 1-carat blue sapphires set in 18k white gold.",
            "price": 149999,
            "sale_price": None,
            "stock": 7,
            "category_id": category_objects["earrings"].id,
            "brand_id": brand_objects["tiffany"].id,
            "image_urls": ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop",
            "sku": "EAR-004",
            "weight": 0.01,
            "dimensions": {"length": 0.8, "width": 0.8, "height": 0.5},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Smart Fitness Ring",
            "slug": "smart-fitness-ring",
            "description": "Innovative smart ring that tracks fitness metrics, sleep patterns, and heart rate in a sleek, minimalist design.",
            "price": 29999,
            "sale_price": None,
            "stock": 25,
            "category_id": category_objects["rings"].id,
            "brand_id": None,
            "image_urls": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
            "sku": "RIN-002",
            "weight": 0.01,
            "dimensions": {"length": 2, "width": 2, "height": 0.5},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Premium Silk Scarf",
            "slug": "premium-silk-scarf",
            "description": "Luxurious silk scarf with vibrant print design, perfect for adding a touch of elegance to any outfit.",
            "price": 12999,
            "sale_price": None,
            "stock": 40,
            "category_id": category_objects["accessories"].id,
            "brand_id": brand_objects["hm"].id,
            "image_urls": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop",
            "sku": "ACC-002",
            "weight": 0.05,
            "dimensions": {"length": 90, "width": 90, "height": 0.1},
            "is_featured": True,
            "is_new": True,
            "is_sale": False,
            "is_flash_sale": False,
            "is_luxury_deal": False
        },
        {
            "name": "Gold Plated Watch",
            "slug": "gold-plated-watch",
            "description": "Elegant gold-plated watch with chronograph function, sapphire crystal, and genuine leather strap.",
            "price": 59999,
            "sale_price": None,
            "stock": 15,
            "category_id": category_objects["watches"].id,
            "brand_id": brand_objects["swarovski"].id,
            "image_urls": ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&q=80"],
            "thumbnail_url": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=300&h=300&fit=crop",
            "sku": "WAT-005",
            "weight": 0.15,
            "dimensions": {"length": 24, "width": 4, "height": 1},
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

    for product_data in all_products:
        product = Product(**product_data)
        db.session.add(product)
        db.session.flush()
        product_objects[product.slug] = product

    # Commit products before creating variants
    db.session.commit()
    print("Products created successfully")

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
                "image_urls": gold_chain_product.image_urls
            },
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-18",
                "color": "Yellow Gold",
                "size": '18"',
                "stock": 8,
                "price": gold_chain_product.price,
                "image_urls": gold_chain_product.image_urls
            },
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-20",
                "color": "White Gold",
                "size": '20"',
                "stock": 6,
                "price": gold_chain_product.price + 2000,
                "image_urls": gold_chain_product.image_urls
            },
            {
                "product_id": gold_chain_product.id,
                "sku": f"{gold_chain_product.sku}-24",
                "color": "Rose Gold",
                "size": '24"',
                "stock": 4,
                "price": gold_chain_product.price + 5000,
                "image_urls": gold_chain_product.image_urls
            }
        ]

        for variant_data in variants:
            variant = ProductVariant(**variant_data)
            db.session.add(variant)

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
        }
    ]

    for coupon_data in coupons:
        coupon = Coupon(**coupon_data)
        db.session.add(coupon)

    # Create newsletter subscribers
    print("Creating newsletter subscribers...")
    newsletters = [
        {"email": "subscriber1@example.com", "is_subscribed": True},
        {"email": "subscriber2@example.com", "is_subscribed": True},
        {"email": "subscriber3@example.com", "is_subscribed": True},
        {"email": "unsubscribed@example.com", "is_subscribed": False}
    ]

    for newsletter_data in newsletters:
        newsletter = Newsletter(**newsletter_data)
        db.session.add(newsletter)

    # Commit all changes
    db.session.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_database()