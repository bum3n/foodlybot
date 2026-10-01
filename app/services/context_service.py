import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database.models import User, Meal, MealItem, CustomProduct, UserStandard, ConversationContext
from app.schemas.nutrition import AIParsedFoodResponse, CalculatedMeal, ParsedItem
from app.services.nutrition_service import NutritionService
from app.services.diary_service import DiaryService

logger = logging.getLogger(__name__)


class ContextService:
    @staticmethod
    async def get_user_context(session: AsyncSession, user_id: int) -> Optional[Dict[str, Any]]:
        stmt = select(ConversationContext).where(ConversationContext.user_id == user_id)
        res = await session.execute(stmt)
        ctx = res.scalars().first()
        if not ctx or not ctx.context_data_json:
            return None
        try:
            return json.loads(ctx.context_data_json)
        except Exception:
            return None

    @staticmethod
    async def save_user_context(
        session: AsyncSession,
        user_id: int,
        last_meal_id: Optional[int],
        action: str,
        context_data: Dict[str, Any],
        pending_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        stmt = select(ConversationContext).where(ConversationContext.user_id == user_id)
        res = await session.execute(stmt)
        ctx = res.scalars().first()
        if not ctx:
            ctx = ConversationContext(
                user_id=user_id,
                last_meal_id=last_meal_id,
                last_action=action,
                context_data_json=json.dumps(context_data, ensure_ascii=False),
                pending_parsed_data_json=json.dumps(pending_data, ensure_ascii=False) if pending_data else None,
            )
            session.add(ctx)
        else:
            ctx.last_meal_id = last_meal_id
            ctx.last_action = action
            ctx.context_data_json = json.dumps(context_data, ensure_ascii=False)
            if pending_data is not None:
                ctx.pending_parsed_data_json = json.dumps(pending_data, ensure_ascii=False)
        await session.commit()

    @staticmethod
    async def handle_intent(
        session: AsyncSession,
        user_id: int,
        parsed: AIParsedFoodResponse,
    ) -> Tuple[str, Optional[CalculatedMeal]]:
        """
        Обработка специфических намерений:
        - create_recipe
        - create_standard
        - delete_last_item
        - modify_quantity
        - repeat_yesterday
        - append_to_last
        - add_meal
        """
        # 1. Запоминание рецепта (например: "мой шейк")
        if parsed.intent == "create_recipe" and parsed.recipe_name and parsed.recipe_ingredients:
            # Calculate total nutrients for ingredients
            total_g = sum(i.grams for i in parsed.recipe_ingredients)
            total_cal = 0.0
            total_p = 0.0
            total_f = 0.0
            total_cb = 0.0

            for ing in parsed.recipe_ingredients:
                dummy_item = ParsedItem(name=ing.name, quantity=ing.quantity, unit=ing.unit)
                res = await NutritionService.resolve_item_nutrients(session, user_id, dummy_item)
                total_cal += res.calories
                total_p += res.protein
                total_f += res.fat
                total_cb += res.carbs

            # Per 100g values
            ratio = (100.0 / total_g) if total_g > 0 else 1.0
            c100 = round(total_cal * ratio, 1)
            p100 = round(total_p * ratio, 1)
            f100 = round(total_f * ratio, 1)
            cb100 = round(total_cb * ratio, 1)

            custom_prod = CustomProduct(
                user_id=user_id,
                name=parsed.recipe_name.lower().strip(),
                aliases=parsed.recipe_name.lower().strip(),
                calories_100g=c100,
                protein_100g=p100,
                fat_100g=f100,
                carbs_100g=cb100,
                is_recipe=True,
                recipe_items_json=json.dumps([i.model_dump() for i in parsed.recipe_ingredients], ensure_ascii=False),
            )
            session.add(custom_prod)
            await session.commit()
            msg = f"✅ Рецепт «{parsed.recipe_name}» сохранен! Теперь можно просто написать «выпил {parsed.recipe_name}»."
            return msg, None

        # 2. Запоминание стандарта (например: "яйцо у меня обычно 70 грамм")
        if parsed.intent == "create_standard" and parsed.standard_item_name and parsed.standard_grams:
            item_n = parsed.standard_item_name.lower().strip()
            # Check existing standard
            st_stmt = select(UserStandard).where(
                UserStandard.user_id == user_id,
                UserStandard.item_name == item_n
            )
            st_res = await session.execute(st_stmt)
            existing_std = st_res.scalars().first()
            if existing_std:
                existing_std.standard_grams = parsed.standard_grams
            else:
                new_std = UserStandard(
                    user_id=user_id,
                    item_name=item_n,
                    standard_grams=parsed.standard_grams,
                    standard_unit="pcs",
                )
                session.add(new_std)
            await session.commit()
            msg = f"✅ Запомнил! Стандартный вес для «{parsed.standard_item_name}» теперь {parsed.standard_grams:g} г."
            return msg, None

        # 3. Удаление последнего продукта ("удали последний продукт")
        if parsed.intent == "delete_last_item":
            last_item_stmt = (
                select(MealItem)
                .join(Meal)
                .where(Meal.user_id == user_id)
                .order_by(desc(MealItem.id))
            )
            last_res = await session.execute(last_item_stmt)
            last_item = last_res.scalars().first()
            if last_item:
                deleted_name = last_item.name
                await DiaryService.delete_item(session, user_id, last_item.id)
                return f"🗑 Удален последний продукт: «{deleted_name}».", None
            return "В дневнике пока нет продуктов для удаления.", None

        # 4. Исправление количества ("исправь банан на 150 грамм" или "там было 300 грамм")
        if parsed.intent == "modify_quantity" and parsed.new_quantity:
            target_name = (parsed.target_product_name or "").lower().strip()
            # Find item to modify
            query = select(MealItem).join(Meal).where(Meal.user_id == user_id).order_by(desc(MealItem.id))
            items_res = await session.execute(query)
            all_recent_items = items_res.scalars().all()

            matched_item = None
            if target_name:
                for it in all_recent_items:
                    if target_name in it.name.lower():
                        matched_item = it
                        break
            if not matched_item and all_recent_items:
                matched_item = all_recent_items[0]

            if matched_item:
                old_q = matched_item.quantity
                updated = await DiaryService.update_item_quantity(
                    session, user_id, matched_item.id, parsed.new_quantity
                )
                if updated:
                    return (
                        f"✏️ Исправлено: «{updated.name}» с {old_q:g} {updated.unit} на {updated.quantity:g} {updated.unit} "
                        f"({updated.calories:g} ккал).",
                        None
                    )
            return "Не удалось найти подходящий продукт для исправления.", None

        # 5. Повторить вчерашний прием пищи ("то же самое, что вчера на обед")
        if parsed.intent == "repeat_yesterday":
            yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            y_stmt = select(Meal).where(
                Meal.user_id == user_id,
                Meal.date == yesterday_str,
                Meal.meal_type == parsed.meal
            )
            y_res = await session.execute(y_stmt)
            prev_meal = y_res.scalars().first()
            if prev_meal:
                # Load items
                i_stmt = select(MealItem).where(MealItem.meal_id == prev_meal.id)
                i_res = await session.execute(i_stmt)
                prev_items = i_res.scalars().all()
                new_parsed_items = [
                    ParsedItem(name=it.name, quantity=it.quantity, unit=it.unit)
                    for it in prev_items
                ]
                calc = await NutritionService.calculate_meal_totals(
                    session, user_id, parsed.date, parsed.meal, new_parsed_items
                )
                return "Повторяем вчерашний прием пищи", calc

        # 6. Обычное добавление или дополнение («И ещё банан»)
        calc_meal = await NutritionService.calculate_meal_totals(
            session=session,
            user_id=user_id,
            date_str=parsed.date,
            meal_type=parsed.meal,
            items=parsed.items,
        )
        return "Успешно распознано", calc_meal
