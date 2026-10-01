from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc, func

from app.database.models import User, Meal, MealItem, CustomProduct, UserStandard, ConversationContext
from app.schemas.nutrition import CalculatedMeal, DayDiaryOut, MealOut, MealItemOut, DayTotals, UserGoalsOut


class DiaryService:
    @staticmethod
    async def get_or_create_user(
        session: AsyncSession,
        telegram_id: int,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
    ) -> User:
        user = await session.get(User, telegram_id)
        if not user:
            user = User(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                calorie_goal=2000,
                protein_goal=120,
                fat_goal=65,
                carb_goal=220,
                auto_confirm=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        else:
            # Update username if changed
            if username and user.username != username:
                user.username = username
            if first_name and user.first_name != first_name:
                user.first_name = first_name
            await session.commit()
        return user

    @staticmethod
    async def save_meal(
        session: AsyncSession,
        user_id: int,
        calc_meal: CalculatedMeal,
    ) -> Meal:
        """Сохраняет прием пищи и его продукты в базу данных."""
        meal = Meal(
            user_id=user_id,
            date=calc_meal.date,
            meal_type=calc_meal.meal_type,
            photo_file_id=calc_meal.photo_file_id,
            photo_url=calc_meal.photo_url,
        )
        session.add(meal)
        await session.flush()

        for it in calc_meal.items:
            m_item = MealItem(
                meal_id=meal.id,
                name=it.name,
                quantity=it.quantity,
                unit=it.unit,
                weight_grams=it.weight_grams,
                calories=it.calories,
                protein=it.protein,
                fat=it.fat,
                carbs=it.carbs,
                confidence=it.confidence,
                is_estimated=it.is_estimated,
                source=it.source,
            )
            session.add(m_item)

        await session.commit()
        await session.refresh(meal)
        return meal

    @staticmethod
    async def get_day_diary(
        session: AsyncSession,
        user_id: int,
        date_str: str,
    ) -> DayDiaryOut:
        """Возвращает полный дневник за указанный день с КБЖУ итогами и целями."""
        user = await session.get(User, user_id)
        if not user:
            user = await DiaryService.get_or_create_user(session, user_id)

        stmt = select(Meal).where(
            Meal.user_id == user_id,
            Meal.date == date_str
        ).order_by(Meal.id)
        res = await session.execute(stmt)
        meals_db = res.scalars().all()

        meals_out: List[MealOut] = []
        day_cal = 0.0
        day_prot = 0.0
        day_fat = 0.0
        day_carb = 0.0

        for m in meals_db:
            # Load items
            i_stmt = select(MealItem).where(MealItem.meal_id == m.id)
            i_res = await session.execute(i_stmt)
            items_db = i_res.scalars().all()

            m_cal = sum(it.calories for it in items_db)
            m_prot = sum(it.protein for it in items_db)
            m_fat = sum(it.fat for it in items_db)
            m_carb = sum(it.carbs for it in items_db)

            day_cal += m_cal
            day_prot += m_prot
            day_fat += m_fat
            day_carb += m_carb

            meals_out.append(
                MealOut(
                    id=m.id,
                    user_id=m.user_id,
                    date=m.date,
                    meal_type=m.meal_type,
                    photo_url=m.photo_url,
                    items=[MealItemOut.model_validate(it) for it in items_db],
                    total_calories=round(m_cal, 1),
                    total_protein=round(m_prot, 1),
                    total_fat=round(m_fat, 1),
                    total_carbs=round(m_carb, 1),
                )
            )

        return DayDiaryOut(
            date=date_str,
            meals=meals_out,
            totals=DayTotals(
                date=date_str,
                calories=round(day_cal, 1),
                protein=round(day_prot, 1),
                fat=round(day_fat, 1),
                carbs=round(day_carb, 1),
            ),
            goals=UserGoalsOut.model_validate(user),
        )

    @staticmethod
    async def delete_item(session: AsyncSession, user_id: int, item_id: int) -> bool:
        stmt = select(MealItem).join(Meal).where(
            MealItem.id == item_id,
            Meal.user_id == user_id
        )
        res = await session.execute(stmt)
        item = res.scalars().first()
        if not item:
            return False

        meal_id = item.meal_id
        await session.delete(item)
        await session.commit()

        # Check if meal is now empty, if so remove meal
        rem_stmt = select(MealItem).where(MealItem.meal_id == meal_id)
        rem_res = await session.execute(rem_stmt)
        if not rem_res.scalars().all():
            m_stmt = select(Meal).where(Meal.id == meal_id)
            m_res = await session.execute(m_stmt)
            m = m_res.scalars().first()
            if m:
                await session.delete(m)
                await session.commit()

        return True

    @staticmethod
    async def update_item_quantity(
        session: AsyncSession,
        user_id: int,
        item_id: int,
        new_quantity: float,
    ) -> Optional[MealItem]:
        stmt = select(MealItem).join(Meal).where(
            MealItem.id == item_id,
            Meal.user_id == user_id
        )
        res = await session.execute(stmt)
        item = res.scalars().first()
        if not item or new_quantity <= 0:
            return None

        # Recompute proportionally
        ratio = new_quantity / item.quantity
        item.quantity = new_quantity
        item.weight_grams = round(item.weight_grams * ratio, 1)
        item.calories = round(item.calories * ratio, 1)
        item.protein = round(item.protein * ratio, 1)
        item.fat = round(item.fat * ratio, 1)
        item.carbs = round(item.carbs * ratio, 1)

        await session.commit()
        await session.refresh(item)
        return item
