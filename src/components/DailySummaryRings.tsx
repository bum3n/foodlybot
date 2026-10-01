import React from 'react';
import { UserGoals } from '../types/nutrition';

interface Props {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  goals: UserGoals;
  onOpenGoals: () => void;
}

export const DailySummaryRings: React.FC<Props> = ({
  totalCalories,
  totalProtein,
  totalFat,
  totalCarbs,
  goals,
  onOpenGoals,
}) => {
  const calPercent = Math.min(100, Math.round((totalCalories / goals.calorieGoal) * 100));
  const protPercent = Math.min(100, Math.round((totalProtein / goals.proteinGoal) * 100));
  const fatPercent = Math.min(100, Math.round((totalFat / goals.fatGoal) * 100));
  const carbPercent = Math.min(100, Math.round((totalCarbs / goals.carbGoal) * 100));

  const remainingCal = Math.max(0, goals.calorieGoal - Math.round(totalCalories));

  // SVG Ring calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Суточный прогресс</span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            {remainingCal > 0 ? `Осталось ${remainingCal} ккал` : 'Норма калорий выполнена!'}
          </h2>
        </div>
        <button
          onClick={onOpenGoals}
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full transition-colors"
        >
          Цели
        </button>
      </div>

      <div className="flex items-center gap-6">
        {/* Main Calorie Ring */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="9"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-emerald-500 transition-all duration-700 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {Math.round(totalCalories)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium -mt-0.5">
              / {goals.calorieGoal}
            </span>
          </div>
        </div>

        {/* Macro Bars */}
        <div className="flex-1 space-y-3">
          {/* Protein */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">Белки</span>
              <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                {Math.round(totalProtein)} <span className="text-slate-400">/ {goals.proteinGoal} г</span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${protPercent}%` }}
              />
            </div>
          </div>

          {/* Fat */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">Жиры</span>
              <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                {Math.round(totalFat)} <span className="text-slate-400">/ {goals.fatGoal} г</span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">Углеводы</span>
              <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                {Math.round(totalCarbs)} <span className="text-slate-400">/ {goals.carbGoal} г</span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${carbPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
