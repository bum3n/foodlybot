from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    WebAppInfo,
)
from app.core.config import settings


def get_main_reply_keyboard(webapp_url: str = "") -> ReplyKeyboardMarkup:
    target_url = webapp_url or settings.WEBAPP_URL
    kb = [
        [
            KeyboardButton(
                text="📱 Открыть дневник питания",
                web_app=WebAppInfo(url=target_url) if target_url.startswith("https://") else None,
            )
        ],
        [
            KeyboardButton(text="📊 Сегодня"),
            KeyboardButton(text="🎯 Мои цели"),
        ],
        [
            KeyboardButton(text="ℹ️ Помощь"),
        ],
    ]
    return ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)


def get_meal_confirmation_keyboard(temp_id: str) -> InlineKeyboardMarkup:
    """Кнопки подтверждения распознанного блюда перед записью в дневник."""
    buttons = [
        [
            InlineKeyboardButton(text="✅ Добавить в дневник", callback_data=f"confirm_meal:{temp_id}"),
            InlineKeyboardButton(text="✏️ Изменить", callback_data=f"edit_meal:{temp_id}"),
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data=f"cancel_meal:{temp_id}"),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_meal_type_selector_keyboard(temp_id: str) -> InlineKeyboardMarkup:
    """Выбор приёма пищи при ручном уточнении."""
    buttons = [
        [
            InlineKeyboardButton(text="🍳 Завтрак", callback_data=f"set_meal_type:{temp_id}:breakfast"),
            InlineKeyboardButton(text="🍲 Обед", callback_data=f"set_meal_type:{temp_id}:lunch"),
        ],
        [
            InlineKeyboardButton(text="🥗 Ужин", callback_data=f"set_meal_type:{temp_id}:dinner"),
            InlineKeyboardButton(text="🥪 Перекус", callback_data=f"set_meal_type:{temp_id}:snack"),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)
