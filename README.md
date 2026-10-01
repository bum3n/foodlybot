# 🥑 Smart NutriBot — Умный AI-дневник питания для Telegram

Персональный Telegram-бот и Telegram Mini App для простого и точного учета питания на базе искусственного интеллекта.

Вам больше не нужно вручную искать продукты в огромных базах или считать калории на весах. Вы просто пишете боту, что съели, отправляете голосовое сообщение или фотографию тарелки, а бот определяет продукты, их вес, рассчитывает честный КБЖУ обычным Python-кодом и сохраняет запись в дневник.

---

## 📑 Оглавление

1. [Что делает проект](#1-что-делает-проект)
2. [Архитектура и ключевой принцип расчёта](#2-архитектура-и-ключевой-принцип-расчёта)
3. [Требования](#3-требования)
4. [Установка и виртуальное окружение](#4-установка-и-виртуальное-окружение)
5. [Создание Telegram-бота (@BotFather)](#5-создание-telegram-бота-botfather)
6. [Получение Gemini AI API Key](#6-получение-gemini-ai-api-key)
7. [Настройка конфигурации (.env)](#7-настройка-конфигурации-env)
8. [Запуск локально](#8-запуск-локально)
9. [Запуск и настройка Telegram Mini App](#9-запуск-и-настройка-telegram-mini-app)
10. [Запуск через Docker / Docker Compose](#10-запуск-через-docker--docker-compose)
11. [Структура проекта](#11-структура-проекта)
12. [Описание основных компонентов](#12-описание-основных-компонентов)
13. [Инструкция по добавлению нового AI-провайдера](#13-инструкция-по-добавлению-нового-ai-провайдера)

---

## 1. Что делает проект

- **Ввод текстом на естественном языке:**  
  *«Съел 250 г рисовой каши, 2 яйца, 5 печенек и чай с 2 чайными ложками сахара»* → бот определяет 5 продуктов с точными граммами.
- **Ввод голосом (Voice Messages):**  
  Отправляйте голосовые сообщения на ходу без специальных форматов — модель транскрибирует речь и отправляет в единый пайплайн распознавания.
- **Ввод по фото (Food Vision):**  
  Отправьте фотографию блюда. AI определяет продукты на тарелке, оценивает размер порции, уровень уверенности и предлагает подтвердить или скорректировать запись перед сохранением.
- **Понимание естественных дат и приёмов пищи:**  
  *«Вчера вечером съел пиццу»* → запишет в ужин за вчерашнюю дату.
- **Поддержка контекста сообщений:**  
  *«И ещё банан»* (добавит к текущему приёму пищи), *«Нет, там было не 200, а 300 грамм»* (исправит порцию), *«Удали последний продукт»*, *«Съел ещё столько же»*.
- **Персональные рецепты и стандарты:**  
  *«Запомни: когда я говорю "мой шейк", это 300 мл молока, банан, 30 г протеина и 20 г арахисовой пасты»*  
  *«Яйцо у меня обычно 70 грамм»*  
  *«Чай у меня всегда с двумя чайными ложками сахара»*.
- **Telegram Mini App:**  
  Красивый современный мобильный интерфейс внутри Telegram с кольцами прогресса по КБЖУ, карточками приёмов пищи, календарём истории, просмотром фотографий блюд, ручным добавлением и настройкой личных целей.

---

## 2. Архитектура и ключевой принцип расчёта

> **КРИТИЧЕСКИЙ ПРИНЦИП:**  
> **Нейросеть НЕ является источником истины для расчёта КБЖУ.**

AI выполняет роль **интеллектуального парсера**:
```
Ввод пользователя (текст / голос / фото)
                   ↓
AI Parser (Gemini Flash) → строго структурированный JSON
                   ↓
Поиск продукта (Локальная база ГОСТ → Open Food Facts → Персональные стандарты)
                   ↓
Детерминированный калькулятор на чистом Python (КБЖУ по формуле на 100 г)
                   ↓
Сохранение в базу данных SQLite (SQLAlchemy Async)
                   ↓
Отображение в чате Telegram и в Telegram Mini App
```

Если продукт на 100 г содержит 400 ккал, 10 г белка, 20 г жира и 50 г углеводов, то для порции 50 г Python гарантированно рассчитает: `200 ккал, 5 г белка, 10 г жира, 25 г углеводов`.

---

## 3. Требования

- **Python 3.10+** (рекомендуется Python 3.12)
- **Telegram-аккаунт**
- **Бесплатный Gemini API Key** (Google AI Studio)
- **Docker и Docker Compose** (опционально для контейнеризации)

---

## 4. Установка и виртуальное окружение

Клонируйте репозиторий и создайте виртуальное окружение:

```bash
git clone https://github.com/bum3n/foodlybot
cd telegram-nutribot

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate  # На Linux / macOS
# или: venv\Scripts\activate  # На Windows

# Установка зависимостей
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 5. Создание Telegram-бота (@BotFather)

1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather).
2. Отправьте команду `/newbot`.
3. Задайте имя бота (например, `Smart NutriBot`) и username (например, `my_smart_nutribot`).
4. Скопируйте полученный **HTTP API Token** (формат: `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`).
5. Для привязки Mini App отправьте в @BotFather:
   - `/mybots` → выберите вашего бота → `Bot Settings` → `Menu Button` → `Configure menu button`.
   - Введите URL вашего развернутого приложения (или локальный ngrok-туннель).

---

## 6. Получение Gemini AI API Key

1. Перейдите на [Google AI Studio](https://aistudio.google.com/).
2. Войдите с помощью Google-аккаунта.
3. Нажмите кнопку **Get API key** в левом верхнем углу.
4. Нажмите **Create API key in new project** и скопируйте ключ.
5. Для личного дневника на 1–5 пользователей бесплатных лимитов Gemini Flash с запасом хватает на любые сценарии.

---

## 7. Настройка конфигурации (.env)

Скопируйте пример файла конфигурации:

```bash
cp .env.example .env
```

Откройте `.env` в текстовом редакторе и укажите ваши значения:

```env
# Токен бота из @BotFather
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"

# Ключ Gemini API из Google AI Studio
GEMINI_API_KEY="AIzaSy..."

# Модель Gemini (gemini-3.8-flash или gemini-3.1-flash-lite)
GEMINI_MODEL="gemini-3.8-flash"

# База данных SQLite
DATABASE_URL="sqlite+aiosqlite:///./data/nutrition_bot.db"

# Публичный URL для Telegram Mini App (например, https://my-nutribot.example.com)
WEBAPP_URL="https://your-domain.com"

# Имя AI провайдера
AI_PROVIDER="gemini"

# User-Agent для вызовов Open Food Facts API
OPENFOODFACTS_USER_AGENT="SmartNutriBot - Telegram Nutrition Assistant - v1.0"
```

---

## 8. Запуск локально

### Запуск тестов
Убедитесь, что все тесты расчёта КБЖУ и локальной базы проходят:
```bash
python3 -m unittest discover tests
```

### Запуск приложения
Запустите единый сервис (FastAPI сервер на порту 8000 + Telegram-бот через polling):
```bash
python3 -m app.main
```

Вы увидите:
```
INFO: Инициализация базы данных SQLite...
INFO: Запуск сервисов NutriBot...
INFO: Uvicorn running on http://0.0.0.0:8000
INFO: Запуск Telegram-бота (polling)...
```

Откройте вашего бота в Telegram и отправьте `/start`!

---

## 9. Запуск и настройка Telegram Mini App

Backend FastAPI предоставляет готовые REST API эндпоинты для Mini App (`/api/diary/day`, `/api/diary/meal/item`, `/api/user/goals`, `/api/photos/{file_id}`).

Для того чтобы Telegram мог открывать Mini App внутри мобильного клиента:
1. Запустите Mini App веб-сервер (входит в данный репозиторий на Vite/React).
2. Для локального тестирования на телефоне используйте HTTPS-туннель (например, [ngrok](https://ngrok.com/) или Cloudflare Tunnel):
   ```bash
   ngrok http 3000
   ```
3. Укажите полученный HTTPS-адрес в переменной `WEBAPP_URL` в файле `.env` и в настройках кнопки меню в @BotFather.

---

## 10. Запуск через Docker / Docker Compose

Для фонового запуска без необходимости держать открытой консоль используйте Docker Compose:

```bash
# Сборка и запуск в фоне
docker compose -f docker/docker-compose.yml up -d --build

# Просмотр логов
docker compose -f docker/docker-compose.yml logs -f

# Остановка
docker compose -f docker/docker-compose.yml down
```

Все данные SQLite и загруженные фотографии еды сохраняются в папке `./data` на хосте и не теряются при перезапусках контейнера.

---

## 11. Структура проекта

```
telegram-nutribot/
├── app/
│   ├── ai/                        # Слой интеграции с нейросетями
│   │   ├── base.py                # Абстрактный базовый класс AIProvider
│   │   └── gemini_provider.py     # Реализация Gemini Flash (текст, фото, голос)
│   ├── api/                       # FastAPI эндпоинты для Telegram Mini App
│   │   ├── main.py                # Конфигурация FastAPI и CORS
│   │   └── routes.py              # Маршруты: дневник, цели, поиск продуктов, фото
│   ├── bot/                       # Telegram Bot на aiogram 3.x
│   │   ├── bot.py                 # Инициализация Bot и Dispatcher
│   │   ├── keyboards.py           # Клавиатуры (WebApp, подтверждение блюда)
│   │   └── handlers/
│   │       ├── start.py           # /start, /help, /today, /goals
│   │       ├── text.py            # Обработка текста, контекста и КБЖУ
│   │       ├── voice.py           # Голосовые сообщения (Speech-to-Text)
│   │       ├── photo.py           # Распознавание еды по фотографии
│   │       └── callbacks.py       # Кнопки [Добавить], [Изменить], [Отмена]
│   ├── core/
│   │   └── config.py              # Настройки и переменные окружения
│   ├── database/
│   │   ├── database.py            # SQLAlchemy async engine и сессии
│   │   └── models.py              # Модели: User, Meal, MealItem, CustomProduct, Standards
│   ├── nutrition/                 # Модули питания и математики
│   │   ├── calculator.py          # Точный расчёт КБЖУ и конвертация единиц
│   │   ├── food_db.py             # Локальная база 200+ продуктов с синонимами
│   │   └── openfoodfacts.py       # Асинхронный клиент Open Food Facts с кэшем
│   ├── schemas/
│   │   └── nutrition.py           # Pydantic-схемы валидации и API
│   ├── services/
│   │   ├── context_service.py     # Обработка контекста («И ещё банан», исправления)
│   │   ├── diary_service.py       # CRUD операции дневника питания
│   │   └── nutrition_service.py   # Резолвинг нутриентов и вызов калькулятора
│   └── main.py                    # Главная точка входа (FastAPI + aiogram polling)
├── docker/
│   ├── Dockerfile                 # Multi-stage сборка Python 3.12
│   └── docker-compose.yml         # Конфигурация Docker Compose
├── tests/
│   ├── test_calculator.py         # Юнит-тесты формул КБЖУ
│   └── test_food_db.py            # Юнит-тесты поиска продуктов
├── requirements.txt               # Зависимости Python
├── .env.example                   # Шаблон переменных окружения
└── README.md                      # Полная документация
```

---

## 12. Описание основных компонентов

### `app.nutrition.calculator`
Сердце приложения. Выполняет всю арифметику:
- Переводит бытовые меры (штуки, ложки, стаканы, ломтики) в граммы.
- Проверяет персональные стандарты пользователя (например, яйцо = 70 г).
- Вычисляет:
  $$\text{КБЖУ} = \frac{\text{вес в граммах}}{100} \times \text{КБЖУ на 100 г}$$

### `app.ai.gemini_provider`
Использует Gemini Flash с режимом `responseMimeType: "application/json"`. Защищён повторными попытками (exponential backoff) при ошибках 429/5xx, очищает markdown-теги и не допускает произвольного текста вместо структурированных данных.

### `app.services.context_service`
Позволяет пользователю общаться естественно:
- Понимает реплики вроде *«И ещё 100 г творога»* и привязывает их к последнему приёму пищи.
- Обрабатывает команды исправления: *«Нет, там было не 200, а 300 грамм»*.
- Обрабатывает запоминание рецептов: *«Запомни: мой шейк это...»*.

---

## 13. Инструкция по добавлению нового AI-провайдера

Архитектура NutriBot спроектирована по принципу **Dependency Inversion**: бизнес-логика зависит только от интерфейса `AbstractAIProvider`.

Чтобы подключить другого провайдера (например, **OpenRouter** или **GigaChat**):

1. Создайте файл `app/ai/openrouter_provider.py`:
```python
from app.ai.base import AbstractAIProvider
from app.schemas.nutrition import AIParsedFoodResponse

class OpenRouterProvider(AbstractAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def parse_food_text(self, text, context=None, current_datetime=None, user_standards=None) -> AIParsedFoodResponse:
        # Отправьте запрос к OpenRouter API с требованием JSON Schema
        ...
        return AIParsedFoodResponse(**response_data)

    async def parse_food_image(self, image_bytes, mime_type="image/jpeg", caption=None, ...) -> AIParsedFoodResponse:
        ...

    async def transcribe_voice(self, audio_bytes, mime_type="audio/ogg") -> str:
        # Вызов Whisper API через OpenRouter или совместимый эндпоинт
        ...
```

2. В `app/core/config.py` или фабрике выберите провайдера на основе переменной окружения `AI_PROVIDER`:
```python
def get_ai_provider() -> AbstractAIProvider:
    if settings.AI_PROVIDER == "openrouter":
        return OpenRouterProvider(api_key=settings.OPENROUTER_API_KEY)
    return GeminiProvider(api_key=settings.GEMINI_API_KEY)
```

Никакой код в калькуляторе, базе данных, обработчиках бота или Mini App менять не потребуется!
