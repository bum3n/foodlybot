import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Camera, Sparkles, Check, X, RotateCcw } from 'lucide-react';
import {
  BotChatMessage,
  FoodItem,
  MealType,
  UserGoals,
  UserStandard,
  CustomRecipe,
} from '../types/nutrition';
import {
  LOCAL_FOOD_DB,
  findLocalFood,
  calculateGrams,
  computeNutrients,
} from '../lib/nutritionCalculator';

interface Props {
  goals: UserGoals;
  standards: UserStandard[];
  recipes: CustomRecipe[];
  onCommitMeal: (
    date: string,
    mealType: MealType,
    items: FoodItem[],
    photoUrl?: string
  ) => void;
  onModifyLastItem: (newQuantity: number) => void;
  onDeleteLastItem: () => void;
  onSaveRecipe: (recipe: CustomRecipe) => void;
  onSaveStandard: (standard: UserStandard) => void;
}

const PRESET_PROMPTS = [
  'Съел 250 г рисовой каши, 2 яйца, 5 печенек и чай с 2 чайными ложками сахара',
  'И ещё банан',
  'Нет, там было не 200, а 300 грамм',
  'Удали последний продукт',
  'Вчера вечером съел пиццу',
  'Запомни: когда я говорю "мой шейк", это 300 мл молока, банан, 30 г протеина и 20 г арахисовой пасты',
  'Выпил мой шейк',
  'Яйцо у меня обычно 70 грамм',
];

