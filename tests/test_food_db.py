"""
Тесты локальной базы продуктов и поиска.
"""

import unittest
from app.nutrition.food_db import find_in_food_database, normalize_food_name


class TestFoodDB(unittest.TestCase):
    def test_normalize_name(self):
        self.assertEqual(normalize_food_name("  Рисовая Каша! "), "рисовая каша")
        self.assertEqual(normalize_food_name("Куриное яйцо, вареное."), "куриное яйцо вареное")

    def test_find_exact_and_synonyms(self):
        # Точный поиск
        res = find_in_food_database("яйцо")
        self.assertIsNotNone(res)
        key, data = res
        self.assertEqual(data["calories"], 143.0)
        self.assertEqual(data["piece_weight"], 60.0)

        # Поиск по синониму "гречневая каша"
        res_buckwheat = find_in_food_database("гречневая каша")
        self.assertIsNotNone(res_buckwheat)
        _, data_bw = res_buckwheat
        self.assertIn("Гречка", data_bw["name"])

        # Поиск "рисовая каша"
        res_rice = find_in_food_database("рисовая каша")
        self.assertIsNotNone(res_rice)
        _, data_rice = res_rice
        self.assertEqual(data_rice["calories"], 116.0)

