import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.models import CustomProduct, UserStandard
from app.nutrition.food_db import find_in_food_database, normalize_food_name
from app.nutrition.calculator import calculate_weight_in_grams, compute_nutrition
from app.nutrition.openfoodfacts import search_open_food_facts
from app.schemas.nutrition import ParsedItem, CalculatedItem, CalculatedMeal

logger = logging.getLogger(__name__)


class NutritionService:
    @staticmethod
    async def resolve_item_nutrients(
        session: AsyncSession,
        user_id: int,
        item: ParsedItem,
    ) -> CalculatedItem:
        """
        Разрешает КБЖУ продукта:
        1. Проверяет рецепты и кастомные продукты пользователя в БД
        2. Проверяет стандарты пользователя (например яйцо = 70г)
        3. Ищет в локальной базе продуктов
        4. Ищет в Open Food Facts
        5. При отсутствии использует приблизительные данные с пометкой estimated
        Математический расчёт выполняется строго в Python.
        """
        norm_name = normalize_food_name(item.name)

        # 1. Поиск в пользовательских кастомных продуктах и рецептах
        stmt = select(CustomProduct).where(
            CustomProduct.user_id == user_id,
            (CustomProduct.name.ilike(f"%{norm_name}%")) | (CustomProduct.aliases.ilike(f"%{norm_name}%"))
        )
        result = await session.execute(stmt)
        custom_prod = result.scalars().first()

        # 2. Поиск стандартов пользователя (например яйцо = 70 г)
        std_stmt = select(UserStandard).where(
            UserStandard.user_id == user_id,
            UserStandard.item_name.ilike(f"%{norm_name}%")
        )
        std_res = await session.execute(std_stmt)
        user_standard = std_res.scalars().first()
        user_std_grams = user_standard.standard_grams if user_standard else None

        # Если это сохраненный рецепт (например "мой шейк")
        if custom_prod and custom_prod.is_recipe and custom_prod.recipe_items_json:
            try:
                recipe_ingredients = json.loads(custom_prod.recipe_items_json)
                total_grams = sum(float(i.get("grams", 100)) for i in recipe_ingredients) * item.quantity
                c = round(custom_prod.calories_100g * (total_grams / 100.0), 1)
                p = round(custom_prod.protein_100g * (total_grams / 100.0), 1)
                f = round(custom_prod.fat_100g * (total_grams / 100.0), 1)
                cb = round(custom_prod.carbs_100g * (total_grams / 100.0), 1)

                return CalculatedItem(
                    name=custom_prod.name,
                    quantity=item.quantity,
                    unit=item.unit,
                    weight_grams=round(total_grams, 1),
                    calories=c,
                    protein=p,
                    fat=f,
                    carbs=cb,
                    confidence="high",
                    is_estimated=False,
                    source="custom_recipe"
                )
            except Exception as e:
                logger.error("Error parsing recipe json: %s", str(e))

        # Если это обычный кастомный продукт пользователя
        if custom_prod:
            weight_g = calculate_weight_in_grams(
                quantity=item.quantity,
                unit=item.unit,
                user_standard_grams=user_std_grams,
                fallback_grams=item.estimated_grams
            )
            c, p, f, cb = compute_nutrition(
                weight_g,
                custom_prod.calories_100g,
                custom_prod.protein_100g,
                custom_prod.fat_100g,
                custom_prod.carbs_100g
            )
            return CalculatedItem(
                name=custom_prod.name,
                quantity=item.quantity,
                unit=item.unit,
                weight_grams=weight_g,
                calories=c,
                protein=p,
                fat=f,
                carbs=cb,
                confidence="high",
                is_estimated=item.estimated,
                source="custom_product"
            )

        # 3. Поиск в локальной базе продуктов
        local_match = find_in_food_database(item.name)
        if local_match:
            _, food_data = local_match
            weight_g = calculate_weight_in_grams(
                quantity=item.quantity,
                unit=item.unit,
                food_data=food_data,
                user_standard_grams=user_std_grams,
                fallback_grams=item.estimated_grams
            )
            c, p, f, cb = compute_nutrition(
                weight_g,
                food_data["calories"],
                food_data["protein"],
                food_data["fat"],
                food_data["carbs"]
            )
            return CalculatedItem(
                name=food_data["name"],
                quantity=item.quantity,
                unit=item.unit,
                weight_grams=weight_g,
                calories=c,
                protein=p,
                fat=f,
                carbs=cb,
                confidence=item.confidence,
                is_estimated=item.estimated,
                source="local"
            )

        # 4. Поиск в Open Food Facts
        off_data = await search_open_food_facts(item.name)
        if off_data:
            weight_g = calculate_weight_in_grams(
                quantity=item.quantity,
                unit=item.unit,
                user_standard_grams=user_std_grams,
                fallback_grams=item.estimated_grams
            )
            c, p, f, cb = compute_nutrition(
                weight_g,
                off_data["calories"],
                off_data["protein"],
                off_data["fat"],
                off_data["carbs"]
            )
            return CalculatedItem(
                name=off_data["name"],
                quantity=item.quantity,
                unit=item.unit,
                weight_grams=weight_g,
                calories=c,
                protein=p,
                fat=f,
                carbs=cb,
                confidence="medium",
                is_estimated=True,
                source="openfoodfacts"
            )

        # 5. Оценочные средние значения (усредненное блюдо ~150 ккал на 100 г)
        weight_g = calculate_weight_in_grams(
            quantity=item.quantity,
            unit=item.unit,
            user_standard_grams=user_std_grams,
            fallback_grams=item.estimated_grams or 100.0
        )
        c, p, f, cb = compute_nutrition(
            weight_g,
            calories_100g=150.0,
            protein_100g=6.0,
            fat_100g=5.0,
            carbs_100g=20.0
        )
        return CalculatedItem(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            weight_grams=weight_g,
            calories=c,
            protein=p,
            fat=f,
            carbs=cb,
            confidence="low",
            is_estimated=True,
            source="estimated"
        )

    @classmethod
    async def calculate_meal_totals(
        cls,
        session: AsyncSession,
        user_id: int,
        date_str: str,
        meal_type: str,
        items: List[ParsedItem],
        photo_file_id: Optional[str] = None,
        photo_url: Optional[str] = None,
    ) -> CalculatedMeal:
        """Рассчитывает КБЖУ для всех продуктов в приеме пищи."""
        calculated_items: List[CalculatedItem] = []

        total_c = 0.0
        total_p = 0.0
        total_f = 0.0
        total_cb = 0.0

        for it in items:
            calc_it = await cls.resolve_item_nutrients(session, user_id, it)
            calculated_items.append(calc_it)
            total_c += calc_it.calories
            total_p += calc_it.protein
            total_f += calc_it.fat
            total_cb += calc_it.carbs

        return CalculatedMeal(
            date=date_str,
            meal_type=meal_type,
            items=calculated_items,
            total_calories=round(total_c, 1),
            total_protein=round(total_p, 1),
            total_fat=round(total_f, 1),
            total_carbs=round(total_cb, 1),
            photo_file_id=photo_file_id,
            photo_url=photo_url,
        )
