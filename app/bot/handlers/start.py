from datetime import datetime
from aiogram import Router, types
from aiogram.filters import CommandStart, Command
from aiogram.enums import ParseMode

from app.database.database import AsyncSessionLocal
from app.services.diary_service import DiaryService
from app.bot.keyboards import get_main_reply_keyboard

router = Router()


@router.message(CommandStart())
async def handle_start(message: types.Message):
    async with AsyncSessionLocal() as session:
        user = await DiaryService.get_or_create_user(
            session=session,
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
        )

    greeting = (
        f"👋 Привет, {message.from_user.first_name or 'друг'}!\n\n"
        "Я твой <b>умный AI-дневник питания</b> 🥑\n\n"
        "Тебе не нужно вручную взвешивать всё до крошки или искать продукты по сложным таблицам. "
        "Просто пиши, отправляй голосовые или присылай фото того, что съел:\n\n"
        "💬 <i>«Съел 250 г рисовой каши, 2 яйца и чай с 2 ложками сахара»</i>\n"
        "🎤 <i>Голосовое: «На обед была тарелка борща и кусок черного хлеба»</i>\n"
        "📸 <i>Фотографию тарелки с едой</i>\n\n"
        "Я пойму продукты, найду точные данные в базе и рассчитаю честный КБЖУ обычным кодом без галлюцинаций.\n\n"
        "Нажми кнопку ниже, чтобы открыть красивый интерфейс дневника:"
    )
    await message.answer(greeting, reply_markup=get_main_reply_keyboard())


@router.message(Command("help"))
@router.message(lambda m: m.text == "ℹ️ Помощь")
async def handle_help(message: types.Message):
    help_text = (
        "💡 <b>Как пользоваться ботом:</b>\n\n"
        "<b>1. Ввод текстом:</b>\n"
        "Пиши своими словами, указывай граммы или штуки:\n"
        "• <i>«200 г гречки с куриной грудкой»</i>\n"
        "• <i>«Вчера вечером съел пиццу»</i>\n\n"
        "<b>2. Контекст и исправления:</b>\n"
        "• <i>«И ещё банан»</i> — добавит к последнему приёму\n"
        "• <i>«Нет, там было не 200, а 300 грамм»</i> — исправит порцию\n"
        "• <i>«Удали последний продукт»</i> — удалит ошибочную запись\n"
        "• <i>«Съел ещё столько же»</i> — продублирует порцию\n\n"
        "<b>3. Свои рецепты и стандарты:</b>\n"
        "• <i>«Запомни: когда я говорю мой шейк, это 300 мл молока, банан, 30 г протеина и 20 г арахисовой пасты»</i>\n"
        "• <i>«Яйцо у меня обычно 70 грамм»</i>\n\n"
        "<b>4. Фото и голос:</b>\n"
        "Отправляй фото блюда или голосовые сообщения в любой момент!"
    )
    await message.answer(help_text, reply_markup=get_main_reply_keyboard())


@router.message(Command("today"))
@router.message(lambda m: m.text == "📊 Сегодня")
async def handle_today(message: types.Message):
    today_str = datetime.now().strftime("%Y-%m-%d")
    async with AsyncSessionLocal() as session:
        diary = await DiaryService.get_day_diary(session, message.from_user.id, today_str)

    tot = diary.totals
    goals = diary.goals

    cal_pct = int((tot.calories / goals.calorie_goal) * 100) if goals.calorie_goal else 0
    prot_pct = int((tot.protein / goals.protein_goal) * 100) if goals.protein_goal else 0
    fat_pct = int((tot.fat / goals.fat_goal) * 100) if goals.fat_goal else 0
    carb_pct = int((tot.carbs / goals.carb_goal) * 100) if goals.carb_goal else 0

    meal_titles = {
        "breakfast": "🍳 Завтрак",
        "lunch": "🍲 Обед",
        "dinner": "🥗 Ужин",
        "snack": "🥪 Перекус"
    }

    lines = [f"📅 <b>Дневник питания на сегодня ({today_str}):</b>\n"]
    lines.append(f"🔥 <b>Калории:</b> {tot.calories:g} / {goals.calorie_goal} ккал ({cal_pct}%)")
    lines.append(f"🥩 <b>Белки:</b> {tot.protein:g} / {goals.protein_goal} г ({prot_pct}%)")
    lines.append(f"🥑 <b>Жиры:</b> {tot.fat:g} / {goals.fat_goal} г ({fat_pct}%)")
    lines.append(f"🍞 <b>Углеводы:</b> {tot.carbs:g} / {goals.carb_goal} г ({carb_pct}%)\n")

    if not diary.meals:
        lines.append("<i>Записей за сегодня пока нет. Напиши, что съел!</i>")
    else:
        for m in diary.meals:
            lines.append(f"<b>{meal_titles.get(m.meal_type, m.meal_type.capitalize())}</b> — {m.total_calories:g} ккал")
            for it in m.items:
                est_tag = " <i>(оценка)</i>" if it.is_estimated else ""
                lines.append(f"  • {it.name}: {it.quantity:g} {it.unit} ({it.weight_grams:g} г) — {it.calories:g} ккал{est_tag}")
            lines.append("")

    await message.answer("\n".join(lines), reply_markup=get_main_reply_keyboard())


@router.message(Command("goals"))
@router.message(lambda m: m.text == "🎯 Мои цели")
async def handle_goals(message: types.Message):
    async with AsyncSessionLocal() as session:
        user = await DiaryService.get_or_create_user(session, message.from_user.id)

    text = (
        "🎯 <b>Твои суточные нормы питания:</b>\n\n"
        f"• Калории: <b>{user.calorie_goal} ккал</b>\n"
        f"• Белки: <b>{user.protein_goal} г</b>\n"
        f"• Жиры: <b>{user.fat_goal} г</b>\n"
        f"• Углеводы: <b>{user.carb_goal} г</b>\n"
        f"• Авто-подтверждение: <b>{'Включено' if user.auto_confirm else 'Всегда спрашивать'}</b>\n\n"
        "💡 Ты можешь легко изменить эти цели в Telegram Mini App!"
    )
    await message.answer(text, reply_markup=get_main_reply_keyboard())
