import React from 'react';
import { DayDiary, UserGoals } from '../types/nutrition';

interface Props {
  diaries: Record<string, DayDiary>;
  goals: UserGoals;
}

export const StatsView: React.FC<Props> = ({ diaries, goals }) => {
  // Generate last 7 days
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const daysData = last7Days.map((dStr) => {
    const diary = diaries[dStr];
    return {
      date: dStr,
      dayShort: new Date(dStr).toLocaleDateString('ru-RU', { weekday: 'short' }),
      calories: diary ? Math.round(diary.totalCalories) : 0,
      protein: diary ? Math.round(diary.totalProtein) : 0,
      fat: diary ? Math.round(diary.totalFat) : 0,
      carbs: diary ? Math.round(diary.totalCarbs) : 0,
    };
  });

  const loggedDays = daysData.filter((d) => d.calories > 0);
  const avgCalories = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((acc, cur) => acc + cur.calories, 0) / loggedDays.length)
    : 0;

  const maxCalorieInPeriod = Math.max(goals.calorieGoal, ...daysData.map((d) => d.calories), 2200);

  return (
    <div className="space-y-4">
      {/* Average Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
          Статистика за последние 7 дней
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {avgCalories}
          </span>
          <span className="text-sm font-medium text-slate-400">ккал / в среднем в день</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Цель: {goals.calorieGoal} ккал · Выполнено дней: {loggedDays.length} из 7
        </p>
      </div>

      {/* 7-day Bar Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-4">
          Динамика калорийности
        </h4>

        <div className="h-44 flex items-end gap-2 pt-6">
          {daysData.map((item) => {
            const heightPercent = Math.min(100, Math.round((item.calories / maxCalorieInPeriod) * 100));
            const isTargetMet = item.calories >= goals.calorieGoal * 0.9 && item.calories <= goals.calorieGoal * 1.1;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                  {item.calories > 0 ? item.calories : ''}
                </span>
                <div className="w-full max-w-[32px] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col justify-end h-32">
                  <div
                    className={`w-full rounded-xl transition-all duration-500 ${
                      item.calories === 0
                        ? 'bg-transparent'
                        : isTargetMet
                        ? 'bg-emerald-500'
                        : item.calories > goals.calorieGoal
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 capitalize">
                  {item.dayShort}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>В норме</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Ниже нормы</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Выше нормы</span>
          </div>
        </div>
      </div>
    </div>
  );
};
