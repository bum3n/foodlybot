import React, { useState } from 'react';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { UserGoals, UserStandard, CustomRecipe } from '../types/nutrition';

interface Props {
  goals: UserGoals;
  standards: UserStandard[];
  recipes: CustomRecipe[];
  onSaveGoals: (goals: UserGoals) => void;
  onAddStandard: (std: UserStandard) => void;
  onDeleteStandard: (itemName: string) => void;
  onClose: () => void;
}

export const GoalsModal: React.FC<Props> = ({
  goals,
  standards,
  recipes,
  onSaveGoals,
  onAddStandard,
  onDeleteStandard,
  onClose,
}) => {
  const [calorieGoal, setCalorieGoal] = useState(goals.calorieGoal);
  const [proteinGoal, setProteinGoal] = useState(goals.proteinGoal);
  const [fatGoal, setFatGoal] = useState(goals.fatGoal);
  const [carbGoal, setCarbGoal] = useState(goals.carbGoal);
  const [autoConfirm, setAutoConfirm] = useState(goals.autoConfirmHighConfidence);

  // New standard input
  const [newStdName, setNewStdName] = useState('');
  const [newStdGrams, setNewStdGrams] = useState(70);

  const handleSave = () => {
    onSaveGoals({
      calorieGoal,
      proteinGoal,
      fatGoal,
      carbGoal,
      autoConfirmHighConfidence: autoConfirm,
    });
    onClose();
  };

  const handleAddStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStdName.trim() && newStdGrams > 0) {
      onAddStandard({
        itemName: newStdName.trim().toLowerCase(),
        standardGrams: newStdGrams,
        standardUnit: 'pcs',
      });
      setNewStdName('');
      setNewStdGrams(70);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Настройки и личные цели
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Goals Section */}
        <div className="space-y-4 mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Суточные нормы питания
          </span>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Дневная норма калорий (ккал)
            </label>
            <input
              type="number"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold tabular-nums text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Белки (г)</label>
              <input
                type="number"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm tabular-nums text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Жиры (г)</label>
              <input
                type="number"
                value={fatGoal}
                onChange={(e) => setFatGoal(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm tabular-nums text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Углеводы (г)</label>
              <input
                type="number"
                value={carbGoal}
                onChange={(e) => setCarbGoal(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm tabular-nums text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Auto confirm toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <div>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                Авто-подтверждение однозначных записей
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Если AI уверен на 100%, сразу добавлять без кнопок подтверждения
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* User Standards Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Мои стандарты продуктов
          </span>
          <p className="text-[11px] text-slate-400">
            Например: «Яйцо у меня обычно 70 грамм» или «Кружка чая 300 мл».
          </p>

          <div className="space-y-1.5">
            {standards.map((st) => (
              <div
                key={st.itemName}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs"
              >
                <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                  {st.itemName} = {st.standardGrams} г ({st.standardUnit})
                </span>
                <button
                  onClick={() => onDeleteStandard(st.itemName)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddStandardSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Продукт (например: яйцо)"
              value={newStdName}
              onChange={(e) => setNewStdName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
            <input
              type="number"
              placeholder="Грамм"
              value={newStdGrams}
              onChange={(e) => setNewStdGrams(parseFloat(e.target.value) || 0)}
              className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-500"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>

        {/* User Saved Recipes Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Мои рецепты (быстрый ввод)
          </span>
          <div className="space-y-2">
            {recipes.map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1"
              >
                <div className="font-semibold text-slate-900 dark:text-white">
                  «{rec.name}»
                </div>
                <div className="text-[11px] text-slate-400">
                  Состав: {rec.ingredients.map((ing) => `${ing.name} ${ing.quantity} ${ing.unit}`).join(', ')}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {rec.calories100g} ккал / 100 г · Б {rec.protein100g}г · Ж {rec.fat100g}г · У {rec.carbs100g}г
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full h-11 bg-slate-900 dark:bg-emerald-600 text-white font-medium text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
        >
          <Check size={16} />
          <span>Сохранить настройки</span>
        </button>
      </div>
    </div>
  );
};
