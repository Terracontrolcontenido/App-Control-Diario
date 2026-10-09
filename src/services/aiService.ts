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

  const sampleRec = records[0];
  const fbGoal = sampleRec?.facebookChecks ? sampleRec.facebookChecks.length : 6;
  const mpGoal = sampleRec?.marketplaceChecks ? sampleRec.marketplaceChecks.length : 1;
  const igGoal = 1;
  const targetGoal = sampleRec?.totalGoal || (fbGoal + mpGoal + igGoal);

  const completed = records.filter(
    (r) => r.status === 'completed' || r.totalCount >= (r.totalGoal || targetGoal)
  ).length;
  const pending = records.filter(
    (r) => r.status === 'pending' && r.totalCount < (r.totalGoal || targetGoal)
  );
  const notCompleted = records.filter((r) => r.status === 'not_completed');
  const justified = records.filter((r) => r.status === 'justified');

  // Calculate missing per platform
  let pendingFb = 0;
  let pendingMp = 0;
  let pendingIg = 0;

  records.forEach((r) => {
    const curFbChecks = r.facebookChecks || [];
    const completedFb = curFbChecks.filter(Boolean).length;
    const curFbGoal = curFbChecks.length > 0 ? curFbChecks.length : fbGoal;
    pendingFb += Math.max(0, curFbGoal - completedFb);

    const curMpChecks = r.marketplaceChecks || [];
    const completedMp = curMpChecks.filter(Boolean).length;
    const curMpGoal = curMpChecks.length > 0 ? curMpChecks.length : mpGoal;
    pendingMp += Math.max(0, curMpGoal - completedMp);

    const completedIg = r.instagramCheck ? 1 : (r.instagramCount || 0);
    pendingIg += Math.max(0, igGoal - completedIg);
  });

  const totalPending = pendingFb + pendingMp + pendingIg;
  const completionRate = Math.round((completed / total) * 100);

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
        pendingMeta: pendingFb,
        pendingMarketplace: pendingMp,
        pendingIg,
        details: records.map((r) => ({
          name: r.responsibleName,
          total: `${r.totalCount}/${r.totalGoal || targetGoal}`,
          status: r.status,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.observation && data.observation.trim().length > 0) {
        let obs = data.observation.trim();
        // Ensure no AI words slipped through
        obs = obs
          .replace(/la\s+ia(\s+detecta)?/gi, 'la supervisión')
          .replace(/como\s+ia/gi, '')
          .replace(/inteligencia\s+artificial/gi, 'supervisión');
        return obs;
      }
    }
  } catch {
    // Fall back to rule-based natural language generator
  }

  // Exact, high-level executive report (100% human phrasing)
  if (completed === total) {
    return `Meta del día completada con éxito. El 100% de los responsables (${completed}/${total}) cumplieron oportunamente con todas sus publicaciones programadas en Facebook, Marketplace e Instagram con excelente regularidad.`;
  }

  if (completed >= Math.ceil(total * 0.7)) {
    const pendingDetails = [];
    if (pendingFb > 0) pendingDetails.push(`${pendingFb} en Facebook`);
    if (pendingMp > 0) pendingDetails.push(`${pendingMp} en Marketplace`);
    if (pendingIg > 0) pendingDetails.push(`${pendingIg} en Instagram`);
    const pendingText = pendingDetails.length > 0 ? ` (${pendingDetails.join(', ')})` : '';

    return `Buen avance operativo con ${completed} de ${total} responsables (${completionRate}% de cumplimiento). Restan ${totalPending} publicaciones pendientes${pendingText}. Se recomienda seguimiento para cerrar el día sin faltantes.`;
  }

  if (totalPending > 0) {
    const pendingDetails = [];
    if (pendingFb > 0) pendingDetails.push(`${pendingFb} en Facebook`);
    if (pendingMp > 0) pendingDetails.push(`${pendingMp} en Marketplace`);
    if (pendingIg > 0) pendingDetails.push(`${pendingIg} en Instagram`);
    const pendingText = pendingDetails.length > 0 ? ` (${pendingDetails.join(', ')})` : '';

    return `Cumplimiento del ${completionRate}% al momento (${completed} de ${total} responsables al día). Se registran ${totalPending} publicaciones pendientes${pendingText}. Se requiere reforzar la difusión antes del cierre de jornada.`;
  }

  return `Reporte operativo del día: ${completed} de ${total} responsables completaron sus publicaciones diarias programadas.`;
}

