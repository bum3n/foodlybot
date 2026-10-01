from datetime import date
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ParsedItem(BaseModel):
    name: str = Field(..., description="Название продукта на русском языке в нормализованной форме")
    quantity: float = Field(..., description="Количество продукта")
    unit: str = Field("g", description="Единица измерения: g, ml, pcs, tbsp, tsp, cup, slice, etc.")
    estimated: bool = Field(False, description="Приблизительная ли оценка (true для фото или неточных мер)")
    confidence: Literal["low", "medium", "high"] = Field("high", description="Уровень уверенности")
    estimated_grams: Optional[float] = Field(None, description="Оценка веса в граммах если единица не граммы")


class RecipeIngredient(BaseModel):
    name: str
    quantity: float
    unit: str = "g"
    grams: float


class AIParsedFoodResponse(BaseModel):
    date: str = Field(..., description="Дата записи в формате YYYY-MM-DD")
    meal: Literal["breakfast", "lunch", "dinner", "snack"] = Field("snack", description="Прием пищи")
    items: List[ParsedItem] = Field(default_factory=list, description="Список распознанных продуктов")
    
    # Intent / context processing
    intent: Literal[
        "add_meal",
        "append_to_last",
        "modify_quantity",
        "delete_last_item",
        "repeat_yesterday",
        "repeat_last",
        "create_recipe",
        "create_standard",
        "unknown"
    ] = Field("add_meal", description="Намерение пользователя")

    target_product_name: Optional[str] = Field(None, description="Название продукта для исправления или удаления")
    new_quantity: Optional[float] = Field(None, description="Новое количество при исправлении")
    new_unit: Optional[str] = Field(None, description="Новая единица измерения")
    
    # Custom recipe / standard definition
    recipe_name: Optional[str] = Field(None, description="Название сохраняемого рецепта/команды (например, 'мой шейк')")
    recipe_ingredients: Optional[List[RecipeIngredient]] = Field(None, description="Ингредиенты рецепта")
    standard_item_name: Optional[str] = Field(None, description="Продукт для стандарта (например, 'яйцо')")
    standard_grams: Optional[float] = Field(None, description="Стандартный вес в граммах (например, 70)")

    confidence: Literal["low", "medium", "high"] = Field("high", description="Общая уверенность распознавания")
    clarification_message: Optional[str] = Field(None, description="Текст уточнения, если AI сомневается или не распознал еду")


class FoodNutrients(BaseModel):
    calories_100g: float
    protein_100g: float
    fat_100g: float
    carbs_100g: float
    source: str = "local"  # local, openfoodfacts, custom_recipe, estimated


class CalculatedItem(BaseModel):
    name: str
    quantity: float
    unit: str
    weight_grams: float
    calories: float
    protein: float
    fat: float
    carbs: float
    confidence: str = "high"
    is_estimated: bool = False
    source: str = "local"


class CalculatedMeal(BaseModel):
    date: str
    meal_type: str
    items: List[CalculatedItem]
    total_calories: float
    total_protein: float
    total_fat: float
    total_carbs: float
    photo_file_id: Optional[str] = None
    photo_url: Optional[str] = None


class DayTotals(BaseModel):
    date: str
    calories: float
    protein: float
    fat: float
    carbs: float


class MealItemOut(BaseModel):
    id: int
    meal_id: int
    name: str
    quantity: float
    unit: str
    weight_grams: float
    calories: float
    protein: float
    fat: float
    carbs: float
    confidence: str
    is_estimated: bool
    source: str

    class Config:
        from_attributes = True


class MealOut(BaseModel):
    id: int
    user_id: int
    date: str
    meal_type: str
    photo_url: Optional[str] = None
    items: List[MealItemOut]
    total_calories: float = 0.0
    total_protein: float = 0.0
    total_fat: float = 0.0
    total_carbs: float = 0.0

    class Config:
        from_attributes = True


class DayDiaryOut(BaseModel):
    date: str
    meals: List[MealOut]
    totals: DayTotals
    goals: "UserGoalsOut"


class UserGoalsOut(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    calorie_goal: int
    protein_goal: int
    fat_goal: int
    carb_goal: int
    auto_confirm: bool

    class Config:
        from_attributes = True


class UserGoalsUpdate(BaseModel):
    calorie_goal: Optional[int] = None
    protein_goal: Optional[int] = None
    fat_goal: Optional[int] = None
    carb_goal: Optional[int] = None
    auto_confirm: Optional[bool] = None
