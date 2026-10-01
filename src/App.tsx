import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  Plus,
  MessageSquare,
  Smartphone,
  BarChart2,
  Info,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import {
  DayDiary,
  MealType,
  FoodItem,
  UserGoals,
  UserStandard,
  CustomRecipe,
} from './types/nutrition';
import {
  INITIAL_DIARIES,
  INITIAL_USER_GOALS,
  INITIAL_STANDARDS,
  INITIAL_RECIPES,
} from './data/initialData';
import { DailySummaryRings } from './components/DailySummaryRings';
import { MealCard } from './components/MealCard';
import { CalendarModal } from './components/CalendarModal';
import { AddProductModal } from './components/AddProductModal';
import { EditQuantityModal } from './components/EditQuantityModal';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { GoalsModal } from './components/GoalsModal';
import { StatsView } from './components/StatsView';
import { BotSimulator } from './components/BotSimulator';
import { ArchitectureModal } from './components/ArchitectureModal';

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeView, setActiveView] = useState<'miniapp' | 'bot' | 'stats'>('miniapp');
  const [diaries, setDiaries] = useState<Record<string, DayDiary>>(INITIAL_DIARIES);
  const [goals, setGoals] = useState<UserGoals>(INITIAL_USER_GOALS);
  const [standards, setStandards] = useState<UserStandard[]>(INITIAL_STANDARDS);
  const [recipes, setRecipes] = useState<CustomRecipe[]>(INITIAL_RECIPES);

  // Modals state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType | null>(null);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  // Dark mode toggle
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Current day diary
  const currentDiary: DayDiary = diaries[selectedDate] || {
    date: selectedDate,
    meals: [],
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
  };

  // Organize meals into 4 standard categories
  const mealsByType: Record<MealType, FoodItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  currentDiary.meals.forEach((m) => {
    if (mealsByType[m.type]) {
      mealsByType[m.type].push(...m.items);
    } else {
      mealsByType['snack'].push(...m.items);
    }
  });

  const getMealCategoryObject = (type: MealType) => {
    const items = mealsByType[type];
    const c = Math.round(items.reduce((acc, it) => acc + it.calories, 0));
    const p = Math.round(items.reduce((acc, it) => acc + it.protein, 0));
    const f = Math.round(items.reduce((acc, it) => acc + it.fat, 0));
    const cb = Math.round(items.reduce((acc, it) => acc + it.carbs, 0));

    return {
      id: `${selectedDate}-${type}`,
      type: type,
      date: selectedDate,
      items: items,
      totalCalories: c,
      totalProtein: p,
      totalFat: f,
      totalCarbs: cb,
    };
  };

  // Helper to recompute totals
  const recalculateDayDiary = (prevDiaries: Record<string, DayDiary>, date: string): Record<string, DayDiary> => {
    const day = prevDiaries[date];
    if (!day) return prevDiaries;

    let totC = 0;
    let totP = 0;
    let totF = 0;
    let totCb = 0;

    day.meals.forEach((m) => {
      let mC = 0;
      let mP = 0;
      let mF = 0;
      let mCb = 0;
      m.items.forEach((it) => {
        mC += it.calories;
        mP += it.protein;
        mF += it.fat;
        mCb += it.carbs;
      });
      m.totalCalories = Math.round(mC * 10) / 10;
      m.totalProtein = Math.round(mP * 10) / 10;
      m.totalFat = Math.round(mF * 10) / 10;
      m.totalCarbs = Math.round(mCb * 10) / 10;

      totC += mC;
      totP += mP;
      totF += mF;
      totCb += mCb;
    });

    day.totalCalories = Math.round(totC * 10) / 10;
    day.totalProtein = Math.round(totP * 10) / 10;
    day.totalFat = Math.round(totF * 10) / 10;
    day.totalCarbs = Math.round(totCb * 10) / 10;

    return { ...prevDiaries, [date]: { ...day } };
  };

  // Add Item
  const handleAddItemToMeal = (type: MealType, item: Omit<FoodItem, 'id'>) => {
    const newItem: FoodItem = {
      ...item,
      id: 'it-' + Date.now(),
    };

    setDiaries((prev) => {
      const day = prev[selectedDate] || {
        date: selectedDate,
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
      };

      let existingMeal = day.meals.find((m) => m.type === type);
      if (!existingMeal) {
        existingMeal = {
          id: `meal-${Date.now()}`,
          type: type,
          date: selectedDate,
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCarbs: 0,
        };
        day.meals.push(existingMeal);
      }

      existingMeal.items.push(newItem);
      return recalculateDayDiary({ ...prev, [selectedDate]: day }, selectedDate);
    });
  };

  // Commit from Bot
  const handleCommitFromBot = (
    date: string,
    mealType: MealType,
    items: FoodItem[],
    photoUrl?: string
  ) => {
    setDiaries((prev) => {
      const day = prev[date] || {
        date: date,
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
      };

      let existingMeal = day.meals.find((m) => m.type === mealType);
      if (!existingMeal) {
        existingMeal = {
          id: `meal-${Date.now()}`,
          type: mealType,
          date: date,
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCarbs: 0,
          photoUrl: photoUrl,
        };
        day.meals.push(existingMeal);
      }

      existingMeal.items.push(...items);
      return recalculateDayDiary({ ...prev, [date]: day }, date);
    });
  };

  // Edit quantity
  const handleSaveEditedQuantity = (newQuantity: number) => {
    if (!editingItem) return;

    setDiaries((prev) => {
      const day = prev[selectedDate];
      if (!day) return prev;

      day.meals.forEach((m) => {
        m.items.forEach((it) => {
          if (it.id === editingItem.id) {
            const ratio = it.quantity > 0 ? newQuantity / it.quantity : 1;
            it.quantity = newQuantity;
            it.weightGrams = Math.round(it.weightGrams * ratio * 10) / 10;
            it.calories = Math.round(it.calories * ratio * 10) / 10;
            it.protein = Math.round(it.protein * ratio * 10) / 10;
            it.fat = Math.round(it.fat * ratio * 10) / 10;
            it.carbs = Math.round(it.carbs * ratio * 10) / 10;
          }
        });
      });

      return recalculateDayDiary({ ...prev, [selectedDate]: day }, selectedDate);
    });
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    setDiaries((prev) => {
      const day = prev[selectedDate];
      if (!day) return prev;

      day.meals.forEach((m) => {
        m.items = m.items.filter((it) => it.id !== itemId);
      });
      day.meals = day.meals.filter((m) => m.items.length > 0);

      return recalculateDayDiary({ ...prev, [selectedDate]: day }, selectedDate);
    });
  };

  // Bot context shortcuts
  const handleModifyLastItem = (newQuantity: number) => {
    const day = diaries[selectedDate];
    if (!day || day.meals.length === 0) return;
    const lastMeal = day.meals[day.meals.length - 1];
    if (!lastMeal || lastMeal.items.length === 0) return;
    const lastItem = lastMeal.items[lastMeal.items.length - 1];
    setEditingItem(lastItem);
    handleSaveEditedQuantity(newQuantity);
    setEditingItem(null);
  };

  const handleDeleteLastItem = () => {
    const day = diaries[selectedDate];
    if (!day || day.meals.length === 0) return;
    const lastMeal = day.meals[day.meals.length - 1];
    if (!lastMeal || lastMeal.items.length === 0) return;
    const lastItem = lastMeal.items[lastMeal.items.length - 1];
    handleDeleteItem(lastItem.id);
  };

  // Date stepper
  const changeDateByDays = (delta: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + delta);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const formattedDateString = new Date(selectedDate).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  const isSelectedToday = selectedDate === todayStr;

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors flex flex-col items-center py-4 px-2 sm:px-4">
        {/* Main responsive container (Max 680px for authentic mobile/tablet Telegram Mini App preview) */}
        <div className="w-full max-w-[620px] flex flex-col gap-3">
          {/* Top Bar Navigation Contract (One row, 3 zones) */}
          <header className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
            {/* Zone 1: Single Wordmark */}
            <div className="flex items-center gap-2">
              <span className="text-xl">🥑</span>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                NutriBot
              </span>
            </div>

            {/* Zone 2: Navigation segmented control tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setActiveView('miniapp')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  activeView === 'miniapp'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone size={14} />
                <span>Дневник</span>
              </button>
              <button
                onClick={() => setActiveView('bot')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  activeView === 'bot'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare size={14} />
                <span>Чат с ботом</span>
              </button>
              <button
                onClick={() => setActiveView('stats')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  activeView === 'stats'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BarChart2 size={14} />
                <span>Отчёты</span>
              </button>
            </div>

            {/* Zone 3: Quick Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsArchOpen(true)}
                title="Архитектура и код проекта"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <Info size={17} />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                title="Сменить тему"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </header>

          {/* VIEW 1: Telegram Mini App Diary */}
          {activeView === 'miniapp' && (
            <main className="space-y-3">
              {/* Date Header Strip */}
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <button
                  onClick={() => changeDateByDays(-1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Предыдущий день"
                >
                  <ChevronLeft size={18} />
                </button>

                <div
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <CalendarIcon size={16} className="text-emerald-500" />
                  <span className="font-semibold text-sm capitalize">
                    {isSelectedToday ? `Сегодня, ${formattedDateString}` : formattedDateString}
                  </span>
                </div>

                <button
                  onClick={() => changeDateByDays(1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Следующий день"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Macro Summary Rings */}
              <DailySummaryRings
                totalCalories={currentDiary.totalCalories}
                totalProtein={currentDiary.totalProtein}
                totalFat={currentDiary.totalFat}
                totalCarbs={currentDiary.totalCarbs}
                goals={goals}
                onOpenGoals={() => setIsGoalsOpen(true)}
              />

              {/* Meals List */}
              <div className="space-y-3">
                <MealCard
                  meal={getMealCategoryObject('breakfast')}
                  onAddItem={(t) => setAddMealType(t)}
                  onEditItem={(it) => setEditingItem(it)}
                  onDeleteItem={(id) => handleDeleteItem(id)}
                  onViewPhoto={(url) => setViewingPhotoUrl(url)}
                />
                <MealCard
                  meal={getMealCategoryObject('lunch')}
                  onAddItem={(t) => setAddMealType(t)}
                  onEditItem={(it) => setEditingItem(it)}
                  onDeleteItem={(id) => handleDeleteItem(id)}
                  onViewPhoto={(url) => setViewingPhotoUrl(url)}
                />
                <MealCard
                  meal={getMealCategoryObject('dinner')}
                  onAddItem={(t) => setAddMealType(t)}
                  onEditItem={(it) => setEditingItem(it)}
                  onDeleteItem={(id) => handleDeleteItem(id)}
                  onViewPhoto={(url) => setViewingPhotoUrl(url)}
                />
                <MealCard
                  meal={getMealCategoryObject('snack')}
                  onAddItem={(t) => setAddMealType(t)}
                  onEditItem={(it) => setEditingItem(it)}
                  onDeleteItem={(id) => handleDeleteItem(id)}
                  onViewPhoto={(url) => setViewingPhotoUrl(url)}
                />
              </div>

              {/* Bottom Quick Bot Suggestion */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-3xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-emerald-900 dark:text-emerald-200">
                    Хотите быстро записать еду голосом или фото?
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Перейдите во вкладку «Чат с ботом» или отправьте сообщение боту в Telegram.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('bot')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-colors shrink-0 shadow-xs"
                >
                  Открыть чат
                </button>
              </div>
            </main>
          )}

          {/* VIEW 2: Interactive Telegram Bot Simulator */}
          {activeView === 'bot' && (
            <main>
              <BotSimulator
                goals={goals}
                standards={standards}
                recipes={recipes}
                onCommitMeal={handleCommitFromBot}
                onModifyLastItem={handleModifyLastItem}
                onDeleteLastItem={handleDeleteLastItem}
                onSaveRecipe={(rec) => setRecipes((prev) => [...prev, rec])}
                onSaveStandard={(std) =>
                  setStandards((prev) => [
                    ...prev.filter((s) => s.itemName !== std.itemName),
                    std,
                  ])
                }
              />
            </main>
          )}

          {/* VIEW 3: Weekly Statistics */}
          {activeView === 'stats' && (
            <main>
              <StatsView diaries={diaries} goals={goals} />
            </main>
          )}
        </div>

        {/* MODALS */}
        {isCalendarOpen && (
          <CalendarModal
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
            onClose={() => setIsCalendarOpen(false)}
            loggedDates={Object.keys(diaries).filter((k) => diaries[k].totalCalories > 0)}
          />
        )}

        {addMealType && (
          <AddProductModal
            mealType={addMealType}
            onAdd={(it) => handleAddItemToMeal(addMealType, it)}
            onClose={() => setAddMealType(null)}
          />
        )}

        {editingItem && (
          <EditQuantityModal
            item={editingItem}
            onSave={handleSaveEditedQuantity}
            onClose={() => setEditingItem(null)}
          />
        )}

        {viewingPhotoUrl && (
          <PhotoViewerModal
            photoUrl={viewingPhotoUrl}
            onClose={() => setViewingPhotoUrl(null)}
          />
        )}

        {isGoalsOpen && (
          <GoalsModal
            goals={goals}
            standards={standards}
            recipes={recipes}
            onSaveGoals={(newGoals) => setGoals(newGoals)}
            onAddStandard={(std) =>
              setStandards((prev) => [
                ...prev.filter((s) => s.itemName !== std.itemName),
                std,
              ])
            }
            onDeleteStandard={(name) =>
              setStandards((prev) => prev.filter((s) => s.itemName !== name))
            }
            onClose={() => setIsGoalsOpen(false)}
          />
        )}

        {isArchOpen && <ArchitectureModal onClose={() => setIsArchOpen(false)} />}
      </div>
    </div>
  );
}
