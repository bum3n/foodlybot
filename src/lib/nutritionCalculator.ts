import { FoodItem, MealType } from '../types/nutrition';

export interface FoodBaseEntry {
  name: string;
  calories: number; // per 100g
  protein: number;
  fat: number;
  carbs: number;
  pieceWeight?: number;
  synonyms: string[];
}

export const LOCAL_FOOD_DB: Record<string, FoodBaseEntry> = {
  'яйцо': {
    name: 'Яйцо куриное',
    calories: 143.0,
    protein: 12.6,
    fat: 9.5,
    carbs: 0.7,
    pieceWeight: 60.0,
    synonyms: ['яйцо куриное', 'яйца', 'яичница', 'яйцо вареное', 'вареное яйцо', 'яйцо вкрутую'],
  },
  'яичница': {
    name: 'Яичница на масле',
    calories: 195.0,
    protein: 13.0,
    fat: 15.0,
    carbs: 0.8,
    pieceWeight: 65.0,
    synonyms: ['глазунья', 'омлет'],
  },
  'рисовая каша': {
    name: 'Каша рисовая вареная',
    calories: 116.0,
    protein: 2.5,
    fat: 0.5,
    carbs: 25.0,
    synonyms: ['рис вареный', 'рис отварной', 'рис белый', 'рис'],
  },
  'гречка': {
    name: 'Гречка вареная',
    calories: 110.0,
    protein: 4.2,
    fat: 1.1,
    carbs: 21.3,
    synonyms: ['каша гречневая', 'гречневая каша', 'гречка отварная'],
  },
  'овсянка': {
    name: 'Овсяная каша на воде',
    calories: 88.0,
    protein: 3.0,
    fat: 1.7,
    carbs: 15.0,
    synonyms: ['овсяная каша', 'геркулес', 'овсяные хлопья'],
  },
  'макароны': {
    name: 'Макароны отварные',
    calories: 131.0,
    protein: 5.0,
    fat: 1.1,
    carbs: 25.0,
    synonyms: ['спагетти', 'паста', 'вермишель', 'рожки'],
  },
  'куриная грудка': {
    name: 'Куриное филе (грудка) вареная',
    calories: 137.0,
    protein: 29.8,
    fat: 1.8,
    carbs: 0.0,
    pieceWeight: 180.0,
    synonyms: ['курица', 'куриное филе', 'куриная грудь', 'курица вареная', 'куриное мясо'],
  },
  'говядина': {
    name: 'Говядина тушеная',
    calories: 210.0,
    protein: 26.0,
    fat: 12.0,
    carbs: 0.0,
    pieceWeight: 150.0,
    synonyms: ['говядина вареная', 'стейк', 'гуляш'],
  },
  'молоко': {
    name: 'Молоко 2.5%',
    calories: 52.0,
    protein: 2.8,
    fat: 2.5,
    carbs: 4.7,
    pieceWeight: 200.0,
    synonyms: ['молоко коровье', 'пастеризованное молоко'],
  },
  'творог 5%': {
    name: 'Творог 5%',
    calories: 121.0,
    protein: 17.2,
    fat: 5.0,
    carbs: 1.8,
    pieceWeight: 180.0,
    synonyms: ['творог', 'творог нежирный'],
  },
  'сыр': {
    name: 'Сыр твердый (Российский)',
    calories: 360.0,
    protein: 24.0,
    fat: 29.5,
    carbs: 0.0,
    pieceWeight: 30.0,
    synonyms: ['сыр твердый', 'сыр российский', 'гауда', 'чеддер', 'пармезан'],
  },
  'хлеб': {
    name: 'Хлеб белый/пшеничный',
    calories: 250.0,
    protein: 8.0,
    fat: 1.5,
    carbs: 50.0,
    pieceWeight: 35.0,
    synonyms: ['хлеб белый', 'батон', 'булка', 'кусок хлеба'],
  },
  'хлеб ржаной': {
    name: 'Хлеб ржаной (Бородинский)',
    calories: 210.0,
    protein: 6.8,
    fat: 1.3,
    carbs: 41.0,
    pieceWeight: 40.0,
    synonyms: ['черный хлеб', 'ржаной хлеб', 'бородинский'],
  },
  'бутерброд с сыром': {
    name: 'Бутерброд с сыром',
    calories: 260.0,
    protein: 10.5,
    fat: 11.0,
    carbs: 29.0,
    pieceWeight: 75.0,
    synonyms: ['бутерброд', 'бутер'],
  },
  'печенье': {
    name: 'Печенье (овсяное/юбилейное)',
    calories: 440.0,
    protein: 7.0,
    fat: 15.0,
    carbs: 68.0,
    pieceWeight: 15.0,
    synonyms: ['печеньки', 'печенька', 'овсяное печенье', 'сладкое печенье'],
  },
  'банан': {
    name: 'Банан свежий',
    calories: 89.0,
    protein: 1.1,
    fat: 0.3,
    carbs: 22.8,
    pieceWeight: 120.0,
    synonyms: ['бананы', 'бананчик'],
  },
  'яблоко': {
    name: 'Яблоко свежее',
    calories: 52.0,
    protein: 0.3,
    fat: 0.2,
    carbs: 13.8,
    pieceWeight: 160.0,
    synonyms: ['яблоки', 'яблочко'],
  },
  'чай': {
    name: 'Чай без сахара',
    calories: 1.0,
    protein: 0.1,
    fat: 0.0,
    carbs: 0.2,
    pieceWeight: 250.0,
    synonyms: ['чай черный', 'чай зеленый', 'зеленый чай', 'черный чай', 'кружка чая'],
  },
  'кофе': {
    name: 'Кофе черный без сахара',
    calories: 2.0,
    protein: 0.2,
    fat: 0.1,
    carbs: 0.3,
    pieceWeight: 200.0,
    synonyms: ['американо', 'эспрессо'],
  },
  'сахар': {
    name: 'Сахар белый',
    calories: 398.0,
    protein: 0.0,
    fat: 0.0,
    carbs: 99.8,
    pieceWeight: 5.0,
    synonyms: ['сахарный песок', 'сахар белый'],
  },
  'протеин': {
    name: 'Сывороточный протеин 80%',
    calories: 390.0,
    protein: 80.0,
    fat: 5.0,
    carbs: 6.0,
    pieceWeight: 30.0,
    synonyms: ['сывороточный протеин', 'протеин порошок', 'белковый порошок'],
  },
  'арахисовая паста': {
    name: 'Арахисовая паста без сахара',
    calories: 588.0,
    protein: 25.0,
    fat: 50.0,
    carbs: 20.0,
    pieceWeight: 20.0,
    synonyms: ['арахисовое масло', 'паста арахисовая'],
  },
  'пицца': {
    name: 'Пицца (средний кусок)',
    calories: 266.0,
    protein: 11.0,
    fat: 10.0,
    carbs: 33.0,
    pieceWeight: 120.0,
    synonyms: ['кусок пиццы', 'пепперони'],
  },
};

