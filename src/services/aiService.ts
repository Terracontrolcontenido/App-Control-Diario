import { ResponsibleDailyRecord, Responsible } from '../types';

/**
 * Generates an accurate, professional AI observation for the day
 * strictly based on real data counts.
 */
export async function generateDailyAIObservation(
  records: ResponsibleDailyRecord[],
  dateFormatted: string
): Promise<string> {
  const total = records.length;
  if (total === 0) {
    return 'No hay registros cargados para esta fecha.';
  }

  const completed = records.filter((r) => r.status === 'completed' || r.totalCount >= 9).length;
  const pending = records.filter((r) => r.status === 'pending' && r.totalCount < 9);
  const notCompleted = records.filter((r) => r.status === 'not_completed');
  const justified = records.filter((r) => r.status === 'justified');

  const pendingMeta = records.reduce((acc, r) => acc + (8 - (r.metaCount || 0)), 0);
  const pendingIg = records.reduce((acc, r) => acc + (1 - (r.instagramCount || 0)), 0);
  const totalPending = pendingMeta + pendingIg;

  // Try server-side Gemini API proxy first
  try {
    const res = await fetch('/api/ai/daily-observation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateFormatted,
        total,
        completed,
        pendingCount: pending.length,
        notCompletedCount: notCompleted.length,
        justifiedCount: justified.length,
        totalPendingPosts: totalPending,
        pendingMeta,
        pendingIg,
        details: records.map((r) => ({
          name: r.responsibleName,
          meta: `${r.metaCount}/8`,
          ig: `${r.instagramCount}/1`,
          total: `${r.totalCount}/9`,
          status: r.status,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.observation && data.observation.trim().length > 0) {
        return data.observation.trim();
      }
    }
  } catch {
    // Fall back to rule-based natural language generator
  }

  // Exact, reliable rule-based observation matching prompt maestro specs
  if (completed === total) {
    return `¡Meta cumplida! Los ${total} responsables completaron exitosamente sus 9 publicaciones diarias (8 Meta + 1 Instagram).`;
  }

  if (completed >= Math.ceil(total * 0.7)) {
    return `Buen cumplimiento general: ${completed} de ${total} completaron la meta. Quedan ${totalPending} pendientes (${pendingMeta} Facebook, ${pendingIg} Instagram).`;
  }

  if (totalPending > 0) {
    const namesWithPending = pending.slice(0, 3).map((r) => r.responsibleName).join(', ');
    return `${completed} de ${total} cumplieron. La IA detecta ${totalPending} publicaciones pendientes (${pendingMeta} en Meta/Facebook y ${pendingIg} en Instagram). Reforzar antes del cierre.`;
  }

  return `Reporte del día: ${completed} de ${total} responsables cumplieron con las 9 publicaciones diarias.`;
}

/**
 * Generates an accurate individual observation for a single responsible
 */
export async function generateIndividualAIObservation(
  responsible: Responsible,
  record: ResponsibleDailyRecord | undefined
): Promise<string> {
  const metaCount = record?.metaCount ?? 0;
  const igCount = record?.instagramCount ?? 0;
  const total = metaCount + igCount;
  const name = responsible.name;

  if (total >= 9) {
    return `${name} completó exitosamente sus 9/9 publicaciones (8 Meta/Facebook + 1 Instagram).`;
  }

  const missingMeta = 8 - metaCount;
  const missingIg = 1 - igCount;

  if (metaCount === 8 && igCount === 0) {
    return `${name} completó Facebook (8/8), pero falta la publicación de Instagram (1) para alcanzar la meta.`;
  }

  if (igCount === 1 && missingMeta > 0) {
    return `${name} completó Instagram, pero faltan ${missingMeta} publicaciones en Facebook para completar su meta de 9.`;
  }

  if (total === 0) {
    return `${name} aún no registra publicaciones hoy. Faltan 8 en Facebook y 1 en Instagram.`;
  }

  return `${name} registra ${total}/9 publicaciones. Faltan ${missingMeta} en Facebook y ${missingIg} en Instagram para completar la meta.`;
}
