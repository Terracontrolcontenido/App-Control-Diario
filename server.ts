import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Server route for Daily AI Observation
app.post('/api/ai/daily-observation', async (req, res) => {
  try {
    const {
      date,
      total,
      completed,
      pendingCount,
      notCompletedCount,
      totalPendingPosts,
      pendingMeta,
      pendingIg,
      details,
    } = req.body;

    if (!ai) {
      // Fallback response if API key not available
      return res.json({
        observation: `${completed} de ${total} responsables cumplieron la meta. Quedan ${totalPendingPosts} publicaciones pendientes (${pendingMeta} Meta/Facebook y ${pendingIg} Instagram).`,
      });
    }

    const prompt = `Actúa como el asistente analítico de "Control Diario de Publicaciones Terra" para la empresa Terra Colchones & Muebles.
Analiza estrictamente estos datos del día ${date}:
- Total responsables: ${total}
- Cumplieron las 9 publicaciones: ${completed}
- Pendientes: ${pendingCount}
- No cumplieron: ${notCompletedCount}
- Publicaciones totales pendientes: ${totalPendingPosts} (Meta/Facebook pendientes: ${pendingMeta}, Instagram pendientes: ${pendingIg})
Detalles por persona: ${JSON.stringify(details || [])}

REGLAS ESTRICTAS:
1. Genera una observación breve en español (máximo 2 líneas, entre 20 y 35 palabras).
2. Sé directo, profesional y claro.
3. Menciona cuántos cumplieron y cuántas publicaciones faltan exactamente en Facebook e Instagram si hay pendientes.
4. NUNCA inventes información ni menciones nombres que no estén en los datos. No uses viñetas ni asteriscos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    return res.json({ observation: text });
  } catch (error) {
    console.error('Error in /api/ai/daily-observation:', error);
    return res.json({
      observation: 'Los registros se han actualizado y sincronizado en tiempo real con Firebase.',
    });
  }
});

// Server route for Individual Responsible Observation
app.post('/api/ai/responsible-observation', async (req, res) => {
  try {
    const { name, metaCount, instagramCount, status } = req.body;

    if (!ai) {
      const total = (metaCount || 0) + (instagramCount || 0);
      return res.json({
        observation: `${name}: ${total}/9 publicaciones registradas (${metaCount}/8 Facebook, ${instagramCount}/1 Instagram).`,
      });
    }

    const prompt = `Analiza al responsable ${name} en Control Diario Terra:
- Facebook: ${metaCount}/8
- Instagram: ${instagramCount}/1
- Total: ${(metaCount || 0) + (instagramCount || 0)}/9
- Estado: ${status}

Genera una sugerencia o estado en exactamente 1 frase breve (máximo 18 palabras). Nunca inventes datos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    return res.json({ observation: text });
  } catch (error) {
    console.error('Error in /api/ai/responsible-observation:', error);
    return res.json({ observation: '' });
  }
});

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
