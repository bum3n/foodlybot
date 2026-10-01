"""
Тесты строгого расчёта КБЖУ на чистом Python без нейросети.
"""

import unittest
from app.nutrition.calculator import (
    compute_nutrition,
    calculate_weight_in_grams,
    normalize_unit,
)


class TestCalculator(unittest.TestCase):
    def test_exact_arithmetic_from_prompt(self):
        """
        Проверка примера из задания:
        Продукт на 100 г: 400 ккал, 10 г белка, 20 г жира, 50 г углеводов.
        Для 50 г должно быть ровно: 200 ккал, 5 г белка, 10 г жира, 25 г углеводов.
        """
        weight_grams = 50.0
        c100, p100, f100, cb100 = 400.0, 10.0, 20.0, 50.0

        calories, protein, fat, carbs = compute_nutrition(
            weight_grams, c100, p100, f100, cb100
        )

        self.assertEqual(calories, 200.0)
        self.assertEqual(protein, 5.0)
        self.assertEqual(fat, 10.0)
        self.assertEqual(carbs, 25.0)

    def test_unit_conversion_spoons(self):
        # 2 чайные ложки сахара = 10 г
        grams = calculate_weight_in_grams(quantity=2.0, unit="tsp")
        self.assertEqual(grams, 10.0)

        # 1 столовая ложка = 15 г
        grams_tbsp = calculate_weight_in_grams(quantity=1.0, unit="tbsp")
        self.assertEqual(grams_tbsp, 15.0)

    def test_piece_weight_and_custom_standards(self):
        # 2 яйца по стандартной базе (60г) = 120 г
        food_data = {"name": "Яйцо куриное", "piece_weight": 60.0}
        grams_std = calculate_weight_in_grams(quantity=2.0, unit="pcs", food_data=food_data)
        self.assertEqual(grams_std, 120.0)

        # Персональный стандарт пользователя (яйцо = 70 г) -> 2 яйца = 140 г
        grams_custom = calculate_weight_in_grams(
            quantity=2.0,
            unit="pcs",
            food_data=food_data,
            user_standard_grams=70.0
        )
        self.assertEqual(grams_custom, 140.0)

    def test_normalize_units(self):
        self.assertEqual(normalize_unit("г"), "g")
        self.assertEqual(normalize_unit("мл"), "ml")
        self.assertEqual(normalize_unit("шт"), "pcs")
        self.assertEqual(normalize_unit("ч.л."), "tsp")
        self.assertEqual(normalize_unit("ст.л."), "tbsp")

