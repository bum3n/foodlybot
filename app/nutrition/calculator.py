"""
Строгий детерминированный калькулятор КБЖУ на чистом Python.
AI определяет продукты и количества; этот модуль выполняет всю математику.
"""

from typing import Dict, Any, Optional, Tuple


# Стандартные коэффициенты веса в граммах для бытовых мер
UNIT_CONVERSIONS_GRAMS: Dict[str, float] = {
    # Граммы и килограммы
    "g": 1.0,
    "г": 1.0,
    "гр": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "kg": 1000.0,
    "кг": 1000.0,

    # Миллилитры и литры (для жидкостей плотность ~1.0)
    "ml": 1.0,
    "мл": 1.0,
    "l": 1000.0,
    "л": 1000.0,
    "литр": 1000.0,

    # Бытовые меры
    "tsp": 5.0,            # чайная ложка (сахар, соль, масло)
    "ч.л.": 5.0,
    "чл": 5.0,
    "чайная ложка": 5.0,
    "чайные ложки": 5.0,
    "чайных ложки": 5.0,
    "чайных ложек": 5.0,

    "tbsp": 15.0,          # столовая ложка
    "ст.л.": 15.0,
    "стл": 15.0,
    "столовая ложка": 15.0,
    "столовые ложки": 15.0,
    "столовых ложек": 15.0,

    "cup": 200.0,          # стакан
    "стакан": 200.0,
    "стакана": 200.0,
    "стаканов": 200.0,
    "кружка": 250.0,
    "чашка": 200.0,

    "slice": 35.0,         # ломтик хлеба/сыра
    "кусок": 35.0,
    "кусочек": 20.0,
    "ломтик": 30.0,
}


def normalize_unit(unit_str: str) -> str:
    """Нормализует строковое обозначение единицы измерения."""
    u = unit_str.lower().strip().replace(".", "")
    if u in ["g", "г", "гр", "грамм", "грамма", "граммов"]:
        return "g"
    if u in ["ml", "мл", "миллилитр", "миллилитров"]:
        return "ml"
    if u in ["kg", "кг", "килограмм"]:
        return "kg"
    if u in ["l", "л", "литр", "литра", "литров"]:
        return "l"
    if u in ["pcs", "шт", "штука", "штуки", "штук"]:
        return "pcs"
    if u in ["tsp", "чл", "ч л", "чайная ложка", "чайные ложки", "чайных ложек", "ложечка"]:
        return "tsp"
    if u in ["tbsp", "стл", "ст л", "столовая ложка", "столовые ложки", "столовых ложек"]:
        return "tbsp"
    if u in ["cup", "стакан", "стакана", "стаканов", "кружка", "чашка"]:
        return "cup"
    if u in ["slice", "кусок", "куска", "кусков", "ломтик", "ломтика"]:
        return "slice"
    return u


def calculate_weight_in_grams(
    quantity: float,
    unit: str,
    food_data: Optional[Dict[str, Any]] = None,
    user_standard_grams: Optional[float] = None,
    fallback_grams: Optional[float] = None
) -> float:
    """
    Рассчитывает суммарный вес в граммах с учётом персональных стандартов пользователя,
    свойств продукта из базы и общепринятых мер.
    """
    if quantity <= 0:
        return 0.0

    norm_unit = normalize_unit(unit)

    # 1. Если задан персональный стандарт пользователя (например яйцо = 70 г)
    if user_standard_grams and user_standard_grams > 0 and norm_unit in ["pcs", "шт", "portion"]:
        return round(quantity * user_standard_grams, 1)

    # 2. Прямые граммы / миллилитры
    if norm_unit in ["g", "ml"]:
        return round(quantity, 1)

    # 3. Килограммы / литры
    if norm_unit in ["kg", "l"]:
        return round(quantity * 1000.0, 1)

    # 4. Штуки (pcs) — смотрим вес одной штуки в базе продукта
    if norm_unit in ["pcs", "штука", "шт"]:
        if food_data and "piece_weight" in food_data:
            return round(quantity * float(food_data["piece_weight"]), 1)
        if fallback_grams and fallback_grams > 0:
            return round(quantity * fallback_grams, 1)
        # Если продукт не имеет piece_weight, берем условные 100 г на 1 шт
        return round(quantity * 100.0, 1)

    # 5. Ложки, стаканы, ломтики
    if norm_unit in UNIT_CONVERSIONS_GRAMS:
        unit_weight = UNIT_CONVERSIONS_GRAMS[norm_unit]
        # Корректировка: арахисовая паста в столовой ложке тяжелее (~20г)
        if norm_unit == "tbsp" and food_data and "паста" in food_data.get("name", "").lower():
            unit_weight = 20.0
        return round(quantity * unit_weight, 1)

    # 6. Если передан явный fallback_grams
    if fallback_grams and fallback_grams > 0:
        return round(quantity * fallback_grams, 1)

    # Дефолтная безопасность: возвращаем исходное значение как граммы
    return round(quantity, 1)


def compute_nutrition(
    weight_grams: float,
    calories_100g: float,
    protein_100g: float,
    fat_100g: float,
    carbs_100g: float,
) -> Tuple[float, float, float, float]:
    """
    Точный математический расчёт КБЖУ для заданного веса в граммах.
    Формула: nutrient = (weight_grams / 100.0) * nutrient_100g
    Округляется до 1 десятичного знака (калории до 1 знака).
    """
    if weight_grams <= 0:
        return 0.0, 0.0, 0.0, 0.0

    ratio = weight_grams / 100.0
    calories = round(ratio * calories_100g, 1)
    protein = round(ratio * protein_100g, 1)
    fat = round(ratio * fat_100g, 1)
    carbs = round(ratio * carbs_100g, 1)

    return calories, protein, fat, carbs
