import io
import uuid
import logging
from datetime import datetime
from pathlib import Path
from aiogram import Router, types, F
from aiogram.enums import ParseMode

from app.database.database import AsyncSessionLocal
from app.core.config import settings
from app.ai.gemini_provider import GeminiProvider
from app.services.diary_service import DiaryService
from app.services.nutrition_service import NutritionService
from app.bot.bot import PENDING_MEALS
from app.bot.keyboards import get_meal_confirmation_keyboard, get_main_reply_keyboard
from app.bot.handlers.text import format_meal_summary

router = Router()
logger = logging.getLogger(__name__)
ai_provider = GeminiProvider()


@router.message(F.photo)
async def handle_photo_message(message: types.Message):
    user_id = message.from_user.id
    photo = message.photo[-1]  # Highest resolution
    caption = message.caption or ""

    await message.bot.send_chat_action(chat_id=message.chat.id, action="upload_photo")

    try:
        # 1. Download photo
        file_info = await message.bot.get_file(photo.file_id)
        bio = io.BytesIO()
        await message.bot.download_file(file_info.file_path, bio)
        image_bytes = bio.getvalue()

        # Save locally for webapp viewing
        photo_dir = settings.DATA_DIR / "photos"
        photo_filename = f"{photo.file_id}.jpg"
        local_photo_path = photo_dir / photo_filename
        with open(local_photo_path, "wb") as f:
            f.write(image_bytes)

        photo_url = f"/api/photos/{photo.file_id}"

        # 2. Call AI Vision Food Parser
        now_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        parsed = await ai_provider.parse_food_image(
            image_bytes=image_bytes,
            mime_type="image/jpeg",
            caption=caption,
            current_datetime=now_dt
        )

        if not parsed.items:
            clarify = parsed.clarification_message or "Не удалось распознать еду на этой фотографии. Пожалуйста, напиши текстом, что это за блюдо."
            await message.answer(f"🔍 {clarify}", reply_markup=get_main_reply_keyboard())
            return

        # 3. Calculate KBJU via Python
        async with AsyncSessionLocal() as session:
            await DiaryService.get_or_create_user(
                session=session,
                telegram_id=user_id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
            )
            calc_meal = await NutritionService.calculate_meal_totals(
                session=session,
                user_id=user_id,
                date_str=parsed.date,
                meal_type=parsed.meal,
                items=parsed.items,
                photo_file_id=photo.file_id,
                photo_url=photo_url,
            )

        # 4. For photos, always request confirmation since weights are estimated
        temp_id = str(uuid.uuid4())[:8]
        PENDING_MEALS[temp_id] = calc_meal

        conf_level_ru = {"low": "низкая", "medium": "средняя", "high": "хорошая"}.get(parsed.confidence, "средняя")
        preview = format_meal_summary(calc_meal, is_added=False)
        preview += f"\n\n🎯 <i>Уверенность оценки: {conf_level_ru}</i>\n<b>Добавить в дневник?</b>"

        await message.answer(preview, reply_markup=get_meal_confirmation_keyboard(temp_id))

    except Exception as e:
        logger.exception("Error processing photo: %s", str(e))
        await message.answer(
            "⚠️ Не удалось проанализировать фотографию. Попробуй ещё раз или опиши текстом.",
            reply_markup=get_main_reply_keyboard()
        )
