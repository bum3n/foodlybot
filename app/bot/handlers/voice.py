import io
import uuid
import logging
from datetime import datetime
from aiogram import Router, types, F
from aiogram.enums import ParseMode

from app.database.database import AsyncSessionLocal
from app.ai.gemini_provider import GeminiProvider
from app.services.diary_service import DiaryService
from app.services.context_service import ContextService
from app.bot.bot import PENDING_MEALS
from app.bot.keyboards import get_meal_confirmation_keyboard, get_main_reply_keyboard
from app.bot.handlers.text import format_meal_summary

router = Router()
logger = logging.getLogger(__name__)
ai_provider = GeminiProvider()


@router.message(F.voice | F.audio)
async def handle_voice_message(message: types.Message):
    user_id = message.from_user.id

    await message.bot.send_chat_action(chat_id=message.chat.id, action="record_voice")

    # 1. Download voice file
    file_id = message.voice.file_id if message.voice else message.audio.file_id
    file_info = await message.bot.get_file(file_id)

    bio = io.BytesIO()
    await message.bot.download_file(file_info.file_path, bio)
    audio_bytes = bio.getvalue()

    # 2. Transcribe voice via AI
    try:
        transcription = await ai_provider.transcribe_voice(audio_bytes, mime_type="audio/ogg")
        if not transcription:
            await message.answer("Не удалось расслышать голосовое сообщение. Попробуй сказать еще раз четче.")
            return

        await message.answer(f"🎤 <i>«{transcription}»</i>")

        # 3. Process transcribed text
        async with AsyncSessionLocal() as session:
            user = await DiaryService.get_or_create_user(
                session=session,
                telegram_id=user_id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
            )
            context = await ContextService.get_user_context(session, user_id)

        now_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        parsed = await ai_provider.parse_food_text(transcription, context=context, current_datetime=now_dt)

        if not parsed.items and parsed.clarification_message:
            await message.answer(f"🤔 {parsed.clarification_message}", reply_markup=get_main_reply_keyboard())
            return

        async with AsyncSessionLocal() as session:
            reply_msg, calculated_meal = await ContextService.handle_intent(session, user_id, parsed)

            if not calculated_meal:
                await message.answer(reply_msg, reply_markup=get_main_reply_keyboard())
                return

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
                temp_id = str(uuid.uuid4())[:8]
                PENDING_MEALS[temp_id] = calculated_meal
                preview_text = format_meal_summary(calculated_meal, is_added=False) + "\n\n<b>Добавить эту запись в дневник?</b>"
                await message.answer(preview_text, reply_markup=get_meal_confirmation_keyboard(temp_id))

    except Exception as e:
        logger.exception("Error processing voice message: %s", str(e))
        await message.answer(
            "⚠️ Не удалось распознать голосовое сообщение. Попробуй отправить текстом.",
            reply_markup=get_main_reply_keyboard(),
        )
