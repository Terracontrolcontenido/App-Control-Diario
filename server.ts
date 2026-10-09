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

// Server route for Daily Executive Observation
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
      pendingMarketplace,
      pendingIg,
      details,
    } = req.body;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (!ai) {
      // Fallback executive response if API key not available
      const fallbackText =
        completed === total
          ? `Meta del día completada con éxito. El 100% de los responsables (${completed}/${total}) cumplieron oportunamente con todas sus publicaciones programadas en Facebook, Marketplace e Instagram.`
          : `El equipo registra un ${completionRate}% de cumplimiento diario con ${completed} de ${total} responsables al día. Se registran ${totalPendingPosts} publicaciones pendientes (${pendingMeta || 0} Facebook, ${pendingMarketplace || 0} Marketplace, ${pendingIg || 0} Instagram); se recomienda dar seguimiento para asegurar el alcance diario.`;

      return res.json({ observation: fallbackText });
    }

    const prompt = `Actúa como el Director de Marketing y Supervisor Operativo de Terra Colchones & Muebles.
Elabora el informe ejecutivo oficial del día ${date} basado estrictamente en estas métricas operativas:
- Responsables totales: ${total}
- Cumplieron la meta del día: ${completed} (${completionRate}%)
- En estado pendiente: ${pendingCount}
- No cumplieron la meta: ${notCompletedCount}
- Publicaciones totales pendientes de publicar: ${totalPendingPosts} (Facebook faltantes: ${pendingMeta || 0}, Marketplace faltantes: ${pendingMarketplace || 0}, Instagram faltantes: ${pendingIg || 0})
Detalle por persona: ${JSON.stringify(details || [])}

REGLAS OBLIGATORIAS:
1. Redacta un análisis ejecutivo oficial de supervisión (entre 30 y 50 palabras, de 2 a 3 oraciones completas).
2. Tono formal, corporativo, claro y enfocado a resultados de marketing.
3. CRÍTICO Y ESTRICTO: NUNCA menciones que eres una IA, NUNCA digas "La IA detecta", ni uses las palabras "inteligencia artificial", "IA", "bot" o "asistente". Debe leerse 100% como redactado por la dirección de marketing.
4. Si el 100% cumplió, felicita el compromiso y la puntualidad del equipo en todas las plataformas. Si faltan publicaciones, menciona cuántas faltan y en qué redes (Facebook, Marketplace o Instagram) e indica la necesidad de seguimiento antes del cierre.
5. NO uses viñetas, asteriscos, comillas ni títulos; devuelve únicamente el texto continuo del análisis.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let text = response.text?.trim() || '';
    // Strip any accidental AI mentions just in case
    text = text.replace(/la\s+ia(\s+detecta)?/gi, 'el informe')
      .replace(/como\s+inteligencia\s+artificial/gi, 'en el análisis')
      .replace(/inteligencia\s+artificial/gi, 'supervisión')
      .replace(/["*]/g, '');

    return res.json({ observation: text });
  } catch (error) {
    console.error('Error in /api/ai/daily-observation:', error);
    return res.json({
      observation:
        'Reporte del día supervisado. Los registros de cumplimiento diario en Facebook, Marketplace e Instagram se encuentran actualizados en el sistema.',
    });
  }
});

// Server route for Improving/Writing Observation with User Notes / Help Text
app.post('/api/ai/improve-observation', async (req, res) => {
  try {
    const {
      userNotes,
      date,
      total,
      completed,
      pendingCount,
      notCompletedCount,
      totalPendingPosts,
      pendingMeta,
      pendingMarketplace,
      pendingIg,
      details,
    } = req.body;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (!ai) {
      const fallback = userNotes && userNotes.trim().length > 0
        ? `Informe del día: ${userNotes.trim()}. Registro de ${completed}/${total} responsables con meta alcanzada (${completionRate}% de avance).`
        : `Reporte del día supervisado con ${completed} de ${total} responsables al día (${completionRate}% de avance general).`;
      return res.json({ observation: fallback });
    }

    const prompt = `Actúa como el Director de Marketing y Supervisor Operativo de Terra Colchones & Muebles.
El supervisor de área ha proporcionado las siguientes notas, borrador o texto de ayuda para el reporte del día ${date}:
"""${userNotes || 'Sin notas adicionales'}"""

Contexto de cumplimiento del día en el sistema:
- Responsables totales: ${total}
- Cumplieron la meta: ${completed} (${completionRate}%)
- En estado pendiente: ${pendingCount}
- No cumplieron la meta: ${notCompletedCount}
- Publicaciones faltantes: ${totalPendingPosts} (Facebook: ${pendingMeta || 0}, Marketplace: ${pendingMarketplace || 0}, Instagram: ${pendingIg || 0})
Detalle de responsables: ${JSON.stringify(details || [])}

OBJETIVO:
Perfecciona la redacción, ortografía y estilo de las notas del supervisor, integrándolas de forma natural y coherente con las métricas del día para generar una observación ejecutiva oficial impecable.

REGLAS ESTRICTAS:
1. Redacta un texto ejecutivo oficial y pulido (entre 35 y 60 palabras, de 2 a 3 oraciones completas).
2. Conserva y mejora los puntos o explicaciones que el usuario aportó en sus notas de ayuda (por ejemplo si explicó retrasos, problemas de conexión, prórrogas o justificaciones).
3. CRÍTICO Y OBLIGATORIO: NUNCA digas que eres una IA, NUNCA digas "La IA detecta" ni menciones "inteligencia artificial", "IA", "bot" o "asistente". Debe leerse 100% como redactado por un supervisor humano de marketing.
4. Tono formal, corporativo, claro y profesional.
5. NO uses viñetas, asteriscos (*), comillas ni títulos; devuelve únicamente el texto continuo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let text = response.text?.trim() || '';
    text = text.replace(/la\s+ia(\s+detecta)?/gi, 'la supervisión')
      .replace(/como\s+inteligencia\s+artificial/gi, 'en el análisis')
      .replace(/inteligencia\s+artificial/gi, 'supervisión')
      .replace(/["*]/g, '');

    return res.json({ observation: text });
  } catch (error) {
    console.error('Error in /api/ai/improve-observation:', error);
    const { userNotes, completed, total } = req.body;
    return res.json({
      observation: userNotes
        ? `Observación del día: ${userNotes}. Cumplimiento registrado de ${completed || 0}/${total || 0} responsables.`
        : 'Reporte del día supervisado y registrado en el sistema.',
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
