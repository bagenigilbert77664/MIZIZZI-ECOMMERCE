"""
Real-time Search Analytics Service
Production-ready analytics with performance monitoring
"""

import logging
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from sqlalchemy import func, text
import json

from ..app.models.models import db, Product, Category, Brand
from ..app.models.search_analytics import (
    SearchQuery, SearchClick, SearchConversion,
    SearchSuggestion, SearchPerformanceMetric
)

logger = logging.getLogger(__name__)

class SearchAnalyticsService:
    """Comprehensive search analytics service"""

    def __init__(self):
        self.daily_metrics_cache = {}
        self.last_cache_update = None

    def log_search_query(self, query_data):
        """Log search query with comprehensive data"""
        try:
            search_query = SearchQuery(
                query_text=query_data.get('query', ''),
                user_id=query_data.get('user_id'),
                session_id=query_data.get('session_id'),
                results_count=query_data.get('results_count', 0),
                filters_used=query_data.get('filters', {}),
                response_time_ms=query_data.get('response_time_ms', 0),
                user_agent=query_data.get('user_agent'),
                ip_address=query_data.get('ip_address')
            )

            db.session.add(search_query)
            db.session.commit()

            # Update suggestion counts
            if query_data.get('query'):
                self._update_suggestion_popularity(query_data['query'])

            return search_query.id

        except Exception as e:
            logger.error(f"Error logging search query: {e}")
            db.session.rollback()
            return None

    def log_search_click(self, search_query_id, product_id, position):
        """Log product click from search results"""
        try:
            search_click = SearchClick(
                search_query_id=search_query_id,
                product_id=product_id,
                click_position=position
            )

            db.session.add(search_click)
            db.session.commit()

            logger.info(f"Logged click: query_id={search_query_id}, product_id={product_id}, position={position}")

        except Exception as e:
            logger.error(f"Error logging search click: {e}")
            db.session.rollback()

    def log_search_conversion(self, search_query_id, order_id, conversion_value):
        """Log conversion from search to purchase"""
        try:
            search_conversion = SearchConversion(
                search_query_id=search_query_id,
                order_id=order_id,
                conversion_value=conversion_value
            )

            db.session.add(search_conversion)

            # Mark original search as converted
            db.session.query(SearchQuery).filter(
                SearchQuery.id == search_query_id
            ).update({'converted': True})

            db.session.commit()

            logger.info(f"Logged conversion: query_id={search_query_id}, order_id={order_id}, value={conversion_value}")

        except Exception as e:
            logger.error(f"Error logging search conversion: {e}")
            db.session.rollback()

    def _update_suggestion_popularity(self, query_text):
        """Update search suggestion popularity"""
        try:
            # Check if suggestion exists
            suggestion = db.session.query(SearchSuggestion).filter(
                SearchSuggestion.suggestion_text == query_text.lower()
            ).first()

            if suggestion:
                suggestion.search_count += 1
                suggestion.last_searched = datetime.utcnow()
            else:
                suggestion = SearchSuggestion(
                    suggestion_text=query_text.lower(),
                    search_count=1
                )
                db.session.add(suggestion)

            db.session.commit()

        except Exception as e:
            logger.error(f"Error updating suggestion popularity: {e}")
            db.session.rollback()

    def get_trending_searches(self, days=7, limit=20):
        """Get trending search terms with real analytics"""
        try:
            result = db.session.query(
                SearchQuery.query_text,
                func.count(SearchQuery.id).label('search_count'),
                func.avg(SearchQuery.results_count).label('avg_results'),
                func.count(func.distinct(SearchQuery.user_id)).label('unique_users'),
                func.count(func.distinct(SearchQuery.session_id)).label('unique_sessions'),
                func.avg(SearchQuery.response_time_ms).label('avg_response_time')
            ).filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days),
                SearchQuery.query_text != '',
                func.length(SearchQuery.query_text) > 2
            ).group_by(SearchQuery.query_text)\
             .having(func.count(SearchQuery.id) > 1)\
             .order_by(func.count(SearchQuery.id).desc())\
             .limit(limit).all()

            trending = []
            for row in result:
                trending.append({
                    'term': row.query_text,
                    'search_count': row.search_count,
                    'avg_results': float(row.avg_results) if row.avg_results else 0,
                    'unique_users': row.unique_users,
                    'unique_sessions': row.unique_sessions,
                    'avg_response_time': float(row.avg_response_time) if row.avg_response_time else 0
                })

            return trending

        except Exception as e:
            logger.error(f"Error getting trending searches: {e}")
            return []

    def get_search_performance_metrics(self, days=30):
        """Get comprehensive search performance metrics"""
        try:
            # Overall metrics
            overall_stats = db.session.query(
                func.count(SearchQuery.id).label('total_searches'),
                func.count(func.distinct(SearchQuery.user_id)).label('unique_users'),
                func.avg(SearchQuery.response_time_ms).label('avg_response_time'),
                func.avg(SearchQuery.results_count).label('avg_results_count'),
                func.count(SearchQuery.id).filter(SearchQuery.results_count == 0).label('zero_results'),
                func.count(SearchQuery.id).filter(SearchQuery.converted == True).label('conversions')
            ).filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days)
            ).first()

            # Daily breakdown
            daily_stats = db.session.query(
                func.date(SearchQuery.search_time).label('date'),
                func.count(SearchQuery.id).label('searches'),
                func.count(func.distinct(SearchQuery.user_id)).label('unique_users'),
                func.avg(SearchQuery.response_time_ms).label('avg_response_time'),
                func.count(SearchQuery.id).filter(SearchQuery.results_count == 0).label('zero_results'),
                func.count(SearchQuery.id).filter(SearchQuery.converted == True).label('conversions')
            ).filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days)
            ).group_by(func.date(SearchQuery.search_time))\
             .order_by(func.date(SearchQuery.search_time)).all()

            # Click-through rates
            ctr_stats = db.session.query(
                func.count(SearchQuery.id).label('total_searches'),
                func.count(SearchClick.id).label('total_clicks')
            ).outerjoin(SearchClick, SearchQuery.id == SearchClick.search_query_id)\
             .filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days)
             ).first()

            # Top performing queries
            top_queries = db.session.query(
                SearchQuery.query_text,
                func.count(SearchQuery.id).label('searches'),
                func.count(SearchClick.id).label('clicks'),
                func.count(SearchConversion.id).label('conversions')
            ).outerjoin(SearchClick, SearchQuery.id == SearchClick.search_query_id)\
             .outerjoin(SearchConversion, SearchQuery.id == SearchConversion.search_query_id)\
             .filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days),
                SearchQuery.query_text != ''
             ).group_by(SearchQuery.query_text)\
              .having(func.count(SearchQuery.id) >= 5)\
              .order_by(func.count(SearchConversion.id).desc())\
              .limit(10).all()

            return {
                'overall': {
                    'total_searches': overall_stats.total_searches or 0,
                    'unique_users': overall_stats.unique_users or 0,
                    'avg_response_time': float(overall_stats.avg_response_time) if overall_stats.avg_response_time else 0,
                    'avg_results_count': float(overall_stats.avg_results_count) if overall_stats.avg_results_count else 0,
                    'zero_results_rate': (overall_stats.zero_results / overall_stats.total_searches * 100) if overall_stats.total_searches else 0,
                    'conversion_rate': (overall_stats.conversions / overall_stats.total_searches * 100) if overall_stats.total_searches else 0
                },
                'daily_breakdown': [
                    {
                        'date': str(row.date),
                        'searches': row.searches,
                        'unique_users': row.unique_users,
                        'avg_response_time': float(row.avg_response_time) if row.avg_response_time else 0,
                        'zero_results_rate': (row.zero_results / row.searches * 100) if row.searches else 0,
                        'conversion_rate': (row.conversions / row.searches * 100) if row.searches else 0
                    }
                    for row in daily_stats
                ],
                'click_through_rate': (ctr_stats.total_clicks / ctr_stats.total_searches * 100) if ctr_stats.total_searches else 0,
                'top_performing_queries': [
                    {
                        'query': row.query_text,
                        'searches': row.searches,
                        'clicks': row.clicks,
                        'conversions': row.conversions,
                        'ctr': (row.clicks / row.searches * 100) if row.searches else 0,
                        'conversion_rate': (row.conversions / row.searches * 100) if row.searches else 0
                    }
                    for row in top_queries
                ]
            }

        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {}

    def get_popular_suggestions(self, query_prefix, limit=10):
        """Get popular search suggestions based on real usage data"""
        try:
            suggestions = db.session.query(SearchSuggestion).filter(
                SearchSuggestion.suggestion_text.like(f"{query_prefix.lower()}%")
            ).order_by(
                SearchSuggestion.search_count.desc(),
                SearchSuggestion.last_searched.desc()
            ).limit(limit).all()

            return [
                {
                    'text': suggestion.suggestion_text,
                    'count': suggestion.search_count,
                    'last_searched': suggestion.last_searched.isoformat()
                }
                for suggestion in suggestions
            ]

        except Exception as e:
            logger.error(f"Error getting popular suggestions: {e}")
            return []

    def get_search_funnel_analysis(self, days=30):
        """Analyze search to purchase funnel"""
        try:
            # Search funnel stages
            funnel_data = db.session.query(
                func.count(SearchQuery.id).label('searches'),
                func.count(SearchClick.id).label('clicks'),
                func.count(SearchConversion.id).label('conversions'),
                func.sum(SearchConversion.conversion_value).label('total_revenue')
            ).outerjoin(SearchClick, SearchQuery.id == SearchClick.search_query_id)\
             .outerjoin(SearchConversion, SearchQuery.id == SearchConversion.search_query_id)\
             .filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days)
             ).first()

            # Category performance
            category_performance = db.session.query(
                Category.name.label('category'),
                func.count(SearchQuery.id).label('searches'),
                func.count(SearchClick.id).label('clicks'),
                func.count(SearchConversion.id).label('conversions')
            ).join(SearchClick, SearchQuery.id == SearchClick.search_query_id)\
             .join(Product, SearchClick.product_id == Product.id)\
             .join(Category, Product.category_id == Category.id)\
             .outerjoin(SearchConversion, SearchQuery.id == SearchConversion.search_query_id)\
             .filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days)
             ).group_by(Category.name)\
              .order_by(func.count(SearchConversion.id).desc())\
              .limit(10).all()

            return {
                'funnel_overview': {
                    'searches': funnel_data.searches or 0,
                    'clicks': funnel_data.clicks or 0,
                    'conversions': funnel_data.conversions or 0,
                    'total_revenue': float(funnel_data.total_revenue) if funnel_data.total_revenue else 0,
                    'search_to_click_rate': (funnel_data.clicks / funnel_data.searches * 100) if funnel_data.searches else 0,
                    'click_to_conversion_rate': (funnel_data.conversions / funnel_data.clicks * 100) if funnel_data.clicks else 0,
                    'search_to_conversion_rate': (funnel_data.conversions / funnel_data.searches * 100) if funnel_data.searches else 0
                },
                'category_performance': [
                    {
                        'category': row.category,
                        'searches': row.searches,
                        'clicks': row.clicks,
                        'conversions': row.conversions,
                        'conversion_rate': (row.conversions / row.searches * 100) if row.searches else 0
                    }
                    for row in category_performance
                ]
            }

        except Exception as e:
            logger.error(f"Error getting funnel analysis: {e}")
            return {}

    def generate_daily_metrics(self):
        """Generate and cache daily performance metrics"""
        try:
            today = datetime.utcnow().date()

            # Check if already generated for today
            existing_metric = db.session.query(SearchPerformanceMetric).filter(
                func.date(SearchPerformanceMetric.date) == today
            ).first()

            if existing_metric:
                return existing_metric

            # Calculate today's metrics
            today_stats = db.session.query(
                func.count(SearchQuery.id).label('total_searches'),
                func.count(func.distinct(SearchQuery.user_id)).label('unique_users'),
                func.avg(SearchQuery.response_time_ms).label('avg_response_time'),
                func.count(SearchQuery.id).filter(SearchQuery.results_count == 0).label('zero_results'),
                func.count(SearchQuery.id).filter(SearchQuery.converted == True).label('conversions'),
                func.sum(SearchConversion.conversion_value).label('total_revenue')
            ).outerjoin(SearchConversion, SearchQuery.id == SearchConversion.search_query_id)\
             .filter(
                func.date(SearchQuery.search_time) == today
             ).first()

            # Create daily metric record
            daily_metric = SearchPerformanceMetric(
                date=datetime.combine(today, datetime.min.time()),
                total_searches=today_stats.total_searches or 0,
                unique_users=today_stats.unique_users or 0,
                avg_response_time=today_stats.avg_response_time or 0,
                zero_results_count=today_stats.zero_results or 0,
                conversion_count=today_stats.conversions or 0,
                total_revenue=today_stats.total_revenue or 0
            )

            db.session.add(daily_metric)
            db.session.commit()

            logger.info(f"Generated daily metrics for {today}")
            return daily_metric

        except Exception as e:
            logger.error(f"Error generating daily metrics: {e}")
            db.session.rollback()
            return None

# Global analytics service instance
analytics_service = SearchAnalyticsService()
