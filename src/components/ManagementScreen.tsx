import React, { useState, useEffect, useRef } from 'react';
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
  Store,
  Instagram,
  Sliders,
} from 'lucide-react';
import { TerraLogo } from './TerraLogo';
import {
  Responsible,
  ResponsibleDailyRecord,
  ResponsibleStatus,
  GoalsConfig,
} from '../types';
import {
  saveResponsible,
  softDeleteResponsible,
  togglePublicationCheck,
  setResponsibleStatus,
  subscribeToGoalsConfig,
  getLocalCachedGoalsConfig,
  saveGoalsConfig,
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

  // Global goals configuration for the whole app
  const [globalGoals, setGlobalGoals] = useState<GoalsConfig>(getLocalCachedGoalsConfig());
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [modalFbGoal, setModalFbGoal] = useState<number>(globalGoals.facebookGoal);
  const [modalMpGoal, setModalMpGoal] = useState<number>(globalGoals.marketplaceGoal);
  const [modalIgGoal, setModalIgGoal] = useState<number>(globalGoals.instagramGoal);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  useEffect(() => {
    const unsub = subscribeToGoalsConfig((cfg) => {
      setGlobalGoals(cfg);
    });
    return () => unsub();
  }, []);

  // Form states for DATOS DEL RESPONSABLE (Clean & Compact)
  const [formName, setFormName] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formActive, setFormActive] = useState(true);

  const [isSavingForm, setIsSavingForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI observation for selected responsible
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (selectedResponsible) {
      setFormName(selectedResponsible.name);
      setFormPhotoUrl(selectedResponsible.photoUrl || '');
      setFormActive(selectedResponsible.active);
      updateAiSuggestion(selectedResponsible, currentRecord);
    }
  }, [activeSelectedId, selectedResponsible?.name, selectedResponsible?.active, selectedResponsible?.photoUrl]);

  useEffect(() => {
    if (selectedResponsible) {
      updateAiSuggestion(selectedResponsible, currentRecord);
    }
  }, [currentRecord?.metaCount, currentRecord?.instagramCount, currentRecord?.status, currentRecord?.totalCount]);

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200; // Square avatar
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Crop to square from center
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormPhotoUrl(dataUrl);

        // Auto-save immediately to Firestore if editing an existing responsible
        if (selectedResponsible?.id) {
          saveResponsible({
            ...selectedResponsible,
            photoUrl: dataUrl,
          }).then(() => triggerSavedFeedback());
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    setFormPhotoUrl('');
    if (selectedResponsible?.id) {
      await saveResponsible({
        ...selectedResponsible,
        photoUrl: '',
      });
      triggerSavedFeedback();
    }
  };

  const handleSaveResponsibleForm = async () => {
    if (!formName.trim()) return;
    setIsSavingForm(true);

    try {
      await saveResponsible({
        id: selectedResponsible?.id,
        name: formName.trim(),
        photoUrl: formPhotoUrl,
        active: formActive,
        dailyGoal: globalGoals.dailyGoal,
        facebookGoal: globalGoals.facebookGoal,
        marketplaceGoal: globalGoals.marketplaceGoal,
        instagramGoal: globalGoals.instagramGoal,
      });

      triggerSavedFeedback();
    } catch (e) {
      console.error('Error saving responsible:', e);
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleSaveGlobalGoals = async () => {
    setIsSavingGoals(true);
    const fb = Math.max(0, modalFbGoal);
    const mp = Math.max(0, modalMpGoal);
    const ig = Math.max(0, modalIgGoal);
    const total = fb + mp + ig;

    try {
      await saveGoalsConfig(
        {
          facebookGoal: fb,
          marketplaceGoal: mp,
          instagramGoal: ig,
          dailyGoal: total,
        },
        true
      );
      setShowGoalsModal(false);
      triggerSavedFeedback();
    } catch (e) {
      console.error('Error saving global goals:', e);
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleAddNewResponsible = () => {
    setFormName('');
    setFormPhotoUrl('');
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

  const handleTogglePlatform = async (platform: 'facebook' | 'marketplace' | 'instagram', index: number = 0) => {
    if (!selectedResponsible) return;
    try {
      await togglePublicationCheck(
        currentDate,
        selectedResponsible,
        currentRecord,
        platform,
        index
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

  // Goals for active responsible (fallbacks to global app goals)
  const currentFbGoal = selectedResponsible?.facebookGoal ?? globalGoals.facebookGoal;
  const currentMpGoal = selectedResponsible?.marketplaceGoal ?? globalGoals.marketplaceGoal;
  const currentIgGoal = selectedResponsible?.instagramGoal ?? globalGoals.instagramGoal;
  const currentTotalGoal = selectedResponsible?.dailyGoal ?? globalGoals.dailyGoal;

  const fbChecks = currentRecord?.facebookChecks ?? (currentRecord?.metaChecks ? currentRecord.metaChecks.slice(0, currentFbGoal) : Array(currentFbGoal).fill(false));
  const mpChecks = currentRecord?.marketplaceChecks ?? (currentRecord?.metaChecks && currentRecord.metaChecks.length > currentFbGoal ? currentRecord.metaChecks.slice(currentFbGoal, currentFbGoal + currentMpGoal) : Array(currentMpGoal).fill(false));
  const instagramCheck = currentRecord?.instagramCheck ?? false;

  const confirmedCount = currentRecord?.totalCount ?? 0;
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
    <div className="flex flex-col w-full max-w-md mx-auto pb-10 px-3 pt-1 font-sans select-none">
      {/* 1. Header with Terra Official Logo */}
      <div className="flex flex-col items-center justify-center pt-0.5 pb-0.5">
        <TerraLogo size="sm" />

        <h1 className="mt-0.5 text-lg font-black tracking-tight text-gray-950 uppercase leading-none">
          GESTIÓN DE RESPONSABLES
        </h1>
        <p className="text-[10px] font-semibold text-gray-500 tracking-wide mt-0.5">
          Agregar, editar y seguimiento diario
        </p>
      </div>

      {/* Cloud Auto-save Pill & Global Goals Discreet Trigger */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 shadow-2xs">
          <span className={`w-2 h-2 rounded-full ${savedFeedback ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-gray-700">{savedFeedback ? '¡Sincronizado!' : 'En tiempo real'}</span>
        </div>

        {/* Discreet Global Goals Button (Hidden settings section) */}
        <button
          type="button"
          onClick={() => {
            setModalFbGoal(globalGoals.facebookGoal);
            setModalMpGoal(globalGoals.marketplaceGoal);
            setModalIgGoal(globalGoals.instagramGoal);
            setShowGoalsModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs transition active:scale-95 cursor-pointer"
          title="Configurar meta diaria general para toda la app"
        >
          <Sliders className="w-3 h-3 text-red-600" />
          <span>Metas de la app ({globalGoals.dailyGoal} pubs)</span>
        </button>
      </div>

      {/* 2. Section: DATOS DEL RESPONSABLE (Super Compact & Clean) */}
      <div className="mt-1 bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs">
        <h2 className="text-[11px] font-black tracking-tight text-gray-900 uppercase mb-2">
          DATOS DEL RESPONSABLE
        </h2>

        <div className="flex items-center gap-3.5">
          {/* Avatar with Camera Icon and Photo Upload */}
          <div className="relative shrink-0 flex flex-col items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-200 flex items-center justify-center font-black text-2xl shadow-inner cursor-pointer relative group transition active:scale-95 bg-white"
              title="Toca para subir o cambiar foto de perfil"
            >
              {formPhotoUrl ? (
                <img
                  src={formPhotoUrl}
                  alt={formName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-red-100 via-rose-100 to-amber-100 text-red-600 flex items-center justify-center">
                  {formName ? formName.charAt(0).toUpperCase() : '?'}
                </div>
              )}

              {/* Hover / tap camera indicator */}
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Camera className="w-5 h-5 drop-shadow-xs" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-xs hover:bg-red-700 transition active:scale-90 cursor-pointer"
              title="Subir o cambiar foto"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {formPhotoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="mt-1 text-[9px] text-gray-400 hover:text-red-600 underline font-semibold cursor-pointer"
              >
                Quitar foto
              </button>
            )}
          </div>

          {/* Form Fields: compact, no clutter */}
          <div className="flex-1 space-y-2">
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

            {/* Activo Toggle */}
            <div className="flex items-center justify-between pt-0.5">
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
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSaveResponsibleForm}
            disabled={isSavingForm || !formName.trim()}
            className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 px-3 rounded-xl transition active:scale-95 disabled:opacity-50 shadow-xs cursor-pointer"
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
            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 text-xs font-bold py-2.5 px-3 rounded-xl border border-gray-200 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* 3. Section: LISTA ACTUAL (Clean & Compact) */}
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
                  {resp.photoUrl ? (
                    <img
                      src={resp.photoUrl}
                      alt={resp.name}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center font-black text-xs shrink-0 ${avatarStyle}`}
                    >
                      {resp.name.charAt(0).toUpperCase()}
                    </div>
                  )}
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
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-red-300 hover:border-red-600 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold transition active:scale-98 bg-red-50/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar responsable</span>
        </button>
      </div>

      {/* 4. Section: MARCADO DE PUBLICACIONES (Facebook + Marketplace + Instagram) */}
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
              confirmedCount >= currentTotalGoal
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            Confirmadas: {confirmedCount}/{currentTotalGoal}
          </span>
        </div>

        {/* Checklist per Network: Facebook, Marketplace, Instagram */}
        <div className="mt-3 space-y-3">
          {/* 1. Facebook */}
          {currentFbGoal > 0 && (
            <div className="bg-blue-50/40 border border-blue-100/80 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs" />
                  <span className="text-xs font-black text-blue-900">
                    Facebook ({currentFbGoal})
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-700">
                  {fbChecks.filter(Boolean).length}/{currentFbGoal} listos
                </span>
              </div>

              <div className={`grid gap-1.5 ${currentFbGoal <= 6 ? 'grid-cols-6' : 'grid-cols-4 sm:grid-cols-6'}`}>
                {Array.from({ length: currentFbGoal }, (_, idx) => {
                  const isChecked = !!fbChecks[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTogglePlatform('facebook', idx)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition active:scale-90 border cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600 border-blue-700 text-white shadow-xs ring-2 ring-blue-200'
                          : 'bg-white border-blue-200 text-blue-900 hover:bg-blue-50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
                        {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                      </div>
                      <span className={`text-[9px] font-bold mt-0.5 ${isChecked ? 'text-blue-100' : 'text-blue-600'}`}>
                        {idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Marketplace & Instagram side by side */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Marketplace */}
            {currentMpGoal > 0 && (
              <div className="bg-sky-50/40 border border-sky-100/80 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block shadow-xs" />
                    <span className="text-xs font-black text-sky-950">
                      Marketplace ({currentMpGoal})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {Array.from({ length: currentMpGoal }, (_, idx) => {
                    const isChecked = !!mpChecks[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTogglePlatform('marketplace', idx)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition active:scale-95 border cursor-pointer ${
                          isChecked
                            ? 'bg-sky-600 border-sky-700 text-white shadow-xs ring-2 ring-sky-200'
                            : 'bg-white border-sky-200 text-sky-900 hover:bg-sky-50'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                          {isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Store className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs font-black truncate">
                          {isChecked ? 'Listo ✓' : `Mkt ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instagram */}
            {currentIgGoal > 0 && (
              <div className="bg-pink-50/40 border border-pink-100/80 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 inline-block shadow-xs" />
                    <span className="text-xs font-black text-pink-950">
                      Instagram ({currentIgGoal})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePlatform('instagram', 0)}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl transition active:scale-95 border cursor-pointer ${
                    instagramCheck
                      ? 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 border-pink-600 text-white shadow-xs ring-2 ring-pink-200'
                      : 'bg-white border-pink-200 text-pink-900 hover:bg-pink-50'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                    {instagramCheck ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Instagram className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-black truncate">
                    {instagramCheck ? 'Listo ✓' : 'IG 1'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5. Section: Estado manual (Cumplió / Pendiente / No cumplió / Justificado) */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-gray-100">
          {/* Cumplió */}
          <button
            type="button"
            onClick={() => handleSetStatus('completed')}
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs cursor-pointer ${
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
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs cursor-pointer ${
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
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs cursor-pointer ${
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
            className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black transition active:scale-95 shadow-2xs cursor-pointer ${
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
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black text-gray-900">
                Observación IA
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualRegenerateAi}
              disabled={loadingAi}
              className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Actualizar IA</span>
            </button>
          </div>
          <p className="text-xs text-gray-700 leading-snug font-medium">
            {aiSuggestion || 'Calculando publicaciones pendientes para este responsable...'}
          </p>
        </div>
      </div>

      {/* 6. Section: Guardar configuración del responsable */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleSaveResponsibleForm}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 via-gray-950 to-black hover:from-black hover:to-gray-900 text-white font-black py-3.5 px-4 rounded-2xl shadow-md transition active:scale-98 cursor-pointer"
        >
          <Save className="w-4 h-4 text-white" />
          <span className="text-sm">Guardar configuración</span>
        </button>
      </div>

      {/* Modal: Configuración General de Publicaciones de la App (Hidden / Modal) */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 leading-tight">
                    Metas de Publicación
                  </h3>
                  <span className="text-[10px] text-gray-500 block leading-tight">
                    Aplica a toda la aplicación
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalsModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-xs font-black text-gray-900">Total diario:</span>
                <span className="text-xs font-black text-red-600 bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs">
                  {modalFbGoal + modalMpGoal + modalIgGoal} publicaciones
                </span>
              </div>

              {/* Facebook Stepper */}
              <div className="flex items-center justify-between bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span className="text-xs font-bold text-blue-950">Facebook</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalFbGoal((p) => Math.max(0, p - 1))}
                    className="w-6 h-6 rounded-lg bg-white border border-blue-200 text-blue-800 font-black text-xs flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-blue-950 w-4 text-center">
                    {modalFbGoal}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalFbGoal((p) => Math.min(20, p + 1))}
                    className="w-6 h-6 rounded-lg bg-white border border-blue-200 text-blue-800 font-black text-xs flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Marketplace Stepper */}
              <div className="flex items-center justify-between bg-sky-50/50 p-2.5 rounded-xl border border-sky-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
                  <span className="text-xs font-bold text-sky-950">Marketplace</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMpGoal((p) => Math.max(0, p - 1))}
                    className="w-6 h-6 rounded-lg bg-white border border-sky-200 text-sky-800 font-black text-xs flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-sky-950 w-4 text-center">
                    {modalMpGoal}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalMpGoal((p) => Math.min(10, p + 1))}
                    className="w-6 h-6 rounded-lg bg-white border border-sky-200 text-sky-800 font-black text-xs flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Instagram Stepper */}
              <div className="flex items-center justify-between bg-pink-50/50 p-2.5 rounded-xl border border-pink-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 inline-block" />
                  <span className="text-xs font-bold text-pink-950">Instagram</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalIgGoal((p) => Math.max(0, p - 1))}
                    className="w-6 h-6 rounded-lg bg-white border border-pink-200 text-pink-800 font-black text-xs flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-pink-950 w-4 text-center">
                    {modalIgGoal}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalIgGoal((p) => Math.min(10, p + 1))}
                    className="w-6 h-6 rounded-lg bg-white border border-pink-200 text-pink-800 font-black text-xs flex items-center justify-center shadow-2xs active:scale-90 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoalsModal(false)}
                disabled={isSavingGoals}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGlobalGoals}
                disabled={isSavingGoals}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingGoals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Guardar metas</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer"
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
