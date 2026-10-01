export type ResponsibleStatus = 'completed' | 'pending' | 'not_completed' | 'justified';

export interface Responsible {
  id: string;
  name: string;
  photoUrl?: string;
  active: boolean;
  dailyGoal: number; // 9
  facebookGoal: number; // 8
  instagramGoal: number; // 1
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsibleDailyRecord {
  responsibleId: string;
  responsibleName: string;
  date: string; // YYYY-MM-DD
  metaChecks: boolean[]; // 8 elements
  instagramCheck: boolean; // 1 element
  metaCount: number; // 0-8
  instagramCount: number; // 0-1
  totalCount: number; // 0-9
  totalGoal: number; // 9
  progressPercent: number; // 0-100
  status: ResponsibleStatus;
  aiObservation?: string;
  updatedAt: string;
}

export interface DailyReportSummary {
  date: string; // YYYY-MM-DD
  totalResponsibles: number;
  completed: number;
  notCompleted: number;
  pending: number;
  justified: number;
  completionRate: number;
  aiObservation: string;
  updatedAt: string;
}

export const INITIAL_RESPONSIBLE_NAMES = [
  'Bruno',
  'Eliana',
  'Miguel',
  'Noemi',
  'Walter',
  'Ximena',
  'Julio',
];
