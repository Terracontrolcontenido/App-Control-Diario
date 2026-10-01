import { ResponsibleDailyRecord } from '../types';
import { getCurrentLogo } from '../services/logoService';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(img);
      fallback.src = '/icon.svg';
    };
    img.src = src;
  });
}

export type AspectRatioMode = 'ultra-vertical' | 'standard-9-16';

/**
 * Draws a gorgeous, colorful, high-impact vertical image.
 * By default, uses 'ultra-vertical' (1080 x 2340, 9:19.5), which matches modern
 * smartphone screens edge-to-edge without black letterboxing.
 * Also supports 'standard-9-16' (1080 x 1920) for classic WhatsApp status.
 */
export async function renderReportToCanvas(
  dateDisplay: string,
  records: ResponsibleDailyRecord[],
  summary: {
    completed: number;
    notCompleted: number;
    completionRate: number;
    reviewed: number;
  },
  aiObservation: string,
  mode: AspectRatioMode = 'ultra-vertical'
): Promise<HTMLCanvasElement> {
  const width = 1080;
  // 1080 x 2340 is 9:19.5 (Exact modern smartphone full-screen ratio: iPhone 12/13/14/15/16, Samsung Galaxy)
  // 1080 x 1920 is 9:16 (Classic story/status)
  const isUltra = mode === 'ultra-vertical';
  const height = isUltra ? 2340 : 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load the real logo image
  const logoUrl = getCurrentLogo();
  const logoImg = await loadImage(logoUrl);

  // 1. Crisp Clean Background with subtle gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(0.2, '#fcfdfd');
  bgGrad.addColorStop(0.7, '#f8fafc');
  bgGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer Decorative Frame
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  roundRect(ctx, 18, 18, width - 36, height - 36, 36);
  ctx.stroke();

  // Top Multi-Color Gradient Bar (Yellow -> Red -> Pink -> Purple -> Blue)
  const topGrad = ctx.createLinearGradient(18, 18, width - 18, 18);
  topGrad.addColorStop(0, '#f59e0b');
  topGrad.addColorStop(0.22, '#e20613');
  topGrad.addColorStop(0.5, '#ec4899');
  topGrad.addColorStop(0.75, '#8b5cf6');
  topGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = topGrad;
  roundRect(ctx, 18, 18, width - 36, 16, { tl: 36, tr: 36, bl: 0, br: 0 });
  ctx.fill();

  // 2. HEADER BRANDING: REAL OFFICIAL LOGO IMAGE (100% PROPORTIONAL, ZERO DISTORTION)
  const cx = width / 2;
  const startY = isUltra ? 64 : 52;
  const targetLogoHeight = isUltra ? 195 : 170;
  const aspect = logoImg.width && logoImg.height ? logoImg.width / logoImg.height : 1.25;
  const targetLogoWidth = targetLogoHeight * aspect;
  const targetLogoX = (width - targetLogoWidth) / 2;
  const targetLogoY = startY;

  ctx.drawImage(logoImg, targetLogoX, targetLogoY, targetLogoWidth, targetLogoHeight);

  // Big Bold Main Title: "REPORTE DEL DÍA"
  const titleY = targetLogoY + targetLogoHeight + (isUltra ? 62 : 52);
  ctx.textAlign = 'center';
  ctx.font = '950 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('REPORTE DEL DÍA', cx, titleY);

  // Subtitle
  ctx.font = '600 23px -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Control diario de publicaciones', cx, titleY + 36);

  // 3. DATE PILL with calendar icon style & red accent
  const datePillY = titleY + (isUltra ? 58 : 50);
  const datePillWidth = 640;
  const datePillHeight = isUltra ? 60 : 54;
  const datePillX = (width - datePillWidth) / 2;

  // Shadow under date pill
  ctx.fillStyle = '#f1f5f9';
  roundRect(ctx, datePillX + 2, datePillY + 3, datePillWidth, datePillHeight, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  roundRect(ctx, datePillX, datePillY, datePillWidth, datePillHeight, 18);
  ctx.fill();
  ctx.stroke();

  // Red Accent badge on date pill
  ctx.fillStyle = '#e20613';
  ctx.beginPath();
  ctx.arc(datePillX + 42, datePillY + datePillHeight / 2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 13px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📅', datePillX + 42, datePillY + datePillHeight / 2 + 5);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 23px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dateDisplay, cx + 12, datePillY + datePillHeight / 2 + 8);

  // 4. STATS BOXES: SLEEK 2x2 GRID (Maximizes vertical elegance and readability on phones!)
  const statsStartX = 48;
  const statsTotalWidth = width - 96; // 984
  const statBoxWidth = (statsTotalWidth - 18) / 2; // 483 each
  const statBoxHeight = isUltra ? 144 : 124;
  const statsRowGap = isUltra ? 16 : 12;
  const statsY = datePillY + datePillHeight + (isUltra ? 28 : 22);

  const statsConfig = [
    {
      label: 'Cumplieron la meta',
      val: summary.completed.toString(),
      color: '#16a34a',
      bgGrad: ['#f0fdf4', '#dcfce7'],
      border: '#86efac',
      icon: '✓',
      badgeBg: '#16a34a',
      col: 0,
      row: 0,
    },
    {
      label: 'No cumplieron',
      val: summary.notCompleted.toString(),
      color: '#e20613',
      bgGrad: ['#fef2f2', '#fee2e2'],
      border: '#fca5a5',
      icon: '✕',
      badgeBg: '#e20613',
      col: 1,
      row: 0,
    },
    {
      label: 'Cumplimiento general',
      val: `${summary.completionRate}%`,
      color: '#2563eb',
      bgGrad: ['#eff6ff', '#dbeafe'],
      border: '#93c5fd',
      icon: '%',
      badgeBg: '#2563eb',
      col: 0,
      row: 1,
    },
    {
      label: 'Personas revisadas',
      val: summary.reviewed.toString(),
      color: '#475569',
      bgGrad: ['#f8fafc', '#f1f5f9'],
      border: '#cbd5e1',
      icon: '≡',
      badgeBg: '#475569',
      col: 1,
      row: 1,
    },
  ];

  statsConfig.forEach((st) => {
    const sx = statsStartX + st.col * (statBoxWidth + 18);
    const sy = statsY + st.row * (statBoxHeight + statsRowGap);

    const sGrad = ctx.createLinearGradient(sx, sy, sx, sy + statBoxHeight);
    sGrad.addColorStop(0, st.bgGrad[0]);
    sGrad.addColorStop(1, st.bgGrad[1]);
    ctx.fillStyle = sGrad;
    ctx.strokeStyle = st.border;
    ctx.lineWidth = 2.5;
    roundRect(ctx, sx, sy, statBoxWidth, statBoxHeight, 22);
    ctx.fill();
    ctx.stroke();

    // Icon badge on left
    const iconBadgeX = sx + 42;
    const iconBadgeY = sy + statBoxHeight / 2;
    ctx.fillStyle = st.badgeBg;
    ctx.beginPath();
    ctx.arc(iconBadgeX, iconBadgeY, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.icon, iconBadgeX, iconBadgeY + 8);

    // Number value & label on right of badge
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '950 46px -apple-system, sans-serif';
    ctx.fillText(st.val, sx + 80, iconBadgeY + 4);

    ctx.fillStyle = '#475569';
    ctx.font = '800 17px -apple-system, sans-serif';
    ctx.fillText(st.label, sx + 80, iconBadgeY + 34);
  });

  // 5. DETALLE POR RESPONSABLE (Card with colorful rows)
  const detailY = statsY + 2 * statBoxHeight + statsRowGap + (isUltra ? 30 : 22);
  const detailWidth = statsTotalWidth;
  const detailX = statsStartX;
  const rowsCount = Math.max(records.length, 1);

  // Dynamic row height to give luxurious vertical space
  const rowHeight = isUltra
    ? Math.min(98, Math.max(86, Math.floor(660 / rowsCount)))
    : Math.min(86, Math.max(74, Math.floor(540 / rowsCount)));
  
  // Header height inside detail card (Two rows: Title on row 1, badges on row 2 => ZERO OVERLAPPING!)
  const detailHeaderHeight = 110;
  const detailHeight = detailHeaderHeight + rowsCount * rowHeight + 16;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.5;
  roundRect(ctx, detailX, detailY, detailWidth, detailHeight, 28);
  ctx.fill();
  ctx.stroke();

  // Header Row 1: Main Section Title - 100% UNCLIPPED & PROMINENT
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 29px -apple-system, sans-serif';
  ctx.fillText('DETALLE POR RESPONSABLE', detailX + 32, detailY + 44);

  // Header Row 2: Left pill for Meta and Right badges for Facebook / Instagram
  const subHeaderY = detailY + 62;

  // Left: Pill badge: "Meta diaria: 9 publicaciones"
  ctx.fillStyle = '#f1f5f9';
  roundRect(ctx, detailX + 32, subHeaderY, 210, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.font = '800 15px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Meta: 9 Publicaciones', detailX + 32 + 105, subHeaderY + 23);

  // Right: Legend badges container
  const legendBoxWidth = 270;
  const legendBoxX = detailX + detailWidth - legendBoxWidth - 32;
  const legendBoxY = subHeaderY;

  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, legendBoxX, legendBoxY, legendBoxWidth, 34, 17);
  ctx.fill();
  ctx.stroke();

  // Facebook Dot & Label
  ctx.fillStyle = '#1877f2';
  ctx.beginPath();
  ctx.arc(legendBoxX + 20, legendBoxY + 17, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 15px -apple-system, sans-serif';
  ctx.fillText('Facebook: 8', legendBoxX + 34, legendBoxY + 22);

  // Instagram Dot & Label
  const igGrad = ctx.createLinearGradient(
    legendBoxX + 150,
    legendBoxY + 10,
    legendBoxX + 150,
    legendBoxY + 24
  );
  igGrad.addColorStop(0, '#f59e0b');
  igGrad.addColorStop(0.5, '#ec4899');
  igGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = igGrad;
  ctx.beginPath();
  ctx.arc(legendBoxX + 150, legendBoxY + 17, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Instagram: 1', legendBoxX + 164, legendBoxY + 22);

  // Subtle Header Divider Line
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(detailX + 24, detailY + detailHeaderHeight - 2);
  ctx.lineTo(detailX + detailWidth - 24, detailY + detailHeaderHeight - 2);
  ctx.stroke();

  // Draw Responsibles Rows
  const avatarColors = [
    { bg: '#fee2e2', text: '#e20613' },
    { bg: '#dbeafe', text: '#2563eb' },
    { bg: '#fef3c7', text: '#d97706' },
    { bg: '#e0e7ff', text: '#4f46e5' },
    { bg: '#fce7f3', text: '#db2777' },
    { bg: '#dcfce7', text: '#16a34a' },
    { bg: '#f3e8ff', text: '#9333ea' },
  ];

  records.forEach((rec, idx) => {
    const ry = detailY + detailHeaderHeight + idx * rowHeight;
    const isCompleted = rec.totalCount >= 9 || rec.status === 'completed';
    const isNotCompleted = rec.status === 'not_completed';
    const isJustified = rec.status === 'justified';

    // Alternating zebra row
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, detailX + 14, ry + 2, detailWidth - 28, rowHeight - 6, 16);
      ctx.fill();
    }

    // Avatar
    const col = avatarColors[idx % avatarColors.length];
    const avatarY = ry + rowHeight / 2;
    ctx.fillStyle = col.bg;
    ctx.beginPath();
    ctx.arc(detailX + 54, avatarY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.text;
    ctx.font = '900 22px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rec.responsibleName.charAt(0).toUpperCase(), detailX + 54, avatarY + 8);

    // Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 26px -apple-system, sans-serif';
    ctx.fillText(rec.responsibleName, detailX + 96, avatarY + 9);

    // Progress Bar
    const barX = detailX + 276;
    const barWidth = 414;
    const barHeight = 26;
    const barY = avatarY - 13;

    ctx.fillStyle = '#e2e8f0';
    roundRect(ctx, barX, barY, barWidth, barHeight, 13);
    ctx.fill();

    const fbWidth = (barWidth * 8) / 9;
    const fbFilledCount = Math.min(8, rec.metaCount || 0);
    const fbFilledWidth = (fbWidth * fbFilledCount) / 8;

    if (fbFilledWidth > 0) {
      ctx.fillStyle = isCompleted ? '#16a34a' : '#1877f2';
      roundRect(ctx, barX, barY, fbFilledWidth, barHeight, 13);
      ctx.fill();
    }

    const igPointX = barX + fbWidth + 4;
    const igPointWidth = barWidth - fbWidth - 4;
    if (rec.instagramCheck) {
      const igBarGrad = ctx.createLinearGradient(igPointX, barY, igPointX + igPointWidth, barY);
      igBarGrad.addColorStop(0, '#f59e0b');
      igBarGrad.addColorStop(0.5, '#ec4899');
      igBarGrad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = isCompleted ? '#16a34a' : igBarGrad;
      roundRect(ctx, igPointX, barY, igPointWidth, barHeight, 12);
      ctx.fill();
    }

    // Fraction (e.g. 9/9, 2/9)
    ctx.textAlign = 'right';
    ctx.font = '900 25px -apple-system, sans-serif';
    ctx.fillStyle = isCompleted ? '#16a34a' : '#0f172a';
    ctx.fillText(`${rec.totalCount}/9`, barX + barWidth + 72, avatarY + 9);

    // Status Badge Pill
    const badgeX = barX + barWidth + 98;
    const badgeWidth = 142;
    const badgeHeight = 38;
    const badgeY = avatarY - 19;

    if (isCompleted) {
      ctx.fillStyle = '#dcfce7';
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#15803d';
      ctx.font = '900 17px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cumplió ✓', badgeX + badgeWidth / 2, badgeY + 25);
    } else if (isJustified) {
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '800 16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Justificado', badgeX + badgeWidth / 2, badgeY + 25);
    } else if (isNotCompleted) {
      ctx.fillStyle = '#fee2e2';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b91c1c';
      ctx.font = '800 16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No cumplió ✕', badgeX + badgeWidth / 2, badgeY + 25);
    } else {
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b45309';
      ctx.font = '800 16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pendiente ◷', badgeX + badgeWidth / 2, badgeY + 25);
    }
  });

  // 6. TOTAL POSTS SUMMARY: TWO SIDE-BY-SIDE CARDS (Zero collisions, clean design)
  const totalMeta = records.reduce((acc, r) => acc + (r.metaCount || 0), 0);
  const totalIg = records.reduce((acc, r) => acc + (r.instagramCount || 0), 0);
  const maxPossibleMeta = records.length * 8;
  const maxPossibleIg = records.length * 1;

  const barSummaryY = detailY + detailHeight + (isUltra ? 26 : 18);
  const halfCardWidth = (detailWidth - 18) / 2;
  const barSummaryHeight = isUltra ? 72 : 62;

  // Card 1: Facebook
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 2;
  roundRect(ctx, detailX, barSummaryY, halfCardWidth, barSummaryHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '900 19px -apple-system, sans-serif';
  ctx.fillStyle = '#1877f2';
  ctx.fillText('🔵 Meta/Facebook:', detailX + 24, barSummaryY + barSummaryHeight / 2 + 7);

  ctx.textAlign = 'right';
  ctx.font = '900 20px -apple-system, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${totalMeta}/${maxPossibleMeta} pubs`, detailX + halfCardWidth - 24, barSummaryY + barSummaryHeight / 2 + 7);

  // Card 2: Instagram
  const igCardX = detailX + halfCardWidth + 18;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#fbcfe8';
  ctx.lineWidth = 2;
  roundRect(ctx, igCardX, barSummaryY, halfCardWidth, barSummaryHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '900 19px -apple-system, sans-serif';
  ctx.fillStyle = '#db2777';
  ctx.fillText('🟣 Instagram:', igCardX + 24, barSummaryY + barSummaryHeight / 2 + 7);

  ctx.textAlign = 'right';
  ctx.font = '900 20px -apple-system, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${totalIg}/${maxPossibleIg} pubs`, igCardX + halfCardWidth - 24, barSummaryY + barSummaryHeight / 2 + 7);

  // 7. OBSERVACIONES DEL DÍA (IA TERRA)
  const obsY = barSummaryY + barSummaryHeight + (isUltra ? 26 : 18);
  const obsWidth = detailWidth;
  const obsX = detailX;
  const obsHeight = isUltra ? 270 : 200;

  const aiCardGrad = ctx.createLinearGradient(obsX, obsY, obsX, obsY + obsHeight);
  aiCardGrad.addColorStop(0, '#ffffff');
  aiCardGrad.addColorStop(1, '#fff5f5');
  ctx.fillStyle = aiCardGrad;
  ctx.strokeStyle = '#fecdd3';
  ctx.lineWidth = 2.5;
  roundRect(ctx, obsX, obsY, obsWidth, obsHeight, 24);
  ctx.fill();
  ctx.stroke();

  // Robot Icon in circular red badge
  ctx.fillStyle = '#e20613';
  ctx.beginPath();
  ctx.arc(obsX + 48, obsY + 48, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🤖', obsX + 48, obsY + 56);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 26px -apple-system, sans-serif';
  ctx.fillText('Observación del día (IA Terra)', obsX + 86, obsY + 55);

  // AI text content with multiline support
  ctx.fillStyle = '#334155';
  ctx.font = '600 24px -apple-system, sans-serif';
  wrapText(
    ctx,
    aiObservation || 'Todos los registros sincronizados en tiempo real en la base de datos de Terra.',
    obsX + 40,
    obsY + 112,
    obsWidth - 80,
    38
  );

  // 8. BRANDED OFFICIAL FOOTER (Anchored nicely at the bottom)
  const footerCenterY = height - (isUltra ? 84 : 70);
  ctx.textAlign = 'center';
  ctx.font = '900 21px -apple-system, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Terra Colchones & Muebles — Control Diario de Publicaciones', cx, footerCenterY);

  ctx.font = '600 17px -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Reporte oficial y confidencial • Sincronización en tiempo real con Google Firebase', cx, footerCenterY + 28);

  // Bottom Gradient Accent Bar (Matching top bar)
  ctx.fillStyle = topGrad;
  roundRect(ctx, 18, height - 32, width - 36, 14, { tl: 0, tr: 0, bl: 36, br: 36 });
  ctx.fill();

  return canvas;
}

type RoundRectRadii = number | { tl?: number; tr?: number; bl?: number; br?: number };

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: RoundRectRadii
) {
  const radii =
    typeof r === 'number'
      ? { tl: r, tr: r, bl: r, br: r }
      : { tl: r.tl || 0, tr: r.tr || 0, bl: r.bl || 0, br: r.br || 0 };

  ctx.beginPath();
  ctx.moveTo(x + radii.tl, y);
  ctx.lineTo(x + w - radii.tr, y);
  ctx.arcTo(x + w, y, x + w, y + radii.tr, radii.tr);
  ctx.lineTo(x + w, y + h - radii.br);
  ctx.arcTo(x + w, y + h, x + w - radii.br, y + h, radii.br);
  ctx.lineTo(x + radii.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - radii.bl, radii.bl);
  ctx.lineTo(x, y + radii.tl);
  ctx.arcTo(x, y, x + radii.tl, y, radii.tl);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      linesCount++;
      if (linesCount >= 4) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}
