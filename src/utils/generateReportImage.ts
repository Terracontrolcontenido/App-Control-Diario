import { ResponsibleDailyRecord } from '../types';
import { getCurrentLogo } from '../services/logoService';
import socialMediaBgUrl from '../assets/images/social_media_bg.jpg';

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
 * Helper to draw the official vector Facebook icon in Canvas.
 */
function drawFacebookIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.fillStyle = '#1877f2';
  roundRect(ctx, x, y, size, size, size * 0.28);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(size * 0.74)}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('f', x + size * 0.53, y + size * 0.54);
  ctx.restore();
}

/**
 * Helper to draw the vector Marketplace storefront icon in Canvas.
 */
function drawMarketplaceIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.fillStyle = '#0284c7';
  roundRect(ctx, x, y, size, size, size * 0.28);
  ctx.fill();

  // Crisp storefront icon in white
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.08;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const s = size;
  // Store roof / awning
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y + s * 0.42);
  ctx.lineTo(x + s * 0.32, y + s * 0.24);
  ctx.lineTo(x + s * 0.68, y + s * 0.24);
  ctx.lineTo(x + s * 0.8, y + s * 0.42);
  ctx.closePath();
  ctx.fill();

  // Store outline
  ctx.beginPath();
  ctx.rect(x + s * 0.24, y + s * 0.42, s * 0.52, s * 0.36);
  ctx.stroke();

  // Store door
  ctx.fillRect(x + s * 0.42, y + s * 0.5, s * 0.16, s * 0.28);
  ctx.restore();
}

/**
 * Helper to draw the official Instagram icon with radiant gradient in Canvas.
 */
function drawInstagramIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y + size, x + size, y);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.35, '#e1306c');
  grad.addColorStop(0.65, '#c13584');
  grad.addColorStop(1, '#833ab4');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, size, size, size * 0.28);
  ctx.fill();

  // Camera outline
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.085;
  ctx.lineJoin = 'round';
  const pad = size * 0.2;
  roundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, size * 0.16);
  ctx.stroke();

  // Lens circle
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.17, 0, Math.PI * 2);
  ctx.stroke();

  // Flash dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + size * 0.72, y + size * 0.28, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a high-impact, executive report image optimized for WhatsApp Status & Facebook Stories.
 * - Social media gradient background & subtle ambient glows.
 * - Balanced, spacious header with breathing room between Logo, Title, and Date.
 * - Table header cleanly displays "RESPONSABLE" and removes all "Meta: 8 publicaciones" text.
 * - Pixel-perfect aligned social media badges (Facebook, Marketplace, Instagram).
 * - Hero-sized responsible names.
 * - Single continuous smooth gradient progress bar.
 * - Large "Cumplió ✓" status badges.
 * - Compact 4 summary metrics (with "Cumplieron" instead of "Cumplieron la meta").
 * - Clean "Observaciones del día".
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
  const isUltra = mode === 'ultra-vertical';
  const height = isUltra ? 2340 : 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load the official logo image and social media background image in parallel
  const logoUrl = getCurrentLogo();
  const [logoImg, bgImg] = await Promise.all([
    loadImage(logoUrl),
    loadImage(socialMediaBgUrl).catch(() => null),
  ]);

  // 1. Social Media Background with PURE WHITE Top Gradient to seamlessly blend logo background
  // Base fill
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const whiteHeaderStop = isUltra ? 310 / height : 255 / height;
  const blendTransitionStop = isUltra ? 520 / height : 440 / height;

  if (bgImg && bgImg.width > 0) {
    // Draw background image scaled to cover canvas
    ctx.drawImage(bgImg, 0, 0, width, height);

    // Smooth gradient overlay: 100% pure white at the top (hiding logo box completely),
    // then smoothly transitioning into the social media background below
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
    overlayGrad.addColorStop(0, '#ffffff');
    overlayGrad.addColorStop(whiteHeaderStop, '#ffffff');
    overlayGrad.addColorStop(blendTransitionStop, 'rgba(250, 251, 253, 0.88)');
    overlayGrad.addColorStop(0.7, 'rgba(246, 249, 253, 0.92)');
    overlayGrad.addColorStop(1, 'rgba(240, 245, 250, 0.95)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Fallback modern social media gradient mesh with pure white top
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(whiteHeaderStop, '#ffffff');
    bgGrad.addColorStop(blendTransitionStop, '#faf5ff');
    bgGrad.addColorStop(0.7, '#f0f9ff');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Soft ambient radial glows for social media aesthetic positioned BELOW the logo area
  const glowY = isUltra ? 580 : 480;
  const radialIg = ctx.createRadialGradient(width - 80, glowY, 20, width - 80, glowY, 480);
  radialIg.addColorStop(0, 'rgba(225, 48, 108, 0.08)');
  radialIg.addColorStop(0.6, 'rgba(131, 58, 180, 0.04)');
  radialIg.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = radialIg;
  ctx.fillRect(0, glowY - 300, width, height - glowY + 300);

  const radialFb = ctx.createRadialGradient(80, glowY + 120, 20, 80, glowY + 120, 450);
  radialFb.addColorStop(0, 'rgba(24, 119, 242, 0.07)');
  radialFb.addColorStop(0.6, 'rgba(2, 132, 199, 0.03)');
  radialFb.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = radialFb;
  ctx.fillRect(0, glowY - 200, width, height - glowY + 200);

  // Delicate Outer Border (Fine line)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 16, 16, width - 32, height - 32, 32);
  ctx.stroke();

  // Top Multi-Color Brand Bar (Sleek 10px accent)
  const topGrad = ctx.createLinearGradient(16, 16, width - 16, 16);
  topGrad.addColorStop(0, '#f59e0b');
  topGrad.addColorStop(0.25, '#e20613');
  topGrad.addColorStop(0.5, '#ec4899');
  topGrad.addColorStop(0.75, '#8b5cf6');
  topGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = topGrad;
  roundRect(ctx, 16, 16, width - 32, 10, { tl: 32, tr: 32, bl: 0, br: 0 });
  ctx.fill();

  // 2. BALANCED HEADER WITH BREATHING ROOM ("UN POCO DE AIRE")
  const cx = width / 2;
  const startY = isUltra ? 72 : 52;
  const targetLogoHeight = isUltra ? 215 : 165;
  const aspect = logoImg.width && logoImg.height ? logoImg.width / logoImg.height : 1.25;
  const targetLogoWidth = targetLogoHeight * aspect;
  const targetLogoX = (width - targetLogoWidth) / 2;
  const targetLogoY = startY;

  ctx.drawImage(logoImg, targetLogoX, targetLogoY, targetLogoWidth, targetLogoHeight);

  // Spacing between Logo and Title: Generous and balanced
  const gapLogoToTitle = isUltra ? 72 : 52;
  const titleY = targetLogoY + targetLogoHeight + gapLogoToTitle;

  ctx.textAlign = 'center';
  ctx.font = '950 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('REPORTE DEL DÍA', cx, titleY);

  // Subtitle
  ctx.font = '700 24px -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Control diario de publicaciones', cx, titleY + 40);

  // Spacing between Title and Date: Generous and balanced
  const gapTitleToDate = isUltra ? 82 : 62;
  const dateY = titleY + gapTitleToDate;

  // Clean, stylish date pill
  const dateText = `📅  ${dateDisplay}`;
  ctx.font = isUltra ? '800 28px -apple-system, sans-serif' : '800 23px -apple-system, sans-serif';
  const dateMetrics = ctx.measureText(dateText);
  const datePillWidth = dateMetrics.width + 56;
  const datePillHeight = isUltra ? 56 : 46;
  const datePillX = (width - datePillWidth) / 2;
  const datePillY = dateY - datePillHeight / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  roundRect(ctx, datePillX, datePillY, datePillWidth, datePillHeight, datePillHeight / 2);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(dateText, cx, dateY);
  ctx.textBaseline = 'alphabetic';

  // 3. TABLE CARD: CLEAN "RESPONSABLE" & PERFECTLY ALIGNED SOCIAL MEDIA ICONS
  // Generous breathing room between Date and Table start
  const gapDateToDetail = isUltra ? 74 : 54;
  const detailY = dateY + datePillHeight / 2 + gapDateToDetail;
  const detailX = 48;
  const detailWidth = width - 96; // 984px wide
  const rowsCount = Math.max(records.length, 1);

  // Row height calibrated to enlarge content and eliminate excessive bottom space
  const rowHeight = isUltra
    ? Math.min(168, Math.max(136, Math.floor(1020 / rowsCount)))
    : Math.min(132, Math.max(106, Math.floor(760 / rowsCount)));

  const detailHeaderHeight = isUltra ? 96 : 84;
  const detailHeight = detailHeaderHeight + rowsCount * rowHeight + (isUltra ? 24 : 16);

  // Main Card with glassmorphism clean white background and fine border
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  roundRect(ctx, detailX, detailY, detailWidth, detailHeight, 28);
  ctx.fill();
  ctx.stroke();

  // HEADER: ONLY "RESPONSABLE" (Clean, spacious)
  const headerCenterY = detailY + detailHeaderHeight / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '950 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('RESPONSABLE', detailX + 32, headerCenterY);
  ctx.textBaseline = 'alphabetic'; // reset

  // Determine dominant configured goals from records or defaults
  const sampleRec = records[0];
  const targetGoal = sampleRec?.totalGoal || 8;
  const fbGoal = sampleRec?.facebookChecks ? sampleRec.facebookChecks.length : 6;
  const mpGoal = sampleRec?.marketplaceChecks ? sampleRec.marketplaceChecks.length : 1;
  const igGoal = 1;

  // ALIGNED SOCIAL MEDIA ICONS & BADGES ON THE RIGHT (Icon + Number only, as requested!)
  // Badges: Facebook, Marketplace (if > 0), Instagram
  const badgeH = 36;
  const badgeRadius = 18;
  const iconSize = 24;
  const badgeY = headerCenterY - badgeH / 2;

  // Compact equal-sized pill width: 24px icon + gap + number
  const pillGap = 10;
  const singlePillWidth = 64;
  const fbPillWidth = singlePillWidth;
  const mpPillWidth = mpGoal > 0 ? singlePillWidth : 0;
  const igPillWidth = singlePillWidth;

  const totalBadgesWidth =
    fbPillWidth + (mpGoal > 0 ? mpPillWidth + pillGap : 0) + pillGap + igPillWidth;
  let currentBadgeX = detailX + detailWidth - totalBadgesWidth - 30;

  // 1. Facebook Badge: [f icon] [number]
  ctx.fillStyle = '#f0f7ff';
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 1;
  roundRect(ctx, currentBadgeX, badgeY, fbPillWidth, badgeH, badgeRadius);
  ctx.fill();
  ctx.stroke();

  drawFacebookIcon(ctx, currentBadgeX + 6, badgeY + (badgeH - iconSize) / 2, iconSize);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e40af';
  ctx.font = '900 17px -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${fbGoal}`, currentBadgeX + 37, headerCenterY);
  ctx.textBaseline = 'alphabetic';
  currentBadgeX += fbPillWidth + pillGap;

  // 2. Marketplace Badge: [store icon] [number] (if enabled)
  if (mpGoal > 0) {
    ctx.fillStyle = '#f0fdfa';
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1;
    roundRect(ctx, currentBadgeX, badgeY, mpPillWidth, badgeH, badgeRadius);
    ctx.fill();
    ctx.stroke();

    drawMarketplaceIcon(ctx, currentBadgeX + 6, badgeY + (badgeH - iconSize) / 2, iconSize);

    ctx.fillStyle = '#0f766e';
    ctx.font = '900 17px -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${mpGoal}`, currentBadgeX + 37, headerCenterY);
    ctx.textBaseline = 'alphabetic';
    currentBadgeX += mpPillWidth + pillGap;
  }

  // 3. Instagram Badge: [camera icon] [number]
  ctx.fillStyle = '#fdf2f8';
  ctx.strokeStyle = '#fbcfe8';
  ctx.lineWidth = 1;
  roundRect(ctx, currentBadgeX, badgeY, igPillWidth, badgeH, badgeRadius);
  ctx.fill();
  ctx.stroke();

  drawInstagramIcon(ctx, currentBadgeX + 6, badgeY + (badgeH - iconSize) / 2, iconSize);

  ctx.fillStyle = '#9d174d';
  ctx.font = '900 17px -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${igGoal}`, currentBadgeX + 37, headerCenterY);
  ctx.textBaseline = 'alphabetic';

  // Fine Divider Line below header
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(detailX + 24, detailY + detailHeaderHeight - 2);
  ctx.lineTo(detailX + detailWidth - 24, detailY + detailHeaderHeight - 2);
  ctx.stroke();

  // Sort responsibles in descending order of fulfillment (top performers first!)
  const sortedRecords = [...records].sort((a, b) => {
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }
    const statusPriority: Record<string, number> = {
      completed: 4,
      pending: 3,
      justified: 2,
      not_completed: 1,
    };
    const priorityDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.responsibleName.localeCompare(b.responsibleName);
  });

  // Pre-load all member photos if available
  const memberPhotos: (HTMLImageElement | null)[] = await Promise.all(
    sortedRecords.map(async (rec) => {
      if (rec.photoUrl) {
        try {
          return await loadImage(rec.photoUrl);
        } catch {
          return null;
        }
      }
      return null;
    })
  );

  // Responsibles Rows: HERO-SIZED NAMES, SMOOTH CONTINUOUS GRADIENT BAR, BIG BADGES
  const avatarColors = [
    { bg: '#fee2e2', text: '#e20613' },
    { bg: '#dbeafe', text: '#2563eb' },
    { bg: '#fef3c7', text: '#d97706' },
    { bg: '#e0e7ff', text: '#4f46e5' },
    { bg: '#fce7f3', text: '#db2777' },
    { bg: '#dcfce7', text: '#16a34a' },
    { bg: '#f3e8ff', text: '#9333ea' },
  ];

  sortedRecords.forEach((rec, idx) => {
    const ry = detailY + detailHeaderHeight + idx * rowHeight;
    const personGoal = rec.totalGoal || targetGoal;
    const isCompleted = rec.totalCount >= personGoal || rec.status === 'completed';
    const isNotCompleted = rec.status === 'not_completed';
    const isJustified = rec.status === 'justified';

    // Soft alternating row background
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, detailX + 12, ry + 3, detailWidth - 24, rowHeight - 6, 18);
      ctx.fill();
    }

    const avatarY = ry + rowHeight / 2;

    // Avatar (Real Photo if present, otherwise colored circular initial)
    const photoImg = memberPhotos[idx];
    const avatarRadius = isUltra ? 34 : 28;
    if (photoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(detailX + 56, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        photoImg,
        detailX + 56 - avatarRadius,
        avatarY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
      ctx.restore();

      // Delicate border ring around photo
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(detailX + 56, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const col = avatarColors[idx % avatarColors.length];
      ctx.fillStyle = col.bg;
      ctx.beginPath();
      ctx.arc(detailX + 56, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col.text;
      ctx.font = isUltra ? '900 28px -apple-system, sans-serif' : '900 24px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rec.responsibleName.charAt(0).toUpperCase(), detailX + 56, avatarY + (isUltra ? 10 : 8));
    }

    // HERO NAME OF ENCARGADO - MUCH LARGER & PROMINENT (40px bold!)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = isUltra
      ? '950 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : '950 33px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(rec.responsibleName, detailX + 108, avatarY + (isUltra ? 14 : 11));

    // PROGRESS BAR: ONE SINGLE CONTINUOUS LINE / DEGRADADO
    const barWidth = isUltra ? 135 : 115;
    const barHeight = isUltra ? 14 : 12;
    const barX = detailX + 440;
    const barY = avatarY - barHeight / 2;

    // Background track
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fill();

    // Progress fraction fill (0 to 1)
    const progressRatio = Math.max(0, Math.min(1, (rec.totalCount || 0) / personGoal));
    const filledWidth = barWidth * progressRatio;

    if (filledWidth > 0) {
      if (isCompleted) {
        const compGrad = ctx.createLinearGradient(barX, barY, barX + filledWidth, barY);
        compGrad.addColorStop(0, '#10b981');
        compGrad.addColorStop(1, '#059669');
        ctx.fillStyle = compGrad;
      } else {
        const smoothGrad = ctx.createLinearGradient(barX, barY, barX + filledWidth, barY);
        smoothGrad.addColorStop(0, '#2563eb');
        smoothGrad.addColorStop(0.7, '#ec4899');
        smoothGrad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = smoothGrad;
      }
      roundRect(ctx, barX, barY, filledWidth, barHeight, barHeight / 2);
      ctx.fill();
    }

    // Fraction (e.g. 8/8, 6/8, 2/8)
    ctx.textAlign = 'center';
    ctx.font = isUltra ? '900 28px -apple-system, sans-serif' : '900 24px -apple-system, sans-serif';
    ctx.fillStyle = isCompleted ? '#059669' : '#1e293b';
    ctx.fillText(`${rec.totalCount}/${personGoal}`, barX + barWidth + 58, avatarY + 10);

    // STATUS BADGE PILL
    const badgeWidth = isUltra ? 175 : 150;
    const badgeHeight = isUltra ? 48 : 40;
    const badgeX = detailX + detailWidth - badgeWidth - 28;
    const rowBadgeY = avatarY - badgeHeight / 2;

    if (isCompleted) {
      ctx.fillStyle = '#ecfdf5';
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, rowBadgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#047857';
      ctx.font = isUltra ? '950 20px -apple-system, sans-serif' : '950 18px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cumplió ✓', badgeX + badgeWidth / 2, rowBadgeY + badgeHeight / 2 + 7);
    } else if (isJustified) {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, rowBadgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = isUltra ? '900 19px -apple-system, sans-serif' : '900 17px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Justificado', badgeX + badgeWidth / 2, rowBadgeY + badgeHeight / 2 + 7);
    } else if (isNotCompleted) {
      ctx.fillStyle = '#fef2f2';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, rowBadgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b91c1c';
      ctx.font = isUltra ? '950 19px -apple-system, sans-serif' : '950 17px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No cumplió ✕', badgeX + badgeWidth / 2, rowBadgeY + badgeHeight / 2 + 7);
    } else {
      ctx.fillStyle = '#fffbeb';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, rowBadgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b45309';
      ctx.font = isUltra ? '900 19px -apple-system, sans-serif' : '900 17px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pendiente ◷', badgeX + badgeWidth / 2, rowBadgeY + badgeHeight / 2 + 7);
    }
  });

  // 4. THE 4 METRIC BUTTONS / CARDS (Enlarged and balanced)
  const statsStartX = detailX;
  const statsTotalWidth = detailWidth;
  const statBoxWidth = (statsTotalWidth - 18) / 2;
  const statBoxHeight = isUltra ? 134 : 110;
  const statsRowGap = isUltra ? 18 : 12;
  const gapTableToStats = isUltra ? 48 : 32;
  const statsY = detailY + detailHeight + gapTableToStats;

  const statsConfig = [
    {
      labelLines: ['Cumplieron'],
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
      labelLines: ['No cumplieron'],
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
      labelLines: ['Cumplimiento', 'general'],
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
      labelLines: ['Personas', 'revisadas'],
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
    ctx.lineWidth = 1;
    const statRadius = isUltra ? 38 : 30; // Más circular visualmente
    roundRect(ctx, sx, sy, statBoxWidth, statBoxHeight, statRadius);
    ctx.fill();
    ctx.stroke();

    // Icon circle badge
    const iconBadgeX = sx + (isUltra ? 44 : 36);
    const iconBadgeY = sy + statBoxHeight / 2;
    const iconRadius = isUltra ? 25 : 21;
    ctx.fillStyle = st.badgeBg;
    ctx.beginPath();
    ctx.arc(iconBadgeX, iconBadgeY, iconRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = isUltra ? '900 24px -apple-system, sans-serif' : '900 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.icon, iconBadgeX, iconBadgeY + 1);

    // Number value (vertically centered beside icon)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = isUltra ? '950 48px -apple-system, sans-serif' : '950 40px -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    const numX = sx + (isUltra ? 84 : 70);
    ctx.fillText(st.val, numX, iconBadgeY);

    // Measure number width to position label neatly to its right
    const numWidth = ctx.measureText(st.val).width;
    const labelX = numX + numWidth + (isUltra ? 16 : 12);

    // Label text to the right of number (1 line or 2 lines for longer ones)
    ctx.fillStyle = '#475569';
    ctx.font = isUltra ? '800 20px -apple-system, sans-serif' : '800 16px -apple-system, sans-serif';
    if (st.labelLines.length === 1) {
      ctx.fillText(st.labelLines[0], labelX, iconBadgeY);
    } else {
      const lineOffset = isUltra ? 13 : 10;
      ctx.fillText(st.labelLines[0], labelX, iconBadgeY - lineOffset);
      ctx.fillText(st.labelLines[1], labelX, iconBadgeY + lineOffset);
    }
    ctx.textBaseline = 'alphabetic'; // reset
  });

  // 5. OBSERVACIONES DEL DÍA (Spacious, prominent, NO AI text)
  const gapStatsToObs = isUltra ? 48 : 32;
  const obsY = statsY + 2 * statBoxHeight + statsRowGap + gapStatsToObs;
  const obsWidth = detailWidth;
  const obsX = detailX;
  const obsHeight = isUltra ? 420 : 310;

  const aiCardGrad = ctx.createLinearGradient(obsX, obsY, obsX, obsY + obsHeight);
  aiCardGrad.addColorStop(0, '#ffffff');
  aiCardGrad.addColorStop(1, '#fff5f5');
  ctx.fillStyle = aiCardGrad;
  ctx.strokeStyle = '#fecdd3';
  ctx.lineWidth = 1;
  roundRect(ctx, obsX, obsY, obsWidth, obsHeight, 28);
  ctx.fill();
  ctx.stroke();

  // Note Icon in circular red badge
  ctx.fillStyle = '#e20613';
  ctx.beginPath();
  const noteBadgeX = obsX + (isUltra ? 50 : 44);
  const noteBadgeY = obsY + (isUltra ? 54 : 46);
  ctx.arc(noteBadgeX, noteBadgeY, isUltra ? 24 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = isUltra ? '900 22px -apple-system, sans-serif' : '900 18px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📝', noteBadgeX, noteBadgeY + (isUltra ? 8 : 6));

  // Title: "OBSERVACIONES DEL DÍA" (Clean, formal, NO AI badge)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = isUltra
    ? '950 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    : '950 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('OBSERVACIONES DEL DÍA', noteBadgeX + (isUltra ? 38 : 32), noteBadgeY + (isUltra ? 9 : 7));

  // Multiline Text content (Generous font size and line height)
  ctx.fillStyle = '#334155';
  ctx.font = isUltra ? '600 26px -apple-system, sans-serif' : '600 21px -apple-system, sans-serif';
  wrapText(
    ctx,
    aiObservation || 'Reporte del día supervisado. Cumplimiento de publicaciones registrado en el sistema.',
    obsX + (isUltra ? 48 : 38),
    obsY + (isUltra ? 122 : 98),
    obsWidth - (isUltra ? 96 : 76),
    isUltra ? 44 : 34
  );

  // Bottom Gradient Accent Bar (Matching top 10px bar) - Footer text completely removed as requested!
  ctx.fillStyle = topGrad;
  roundRect(ctx, 16, height - 26, width - 32, 10, { tl: 0, tr: 0, bl: 32, br: 32 });
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
