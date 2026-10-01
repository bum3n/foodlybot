import asyncio
import logging
import uvicorn
from app.core.config import settings
from app.database.database import init_db
from app.bot.bot import get_bot, dp
from app.bot.handlers import setup_handlers
from app.api.main import app as fastapi_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_api():
    config = uvicorn.Config(fastapi_app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


async def run_bot():
    bot = get_bot()
    if not bot:
        logger.warning("TELEGRAM_BOT_TOKEN не задан. Бот не запущен, работает только API сервер.")
        while True:
            await asyncio.sleep(3600)
        return

    setup_handlers(dp)
    logger.info("Запуск Telegram-бота (polling)...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


async def main():
    logger.info("Инициализация базы данных SQLite...")
    await init_db()

    logger.info("Запуск сервисов NutriBot...")
    await asyncio.gather(
        run_api(),
        run_bot(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("NutriBot остановлен.")
