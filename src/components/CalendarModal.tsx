import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
  loggedDates: string[];
}

export const CalendarModal: React.FC<Props> = ({
  selectedDate,
  onSelectDate,
  onClose,
  loggedDates,
}) => {
  const current = new Date(selectedDate);
  const year = current.getFullYear();
  const month = current.getMonth();

  const [viewDate, setViewDate] = React.useState(new Date(year, month, 1));

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dStr);
    onClose();
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Календарь дневника
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between mb-4 px-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-2">
          <span>Пн</span>
          <span>Вт</span>
          <span>Ср</span>
          <span>Чт</span>
          <span>Пт</span>
          <span>Сб</span>
          <span>Вс</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {daysArray.map((day) => {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const hasData = loggedDates.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-9 rounded-xl flex flex-col items-center justify-center relative text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                    : isToday
                    ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{day}</span>
                {hasData && (
                  <span
                    className={`w-1 h-1 rounded-full absolute bottom-1 ${
                      isSelected ? 'bg-white dark:bg-slate-900' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Today quick jump */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <button
            onClick={() => {
              onSelectDate(new Date().toISOString().split('T')[0]);
              onClose();
            }}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Перейти к сегодняшнему дню
          </button>
        </div>
      </div>
    </div>
  );
};
