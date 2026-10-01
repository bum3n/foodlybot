import logging
from typing import Dict, Any, Optional
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from app.core.config import settings

logger = logging.getLogger(__name__)

# Temporary in-memory cache for pending meal confirmations: {temp_id: CalculatedMeal}
PENDING_MEALS: Dict[str, Any] = {}

bot: Optional[Bot] = None
dp: Dispatcher = Dispatcher()


def get_bot() -> Optional[Bot]:
    global bot
    if bot is None and settings.TELEGRAM_BOT_TOKEN:
        try:
            bot = Bot(
                token=settings.TELEGRAM_BOT_TOKEN,
                default=DefaultBotProperties(parse_mode=ParseMode.HTML)
            )
        except Exception as e:
            logger.error("Failed to initialize Bot with token: %s", str(e))
    return bot
