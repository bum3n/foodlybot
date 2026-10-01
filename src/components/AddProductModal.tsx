import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Sparkles } from 'lucide-react';
import { MealType, FoodItem } from '../types/nutrition';
import {
  LOCAL_FOOD_DB,
  findLocalFood,
  calculateGrams,
  computeNutrients,
  FoodBaseEntry,
} from '../lib/nutritionCalculator';

interface Props {
  mealType: MealType;
  onAdd: (item: Omit<FoodItem, 'id'>) => void;
  onClose: () => void;
}

export const AddProductModal: React.FC<Props> = ({ mealType, onAdd, onClose }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodBaseEntry | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');
  const [offResults, setOffResults] = useState<FoodBaseEntry[]>([]);
  const [isSearchingOff, setIsSearchingOff] = useState(false);

  // Custom product inputs
  const [customName, setCustomName] = useState('');
  const [customC100, setCustomC100] = useState<number>(100);
  const [customP100, setCustomP100] = useState<number>(5);
  const [customF100, setCustomF100] = useState<number>(2);
  const [customCarb100, setCustomCarb100] = useState<number>(15);

  // Filter local foods
  const localMatches = Object.values(LOCAL_FOOD_DB).filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.synonyms.some((s) => s.includes(q));
  }).slice(0, 10);

  // Search Open Food Facts
  useEffect(() => {
    if (query.trim().length < 3) {
      setOffResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOff(true);
      try {
        const res = await fetch(`/api/openfoodfacts?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: FoodBaseEntry[] = data.map((d: any) => ({
            name: d.name,
            calories: d.calories,
            protein: d.protein,
            fat: d.fat,
            carbs: d.carbs,
            synonyms: [],
          }));
          setOffResults(mapped);
        }
      } catch (e) {
        console.error('OFF search error:', e);
      } finally {
        setIsSearchingOff(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Calculate live preview
  const currentGrams = selectedFood
    ? calculateGrams(quantity, unit, selectedFood)
    : quantity;

  const currentNutrients = selectedFood
    ? computeNutrients(
        currentGrams,
        selectedFood.calories,
        selectedFood.protein,
        selectedFood.fat,
        selectedFood.carbs
      )
    : computeNutrients(
        currentGrams,
        customC100,
        customP100,
        customF100,
        customCarb100
      );

  const handleSelectFood = (food: FoodBaseEntry) => {
    setSelectedFood(food);
    if (food.pieceWeight) {
      setUnit('pcs');
      setQuantity(1);
    } else {
      setUnit('g');
      setQuantity(100);
    }
  };

  const handleConfirmAdd = () => {
    if (activeTab === 'search') {
      if (!selectedFood) return;
      onAdd({
        name: selectedFood.name,
        quantity: quantity,
        unit: unit,
        weightGrams: currentGrams,
        calories: currentNutrients.calories,
        protein: currentNutrients.protein,
        fat: currentNutrients.fat,
        carbs: currentNutrients.carbs,
        confidence: 'high',
        isEstimated: false,
        source: selectedFood.synonyms.length > 0 ? 'local' : 'openfoodfacts',
      });
    } else {
      if (!customName.trim()) return;
      onAdd({
        name: customName.trim(),
        quantity: quantity,
        unit: unit,
        weightGrams: currentGrams,
        calories: currentNutrients.calories,
        protein: currentNutrients.protein,
        fat: currentNutrients.fat,
        carbs: currentNutrients.carbs,
        confidence: 'high',
        isEstimated: false,
        source: 'custom_product',
      });
    }
    onClose();
  };

  const mealTitleRu = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
  }[mealType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Добавить в {mealTitleRu}
            </h3>
            <span className="text-xs text-slate-400">Поиск по базе и Open Food Facts</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Tab */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'search'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Поиск продуктов
          </button>
          <button
            onClick={() => {
              setActiveTab('custom');
              setSelectedFood(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'custom'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Свой продукт
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Начните писать название..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Results list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-1">
                Локальная база
              </span>
              {localMatches.map((food, i) => (
                <div
                  key={`local-${i}`}
                  onClick={() => handleSelectFood(food)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                    selectedFood?.name === food.name
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {food.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {Math.round(food.calories)} ккал
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    на 100 г: Б {food.protein}г · Ж {food.fat}г · У {food.carbs}г
                  </div>
                </div>
              ))}

              {offResults.length > 0 && (
                <>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-1 pt-2">
                    Open Food Facts
                  </span>
                  {offResults.map((food, i) => (
                    <div
                      key={`off-${i}`}
                      onClick={() => handleSelectFood(food)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                        selectedFood?.name === food.name
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                          {food.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {Math.round(food.calories)} ккал
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        на 100 г: Б {food.protein}г · Ж {food.fat}г · У {food.carbs}г
                      </div>
                    </div>
                  ))}
                </>
              )}

              {isSearchingOff && (
                <div className="text-center py-2 text-xs text-slate-400">
                  Поиск в Open Food Facts...
                </div>
              )}
            </div>

            {/* Quantity and unit selector for chosen item */}
            {selectedFood && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Выбрано: {selectedFood.name}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400 block mb-0.5">Количество</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-[11px] text-slate-400 block mb-0.5">Единица</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    >
                      <option value="g">граммы (г)</option>
                      <option value="pcs">штуки (шт)</option>
                      <option value="ml">мл</option>
                      <option value="tbsp">ст. ложка</option>
                      <option value="tsp">ч. ложка</option>
                      <option value="slice">кусок</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Название продукта
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Например: Домашний сэндвич"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
              />
            </div>

            <span className="text-[11px] text-slate-400 block font-medium">
              КБЖУ на 100 грамм продукта:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block">Калории (ккал)</label>
                <input
                  type="number"
                  value={customC100}
                  onChange={(e) => setCustomC100(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block">Белки (г)</label>
                <input
                  type="number"
                  value={customP100}
                  onChange={(e) => setCustomP100(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block">Жиры (г)</label>
                <input
                  type="number"
                  value={customF100}
                  onChange={(e) => setCustomF100(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block">Углеводы (г)</label>
                <input
                  type="number"
                  value={customCarb100}
                  onChange={(e) => setCustomCarb100(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 block mb-0.5">Количество</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="w-28">
                <label className="text-[11px] text-slate-400 block mb-0.5">Единица</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                >
                  <option value="g">граммы (г)</option>
                  <option value="pcs">штуки (шт)</option>
                  <option value="ml">мл</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Live Calculation Preview & Submit */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-xs mb-3 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl">
            <span className="text-slate-500">Итого порции ({Math.round(currentGrams)} г):</span>
            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {currentNutrients.calories} ккал · Б {currentNutrients.protein}г · Ж {currentNutrients.fat}г · У {currentNutrients.carbs}г
            </span>
          </div>

          <button
            onClick={handleConfirmAdd}
            disabled={activeTab === 'search' ? !selectedFood : !customName.trim()}
            className="w-full h-11 bg-slate-900 dark:bg-emerald-600 text-white font-medium text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>Добавить продукт в {mealTitleRu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
