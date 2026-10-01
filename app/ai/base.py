from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from app.schemas.nutrition import AIParsedFoodResponse


class AbstractAIProvider(ABC):
    """
    Абстрактный интерфейс AI-провайдера.
    Позволяет легко заменить Gemini на OpenRouter, GigaChat, OpenAI или локальную модель.
    """

    @abstractmethod
    async def parse_food_text(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None,
        current_datetime: Optional[str] = None,
        user_standards: Optional[List[Dict[str, Any]]] = None,
    ) -> AIParsedFoodResponse:
        """Парсинг текстового описания приема пищи в структурированный JSON."""
        pass

    @abstractmethod
    async def parse_food_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        caption: Optional[str] = None,
        current_datetime: Optional[str] = None,
        user_standards: Optional[List[Dict[str, Any]]] = None,
    ) -> AIParsedFoodResponse:
        """Распознавание еды по фотографии с оценкой порций и уверенности."""
        pass

    @abstractmethod
    async def transcribe_voice(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/ogg",
    ) -> str:
        """Speech-to-Text: перевод голосового сообщения в текст."""
        pass
