import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Calendar,
  CloudCheck,
  CheckCircle,
  Wifi,
} from 'lucide-react';
import { ReportScreen } from './components/ReportScreen';
import { ManagementScreen } from './components/ManagementScreen';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Responsible,
  ResponsibleDailyRecord,
  DailyReportSummary,
} from './types';
import {
  subscribeToResponsibles,
  subscribeToDailyRecords,
  subscribeToDailySummary,
} from './services/storageService';
import { testConnection } from './firebase/config';
import { initLogoFromFirestore } from './services/logoService';
import { getTodayDateString } from './utils/dateUtils';

export default function App() {
  // Navigation tab: 'report' or 'management'
  const [activeTab, setActiveTab] = useState<'report' | 'management'>('report');

  // Today's date default using user device's local timezone (never UTC toISOString)
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayDateString());

  // State collections
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [records, setRecords] = useState<ResponsibleDailyRecord[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyReportSummary | null>(null);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string | null>(null);

  // Initial connection test and logo sync
  useEffect(() => {
    testConnection();
    initLogoFromFirestore();
  }, []);

  // 1. Subscribe to Responsibles
  useEffect(() => {
    const unsubscribe = subscribeToResponsibles((list) => {
      setResponsibles(list);
      // Auto-select first active if none selected
      if (!selectedResponsibleId && list.length > 0) {
        const firstActive = list.find((r) => r.active) || list[0];
        setSelectedResponsibleId(firstActive.id);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Daily Records when date or responsibles change
  useEffect(() => {
    if (responsibles.length === 0) return;
    const unsubscribe = subscribeToDailyRecords(currentDate, responsibles, (updatedRecords) => {
      setRecords(updatedRecords);
    });
    return () => unsubscribe();
  }, [currentDate, responsibles]);

  // 3. Subscribe to Daily Summary
  useEffect(() => {
    const unsubscribe = subscribeToDailySummary(currentDate, (summary) => {
      setDailySummary(summary);
    });
    return () => unsubscribe();
  }, [currentDate]);

  // Handler: click on responsible row in Report screen to jump to management marking
  const handleSelectResponsibleForManagement = (id: string) => {
    setSelectedResponsibleId(id);
    setActiveTab('management');
  };

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col items-center justify-start text-gray-900 font-sans selection:bg-red-500 selection:text-white">
      {/* Offline Toast */}
      <OfflineIndicator />

      {/* 100% Mobile Phone App Container */}
      <div className="w-full max-w-md min-h-dvh bg-white flex flex-col relative shadow-md overflow-x-hidden">
        {/* Top Mobile Status Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black tracking-tight text-gray-900">
              <span className="text-red-600 font-black">TERRA</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-800">CONTROL DIARIO</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
          </div>
        </header>

        {/* Screen Content (Scrolls smoothly to bottom) */}
        <main className="flex-1 w-full overflow-y-auto pb-16">
          {activeTab === 'report' ? (
            <ReportScreen
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              responsibles={responsibles}
              records={records}
              dailySummary={dailySummary}
              onSelectResponsibleForManagement={handleSelectResponsibleForManagement}
            />
          ) : (
            <ManagementScreen
              currentDate={currentDate}
              responsibles={responsibles}
              records={records}
              selectedResponsibleId={selectedResponsibleId}
              onSelectResponsible={(id) => setSelectedResponsibleId(id)}
            />
          )}
        </main>

        {/* Bottom Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 py-2 px-6 flex items-center justify-around shadow-lg">
          {/* Tab 1: Reporte del Día */}
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 py-2 px-6 rounded-2xl transition duration-150 active:scale-95 ${
              activeTab === 'report'
                ? 'bg-red-600 text-white shadow-xs font-black'
                : 'text-gray-500 hover:text-gray-900 font-bold'
            }`}
          >
            <FileText className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs tracking-tight">Reporte</span>
          </button>

          {/* Tab 2: Gestión de Responsables */}
          <button
            type="button"
            onClick={() => setActiveTab('management')}
            className={`flex items-center gap-2 py-2 px-6 rounded-2xl transition duration-150 active:scale-95 ${
              activeTab === 'management'
                ? 'bg-red-600 text-white shadow-xs font-black'
                : 'text-gray-500 hover:text-gray-900 font-bold'
            }`}
          >
            <Users className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs tracking-tight">Gestión</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
