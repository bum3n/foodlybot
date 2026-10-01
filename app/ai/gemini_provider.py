import json
import logging
import asyncio
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import aiohttp

from app.core.config import settings
from app.ai.base import AbstractAIProvider
from app.schemas.nutrition import AIParsedFoodResponse, ParsedItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Ты — интеллектуальный анализатор питания для Telegram-бота личного дневника.
Твоя задача — извлечь структурированные данные о продуктах, датах и приемах пищи.
ВАЖНО:
1. Ты НЕ рассчитываешь калории или КБЖУ! Этим занимается отдельный калькулятор на Python.
2. Твоя роль — исключительно парсер текста, контекста и фото.
3. Верни строго валидный JSON без вступительного текста, без markdown блоков, строго в указанной схеме.

Поля JSON:
- date: YYYY-MM-DD (сегодня/вчера/позавчера вычисляй относительно указанного текущего времени)
- meal: "breakfast" | "lunch" | "dinner" | "snack" (по контексту или времени суток: 05:00-11:30 breakfast, 11:30-16:00 lunch, 16:00-21:30 dinner, иначе snack)
- items: массив объектов [
    {
      "name": "название продукта в начальной форме (например: куриное яйцо, рисовая каша)",
      "quantity": число (float),
      "unit": "g" | "ml" | "pcs" | "tbsp" | "tsp" | "cup" | "slice",
      "estimated": boolean (true для фото или неточных мер),
      "confidence": "low" | "medium" | "high",
      "estimated_grams": опционально число грамм
    }
  ]
- intent: "add_meal" | "append_to_last" | "modify_quantity" | "delete_last_item" | "repeat_yesterday" | "repeat_last" | "create_recipe" | "create_standard" | "unknown"
- target_product_name: строка если пользователь просит исправить или удалить конкретный продукт (например: "банан")
- new_quantity: новое количество если intent = "modify_quantity"
- new_unit: новая единица измерения
- recipe_name: строка если intent = "create_recipe" (например: "мой шейк")
- recipe_ingredients: список [ { "name": "...", "quantity": ..., "unit": "...", "grams": ... } ]
- standard_item_name: строка если intent = "create_standard" (например: "яйцо")
- standard_grams: число если intent = "create_standard" (например: 70)
- confidence: "low" | "medium" | "high"
- clarification_message: если еда на фото или в тексте неясна, поясни это вежливо.
"""


class GeminiProvider(AbstractAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    def _clean_json_response(self, text: str) -> str:
        """Очищает ответ от markdown ```json ... ``` и пробелов."""
        clean = text.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\s*", "", clean)
            clean = re.sub(r"\s*```$", "", clean)
        return clean.strip()

    async def _call_gemini_api(
        self,
        contents: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        retries: int = 3,
        backoff_sec: float = 1.5,
    ) -> Dict[str, Any]:
        """Вызывает REST API Gemini с поддержкой повторных попыток и таймаутов."""
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY не настроен в .env файле!")

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "aistudio-build"
        }

        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            }
        }

        if system_instruction:
            body["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        last_error = None
        for attempt in range(1, retries + 1):
            try:
                timeout = aiohttp.ClientTimeout(total=25.0)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.post(url, headers=headers, json=body) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            candidates = data.get("candidates", [])
                            if not candidates:
                                raise ValueError("Gemini API вернул пустой список candidates")
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if not parts:
                                raise ValueError("Gemini API вернул пустые parts")
                            raw_text = parts[0].get("text", "")
                            cleaned = self._clean_json_response(raw_text)
                            return json.loads(cleaned)
                        
                        error_text = await resp.text()
                        if resp.status in [429, 500, 502, 503, 504]:
                            logger.warning(
                                "Gemini API error %d (попытка %d/%d): %s",
                                resp.status, attempt, retries, error_text
                            )
                            last_error = f"API error {resp.status}: {error_text}"
                            if attempt < retries:
                                await asyncio.sleep(backoff_sec * (2 ** (attempt - 1)))
                                continue
                        else:
                            raise ValueError(f"Gemini API returned status {resp.status}: {error_text}")

            except asyncio.TimeoutError:
                logger.warning("Gemini API timeout (попытка %d/%d)", attempt, retries)
                last_error = "Timeout connecting to Gemini API"
                if attempt < retries:
                    await asyncio.sleep(backoff_sec)
                    continue
            except json.JSONDecodeError as jde:
                logger.error("JSON decode error from Gemini: %s", str(jde))
                raise ValueError(f"Некорректный JSON от AI: {str(jde)}")
            except Exception as e:
                logger.error("Unexpected error in Gemini API call: %s", str(e))
                last_error = str(e)
                if attempt < retries:
                    await asyncio.sleep(backoff_sec)
                    continue

        raise RuntimeError(f"Не удалось получить ответ от Gemini API: {last_error}")

    async def parse_food_text(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None,
        current_datetime: Optional[str] = None,
        user_standards: Optional[List[Dict[str, Any]]] = None,
    ) -> AIParsedFoodResponse:
        now_str = current_datetime or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        context_str = json.dumps(context, ensure_ascii=False) if context else "нет контекста"
        standards_str = json.dumps(user_standards, ensure_ascii=False) if user_standards else "стандартные"

        prompt = f"""Текущее время: {now_str}
