import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Check,
  X,
  PieChart,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Share2,
  Download,
  Loader2,
  CheckCircle2,
  RotateCcw,
  PencilLine,
  Wand2,
} from 'lucide-react';
import { TerraLogo } from './TerraLogo';
import { Responsible, ResponsibleDailyRecord, DailyReportSummary } from '../types';
import { renderReportToCanvas, AspectRatioMode } from '../utils/generateReportImage';
import {
  setQuickStatus,
  saveDailySummary,
  sortRecordsByFulfillment,
  resetDailyPublicationRecords,
} from '../services/storageService';
import {
  generateDailyAIObservation,
  improveDailyObservationWithNotes,
} from '../services/aiService';
import {
  addDaysToDateString,
  formatSpanishDate,
} from '../utils/dateUtils';

interface ReportScreenProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  responsibles: Responsible[];
  records: ResponsibleDailyRecord[];
  dailySummary: DailyReportSummary | null;
  onSelectResponsibleForManagement: (responsibleId: string) => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  currentDate,
  onDateChange,
  responsibles,
  records,
  dailySummary,
  onSelectResponsibleForManagement,
}) => {
  const [aiGenerating, setAiGenerating] = useState(false);
  const [customObservation, setCustomObservation] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [exportedImageUri, setExportedImageUri] = useState<string | null>(null);
  const [isRenderingImage, setIsRenderingImage] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [exportMode, setExportMode] = useState<AspectRatioMode>('ultra-vertical');
  const [showUserNotesModal, setShowUserNotesModal] = useState(false);
  const [userNotesInput, setUserNotesInput] = useState('');
  const [improvingWithNotes, setImprovingWithNotes] = useState(false);

  // Synchronize observation state with dailySummary or default
  const effectiveObservation = customObservation || dailySummary?.aiObservation || '';

  // Sort responsibles so top performers are at the top (descending order of fulfillment)
  const sortedRecords = useMemo(() => {
    return sortRecordsByFulfillment(records);
  }, [records]);

  // Formatted date string in Spanish: "Martes, 30 de septiembre de 2026"
  const formattedDate = useMemo(() => {
    return formatSpanishDate(currentDate);
  }, [currentDate]);

  // Auto-generate daily observation when records are loaded if none exists yet for this day
  useEffect(() => {
    if (records.length === 0 || aiGenerating) return;
    if (!dailySummary?.aiObservation && !customObservation) {
      handleGenerateAI();
    }
  }, [currentDate, records.length, dailySummary?.aiObservation]);

  // Next / Previous day helpers (immune to UTC timezone jump)
  const handlePrevDay = () => {
    onDateChange(addDaysToDateString(currentDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDaysToDateString(currentDate, 1));
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = records.length;
    const completed = records.filter(
      (r) => r.status === 'completed' || r.totalCount >= (r.totalGoal || 8)
    ).length;
    const notCompleted = records.filter((r) => r.status === 'not_completed').length;
    const pending = records.filter((r) => r.status === 'pending' && r.totalCount < (r.totalGoal || 8)).length;
    const justified = records.filter((r) => r.status === 'justified').length;
    const reviewed = records.filter((r) => r.totalCount > 0 || r.status !== 'pending').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      notCompleted,
      pending,
      justified,
      reviewed: reviewed > 0 ? reviewed : total,
      completionRate,
    };
  }, [records]);

  // Quick action: click check button on a responsible
  const handleQuickCheck = async (e: React.MouseEvent, record: ResponsibleDailyRecord) => {
    e.stopPropagation();
    const resp = responsibles.find((r) => r.id === record.responsibleId);
    if (!resp) return;

    const targetGoal = record.totalGoal || 8;
    if (record.totalCount >= targetGoal) {
      await setQuickStatus(currentDate, resp, record, 'not_completed');
    } else {
      await setQuickStatus(currentDate, resp, record, 'completed');
    }
  };

  // Quick action: click X button on a responsible
  const handleQuickCross = async (e: React.MouseEvent, record: ResponsibleDailyRecord) => {
    e.stopPropagation();
    const resp = responsibles.find((r) => r.id === record.responsibleId);
    if (!resp) return;
    await setQuickStatus(currentDate, resp, record, 'not_completed');
  };

  // Generate / Regenerate AI observation
  const handleGenerateAI = async () => {
    setAiGenerating(true);
    try {
      const generated = await generateDailyAIObservation(records, formattedDate);
      setCustomObservation(generated);
      await saveDailySummary(currentDate, {
        aiObservation: generated,
        totalResponsibles: stats.total,
        completed: stats.completed,
        notCompleted: stats.notCompleted,
        pending: stats.pending,
        justified: stats.justified,
        completionRate: stats.completionRate,
      });
    } catch (err) {
      console.error('Error generating AI observation:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  // Improve observation with user-provided notes/draft text
  const handleApplyUserNotes = async () => {
    if (!userNotesInput.trim() || improvingWithNotes) return;
    setImprovingWithNotes(true);
    try {
      const improved = await improveDailyObservationWithNotes(
        userNotesInput,
        records,
        formattedDate
      );
      setCustomObservation(improved);
      await saveDailySummary(currentDate, {
        aiObservation: improved,
        totalResponsibles: stats.total,
        completed: stats.completed,
        notCompleted: stats.notCompleted,
        pending: stats.pending,
        justified: stats.justified,
        completionRate: stats.completionRate,
      });
      setShowUserNotesModal(false);
    } catch (err) {
      console.error('Error improving observation with notes:', err);
    } finally {
      setImprovingWithNotes(false);
    }
  };

  const handleObservationChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, 350);
    setCustomObservation(text);
    await saveDailySummary(currentDate, { aiObservation: text });
  };

  // Open Export Modal and render high-res Canvas
  const handleOpenExportModal = async (mode?: AspectRatioMode) => {
    const targetMode = mode || exportMode;
    setIsRenderingImage(true);
    setShowExportModal(true);
    try {
      let obsToRender = effectiveObservation;
      if (!obsToRender || obsToRender.trim().length === 0) {
        obsToRender = await generateDailyAIObservation(records, formattedDate);
        setCustomObservation(obsToRender);
      }
      const canvas = await renderReportToCanvas(
        formattedDate,
        sortedRecords,
        {
          completed: stats.completed,
          notCompleted: stats.notCompleted,
          completionRate: stats.completionRate,
          reviewed: stats.reviewed,
        },
        obsToRender,
        targetMode
      );
      setExportedImageUri(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Error rendering image:', e);
    } finally {
      setIsRenderingImage(false);
    }
  };

  const handleChangeExportMode = async (mode: AspectRatioMode) => {
    setExportMode(mode);
    await handleOpenExportModal(mode);
  };

  const handleResetDayPublications = async () => {
    setIsResetting(true);
    try {
      await resetDailyPublicationRecords(currentDate, responsibles);
      setShowResetConfirm(false);
    } catch (e) {
      console.error('Error resetting day publications:', e);
    } finally {
      setIsResetting(false);
    }
  };

  // Share via WhatsApp / Web Share
  const handleShareWhatsApp = async () => {
    if (!exportedImageUri) return;

    try {
      const res = await fetch(exportedImageUri);
      const blob = await res.blob();
      const file = new File([blob], `Reporte_Terra_${currentDate}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Reporte Diario Terra - ${formattedDate}`,
          text: `📊 Control Diario de Publicaciones Terra (${formattedDate})\nCumplimiento: ${stats.completionRate}%\n${effectiveObservation}`,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        handleDownloadPNG();
      }
    } catch (err) {
      console.error('Share error:', err);
      handleDownloadPNG();
    }
  };

  const handleDownloadPNG = () => {
    if (!exportedImageUri) return;
    const a = document.createElement('a');
    a.href = exportedImageUri;
    a.download = `Reporte_Terra_${currentDate}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  // Colorful avatars palette
  const avatarColors = [
    'bg-red-100 text-red-600 border-red-200',
    'bg-blue-100 text-blue-600 border-blue-200',
    'bg-amber-100 text-amber-600 border-amber-200',
    'bg-indigo-100 text-indigo-600 border-indigo-200',
    'bg-pink-100 text-pink-600 border-pink-200',
    'bg-emerald-100 text-emerald-600 border-emerald-200',
    'bg-purple-100 text-purple-600 border-purple-200',
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-10 px-3 pt-1 font-sans select-none">
      {/* 1. Header with Terra Official Logo */}
      <div className="flex flex-col items-center justify-center pt-0.5 pb-0.5">
        <TerraLogo size="md" />

        <h1 className="mt-0.5 text-lg font-black tracking-tight text-gray-950 uppercase leading-none">
          REPORTE DEL DÍA
        </h1>
        <p className="text-[10px] font-semibold text-gray-500 tracking-wide mt-0.5">
          Control diario de publicaciones
        </p>
      </div>

      {/* 2. Clean Date Selector with Reset Button */}
      <div className="mt-1 flex items-center justify-between px-2 py-1">
        <button
          onClick={handlePrevDay}
          className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition active:scale-95"
          title="Día anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-1.5 cursor-pointer group">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
            <span className="text-xs font-bold text-gray-800 text-center group-hover:text-red-600 transition">
              📅 {formattedDate}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-2 py-0.5 rounded-lg transition active:scale-95 border border-gray-200"
            title="Resetear publicaciones de este día"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>

        <button
          onClick={handleNextDay}
          className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition active:scale-95"
          title="Día siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Section: DETALLE POR RESPONSABLE (Primary Focus / People First!) */}
      <div className="mt-2.5 bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs">
        {/* Section Header & Legend */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h2 className="text-[11px] font-black tracking-tight text-gray-900 uppercase">
            RESPONSABLE
          </h2>
          <div className="flex items-center gap-1.5 text-[9px] font-bold">
            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
              <span>{records[0]?.facebookChecks ? records[0].facebookChecks.length : 6}</span>
            </div>
            {(records[0]?.marketplaceChecks ? records[0].marketplaceChecks.length : 1) > 0 && (
              <div className="flex items-center gap-1 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-full border border-sky-100">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block" />
                <span>{records[0]?.marketplaceChecks ? records[0].marketplaceChecks.length : 1}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full border border-pink-100">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 inline-block" />
              <span>1</span>
            </div>
          </div>
        </div>

        {/* Responsible Rows - Sorted with top performers first! */}
        <div className="divide-y divide-gray-100 mt-1">
          {sortedRecords.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              No hay responsables activos para esta fecha.
            </div>
          ) : (
            sortedRecords.map((record, index) => {
              const targetGoal = record.totalGoal || 8;
              const isCompleted = record.totalCount >= targetGoal || record.status === 'completed';
              const isNotCompleted = record.status === 'not_completed';
              const isJustified = record.status === 'justified';
              const totalCount = record.totalCount || 0;

              const avatarStyle = avatarColors[index % avatarColors.length];

              return (
                <div
                  key={record.responsibleId}
                  onClick={() => onSelectResponsibleForManagement(record.responsibleId)}
                  className="flex items-center justify-between gap-1.5 py-2 px-1 hover:bg-gray-50/80 active:bg-gray-100 rounded-xl transition cursor-pointer group"
                >
                  {/* Avatar (Photo or Colored Initial) */}
                  {record.photoUrl ? (
                    <img
                      src={record.photoUrl}
                      alt={record.responsibleName}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${avatarStyle}`}
                    >
                      {record.responsibleName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* PROMINENT NAME (High visual hero priority) */}
                  <span className="text-base font-black text-gray-900 w-28 sm:w-32 truncate shrink-0">
                    {record.responsibleName}
                  </span>

                  {/* SHORT & COMPACT PROGRESS BAR (Single continuous line / gradient) */}
                  <div className="w-14 sm:w-16 h-2 bg-gray-100 rounded-full overflow-hidden flex relative p-0.5 border border-gray-200/50 shrink-0">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isNotCompleted
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-blue-600 via-pink-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (totalCount / targetGoal) * 100)}%` }}
                    />
                  </div>

                  {/* Fraction Counter */}
                  <span
                    className={`text-xs font-black w-7 text-center shrink-0 px-1 py-0.5 rounded-md ${
                      isCompleted
                        ? 'text-emerald-700 bg-emerald-50 font-black'
                        : isNotCompleted
                        ? 'text-rose-700 bg-rose-50'
                        : 'text-gray-800 bg-gray-100'
                    }`}
                  >
                    {totalCount}/{targetGoal}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Action Check Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickCheck(e, record)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 active:scale-90 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-700'
                      }`}
                      title={isCompleted ? 'Cumplido' : 'Marcar 9/9'}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>

                    {/* Quick Action X Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickCross(e, record)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 active:scale-90 ${
                        isNotCompleted
                          ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-rose-100 hover:text-rose-700'
                      }`}
                      title="Marcar no cumplido"
                    >
                      <X className="w-3 h-3 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. The 4 Metric Buttons / Cards (Text to the right of number, 2 lines for longer ones) */}
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        {/* Cumplieron */}
        <div className="flex items-center gap-2.5 bg-gradient-to-b from-emerald-50 to-emerald-100/60 border border-emerald-200/80 rounded-2xl py-2 px-3 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-xl font-black text-emerald-950 leading-none shrink-0">
            {stats.completed}
          </span>
          <div className="flex flex-col text-[11px] font-bold text-emerald-850 leading-tight">
            <span>Cumplieron</span>
          </div>
        </div>

        {/* No cumplieron */}
        <div className="flex items-center gap-2.5 bg-gradient-to-b from-rose-50 to-rose-100/60 border border-rose-200/80 rounded-2xl py-2 px-3 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <X className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-xl font-black text-rose-950 leading-none shrink-0">
            {stats.notCompleted}
          </span>
          <div className="flex flex-col text-[11px] font-bold text-rose-850 leading-tight">
            <span>No cumplieron</span>
          </div>
        </div>

        {/* Cumplimiento general (2 líneas) */}
        <div className="flex items-center gap-2.5 bg-gradient-to-b from-blue-50 to-blue-100/60 border border-blue-200/80 rounded-2xl py-2 px-3 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black text-blue-950 leading-none shrink-0">
            {stats.completionRate}%
          </span>
          <div className="flex flex-col text-[10px] font-bold text-blue-900 leading-[1.15]">
            <span>Cumplimiento</span>
            <span className="text-[9px] font-medium text-blue-650">general</span>
          </div>
        </div>

        {/* Personas revisadas (2 líneas) */}
        <div className="flex items-center gap-2.5 bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200/80 rounded-2xl py-2 px-3 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black text-slate-900 leading-none shrink-0">
            {stats.reviewed}
          </span>
          <div className="flex flex-col text-[10px] font-bold text-slate-800 leading-[1.15]">
            <span>Personas</span>
            <span className="text-[9px] font-medium text-slate-500">revisadas</span>
          </div>
        </div>
      </div>

      {/* 5. Section: Observaciones del día (Caja completa con botones enteros) */}
      <div className="mt-3 bg-gradient-to-b from-white to-gray-50/70 border border-gray-200 rounded-2xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-black tracking-tight text-gray-900">
              Observaciones del día
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Reporte oficial
          </span>
        </div>

        {/* 2 Botones enteros: Automático y Con texto de ayuda */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 mb-2.5">
          {/* Botón 1: Automático */}
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={aiGenerating || improvingWithNotes}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 shadow-xs transition active:scale-98 disabled:opacity-60 cursor-pointer"
            title="Generar observación automática según métricas"
          >
            {aiGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{aiGenerating ? 'Analizando...' : '⚡ Automático'}</span>
          </button>

          {/* Botón 2: Con texto de ayuda */}
          <button
            type="button"
            onClick={() => setShowUserNotesModal(true)}
            disabled={aiGenerating || improvingWithNotes}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-slate-800 via-slate-900 to-black hover:from-black hover:to-slate-900 shadow-xs transition active:scale-98 disabled:opacity-60 cursor-pointer"
            title="Ingresar texto de ayuda para que la IA mejore la redacción"
          >
            {improvingWithNotes ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <PencilLine className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{improvingWithNotes ? 'Redactando...' : '✍️ Con texto de ayuda'}</span>
          </button>
        </div>

        {/* Caja de texto amplia y completa */}
        <textarea
          rows={4}
          value={effectiveObservation}
          onChange={handleObservationChange}
          placeholder="Aquí se muestra la observación del día para la imagen y WhatsApp. Puedes editarla directamente o usar los botones de arriba..."
          maxLength={350}
          className="w-full text-xs font-medium text-gray-800 bg-white rounded-xl p-3 border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-hidden transition resize-y placeholder:text-gray-400 shadow-2xs leading-relaxed"
        />

        <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 font-semibold px-0.5">
          <span>
            {aiGenerating
              ? 'Analizando métricas del día...'
              : improvingWithNotes
              ? 'Perfeccionando redacción ejecutiva...'
              : 'Listo para WhatsApp e imagen de reporte'}
          </span>
          <span>{effectiveObservation.length}/350</span>
        </div>
      </div>

      {/* Modal: Redactar observación con texto de ayuda */}
      {showUserNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <PencilLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 leading-tight">
                    Redactar con texto de ayuda
                  </h3>
                  <span className="text-[10px] text-gray-500 block leading-tight">
                    La IA mejorará la redacción y la integrará al reporte
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserNotesModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto">
              <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                Escribe notas rápidas, motivos o aclaraciones (ej. cortes de energía, acuerdos, prórrogas o permisos). La IA pulirá la redacción y la unirá al resumen de cumplimiento del reporte:
              </p>

              <textarea
                rows={4}
                value={userNotesInput}
                onChange={(e) => setUserNotesInput(e.target.value)}
                placeholder="Ejemplo: Hubo intermitencia técnica en la tarde, pero los responsables se comprometieron a completar sus publicaciones pendientes antes de las 9:00 PM..."
                className="w-full text-xs font-medium text-gray-800 bg-gray-50 rounded-xl p-3 border border-gray-200 focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 focus:outline-hidden transition resize-none placeholder:text-gray-400 leading-relaxed"
                autoFocus
              />

              {/* Quick suggestions chips */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Sugerencias rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Intermitencia técnica en la tarde',
                    'Prórroga autorizada para la noche',
                    'Permiso justificado con compensación',
                    'Excelente regularidad y cumplimiento',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setUserNotesInput((prev) =>
                          prev ? prev + '. ' + chip : chip
                        )
                      }
                      className="text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUserNotesModal(false)}
                disabled={improvingWithNotes}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyUserNotes}
                disabled={!userNotesInput.trim() || improvingWithNotes}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-slate-900 to-black hover:from-black hover:to-slate-900 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {improvingWithNotes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {improvingWithNotes ? 'Perfeccionando...' : 'Mejorar redacción'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Primary Action: Generar imagen de reporte */}
      <div className="mt-3">
        <button
          onClick={() => handleOpenExportModal()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 via-gray-950 to-black hover:from-black hover:to-gray-900 text-white font-black py-3.5 px-4 rounded-2xl shadow-md transition active:scale-98 border-t border-gray-800"
        >
          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm tracking-wide">Generar imagen de reporte</span>
        </button>
      </div>

      {/* Modal: Export Preview & WhatsApp Share */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 leading-tight">
                    Imagen para WhatsApp
                  </h3>
                  <span className="text-[10px] text-gray-500 block leading-tight">
                    Diseño a todo color y alta resolución
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Image Preview */}
            <div className="p-3 overflow-y-auto flex flex-col items-center bg-gray-100/80">
              {/* Aspect Ratio Mode Selector */}
              <div className="w-full flex items-center bg-gray-200/80 p-1 rounded-xl mb-2.5 gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => handleChangeExportMode('ultra-vertical')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition active:scale-98 ${
                    exportMode === 'ultra-vertical'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  📱 Ultra Vertical (9:19.5 Móvil)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeExportMode('standard-9-16')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition active:scale-98 ${
                    exportMode === 'standard-9-16'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  📱 Estado / WhatsApp (9:16)
                </button>
              </div>

              {isRenderingImage ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-9 h-9 animate-spin text-red-600" />
                  <span className="text-xs font-bold text-gray-700 text-center px-4">
                    Generando imagen {exportMode === 'ultra-vertical' ? 'ultra vertical para móvil (1080 × 2340 px)' : 'vertical para WhatsApp (1080 × 1920 px)'}...
                  </span>
                </div>
              ) : exportedImageUri ? (
                <div
                  className={`relative border-2 border-gray-300 rounded-2xl overflow-hidden shadow-xl max-h-[62vh] bg-white flex items-center justify-center ${
                    exportMode === 'ultra-vertical' ? 'aspect-[9/19.5]' : 'aspect-[9/16]'
                  }`}
                >
                  <img
                    src={exportedImageUri}
                    alt="Reporte Diario Terra Formato Vertical"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="py-12 text-xs text-red-500">Error al procesar la imagen.</div>
              )}

              {shareSuccess && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Listo! Imagen generada correctamente.</span>
                </div>
              )}
            </div>

            {/* Modal Footer / Buttons */}
            <div className="p-3.5 border-t border-gray-100 bg-white flex flex-col gap-2">
              <button
                onClick={handleShareWhatsApp}
                disabled={isRenderingImage || !exportedImageUri}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black py-3 rounded-2xl shadow-md transition active:scale-98 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Compartir por WhatsApp</span>
              </button>

              <button
                onClick={handleDownloadPNG}
                disabled={isRenderingImage || !exportedImageUri}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-2xl transition text-xs active:scale-98 border border-gray-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar archivo PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset Day Publications */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-gray-900">
              ¿Resetear publicaciones de hoy?
            </h3>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Todos los conteos del día volverán a <strong>0/9</strong> (pendiente). <strong>Los nombres, fotos y responsables se mantendrán intactos.</strong>
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetDayPublications}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs flex items-center gap-1.5"
              >
                {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>{isResetting ? 'Reseteando...' : 'Sí, resetear'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
