"""
UI Data Service for Mizizzi E-commerce
Handles fetching and caching of carousel, categories, and other UI component data.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class UIDataService:
    """Service for managing UI component data with caching."""
    
    @staticmethod
    def get_carousel_data() -> Dict[str, Any]:
        """
        Get carousel data with featured, flash sale, and new products.
        Uses Redis caching with 60-second TTL.
        """
        try:
            from ..models.models import Product
            from ..utils.redis_cache_helper import redis_cache, get_carousel_cache_key
            
            cache_key = get_carousel_cache_key()
            
            # Try cache first
            cached = redis_cache.get(cache_key)
            if cached:
                return cached
            
            logger.info("[v0] Fetching carousel data from database")
            
            # Fetch featured products
            featured = Product.query.filter_by(
                is_active=True,
                is_featured=True
            ).limit(8).all()
            
            # Fetch flash sale products
            flash_sales = Product.query.filter_by(
                is_active=True,
                is_flash_sale=True
            ).limit(4).all()
            
            # Fetch new products
            new_arrivals = Product.query.filter_by(
                is_active=True,
                is_new=True
            ).limit(6).all()
            
            carousel_data = {
                "featured": [p.to_dict() if hasattr(p, 'to_dict') else {} for p in featured],
                "flash_sales": [p.to_dict() if hasattr(p, 'to_dict') else {} for p in flash_sales],
                "new_arrivals": [p.to_dict() if hasattr(p, 'to_dict') else {} for p in new_arrivals],
                "total_items": len(featured) + len(flash_sales) + len(new_arrivals)
            }
            
            # Cache for 60 seconds
            redis_cache.set(cache_key, carousel_data, ttl=60)
            logger.info("[v0] Carousel data cached for 60 seconds")
            
            return carousel_data
        except Exception as e:
            logger.error(f"Error fetching carousel data: {str(e)}")
            return {
                "featured": [],
                "flash_sales": [],
                "new_arrivals": [],
                "total_items": 0,
                "error": str(e)
            }
    
    @staticmethod
    def get_categories_data() -> Dict[str, Any]:
        """
        Get categories data with featured categories.
        Uses Redis caching with 300-second TTL.
        """
        try:
            from ..models.models import Category
            from ..utils.redis_cache_helper import redis_cache, get_categories_cache_key
            
            cache_key = get_categories_cache_key()
            
            # Try cache first
            cached = redis_cache.get(cache_key)
            if cached:
                return cached
            
            logger.info("[v0] Fetching categories data from database")
            
            # Fetch featured categories
            featured_cats = Category.query.filter_by(is_featured=True).limit(10).all()
            
            # Fetch all parent categories
            parent_cats = Category.query.filter_by(parent_id=None).all()
            
            categories_data = {
                "featured": [c.to_dict() for c in featured_cats if c],
                "parents": [c.to_dict() for c in parent_cats if c],
                "total_featured": len(featured_cats),
                "total_categories": Category.query.count()
            }
            
            # Cache for 300 seconds
            redis_cache.set(cache_key, categories_data, ttl=300)
            logger.info("[v0] Categories data cached for 300 seconds")
            
            return categories_data
        except Exception as e:
            logger.error(f"Error fetching categories data: {str(e)}")
            return {
                "featured": [],
                "parents": [],
                "total_featured": 0,
                "total_categories": 0,
                "error": str(e)
            }
    
    @staticmethod
    def get_topbar_data() -> Dict[str, Any]:
        """
        Get topbar data (announcements, promotions).
        Uses Redis caching with 120-second TTL.
        """
        try:
            from ..utils.redis_cache_helper import redis_cache, get_topbar_cache_key
            
            cache_key = get_topbar_cache_key()
            
            # Try cache first
            cached = redis_cache.get(cache_key)
            if cached:
                return cached
            
            logger.info("[v0] Fetching topbar data")
            
            topbar_data = {
                "active": True,
                "items": [
                    {
                        "id": 1,
                        "text": "Free shipping on orders over $50!",
                        "type": "promotion"
                    },
                    {
                        "id": 2,
                        "text": "New collection just arrived",
                        "type": "announcement"
                    }
                ]
            }
            
            # Cache for 120 seconds
            redis_cache.set(cache_key, topbar_data, ttl=120)
            logger.info("[v0] Topbar data cached for 120 seconds")
            
            return topbar_data
        except Exception as e:
            logger.error(f"Error fetching topbar data: {str(e)}")
            return {
                "active": True,
                "items": [],
                "error": str(e)
            }
    
    @staticmethod
    def get_side_panels_data() -> Dict[str, Any]:
        """
        Get side panels data (featured categories, filters).
        Uses Redis caching with 300-second TTL.
        """
        try:
            from ..models.models import Category
            from ..utils.redis_cache_helper import redis_cache, get_side_panels_cache_key
            
            cache_key = get_side_panels_cache_key()
            
            # Try cache first
            cached = redis_cache.get(cache_key)
            if cached:
                return cached
            
            logger.info("[v0] Fetching side panels data")
            
            # Get featured categories for sidebar
            featured_cats = Category.query.filter_by(is_featured=True).limit(5).all()
            
            side_panels_data = {
                "active": True,
                "featured_categories": [c.to_dict() for c in featured_cats if c],
                "filters": {
                    "price_ranges": [
                        {"min": 0, "max": 50, "label": "Under $50"},
                        {"min": 50, "max": 100, "label": "$50 - $100"},
                        {"min": 100, "max": 500, "label": "$100 - $500"},
                        {"min": 500, "max": None, "label": "Over $500"}
                    ],
                    "rating": [1, 2, 3, 4, 5]
                }
            }
            
            # Cache for 300 seconds
            redis_cache.set(cache_key, side_panels_data, ttl=300)
            logger.info("[v0] Side panels data cached for 300 seconds")
            
            return side_panels_data
        except Exception as e:
            logger.error(f"Error fetching side panels data: {str(e)}")
            return {
                "active": True,
                "featured_categories": [],
                "filters": {},
                "error": str(e)
            }
    
    @staticmethod
    def get_all_ui_data() -> Dict[str, Any]:
        """
        Get all UI component data in a single call.
        Efficient batch loading with individual caching.
        """
        logger.info("[v0] Batch loading all UI component data")
        
        return {
            "carousel": UIDataService.get_carousel_data(),
            "categories": UIDataService.get_categories_data(),
            "topbar": UIDataService.get_topbar_data(),
            "side_panels": UIDataService.get_side_panels_data(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    @staticmethod
    def invalidate_all_caches() -> Dict[str, bool]:
        """Invalidate all UI component caches."""
        try:
            from ..utils.redis_cache_helper import invalidate_ui_cache
            count = invalidate_ui_cache()
            logger.info(f"[v0] Invalidated {count} UI caches")
            return {"success": True, "invalidated": count}
        except Exception as e:
            logger.error(f"Error invalidating caches: {str(e)}")
            return {"success": False, "error": str(e)}
