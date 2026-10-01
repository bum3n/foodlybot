from datetime import datetime
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database.database import get_db
from app.database.models import User, Meal, MealItem, CustomProduct, UserStandard
from app.services.diary_service import DiaryService
from app.services.nutrition_service import NutritionService
from app.schemas.nutrition import (
    DayDiaryOut,
    MealItemOut,
    UserGoalsOut,
    UserGoalsUpdate,
    CalculatedMeal,
    ParsedItem,
)
from app.nutrition.food_db import STANDARD_FOOD_DATABASE, find_in_food_database
from app.nutrition.openfoodfacts import search_open_food_facts
from app.core.config import settings

api_router = APIRouter()


class AddItemRequest(BaseModel):
    user_id: int
    date: str
    meal_type: str
    name: str
    quantity: float
    unit: str = "g"


class UpdateQuantityRequest(BaseModel):
    user_id: int
    new_quantity: float


class CreateCustomProductRequest(BaseModel):
    user_id: int
    name: str
    calories_100g: float
    protein_100g: float
    fat_100g: float
    carbs_100g: float
    aliases: Optional[str] = None


@api_router.get("/diary/day", response_model=DayDiaryOut)
async def get_day_diary(
    user_id: int = Query(..., description="Telegram ID пользователя"),
    date: str = Query(..., description="Дата YYYY-MM-DD"),
    session: AsyncSession = Depends(get_db),
):
    """Получение дневника за день со всеми приёмами пищи, КБЖУ и целями."""
    return await DiaryService.get_day_diary(session, user_id, date)


@api_router.post("/diary/meal/item")
async def add_meal_item(
    req: AddItemRequest,
    session: AsyncSession = Depends(get_db),
):
    """Ручное добавление продукта в приём пищи из интерфейса Mini App."""
    parsed_item = ParsedItem(name=req.name, quantity=req.quantity, unit=req.unit)
    calc_item = await NutritionService.resolve_item_nutrients(session, req.user_id, parsed_item)

    # Находим или создаем приём пищи за этот день
    stmt = select(Meal).where(
        Meal.user_id == req.user_id,
        Meal.date == req.date,
        Meal.meal_type == req.meal_type,
    )
    res = await session.execute(stmt)
    meal = res.scalars().first()

    if not meal:
        meal = Meal(
            user_id=req.user_id,
            date=req.date,
            meal_type=req.meal_type,
        )
        session.add(meal)
        await session.flush()

    m_item = MealItem(
        meal_id=meal.id,
        name=calc_item.name,
        quantity=calc_item.quantity,
        unit=calc_item.unit,
        weight_grams=calc_item.weight_grams,
        calories=calc_item.calories,
        protein=calc_item.protein,
        fat=calc_item.fat,
        carbs=calc_item.carbs,
        confidence="high",
        is_estimated=calc_item.is_estimated,
        source=calc_item.source,
    )
    session.add(m_item)
    await session.commit()
    await session.refresh(m_item)

    return MealItemOut.model_validate(m_item)


@api_router.put("/diary/meal/item/{item_id}", response_model=MealItemOut)
async def update_item_quantity(
    item_id: int,
    req: UpdateQuantityRequest,
    session: AsyncSession = Depends(get_db),
):
    """Изменение количества продукта в дневнике."""
    updated = await DiaryService.update_item_quantity(
        session, req.user_id, item_id, req.new_quantity
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Продукт не найден или количество некорректно")
    return MealItemOut.model_validate(updated)


@api_router.delete("/diary/meal/item/{item_id}")
async def delete_item(
    item_id: int,
    user_id: int = Query(...),
    session: AsyncSession = Depends(get_db),
):
    """Удаление продукта из дневника."""
    ok = await DiaryService.delete_item(session, user_id, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    return {"status": "deleted", "item_id": item_id}


@api_router.get("/user/goals", response_model=UserGoalsOut)
async def get_user_goals(
    user_id: int = Query(...),
    session: AsyncSession = Depends(get_db),
):
    """Получение целей пользователя по КБЖУ."""
    user = await DiaryService.get_or_create_user(session, user_id)
    return UserGoalsOut.model_validate(user)


@api_router.put("/user/goals", response_model=UserGoalsOut)
async def update_user_goals(
    user_id: int = Query(...),
    goals: UserGoalsUpdate = ...,
    session: AsyncSession = Depends(get_db),
):
    """Обновление суточных целей по КБЖУ."""
    user = await DiaryService.get_or_create_user(session, user_id)
    if goals.calorie_goal is not None:
        user.calorie_goal = goals.calorie_goal
    if goals.protein_goal is not None:
        user.protein_goal = goals.protein_goal
    if goals.fat_goal is not None:
        user.fat_goal = goals.fat_goal
    if goals.carb_goal is not None:
        user.carb_goal = goals.carb_goal
    if goals.auto_confirm is not None:
        user.auto_confirm = goals.auto_confirm

    await session.commit()
    await session.refresh(user)
    return UserGoalsOut.model_validate(user)


@api_router.get("/products/search")
async def search_products(
    q: str = Query(..., min_length=2),
    session: AsyncSession = Depends(get_db),
):
    """Поиск продуктов по локальной базе и Open Food Facts."""
    clean_q = q.lower().strip()
    results = []

    # 1. Локальная база
    for key, data in STANDARD_FOOD_DATABASE.items():
        if clean_q in key or any(clean_q in syn for syn in data.get("synonyms", [])):
            results.append({
                "name": data["name"],
                "calories": data["calories"],
                "protein": data["protein"],
                "fat": data["fat"],
                "carbs": data["carbs"],
                "piece_weight": data.get("piece_weight"),
                "source": "local",
            })
            if len(results) >= 8:
                break

    # 2. Open Food Facts
    if len(results) < 5:
        off_res = await search_open_food_facts(clean_q)
        if off_res and not any(r["name"] == off_res["name"] for r in results):
            results.append(off_res)

    return results


@api_router.post("/products/custom")
async def create_custom_product(
    req: CreateCustomProductRequest,
    session: AsyncSession = Depends(get_db),
):
    """Создание персонального продукта пользователя."""
    cp = CustomProduct(
        user_id=req.user_id,
        name=req.name.strip(),
        aliases=req.aliases or req.name.strip(),
        calories_100g=req.calories_100g,
        protein_100g=req.protein_100g,
        fat_100g=req.fat_100g,
        carbs_100g=req.carbs_100g,
    )
    session.add(cp)
    await session.commit()
    return {"status": "created", "id": cp.id, "name": cp.name}


@api_router.get("/photos/{file_id}")
async def get_photo(file_id: str):
    """Отдача исходной фотографии блюда для Mini App."""
    photo_path = settings.DATA_DIR / "photos" / f"{file_id}.jpg"
    if photo_path.exists():
        return FileResponse(photo_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Фото не найдено")