/**
 * Improves, polishes, and enriches user-provided notes/help text into a high-level
 * executive observation for the day's report, combining user context with system metrics.
 */
export async function improveDailyObservationWithNotes(
  userNotes: string,
  records: ResponsibleDailyRecord[],
  dateFormatted: string
): Promise<string> {
  const total = records.length;
  const sampleRec = records[0];
  const fbGoal = sampleRec?.facebookChecks ? sampleRec.facebookChecks.length : 6;
  const mpGoal = sampleRec?.marketplaceChecks ? sampleRec.marketplaceChecks.length : 1;
  const igGoal = 1;
  const targetGoal = sampleRec?.totalGoal || (fbGoal + mpGoal + igGoal);

  const completed = records.filter(
    (r) => r.status === 'completed' || r.totalCount >= (r.totalGoal || targetGoal)
  ).length;
  const pending = records.filter(
    (r) => r.status === 'pending' && r.totalCount < (r.totalGoal || targetGoal)
  );
  const notCompleted = records.filter((r) => r.status === 'not_completed');
  const justified = records.filter((r) => r.status === 'justified');

  let pendingFb = 0;
  let pendingMp = 0;
  let pendingIg = 0;

  records.forEach((r) => {
    const curFbChecks = r.facebookChecks || [];
    const completedFb = curFbChecks.filter(Boolean).length;
    const curFbGoal = curFbChecks.length > 0 ? curFbChecks.length : fbGoal;
    pendingFb += Math.max(0, curFbGoal - completedFb);

    const curMpChecks = r.marketplaceChecks || [];
    const completedMp = curMpChecks.filter(Boolean).length;
    const curMpGoal = curMpChecks.length > 0 ? curMpChecks.length : mpGoal;
    pendingMp += Math.max(0, curMpGoal - completedMp);

    const completedIg = r.instagramCheck ? 1 : (r.instagramCount || 0);
    pendingIg += Math.max(0, igGoal - completedIg);
  });

  const totalPending = pendingFb + pendingMp + pendingIg;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  try {
    const res = await fetch('/api/ai/improve-observation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userNotes: userNotes.trim(),
        date: dateFormatted,
        total,
        completed,
        pendingCount: pending.length,
        notCompletedCount: notCompleted.length,
        justifiedCount: justified.length,
        totalPendingPosts: totalPending,
        pendingMeta: pendingFb,
        pendingMarketplace: pendingMp,
        pendingIg,
        details: records.map((r) => ({
          name: r.responsibleName,
          total: `${r.totalCount}/${r.totalGoal || targetGoal}`,
          status: r.status,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.observation && data.observation.trim().length > 0) {
        let obs = data.observation.trim();
        obs = obs
          .replace(/la\s+ia(\s+detecta)?/gi, 'la supervisión')
          .replace(/como\s+ia/gi, '')
          .replace(/inteligencia\s+artificial/gi, 'supervisión')
          .replace(/["*]/g, '');
        return obs;
      }
    }
  } catch {
    // Fall back to local synthesis
  }

  // Graceful rule-based enhancement
  const cleanNotes = userNotes.trim();
  if (cleanNotes.length > 0) {
    if (completed === total) {
      return `${cleanNotes}. Meta del día cumplida al 100% con todos los responsables al día.`;
    }
    return `${cleanNotes}. Cumplimiento registrado del ${completionRate}% (${completed}/${total} al día) con ${totalPending} publicaciones pendientes por regularizar.`;
  }

  return `Supervisión del día: ${completed} de ${total} responsables cumplieron con su meta diaria programada.`;
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
