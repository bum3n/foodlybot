import uuid
import logging
from datetime import datetime
from aiogram import Router, types
from aiogram.enums import ParseMode

from app.database.database import AsyncSessionLocal
from app.core.config import settings
from app.ai.gemini_provider import GeminiProvider
from app.services.diary_service import DiaryService
from app.services.context_service import ContextService
from app.schemas.nutrition import CalculatedMeal
from app.bot.bot import PENDING_MEALS
from app.bot.keyboards import get_meal_confirmation_keyboard, get_main_reply_keyboard

router = Router()
logger = logging.getLogger(__name__)
ai_provider = GeminiProvider()

MEAL_NAMES = {
    "breakfast": "🍳 Завтрак",
    "lunch": "🍲 Обед",
    "dinner": "🥗 Ужин",
    "snack": "🥪 Перекус",
}


def format_meal_summary(meal: CalculatedMeal, is_added: bool = True) -> str:
    meal_title = MEAL_NAMES.get(meal.meal_type, meal.meal_type.capitalize())
    header = f"✅ Добавлено в <b>{meal_title}</b> ({meal.date}):" if is_added else f"🍽 <b>Распознан {meal_title}</b> ({meal.date}):"
    
    lines = [header, ""]
    for it in meal.items:
        source_icon = "🔹" if it.source == "local" else ("🔸" if it.source == "openfoodfacts" else "▫️")
        est_mark = " <i>(оценка)</i>" if it.is_estimated else ""
        lines.append(f"{source_icon} <b>{it.name}</b>: {it.quantity:g} {it.unit} ({it.weight_grams:g} г) — {it.calories:g} ккал{est_mark}")
        lines.append(f"    Б: {it.protein:g} г | Ж: {it.fat:g} г | У: {it.carbs:g} г")

    lines.append("")
    lines.append(f"📊 <b>Итог приёма пищи:</b>")
    lines.append(f"🔥 <b>{meal.total_calories:g} ккал</b> | 🥩 Б: {meal.total_protein:g} г | 🥑 Ж: {meal.total_fat:g} г | 🍞 У: {meal.total_carbs:g} г")
    return "\n".join(lines)


@router.message(lambda m: m.text and not m.text.startswith("/"))
async def handle_text_message(message: types.Message):
    # Ignore keyboard button clicks handled elsewhere
    if message.text in ["📱 Открыть дневник питания", "📊 Сегодня", "🎯 Мои цели", "ℹ️ Помощь"]:
        return

    user_id = message.from_user.id
    text = message.text.strip()

    # Send temporary typing status
    await message.bot.send_chat_action(chat_id=message.chat.id, action="typing")

    async with AsyncSessionLocal() as session:
        user = await DiaryService.get_or_create_user(
            session=session,
            telegram_id=user_id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
        )
        context = await ContextService.get_user_context(session, user_id)

    try:
        # 1. Parse food text with AI
        now_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        parsed = await ai_provider.parse_food_text(text, context=context, current_datetime=now_dt)

        # 2. Check if AI found clarification needed or empty
        if not parsed.items and parsed.clarification_message:
            await message.answer(f"🤔 {parsed.clarification_message}", reply_markup=get_main_reply_keyboard())
            return

        async with AsyncSessionLocal() as session:
            # 3. Handle intent (commands like edit quantity, delete last, recipe creation)
            reply_msg, calculated_meal = await ContextService.handle_intent(session, user_id, parsed)

            if not calculated_meal:
                # Intent was fully handled (e.g. recipe saved or last product deleted)
                await message.answer(reply_msg, reply_markup=get_main_reply_keyboard())
                return

            # If user has auto_confirm enabled and high confidence, auto-add
            should_auto_add = user.auto_confirm and parsed.confidence == "high" and not any(it.estimated for it in parsed.items)

            if should_auto_add:
                saved_meal = await DiaryService.save_meal(session, user_id, calculated_meal)
                await ContextService.save_user_context(
                    session=session,
                    user_id=user_id,
                    last_meal_id=saved_meal.id,
                    action="add_meal",
                    context_data={"meal_id": saved_meal.id, "date": saved_meal.date, "meal_type": saved_meal.meal_type}
                )
                response_text = format_meal_summary(calculated_meal, is_added=True)
                await message.answer(response_text, reply_markup=get_main_reply_keyboard())
            else:
                # Ask confirmation
                temp_id = str(uuid.uuid4())[:8]
                PENDING_MEALS[temp_id] = calculated_meal
                preview_text = format_meal_summary(calculated_meal, is_added=False) + "\n\n<b>Добавить эту запись в дневник?</b>"
                await message.answer(preview_text, reply_markup=get_meal_confirmation_keyboard(temp_id))

    except Exception as e:
        logger.exception("Error processing text message: %s", str(e))
        await message.answer(
            "⚠️ Не удалось разобрать сообщение из-за временной ошибки связи с AI. Попробуй ещё раз или сформулируй иначе.",
            reply_markup=get_main_reply_keyboard(),
        )
