export type ResponsibleStatus = 'completed' | 'pending' | 'not_completed' | 'justified';

export interface GoalsConfig {
  facebookGoal: number;
  marketplaceGoal: number;
  instagramGoal: number;
  dailyGoal: number;
}

export const DEFAULT_GOALS: GoalsConfig = {
  facebookGoal: 6,
  marketplaceGoal: 1,
  instagramGoal: 1,
  dailyGoal: 8,
};

export interface Responsible {
  id: string;
  name: string;
  photoUrl?: string;
  active: boolean;
  dailyGoal: number; // default 8 (6 FB + 1 Mkt + 1 IG)
  facebookGoal: number; // default 6
  marketplaceGoal?: number; // default 1
  instagramGoal: number; // default 1
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsibleDailyRecord {
  responsibleId: string;
  responsibleName: string;
  photoUrl?: string;
  date: string; // YYYY-MM-DD
  facebookChecks?: boolean[]; // booleans for Facebook
  marketplaceChecks?: boolean[]; // booleans for Marketplace
  metaChecks: boolean[]; // backward compatible combined check list
  instagramCheck: boolean; // booleans for Instagram
  facebookCount?: number;
  marketplaceCount?: number;
  metaCount: number; // backward compatible
  instagramCount: number; // 0-1
  totalCount: number; // sum of confirmed posts
  totalGoal: number; // target goal (e.g. 8)
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
