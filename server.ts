import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  const aiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim() !== ''
  );
  res.json({ status: 'ok', aiConfigured });
});

// Gemini availability status
app.get('/api/ai/status', (_req, res) => {
  const configured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim() !== ''
  );
  res.json({
    configured,
    model: 'gemini-4-hydrogen',
  });
});

// Live weather lookup via Open-Meteo with wttr.in fallback (no key required)
app.get('/api/weather', async (req, res) => {
  const city = typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : 'Bengaluru';

  const fetchWithTimeout = async (url: string, ms = 3500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    try {
      const geoRes = await fetchWithTimeout(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      if (geoRes.ok) {
        const geoJson = (await geoRes.json()) as {
          results?: Array<{ name: string; country?: string; latitude: number; longitude: number }>;
        };
        const place = geoJson.results?.[0];
        if (place) {
          const weatherRes = await fetchWithTimeout(
            `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
          );
          if (weatherRes.ok) {
            const weatherJson = (await weatherRes.json()) as {
              current?: {
                temperature_2m: number;
                apparent_temperature: number;
                weather_code: number;
                wind_speed_10m: number;
              };
            };
            const code = weatherJson.current?.weather_code ?? 0;
            const condition =
              code === 0 ? 'Clear sky' :
              code <= 3 ? 'Partly cloudy' :
              code <= 48 ? 'Foggy' :
              code <= 67 ? 'Rain' :
              code <= 77 ? 'Snow' :
              code <= 82 ? 'Showers' : 'Thunderstorm';

            return res.json({
              city: place.name,
              country: place.country || '',
              temperatureC: Math.round(weatherJson.current?.temperature_2m ?? 0),
              feelsLikeC: Math.round(weatherJson.current?.apparent_temperature ?? 0),
              windKmh: Math.round(weatherJson.current?.wind_speed_10m ?? 0),
              condition,
            });
          }
        }
      }
    } catch {
      // Fall through to wttr.in
    }

    const wttrRes = await fetchWithTimeout(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, 5000);
    if (!wttrRes.ok) {
      return res.status(502).json({ error: 'Unable to fetch current weather.' });
    }
    const wttrJson = (await wttrRes.json()) as {
      current_condition?: Array<{
        temp_C?: string;
        FeelsLikeC?: string;
        windspeedKmph?: string;
        weatherDesc?: Array<{ value?: string }>;
      }>;
      nearest_area?: Array<{
        areaName?: Array<{ value?: string }>;
        country?: Array<{ value?: string }>;
      }>;
    };
    const current = wttrJson.current_condition?.[0];
    if (!current) {
      return res.status(404).json({ error: `Weather data unavailable for "${city}".` });
    }
    const area = wttrJson.nearest_area?.[0];
    return res.json({
      city: area?.areaName?.[0]?.value || city,
      country: area?.country?.[0]?.value || '',
      temperatureC: Math.round(Number(current.temp_C ?? 0)),
      feelsLikeC: Math.round(Number(current.FeelsLikeC ?? current.temp_C ?? 0)),
      windKmh: Math.round(Number(current.windspeedKmph ?? 0)),
      condition: current.weatherDesc?.[0]?.value || 'Clear',
    });
  } catch (err) {
    console.error('Weather lookup error:', err);
    res.status(500).json({ error: 'Failed to retrieve weather data.' });
  }
});

// Live currency exchange rates via open.er-api.com
app.get('/api/rates', async (req, res) => {
  const base = typeof req.query.base === 'string' && req.query.base.trim() ? req.query.base.trim().toUpperCase() : 'INR';
  try {
    const rateRes = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
    if (!rateRes.ok) {
      return res.status(502).json({ error: 'Exchange rate provider unavailable.' });
    }
    const rateJson = (await rateRes.json()) as {
      result?: string;
      base_code?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
    };
    if (rateJson.result !== 'success' || !rateJson.rates) {
      return res.status(400).json({ error: 'Invalid base currency code.' });
    }
    res.json({
      base: rateJson.base_code || base,
      updatedAt: rateJson.time_last_update_utc || '',
      rates: rateJson.rates,
    });
  } catch (err) {
    console.error('Exchange rate error:', err);
    res.status(500).json({ error: 'Failed to load live exchange rates.' });
  }
});

// DAYFLOW AI conversational assistant endpoint
app.post('/api/ai/chat', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      configured: false,
      error: 'GEMINI_API_KEY is not configured. Configure it in Settings > Secrets to enable DAYFLOW AI.',
    });
  }

  // Verify user auth when Authorization header is provided
  const authHeader = req.headers.authorization;
  let verifiedUid: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      verifiedUid = decoded.uid;
    } catch (err) {
      console.error('Token verification failed:', err);
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
  }

  const body = req.body as {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    workspaceContext?: {
      userUid?: string;
      isDemo?: boolean;
      today?: string;
      currency?: string;
      tasks?: unknown[];
      events?: unknown[];
      transactions?: unknown[];
      budgets?: unknown[];
      notes?: unknown[];
      habits?: unknown[];
      goals?: unknown[];
      focusMinutesToday?: number;
    };
  };

  const userMessage = typeof body.message === 'string' ? body.message.trim() : '';
  if (!userMessage || userMessage.length > 4000) {
    return res.status(400).json({ error: 'Message must be between 1 and 4000 characters.' });
  }

  // Prevent impersonating another user's workspace context
  if (verifiedUid && body.workspaceContext?.userUid && body.workspaceContext.userUid !== verifiedUid) {
    return res.status(403).json({ error: 'Forbidden: Workspace context does not match authenticated user.' });
  }

  const contextSummary = body.workspaceContext ? JSON.stringify(body.workspaceContext) : '{}';
  const historyLines = Array.isArray(body.history)
    ? body.history.slice(-10).map((m) => `${m.role === 'user' ? 'User' : 'DAYFLOW AI'}: ${m.content}`).join('\n')
    : '';

  const systemInstruction = [
    'You are DAYFLOW AI, the intelligent personal productivity assistant inside DAYFLOW.',
    'Rules:',
    '1. Ground every observation strictly in the provided workspaceContext JSON. NEVER invent or fabricate user tasks, events, notes, or financial figures.',
    '2. If workspaceContext has no data for a category, state that clearly.',
    '3. When the user asks to plan their day, create tasks, schedule events, log an expense/income, or extract action items from notes, emit structured proposedActions.',
    '4. Any transaction (log_transaction) or deletion MUST set requiresConfirmation: true so the UI prompts the user before saving.',
    '5. Keep replies concise, actionable, and cleanly formatted in Markdown.',
    '6. For natural language search queries, summarize matching records and optionally emit a navigate_filter action.',
  ].join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Workspace Context (Today: ${body.workspaceContext?.today || new Date().toISOString().slice(0, 10)}, Currency: ${body.workspaceContext?.currency || 'INR'}):\n${contextSummary}\n\nRecent Conversation:\n${historyLines || '(none)'}\n\nCurrent User Request:\n${userMessage}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Helpful Markdown response grounded strictly in user workspace data.',
            },
            proposedActions: {
              type: Type.ARRAY,
              description: 'Optional validated workspace actions the user can confirm and apply.',
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'One of: create_task, create_event, create_note, log_transaction, navigate_view',
                  },
                  label: {
                    type: Type.STRING,
                    description: 'Short human-readable button label for this action.',
                  },
                  requiresConfirmation: {
                    type: Type.BOOLEAN,
                    description: 'True for financial transactions or high-impact changes.',
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  dueDate: { type: Type.STRING },
                  dueTime: { type: Type.STRING },
                  category: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER },
                  txType: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  paymentMethod: { type: Type.STRING },
                  folder: { type: Type.STRING },
                  content: { type: Type.STRING },
                  view: { type: Type.STRING },
                },
                required: ['type', 'label', 'requiresConfirmation'],
              },
            },
          },
          required: ['reply', 'proposedActions'],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    let parsed: { reply?: string; proposedActions?: unknown[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { reply: rawText || 'I processed your request.', proposedActions: [] };
    }

    res.json({
      configured: true,
      reply: parsed.reply || 'Here is what I found in your workspace.',
      proposedActions: Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gemini request failed.';
    console.error('Gemini API error:', err);
    if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
      return res.status(403).json({
        configured: false,
        error: 'Gemini API key is invalid or unauthorized. Please verify GEMINI_API_KEY in Settings > Secrets.',
      });
    }
    if (message.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        configured: true,
        error: 'Gemini rate limit reached. Please try again in a moment.',
      });
    }
    res.status(500).json({ configured: true, error: message });
  }
});

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DAYFLOW server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