Контекст предыдущего сообщения/приема пищи: {context_str}
Персональные стандарты пользователя: {standards_str}

Сообщение пользователя: "{text}"

Разбери сообщение согласно системным инструкциям и верни строго JSON."""

        contents = [{"parts": [{"text": prompt}]}]
        data = await self._call_gemini_api(contents, system_instruction=SYSTEM_PROMPT)
        return AIParsedFoodResponse(**data)

    async def parse_food_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        caption: Optional[str] = None,
        current_datetime: Optional[str] = None,
        user_standards: Optional[List[Dict[str, Any]]] = None,
    ) -> AIParsedFoodResponse:
        import base64
        now_str = current_datetime or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        user_caption = caption or "Определи что на фото, примерный состав и порцию"

        prompt = f"""Текущее время: {now_str}
Подпись к фото: "{user_caption}"
Внимательно оцени блюдо на фото:
1. Назови продукты или блюдо.
2. Оцени примерный размер порции в граммах или штуках.
3. Поле "estimated" обязательно поставь в true.
4. Поле "confidence" поставь "high", "medium" или "low" в зависимости от четкости.
5. Если фото не содержит еды или ничего не понятно, укажи items=[] и напиши clarification_message."""

        contents = [
            {
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": b64_image
                        }
                    },
                    {"text": prompt}
                ]
            }
        ]

        data = await self._call_gemini_api(contents, system_instruction=SYSTEM_PROMPT)
        return AIParsedFoodResponse(**data)

    async def transcribe_voice(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/ogg",
    ) -> str:
        """Использует Gemini Audio / Transcribe для перевода голоса в текст."""
        import base64
        b64_audio = base64.b64encode(audio_bytes).decode("utf-8")

        prompt = "Точно транскрибируй данное голосовое сообщение на русском языке в текст. Выведи только транскрипцию без пояснений."
        
        url = f"{self.base_url}/models/gemini-3.5-transcribe:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": b64_audio
                            }
                        },
                        {"text": prompt}
                    ]
                }
            ]
        }

        try:
            timeout = aiohttp.ClientTimeout(total=20.0)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=body) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return text.strip()
                    else:
                        # Fallback к обычной модели flash
                        logger.warning("gemini-3.5-transcribe returned %d, falling back to gemini-3.8-flash", resp.status)
        except Exception as e:
            logger.warning("Error calling gemini-3.5-transcribe: %s", str(e))

        # Fallback to default flash model for audio
        fallback_url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        async with aiohttp.ClientSession() as session:
            async with session.post(fallback_url, headers=headers, json=body) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    return text.strip()
                raise RuntimeError(f"Speech transcription failed with status {resp.status}")