export function normalizeFoodQuery(q: string): string {
  return q.toLowerCase().replace(/[.,!?;:"'()]/g, '').trim();
}

export function findLocalFood(q: string): FoodBaseEntry | null {
  const norm = normalizeFoodQuery(q);
  if (LOCAL_FOOD_DB[norm]) return LOCAL_FOOD_DB[norm];

  for (const [key, item] of Object.entries(LOCAL_FOOD_DB)) {
    if (norm === key || item.synonyms.includes(norm)) {
      return item;
    }
  }

  for (const [key, item] of Object.entries(LOCAL_FOOD_DB)) {
    if (norm.includes(key) || key.includes(norm)) {
      return item;
    }
    if (item.synonyms.some((s) => norm.includes(s) || s.includes(norm))) {
      return item;
    }
  }

  return null;
}

export function calculateGrams(
  quantity: number,
  unit: string,
  food?: FoodBaseEntry | null,
  userStandardGrams?: number
): number {
  const u = unit.toLowerCase().trim();

  // User personal standard (e.g. egg = 70g)
  if (userStandardGrams && userStandardGrams > 0 && ['pcs', 'шт', 'порция', 'portion'].includes(u)) {
    return Math.round(quantity * userStandardGrams * 10) / 10;
  }

  if (['g', 'г', 'гр', 'gram', 'grams', 'ml', 'мл'].includes(u)) {
    return Math.round(quantity * 10) / 10;
  }

  if (['kg', 'кг', 'l', 'л'].includes(u)) {
    return Math.round(quantity * 1000 * 10) / 10;
  }

  if (['tsp', 'чл', 'ч.л.', 'чайная ложка', 'чайные ложки', 'чайных ложек'].includes(u)) {
    return Math.round(quantity * 5.0 * 10) / 10;
  }

  if (['tbsp', 'стл', 'ст.л.', 'столовая ложка', 'столовые ложки'].includes(u)) {
    const w = food && food.name.toLowerCase().includes('паста') ? 20.0 : 15.0;
    return Math.round(quantity * w * 10) / 10;
  }

  if (['cup', 'стакан', 'стакана', 'чашка'].includes(u)) {
    return Math.round(quantity * 200.0 * 10) / 10;
  }

  if (['slice', 'кусок', 'кусочек', 'ломтик'].includes(u)) {
    const w = food?.pieceWeight || 35.0;
    return Math.round(quantity * w * 10) / 10;
  }

  if (['pcs', 'шт', 'штука', 'штуки', 'штук'].includes(u)) {
    const w = food?.pieceWeight || 100.0;
    return Math.round(quantity * w * 10) / 10;
  }

  return Math.round(quantity * 10) / 10;
}

export function computeNutrients(
  grams: number,
  c100: number,
  p100: number,
  f100: number,
  carb100: number
) {
  const ratio = grams / 100.0;
  return {
    calories: Math.round(ratio * c100 * 10) / 10,
    protein: Math.round(ratio * p100 * 10) / 10,
    fat: Math.round(ratio * f100 * 10) / 10,
    carbs: Math.round(ratio * carb100 * 10) / 10,
  };
}
