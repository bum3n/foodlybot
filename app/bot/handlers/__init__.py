from aiogram import Dispatcher
from app.bot.handlers.start import router as start_router
from app.bot.handlers.text import router as text_router
from app.bot.handlers.voice import router as voice_router
from app.bot.handlers.photo import router as photo_router
from app.bot.handlers.callbacks import router as callbacks_router


def setup_handlers(dp: Dispatcher) -> None:
    dp.include_router(start_router)
    dp.include_router(callbacks_router)
    dp.include_router(voice_router)
    dp.include_router(photo_router)
    dp.include_router(text_router)  # text router is last to catch freeform text
