import React from 'react';
import { X, Code2, Database, Bot, Cpu, CheckCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ArchitectureModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Code2 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Архитектура Smart NutriBot
              </h3>
              <p className="text-xs text-slate-400">
                Python 3.12+ · aiogram 3.x · SQLAlchemy Async · SQLite · FastAPI · Gemini Flash
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {/* Key Rule Highlight */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
              <CheckCircle size={17} />
              <span>Главный принцип: нейросеть НЕ считает КБЖУ</span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-400">
              Нейросеть выполняет только интеллектуальный парсинг естественного языка, фото и голоса.
              Вся арифметика пересчёта на порции (грамм/100 * КБЖУ) выполняется детерминированным Python-кодом в модуле <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono">app.nutrition.calculator</code>.
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
                <Bot size={15} className="text-blue-500" />
                <span>aiogram 3.x Handlers</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Поддерживает текст, голосовые (voice notes ogg), фото высокого разрешения и inline-клавиатуры подтверждения.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
                <Cpu size={15} className="text-amber-500" />
                <span>Abstract AIProvider Layer</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Изолирует вызовы нейросети. Реализован GeminiProvider (Flash 3.8 / Flash-Lite), легко расширяется на OpenRouter/GigaChat.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
                <Database size={15} className="text-emerald-500" />
                <span>База данных и Кэш</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                SQLite + SQLAlchemy Async. Модели User, Meal, MealItem, CustomProduct, UserStandard, ConversationContext.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-xs mb-1">
                <Code2 size={15} className="text-purple-500" />
                <span>Контекст и рецепты</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Поддерживает: «И ещё банан», «Исправь на 300г», «мой шейк», «яйцо = 70г», «то же самое что вчера».
              </p>
            </div>
          </div>

          {/* Quick launch command */}
          <div className="pt-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Команды запуска:
            </span>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-2xl font-mono text-xs space-y-1">
              <div># 1. Запуск тестов КБЖУ</div>
              <div className="text-emerald-400">python3 -m unittest discover tests</div>
              <div className="pt-1"># 2. Локальный запуск сервиса</div>
              <div className="text-emerald-400">python3 -m app.main</div>
              <div className="pt-1"># 3. Запуск через Docker</div>
              <div className="text-emerald-400">docker compose -f docker/docker-compose.yml up -d --build</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
