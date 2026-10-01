import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { FoodItem } from '../types/nutrition';

interface Props {
  item: FoodItem;
  onSave: (newQuantity: number) => void;
  onClose: () => void;
}

export const EditQuantityModal: React.FC<Props> = ({ item, onSave, onClose }) => {
  const [quantity, setQuantity] = useState<number>(item.quantity);

  const ratio = item.quantity > 0 ? quantity / item.quantity : 1;
  const newGrams = Math.round(item.weightGrams * ratio * 10) / 10;
  const newCalories = Math.round(item.calories * ratio * 10) / 10;
  const newProtein = Math.round(item.protein * ratio * 10) / 10;
  const newFat = Math.round(item.fat * ratio * 10) / 10;
  const newCarbs = Math.round(item.carbs * ratio * 10) / 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onSave(quantity);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Изменить количество
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Продукт: <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Количество ({item.unit})
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-semibold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Новый расчетный вес:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {newGrams} г
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Калории:</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {newCalories} ккал
              </span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <span>Б {newProtein}г</span>
              <span>Ж {newFat}г</span>
              <span>У {newCarbs}г</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={quantity <= 0}
            className="w-full h-11 bg-slate-900 dark:bg-emerald-600 text-white font-medium text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>Сохранить изменения</span>
          </button>
        </form>
      </div>
    </div>
  );
};
