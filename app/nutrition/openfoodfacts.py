"""
Асинхронный клиент для Open Food Facts API с кэшированием в памяти.
"""

import aiohttp
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

# Кэш в памяти: {normalized_query: food_data_dict}
_OFF_CACHE: Dict[str, Optional[Dict[str, Any]]] = {}


async def search_open_food_facts(query: str) -> Optional[Dict[str, Any]]:
    """
    Поиск продукта в Open Food Facts API.
    Возвращает словарь с КБЖУ на 100 г или None при отсутствии/ошибке.
    """
    clean_query = query.strip().lower()
    if clean_query in _OFF_CACHE:
        return _OFF_CACHE[clean_query]

    url = "https://world.openfoodfacts.org/cgi/search.pl"
    params = {
        "search_terms": clean_query,
        "search_simple": "1",
        "action": "process",
        "json": "1",
        "page_size": "5",
        "fields": "product_name,nutriments,serving_quantity,serving_size",
    }
    headers = {
        "User-Agent": settings.OPENFOODFACTS_USER_AGENT
    }

    try:
        timeout = aiohttp.ClientTimeout(total=4.0)
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    logger.warning("Open Food Facts returned status %d for query %s", resp.status, query)
                    _OFF_CACHE[clean_query] = None
                    return None

                data = await resp.json()
                products = data.get("products", [])
                if not products:
                    _OFF_CACHE[clean_query] = None
                    return None

                # Ищем первый продукт с валидными нутриентами
                for p in products:
                    nutr = p.get("nutriments", {})
                    # OFF может возвращать energy-kcal_100g или energy-kcal
                    kcal = nutr.get("energy-kcal_100g") or nutr.get("energy-kcal")
                    prot = nutr.get("proteins_100g") or nutr.get("proteins")
                    fat = nutr.get("fat_100g") or nutr.get("fat")
                    carb = nutr.get("carbohydrates_100g") or nutr.get("carbohydrates")

                    if kcal is not None:
                        result = {
                            "name": p.get("product_name") or query,
                            "calories": float(kcal),
                            "protein": float(prot or 0.0),
                            "fat": float(fat or 0.0),
                            "carbs": float(carb or 0.0),
                            "source": "openfoodfacts",
                        }
                        _OFF_CACHE[clean_query] = result
                        return result

    except Exception as e:
        logger.error("Error querying Open Food Facts: %s", str(e))

    _OFF_CACHE[clean_query] = None
    return None
