import React, { useState } from 'react';
import { Meal, FoodItem, MealType } from '../types/nutrition';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, Camera } from 'lucide-react';

interface Props {
  meal: Meal;
  onAddItem: (mealType: MealType) => void;
  onEditItem: (item: FoodItem) => void;
  onDeleteItem: (itemId: string) => void;
  onViewPhoto: (photoUrl: string) => void;
}

const MEAL_INFO: Record<MealType, { title: string; icon: string; emoji: string }> = {
  breakfast: { title: 'Завтрак', icon: '☀️', emoji: '🍳' },
  lunch: { title: 'Обед', icon: '🍲', emoji: '🍲' },
  dinner: { title: 'Ужин', icon: '🥗', emoji: '🥗' },
  snack: { title: 'Перекус', icon: '🥪', emoji: '🥪' },
};

export const MealCard: React.FC<Props> = ({
  meal,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onViewPhoto,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const info = MEAL_INFO[meal.type] || { title: meal.type, icon: '🍽', emoji: '🍽' };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition-all">
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
            {info.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              {info.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span>{meal.items.length} поз.</span>
              <span aria-hidden="true">·</span>
              <span>Б: {Math.round(meal.totalProtein)}г</span>
              <span aria-hidden="true">·</span>
              <span>Ж: {Math.round(meal.totalFat)}г</span>
              <span aria-hidden="true">·</span>
              <span>У: {Math.round(meal.totalCarbs)}г</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {Math.round(meal.totalCalories)} <span className="text-xs font-normal text-slate-400">ккал</span>
          </span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Expanded item list */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 px-4 py-3">
          {meal.items.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              В этом приёме пока нет продуктов
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {meal.items.map((it) => (
                <div key={it.id} className="py-2.5 flex items-center justify-between group">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {it.name}
                      </span>
                      {it.isEstimated && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          оценка
                        </span>
                      )}
                      {it.photoUrl && (
                        <button
                          onClick={() => onViewPhoto(it.photoUrl!)}
                          title="Посмотреть исходное фото блюда"
                          className="text-slate-400 hover:text-emerald-500 transition-colors p-0.5"
                        >
                          <Camera size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{it.quantity} {it.unit} ({Math.round(it.weightGrams)} г)</span>
                      <span aria-hidden="true">·</span>
                      <span>Б {Math.round(it.protein)}г</span>
                      <span aria-hidden="true">·</span>
                      <span>Ж {Math.round(it.fat)}г</span>
                      <span aria-hidden="true">·</span>
                      <span>У {Math.round(it.carbs)}г</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {Math.round(it.calories)} <span className="text-[11px] font-normal text-slate-400">ккал</span>
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditItem(it)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        title="Изменить количество"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteItem(it.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Удалить продукт"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add product button */}
          <button
            onClick={() => onAddItem(meal.type)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
          >
            <Plus size={15} />
            <span>Добавить продукт</span>
          </button>
        </div>
      )}
    </div>
  );
};
