export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  weightGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  confidence: 'low' | 'medium' | 'high';
  isEstimated: boolean;
  source: 'local' | 'openfoodfacts' | 'custom_recipe' | 'custom_product' | 'estimated';
  photoUrl?: string;
  notes?: string;
}

export interface Meal {
  id: string;
  type: MealType;
  date: string; // YYYY-MM-DD
  items: FoodItem[];
  photoUrl?: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

export interface DayDiary {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

export interface UserGoals {
  calorieGoal: number;
  proteinGoal: number;
  fatGoal: number;
  carbGoal: number;
  autoConfirmHighConfidence: boolean;
}

export interface UserStandard {
  itemName: string;
  standardGrams: number;
  standardUnit: string;
}

export interface CustomRecipe {
  id: string;
  name: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    grams: number;
  }[];
  calories100g: number;
  protein100g: number;
  fat100g: number;
  carbs100g: number;
}

export interface BotChatMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  text?: string;
  photoUrl?: string;
  isVoice?: boolean;
  voiceDurationSec?: number;
  pendingMeal?: {
    date: string;
    mealType: MealType;
    items: FoodItem[];
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    confidence: 'low' | 'medium' | 'high';
    clarificationMessage?: string;
  };
  isConfirmed?: boolean;
}
