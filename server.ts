import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize GoogleGenAI SDK strictly on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_PROMPT = `Ты — интеллектуальный анализатор питания для личного Telegram-дневника.
Твоя задача — извлечь структурированные данные о продуктах, датах и приемах пищи.
ВАЖНО:
1. Ты НЕ рассчитываешь калории или КБЖУ! Этим занимается отдельный калькулятор на чистом коде.
2. Твоя роль — исключительно парсер текста, контекста и фото.
3. Верни строго валидный JSON без вступительного текста, без markdown блоков.

Схема JSON:
{
  "date": "YYYY-MM-DD",
  "meal": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "name": "название продукта в начальной форме (например: куриное яйцо, рисовая каша)",
      "quantity": число,
      "unit": "g" | "ml" | "pcs" | "tbsp" | "tsp" | "cup" | "slice",
      "estimated": boolean,
      "confidence": "low" | "medium" | "high",
      "estimated_grams": опционально число
    }
  ],
  "intent": "add_meal" | "append_to_last" | "modify_quantity" | "delete_last_item" | "repeat_yesterday" | "repeat_last" | "create_recipe" | "create_standard" | "unknown",
  "target_product_name": "строка если пользователь просит исправить или удалить конкретный продукт",
  "new_quantity": число если modify_quantity,
  "new_unit": "новая единица измерения",
  "recipe_name": "название сохраняемого рецепта (например: 'мой шейк')",
  "recipe_ingredients": [ { "name": "...", "quantity": ..., "unit": "...", "grams": ... } ],
  "standard_item_name": "продукт для стандарта (например: 'яйцо')",
  "standard_grams": число грамм для стандарта (например: 70),
  "confidence": "low" | "medium" | "high",
  "clarification_message": "если еда на фото или в тексте неясна"
}`;

// 1. Text Parsing API
app.post('/api/gemini/parse-text', async (req, res) => {
  try {
    const { text, context, currentDateTime, userStandards } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    const nowStr = currentDateTime || new Date().toISOString().replace('T', ' ').slice(0, 19);
    const contextStr = context ? JSON.stringify(context) : 'нет контекста';
    const standardsStr = userStandards ? JSON.stringify(userStandards) : 'нет стандартов';

    const prompt = `Текущее время: ${nowStr}
Контекст предыдущего сообщения/приема пищи: ${contextStr}
Персональные стандарты пользователя: ${standardsStr}

Сообщение пользователя: "${text}"

Разбери сообщение согласно системным инструкциям и верни строго JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    let rawText = response.text || '{}';
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsedData = JSON.parse(rawText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/gemini/parse-text:', err);
    return res.status(500).json({ error: err.message || 'AI parsing error' });
  }
});

// 2. Image Parsing API
app.post('/api/gemini/parse-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', caption = '', currentDateTime } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const nowStr = currentDateTime || new Date().toISOString().replace('T', ' ').slice(0, 19);

    const prompt = `Текущее время: ${nowStr}
Подпись к фото: "${caption || 'Определи что на фото, примерный состав и порцию'}"

Внимательно оцени блюдо на фото:
1. Назови продукты или блюдо.
2. Оцени примерный размер порции в граммах или штуках.
3. Поле "estimated" обязательно поставь в true.
4. Поле "confidence" поставь "high", "medium" или "low" в зависимости от четкости.
5. Если фото не содержит еды или ничего не понятно, укажи items=[] и напиши clarification_message.
Верни строго JSON.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    let rawText = response.text || '{}';
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsedData = JSON.parse(rawText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/gemini/parse-image:', err);
    return res.status(500).json({ error: err.message || 'Vision parsing error' });
  }
});

// 3. Audio Transcription API
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '');
    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Точно транскрибируй данное голосовое сообщение на русском языке в текст. Выведи только транскрипцию без пояснений.' },
        ],
      },
    });

    return res.json({ text: response.text?.trim() || '' });
  } catch (err: any) {
    console.error('Error in /api/gemini/transcribe:', err);
    // Fallback using general flash model
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body;
      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: cleanBase64 } },
            { text: 'Транскрибируй русскую речь в этом аудио сообщении в текст.' },
          ],
        },
      });
      return res.json({ text: response.text?.trim() || '' });
    } catch (fbErr: any) {
      return res.status(500).json({ error: fbErr.message || 'Audio transcription error' });
    }
  }
});

// 4. Open Food Facts proxy to avoid CORS
app.get('/api/openfoodfacts', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      return res.json([]);
    }

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments`;
    const offRes = await fetch(url, {
      headers: {
        'User-Agent': 'SmartNutriBot - Telegram Nutrition Assistant - v1.0',
      },
    });

    if (!offRes.ok) {
      return res.json([]);
    }

    const data: any = await offRes.json();
    const products = (data.products || []).map((p: any) => {
      const nutr = p.nutriments || {};
      const kcal = nutr['energy-kcal_100g'] ?? nutr['energy-kcal'] ?? 0;
      const prot = nutr['proteins_100g'] ?? nutr['proteins'] ?? 0;
      const fat = nutr['fat_100g'] ?? nutr['fat'] ?? 0;
      const carbs = nutr['carbohydrates_100g'] ?? nutr['carbohydrates'] ?? 0;
      return {
        name: p.product_name || query,
        calories: Number(kcal),
        protein: Number(prot),
        fat: Number(fat),
        carbs: Number(carbs),
        source: 'openfoodfacts',
      };
    }).filter((p: any) => p.calories > 0);

    return res.json(products);
  } catch (err) {
    console.error('OFF error:', err);
    return res.json([]);
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
