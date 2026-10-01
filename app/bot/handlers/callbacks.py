import logging
from aiogram import Router, types, F
from aiogram.enums import ParseMode

from app.database.database import AsyncSessionLocal
from app.services.diary_service import DiaryService
from app.services.context_service import ContextService
from app.bot.bot import PENDING_MEALS
from app.bot.keyboards import get_main_reply_keyboard, get_meal_type_selector_keyboard
from app.bot.handlers.text import format_meal_summary

router = Router()
logger = logging.getLogger(__name__)


@router.callback_query(F.data.startswith("confirm_meal:"))
async def handle_confirm_meal(callback: types.CallbackQuery):
    temp_id = callback.data.split(":", 1)[1]
    calc_meal = PENDING_MEALS.pop(temp_id, None)

    if not calc_meal:
        await callback.answer("Срок действия этого запроса истёк или запись уже добавлена.")
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        return

    user_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        saved_meal = await DiaryService.save_meal(session, user_id, calc_meal)
        await ContextService.save_user_context(
            session=session,
            user_id=user_id,
            last_meal_id=saved_meal.id,
            action="add_meal",
            context_data={"meal_id": saved_meal.id, "date": saved_meal.date, "meal_type": saved_meal.meal_type}
        )

    await callback.answer("✅ Добавлено!")
    success_text = format_meal_summary(calc_meal, is_added=True)
    await callback.message.edit_text(success_text)


@router.callback_query(F.data.startswith("edit_meal:"))
async def handle_edit_meal(callback: types.CallbackQuery):
    temp_id = callback.data.split(":", 1)[1]
    calc_meal = PENDING_MEALS.get(temp_id)
    if not calc_meal:
        await callback.answer("Запись устарела.")
        return

    await callback.answer()
    await callback.message.reply(
        "✏️ Чтобы изменить приём пищи, выбери категорию ниже или просто напиши боту уточнение (например: <i>«не 250, а 180 грамм»</i> или <i>«это был обед»</i>):",
        reply_markup=get_meal_type_selector_keyboard(temp_id)
    )


@router.callback_query(F.data.startswith("set_meal_type:"))
async def handle_set_meal_type(callback: types.CallbackQuery):
    parts = callback.data.split(":")
    temp_id = parts[1]
    new_type = parts[2]

    calc_meal = PENDING_MEALS.get(temp_id)
    if not calc_meal:
        await callback.answer("Запись не найдена.")
        return

    calc_meal.meal_type = new_type
    await callback.answer(f"Изменено на {new_type}")

    user_id = callback.from_user.id
    async with AsyncSessionLocal() as session:
        saved_meal = await DiaryService.save_meal(session, user_id, calc_meal)
        PENDING_MEALS.pop(temp_id, None)

    success_text = format_meal_summary(calc_meal, is_added=True)
    await callback.message.edit_text(success_text)


@router.callback_query(F.data.startswith("cancel_meal:"))
async def handle_cancel_meal(callback: types.CallbackQuery):
    temp_id = callback.data.split(":", 1)[1]
    PENDING_MEALS.pop(temp_id, None)
    await callback.answer("Отменено")
    await callback.message.edit_text("❌ Запись отменена.")