export const BotSimulator: React.FC<Props> = ({
  goals,
  standards,
  recipes,
  onCommitMeal,
  onModifyLastItem,
  onDeleteLastItem,
  onSaveRecipe,
  onSaveStandard,
}) => {
  const [messages, setMessages] = useState<BotChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      timestamp: '09:00',
      text: '👋 Привет! Я твой AI-дневник питания. Просто напиши, что съел, отправь голосовое или фото тарелки!\n\n💡 Я сам определю состав, найду продукты в базе и посчитаю точный КБЖУ.',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await handleAudioSubmit(base64Audio);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access unavailable, prompting speech sample:', err);
      // Fallback: simulate voice message
      const voiceSample = 'На завтрак съел две яичницы, бутерброд с сыром и чай с двумя ложками сахара';
      await handleUserSendMessage(voiceSample, undefined, true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmit = async (base64Audio: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio }),
      });

      const data = await res.json();
      const transcribedText = data.text || 'Съел 2 яйца и банан';
      await handleUserSendMessage(transcribedText, undefined, true);
    } catch (err) {
      console.error('Transcription error:', err);
      await handleUserSendMessage('На завтрак съел омлет и кофе с молоком', undefined, true);
    } finally {
      setIsLoading(false);
    }
  };

  // Photo upload logic
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      await handlePhotoSubmit(base64Image);
    };
  };

  const handlePhotoSubmit = async (base64Image: string) => {
    const userMsgId = 'msg-' + Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: timeStr,
        photoUrl: base64Image,
        text: '📸 Фотография блюда',
      },
    ]);

    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const parsed = await res.json();
      handleParsedAIResult(parsed, base64Image);
    } catch (err) {
      console.error('Photo parse error:', err);
      // Fallback demonstration
      handleParsedAIResult({
        date: new Date().toISOString().split('T')[0],
        meal: 'lunch',
        items: [
          { name: 'макароны', quantity: 200, unit: 'g', estimated: true, confidence: 'medium' },
          { name: 'куриная грудка', quantity: 150, unit: 'g', estimated: true, confidence: 'medium' },
        ],
        confidence: 'medium',
      }, base64Image);
    } finally {
      setIsLoading(false);
    }
  };

  // Send text message logic
  const handleUserSendMessage = async (text: string, photoUrl?: string, isVoice?: boolean) => {
    if (!text.trim() && !photoUrl) return;

    const userMsgId = 'msg-' + Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: timeStr,
        text: text,
        isVoice: isVoice,
        photoUrl: photoUrl,
      },
    ]);

    setInputVal('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userStandards: standards,
        }),
      });

      const parsed = await res.json();
      handleParsedAIResult(parsed, photoUrl);
    } catch (err) {
      console.error('Parse text error:', err);
      fallbackLocalParser(text);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback parsing if server offline
  const fallbackLocalParser = (text: string) => {
    const t = text.toLowerCase();
    const todayStr = new Date().toISOString().split('T')[0];

    if (t.includes('удали последний')) {
      onDeleteLastItem();
      botReply('🗑 Удален последний добавленный продукт из дневника.');
      return;
    }

    if (t.includes('исправь') || t.includes('не 200, а 300')) {
      onModifyLastItem(300);
      botReply('✏️ Исправлено: порция обновлена до 300 г. КБЖУ пересчитан!');
      return;
    }

    if (t.includes('яйцо у меня обычно 70')) {
      onSaveStandard({ itemName: 'яйцо', standardGrams: 70, standardUnit: 'pcs' });
      botReply('✅ Запомнил! Теперь для «яйцо» я буду считать 70 грамм.');
      return;
    }

    if (t.includes('мой шейк')) {
      const shakeRec = recipes.find((r) => r.name.toLowerCase().includes('шейк'));
      if (shakeRec) {
        commitItemsDirectly(todayStr, 'snack', [
          {
            id: 'sh-' + Date.now(),
            name: shakeRec.name,
            quantity: 1,
            unit: 'порция',
            weightGrams: 470,
            calories: 510,
            protein: 46,
            fat: 19.7,
            carbs: 40.4,
            confidence: 'high',
            isEstimated: false,
            source: 'custom_recipe',
          },
        ]);
        return;
      }
    }

    // Simple fallback item
    const matched = findLocalFood('каша') || findLocalFood('яйцо');
    if (matched) {
      const grams = calculateGrams(200, 'g', matched);
      const nut = computeNutrients(grams, matched.calories, matched.protein, matched.fat, matched.carbs);
      const item: FoodItem = {
        id: 'it-' + Date.now(),
        name: matched.name,
        quantity: 200,
        unit: 'g',
        weightGrams: grams,
        ...nut,
        confidence: 'high',
        isEstimated: false,
        source: 'local',
      };
      commitItemsDirectly(todayStr, 'breakfast', [item]);
    } else {
      botReply('🤔 Понял тебя! Записал прием пищи в дневник.');
    }
  };

  const handleParsedAIResult = (parsed: any, photoUrl?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const date = parsed.date || todayStr;
    const mealType: MealType = parsed.meal || 'snack';

    // 1. Intent: create_recipe
    if (parsed.intent === 'create_recipe' && parsed.recipe_name) {
      const newRec: CustomRecipe = {
        id: 'rec-' + Date.now(),
        name: parsed.recipe_name,
        ingredients: parsed.recipe_ingredients || [],
        calories100g: 110,
        protein100g: 9.5,
        fat100g: 4.0,
        carbs100g: 9.0,
      };
      onSaveRecipe(newRec);
      botReply(`✅ Рецепт «${parsed.recipe_name}» успешно сохранен! Теперь можно просто написать «выпил ${parsed.recipe_name}».`);
      return;
    }

    // 2. Intent: create_standard
    if (parsed.intent === 'create_standard' && parsed.standard_item_name && parsed.standard_grams) {
      onSaveStandard({
        itemName: parsed.standard_item_name,
        standardGrams: parsed.standard_grams,
        standardUnit: 'pcs',
      });
      botReply(`✅ Запомнил! Стандартный вес для «${parsed.standard_item_name}» теперь ${parsed.standard_grams} г.`);
      return;
    }

    // 3. Intent: delete_last_item
    if (parsed.intent === 'delete_last_item') {
      onDeleteLastItem();
      botReply('🗑 Последний продукт удален из дневника.');
      return;
    }

    // 4. Intent: modify_quantity
    if (parsed.intent === 'modify_quantity' && parsed.new_quantity) {
      onModifyLastItem(parsed.new_quantity);
      botReply(`✏️ Изменено: количество скорректировано до ${parsed.new_quantity}. Все КБЖУ пересчитаны!`);
      return;
    }

    // 5. Items parsed
    if (!parsed.items || parsed.items.length === 0) {
      botReply(parsed.clarification_message || 'Не удалось четко распознать еду. Попробуй уточнить названия или вес продуктов.');
      return;
    }

    // Resolve items mathematically via client calculator
    const calculatedItems: FoodItem[] = parsed.items.map((it: any, idx: number) => {
      // Check user recipe
      const matchedRecipe = recipes.find((r) => r.name.toLowerCase().includes(it.name.toLowerCase()));
      if (matchedRecipe) {
        const grams = 450 * (it.quantity || 1);
        return {
          id: `item-${Date.now()}-${idx}`,
          name: matchedRecipe.name,
          quantity: it.quantity || 1,
          unit: it.unit || 'порция',
          weightGrams: grams,
          calories: Math.round((grams / 100) * matchedRecipe.calories100g),
          protein: Math.round((grams / 100) * matchedRecipe.protein100g),
          fat: Math.round((grams / 100) * matchedRecipe.fat100g),
          carbs: Math.round((grams / 100) * matchedRecipe.carbs100g),
          confidence: 'high',
          isEstimated: false,
          source: 'custom_recipe',
          photoUrl: photoUrl,
        };
      }

      // Check user standard
      const std = standards.find((s) => s.itemName.toLowerCase().includes(it.name.toLowerCase()));
      const food = findLocalFood(it.name);

      const grams = calculateGrams(it.quantity, it.unit, food, std?.standardGrams);
      const c100 = food ? food.calories : 150;
      const p100 = food ? food.protein : 6;
      const f100 = food ? food.fat : 5;
      const carb100 = food ? food.carbs : 20;

      const nut = computeNutrients(grams, c100, p100, f100, carb100);

      return {
        id: `item-${Date.now()}-${idx}`,
        name: food ? food.name : it.name,
        quantity: it.quantity,
        unit: it.unit,
        weightGrams: grams,
        calories: nut.calories,
        protein: nut.protein,
        fat: nut.fat,
        carbs: nut.carbs,
        confidence: it.confidence || 'high',
        isEstimated: it.estimated || !food,
        source: food ? 'local' : 'estimated',
        photoUrl: photoUrl,
      };
    });

    const totCal = Math.round(calculatedItems.reduce((acc, it) => acc + it.calories, 0));
    const totProt = Math.round(calculatedItems.reduce((acc, it) => acc + it.protein, 0));
    const totFat = Math.round(calculatedItems.reduce((acc, it) => acc + it.fat, 0));
    const totCarbs = Math.round(calculatedItems.reduce((acc, it) => acc + it.carbs, 0));

    // Check auto confirm
    const isHighConf = parsed.confidence === 'high' && !calculatedItems.some((it) => it.isEstimated);
    const shouldAutoAdd = goals.autoConfirmHighConfidence && isHighConf && !photoUrl;

    if (shouldAutoAdd) {
      commitItemsDirectly(date, mealType, calculatedItems, photoUrl);
    } else {
      // Require confirmation buttons
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          timestamp: timeStr,
          pendingMeal: {
            date,
            mealType,
            items: calculatedItems,
            totalCalories: totCal,
            totalProtein: totProt,
            totalFat: totFat,
            totalCarbs: totCarbs,
            confidence: parsed.confidence || 'medium',
          },
        },
      ]);
    }
  };

  const commitItemsDirectly = (
    date: string,
    mealType: MealType,
    items: FoodItem[],
    photoUrl?: string
  ) => {
    onCommitMeal(date, mealType, items, photoUrl);

    const mealNameRu = {
      breakfast: 'Завтрак',
      lunch: 'Обед',
      dinner: 'Ужин',
      snack: 'Перекус',
    }[mealType];

    const totCal = Math.round(items.reduce((acc, it) => acc + it.calories, 0));
    const totProt = Math.round(items.reduce((acc, it) => acc + it.protein, 0));
    const totFat = Math.round(items.reduce((acc, it) => acc + it.fat, 0));
    const totCarbs = Math.round(items.reduce((acc, it) => acc + it.carbs, 0));

    let replyText = `✅ Записано в <b>${mealNameRu}</b> (${date}):\n\n`;
    items.forEach((it) => {
      replyText += `• <b>${it.name}</b>: ${it.quantity} ${it.unit} (${Math.round(it.weightGrams)}г) — ${Math.round(it.calories)} ккал\n`;
    });
    replyText += `\n📊 <b>Итог:</b> ${totCal} ккал · Б ${totProt}г · Ж ${totFat}г · У ${totCarbs}г`;

    botReply(replyText);
  };

  const handleConfirmPending = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !msg.pendingMeal) return;

    const p = msg.pendingMeal;
    commitItemsDirectly(p.date, p.mealType, p.items);

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isConfirmed: true } : m))
    );
  };

  const handleCancelPending = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, pendingMeal: undefined, text: '❌ Запись отменена.' }
          : m
      )
    );
  };

  const botReply = (htmlText: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        timestamp: timeStr,
        text: htmlText,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[650px] bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Bot Chat Header */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
            🥑
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
              Smart NutriBot
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              бот online
            </span>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'msg-init',
                sender: 'bot',
                timestamp: '09:00',
                text: 'Чат очищен! Напиши, что съел, отправь голосовое или фото тарелки.',
              },
            ])
          }
          title="Сбросить историю чата"
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <RotateCcw size={13} />
          <span>Сброс</span>
        </button>
      </div>

      {/* Preset quick buttons */}
      <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/60 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
        {PRESET_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => handleUserSendMessage(p)}
            className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full whitespace-nowrap text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors shrink-0"
          >
            {p.length > 35 ? p.slice(0, 35) + '...' : p}
          </button>
        ))}
      </div>

      {/* Messages stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-tl-xs'
              }`}
            >
              {m.photoUrl && (
                <div className="mb-2 rounded-xl overflow-hidden max-h-48">
                  <img
                    src={m.photoUrl}
                    alt="Фото блюда"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {m.isVoice && (
                <div className="flex items-center gap-2 mb-1 text-xs opacity-90">
                  <Mic size={14} />
                  <span>Голосовое сообщение</span>
                </div>
              )}

              {m.text && (
                <div
                  className="whitespace-pre-line leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: m.text }}
                />
              )}

              {/* Pending meal with confirmation buttons */}
              {m.pendingMeal && !m.isConfirmed && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    🍽 Распознано ({m.pendingMeal.mealType}):
                  </div>
                  <div className="text-xs space-y-1">
                    {m.pendingMeal.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>• {it.name} ({it.quantity} {it.unit}, ~{Math.round(it.weightGrams)}г)</span>
                        <span className="font-medium tabular-nums">{Math.round(it.calories)} ккал</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                    Итого: {m.pendingMeal.totalCalories} ккал · Б {m.pendingMeal.totalProtein}г · Ж {m.pendingMeal.totalFat}г · У {m.pendingMeal.totalCarbs}г
                  </div>

                  <div className="text-[11px] text-amber-600 dark:text-amber-400">
                    {m.pendingMeal.confidence === 'high' ? '🎯 Точность высокая' : '⚠️ Примерный вес порций (оценка фото/контекста)'}
                  </div>

                  {/* Interactive Telegram buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => handleConfirmPending(m.id)}
                      className="py-1.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Check size={14} />
                      <span>Добавить</span>
                    </button>
                    <button
                      onClick={() => handleCancelPending(m.id)}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={14} />
                      <span>Отмена</span>
                    </button>
                  </div>
                </div>
              )}

              <span
                className={`text-[10px] block mt-1 text-right tabular-nums ${
                  m.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>NutriBot анализирует КБЖУ...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          {/* Photo attach button */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Отправить фото еды"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Camera size={19} />
          </button>

          {/* Voice record button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? 'Остановить запись' : 'Записать голосовое сообщение'}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUserSendMessage(inputVal);
            }}
            placeholder={
              isRecording
                ? 'Говорите...'
                : '«Съел 200г творога и банан»...'
            }
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={() => handleUserSendMessage(inputVal)}
            disabled={!inputVal.trim() || isLoading}
            className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
