import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    PROJECT_NAME: str = "Smart NutriBot"
    VERSION: str = "1.0.0"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    WEBAPP_URL: str = os.getenv("WEBAPP_URL", "http://localhost:3000")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/nutrition_bot.db")
    DATA_DIR: Path = BASE_DIR / "data"

    # AI
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    # Open Food Facts
    OPENFOODFACTS_USER_AGENT: str = os.getenv(
        "OPENFOODFACTS_USER_AGENT",
        "SmartNutriBot - Telegram Nutrition Assistant - v1.0",
    )

    # Defaults for 1-5 users
    DEFAULT_CALORIE_GOAL: int = 2000
    DEFAULT_PROTEIN_GOAL: int = 120
    DEFAULT_FAT_GOAL: int = 65
    DEFAULT_CARB_GOAL: int = 220

    # Auto confirmation threshold
    # If confidence is "high" and estimated is False, can auto-add
    AUTO_CONFIRM_HIGH_CONFIDENCE: bool = True

    def ensure_dirs(self) -> None:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        (self.DATA_DIR / "photos").mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
