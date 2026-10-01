import React, { useState, useEffect } from 'react';
import {
  Camera,
  Save,
  Trash2,
  Edit2,
  Plus,
  Check,
  Clock,
  X,
  FileText,
  Bot,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { TerraLogo } from './TerraLogo';
import {
  Responsible,
  ResponsibleDailyRecord,
  ResponsibleStatus,
} from '../types';
import {
  saveResponsible,
  softDeleteResponsible,
  togglePublicationCheck,
  setResponsibleStatus,
} from '../services/storageService';
import { generateIndividualAIObservation } from '../services/aiService';

interface ManagementScreenProps {
  currentDate: string;
  responsibles: Responsible[];
  records: ResponsibleDailyRecord[];
  selectedResponsibleId: string | null;
  onSelectResponsible: (id: string) => void;
}

export const ManagementScreen: React.FC<ManagementScreenProps> = ({
  currentDate,
  responsibles,
  records,
  selectedResponsibleId,
  onSelectResponsible,
}) => {
  const activeResponsibles = responsibles.filter((r) => r.active);

  const activeSelectedId =
    selectedResponsibleId || (activeResponsibles.length > 0 ? activeResponsibles[0].id : '');

  const selectedResponsible = responsibles.find((r) => r.id === activeSelectedId);
  const currentRecord = records.find((r) => r.responsibleId === activeSelectedId);

  // Form states for DATOS DEL RESPONSABLE
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // AI observation for selected responsible
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (selectedResponsible) {
      setFormName(selectedResponsible.name);
      setFormActive(selectedResponsible.active);
      updateAiSuggestion(selectedResponsible, currentRecord);
    }
  }, [activeSelectedId, selectedResponsible?.name, selectedResponsible?.active]);

  useEffect(() => {
    if (selectedResponsible) {
      updateAiSuggestion(selectedResponsible, currentRecord);
    }
  }, [currentRecord?.metaCount, currentRecord?.instagramCount, currentRecord?.status]);

  const updateAiSuggestion = async (resp: Responsible, rec?: ResponsibleDailyRecord) => {
    const text = await generateIndividualAIObservation(resp, rec);
    setAiSuggestion(text);
  };

  const handleManualRegenerateAi = async () => {
    if (!selectedResponsible) return;
    setLoadingAi(true);
    try {
      const text = await generateIndividualAIObservation(selectedResponsible, currentRecord);
      setAiSuggestion(text);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSaveResponsibleForm = async () => {
    if (!formName.trim()) return;
    setIsSavingForm(true);
    try {
      await saveResponsible({
        id: selectedResponsible?.id,
        name: formName.trim(),
        active: formActive,
        dailyGoal: 9,
        facebookGoal: 8,
        instagramGoal: 1,
      });
      triggerSavedFeedback();
    } catch (e) {
      console.error('Error saving responsible:', e);
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleAddNewResponsible = () => {
    setFormName('');
    setFormActive(true);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await softDeleteResponsible(deleteTargetId);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      const remaining = responsibles.filter((r) => r.active && r.id !== deleteTargetId);
      if (remaining.length > 0) {
        onSelectResponsible(remaining[0].id);
      }
    } catch (e) {
      console.error('Error deleting responsible:', e);
    }
  };

  const handleTogglePoint = async (pointIndex: number) => {
    if (!selectedResponsible) return;
    try {
      await togglePublicationCheck(
        currentDate,
        selectedResponsible,
        currentRecord,
        pointIndex
      );
      triggerSavedFeedback();
    } catch (e) {
      console.error('Error toggling publication check:', e);
    }
  };

  const handleSetStatus = async (status: ResponsibleStatus) => {
    if (!selectedResponsible || !currentRecord) return;
    try {
      await setResponsibleStatus(currentDate, selectedResponsible.id, status, currentRecord);
      triggerSavedFeedback();
    } catch (e) {
      console.error('Error setting status:', e);
    }
  };

  const triggerSavedFeedback = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const confirmedCount = currentRecord?.totalCount ?? 0;
  const metaChecks = currentRecord?.metaChecks ?? [false, false, false, false, false, false, false, false];
  const instagramCheck = currentRecord?.instagramCheck ?? false;
  const currentStatus = currentRecord?.status ?? 'pending';

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
    <div className="flex flex-col w-full max-w-md mx-auto pb-16 px-3 pt-1 font-sans select-none">
      {/* 1. Compact Header with Terra Official Logo */}
      <div className="flex flex-col items-center justify-center pt-0.5 pb-0.5">
        <TerraLogo size="sm" />

        <h1 className="mt-0.5 text-lg font-black tracking-tight text-gray-950 uppercase leading-none">
          GESTIÓN DE RESPONSABLES
        </h1>
        <p className="text-[10px] font-semibold text-gray-500 tracking-wide mt-0.5">
          Agregar, editar y seguimiento diario
        </p>
      </div>

      {/* Cloud Auto-save Pill */}
      <div className="flex items-center justify-center py-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 shadow-2xs">
          <span className={`w-2 h-2 rounded-full ${savedFeedback ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-gray-700">{savedFeedback ? '¡Sincronizado en Firebase!' : 'Base de datos en tiempo real'}</span>
        </div>
      </div>

      {/* 2. Section: DATOS DEL RESPONSABLE */}
      <div className="mt-1.5 bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs">
        <h2 className="text-[11px] font-black tracking-tight text-gray-900 uppercase mb-2.5">
          DATOS DEL RESPONSABLE
        </h2>

        <div className="flex items-start gap-3.5">
          {/* Avatar with Camera Icon */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-100 via-rose-100 to-amber-100 text-red-600 border-2 border-red-200 flex items-center justify-center font-black text-2xl shadow-inner">
              {formName ? formName.charAt(0).toUpperCase() : '?'}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-xs hover:bg-red-700 transition active:scale-95"
              title="Cambiar avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-2.5">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Nombre corto
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej. Bruno"
                className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:border-red-500 focus:bg-white focus:outline-hidden transition shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Meta diaria
              </label>
              <div className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs">
                <span>9 publicaciones</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-blue-600 font-bold">8 Meta</span>
                  <span>+</span>
                  <span className="text-pink-600 font-bold">1 IG</span>
                </div>
              </div>
            </div>

            {/* Activo Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-gray-700">Activo</span>
              <button
                type="button"
                onClick={() => setFormActive(!formActive)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                  formActive ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                    formActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Buttons: Guardar cambios & Eliminar */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSaveResponsibleForm}
            disabled={isSavingForm || !formName.trim()}
            className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 px-3 rounded-xl transition active:scale-95 disabled:opacity-50 shadow-xs"
          >
            {isSavingForm ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Guardar cambios</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedResponsible) {
                setDeleteTargetId(selectedResponsible.id);
                setShowDeleteConfirm(true);
              }
            }}
            disabled={!selectedResponsible}
            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 text-xs font-bold py-2.5 px-3 rounded-xl border border-gray-200 transition active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* 3. Section: LISTA ACTUAL */}
      <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs">
        <h2 className="text-xs font-black tracking-tight text-gray-900 uppercase mb-2">
          LISTA ACTUAL ({activeResponsibles.length})
        </h2>

        <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
          {activeResponsibles.map((resp, idx) => {
            const isSelected = resp.id === activeSelectedId;
            const avatarStyle = avatarColors[idx % avatarColors.length];

            return (
              <div
                key={resp.id}
                onClick={() => onSelectResponsible(resp.id)}
                className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition cursor-pointer ${
                  isSelected
                    ? 'bg-red-50/70 border border-red-200 shadow-2xs'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full border flex items-center justify-center font-black text-xs shrink-0 ${avatarStyle}`}
                  >
                    {resp.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-red-700 font-black' : 'text-gray-800'
                    }`}
                  >
                    {resp.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectResponsible(resp.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition"
                    title="Editar responsable"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(resp.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Desactivar responsable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Button: + Agregar responsable */}
        <button
          type="button"
          onClick={handleAddNewResponsible}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-red-300 hover:border-red-600 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold transition active:scale-98 bg-red-50/30"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar responsable</span>
        </button>
      </div>

      {/* 4. Section: MARCADO DE PUBLICACIONES (8 Meta + 1 Instagram) */}
      <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
        <h2 className="text-xs font-black tracking-tight text-gray-900 uppercase mb-2">
          MARCADO DE PUBLICACIONES
        </h2>

        {/* Selected info header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
              {selectedResponsible?.name.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block leading-none">
                Responsable seleccionado:
              </span>
              <span className="text-xs font-black text-gray-950">
                {selectedResponsible?.name || 'Selecciona uno'}
              </span>
            </div>
          </div>
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-2xs ${
              confirmedCount >= 9
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            Confirmadas: {confirmedCount}/9
          </span>
        </div>

        {/* The 9 Check Points: Meta/Facebook (1-8) & Instagram (9) */}
        <div className="mt-3 flex items-start justify-between gap-3">
          {/* Meta/Facebook (8) */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs" />
              <span className="text-xs font-black text-blue-900">
                Meta/Facebook (8)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const isChecked = metaChecks[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTogglePoint(idx)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition active:scale-90 border ${
                      isChecked
                        ? 'bg-blue-50/80 border-blue-200 text-blue-700 shadow-2xs'
                        : 'bg-gray-50/80 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs ${
                        isChecked
                          ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                          : 'border-2 border-gray-300 text-gray-400 bg-white'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <span className="text-xs font-bold text-gray-600">{idx + 1}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold mt-1 text-gray-600">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instagram (1) */}
          <div className="w-22 shrink-0 border-l border-gray-100 pl-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 inline-block shadow-xs" />
              <span className="text-xs font-black text-pink-900">
                Instagram (1)
              </span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => handleTogglePoint(8)}
                className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition active:scale-90 border ${
                  instagramCheck
                    ? 'bg-pink-50/80 border-pink-200 text-pink-700 shadow-2xs'
                    : 'bg-gray-50/80 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs ${
                    instagramCheck
                      ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white ring-2 ring-pink-200'
                      : 'border-2 border-pink-300 text-pink-500 bg-white'
                  }`}
                >
                  {instagramCheck ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span className="text-xs font-black text-pink-500">9</span>
                  )}
                </div>
                <span className="text-[10px] font-bold mt-1 text-pink-600">
                  9
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Section: ACCIONES SI NO CUMPLE (Status Pills) */}
      <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
        <h2 className="text-xs font-black tracking-tight text-gray-900 uppercase mb-2.5">
          ACCIONES SI NO CUMPLE
        </h2>

        <div className="grid grid-cols-4 gap-1.5">
          {/* Cumplió */}
          <button
            type="button"
            onClick={() => handleSetStatus('completed')}
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs ${
              currentStatus === 'completed'
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span className="text-[11px]">Cumplió</span>
          </button>

          {/* Pendiente */}
          <button
            type="button"
            onClick={() => handleSetStatus('pending')}
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs ${
              currentStatus === 'pending'
                ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px]">Pendiente</span>
          </button>

          {/* No cumplió */}
          <button
            type="button"
            onClick={() => handleSetStatus('not_completed')}
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs ${
              currentStatus === 'not_completed'
                ? 'bg-rose-600 text-white ring-2 ring-rose-200'
                : 'bg-gray-100 text-gray-700 hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
            <span className="text-[11px]">No cumplió</span>
          </button>

          {/* Justificado */}
          <button
            type="button"
            onClick={() => handleSetStatus('justified')}
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs ${
              currentStatus === 'justified'
                ? 'bg-slate-800 text-white ring-2 ring-slate-300'
                : 'bg-gray-100 text-gray-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="text-[11px]">Justificado</span>
          </button>
        </div>

        {/* Observación IA box */}
        <div className="mt-3 bg-gradient-to-r from-gray-50 to-rose-50/40 border border-gray-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Bot className="w-3 h-3" />
              </div>
              <span className="text-[11px] font-black text-gray-900">
                Observación IA
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualRegenerateAi}
              disabled={loadingAi}
              className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 active:scale-95"
            >
              {loadingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>Actualizar IA</span>
            </button>
          </div>
          <p className="text-xs text-gray-700 leading-snug font-medium">
            {aiSuggestion || 'Calculando publicaciones pendientes para este responsable...'}
          </p>
        </div>
      </div>

      {/* 6. Section: Guardar configuración */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleSaveResponsibleForm}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 via-gray-950 to-black hover:from-black hover:to-gray-900 text-white font-black py-3.5 px-4 rounded-2xl shadow-md transition active:scale-98"
        >
          <Save className="w-4 h-4 text-white" />
          <span className="text-sm">Guardar configuración</span>
        </button>
      </div>

      {/* Confirmation Modal for Soft Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-gray-100">
            <h3 className="text-sm font-black text-gray-900">
              ¿Desactivar responsable?
            </h3>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              El responsable dejará de aparecer en la lista diaria activa, pero <strong>todo su historial se conservará</strong> en la base de datos de Firebase.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTargetId(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
