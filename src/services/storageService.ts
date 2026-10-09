import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Responsible,
  ResponsibleDailyRecord,
  DailyReportSummary,
  ResponsibleStatus,
  GoalsConfig,
  DEFAULT_GOALS,
  INITIAL_RESPONSIBLE_NAMES,
} from '../types';

const RESPONSIBLES_COLLECTION = 'responsibles';
const DAILY_REPORTS_COLLECTION = 'dailyReports';
const SETTINGS_COLLECTION = 'settings';
const GOALS_CONFIG_DOC = 'goalsConfig';

const LOCAL_STORAGE_KEY_RESPONSIBLES = 'terra_responsibles_cache';
const LOCAL_STORAGE_KEY_RECORDS = 'terra_daily_records_cache';
const LOCAL_STORAGE_KEY_GOALS = 'terra_goals_config_cache';

// Helper to get cached goals configuration
export function getLocalCachedGoalsConfig(): GoalsConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_GOALS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local goals config:', e);
  }
  return DEFAULT_GOALS;
}

export function saveLocalCachedGoalsConfig(config: GoalsConfig) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_GOALS, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving local goals config:', e);
  }
}

/**
 * Subscribes to real-time goals configuration from Firestore
 */
export function subscribeToGoalsConfig(callback: (config: GoalsConfig) => void) {
  const initial = getLocalCachedGoalsConfig();
  callback(initial);

  const docRef = doc(db, SETTINGS_COLLECTION, GOALS_CONFIG_DOC);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GoalsConfig;
        saveLocalCachedGoalsConfig(data);
        callback(data);
      } else {
        callback(initial);
      }
    },
    (error) => {
      console.warn('Goals config read warning:', error);
    }
  );
}

/**
 * Saves new goals config (e.g. 6 Facebook, 1 Marketplace, 1 Instagram) and applies to responsibles
 */
export async function saveGoalsConfig(config: GoalsConfig, applyToResponsibles = true): Promise<void> {
  saveLocalCachedGoalsConfig(config);
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GOALS_CONFIG_DOC);
    await setDoc(docRef, config, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${GOALS_CONFIG_DOC}`);
  }

  if (applyToResponsibles) {
    const currentList = getLocalCachedResponsibles();
    for (const r of currentList) {
      await saveResponsible({
        ...r,
        dailyGoal: config.dailyGoal,
        facebookGoal: config.facebookGoal,
        marketplaceGoal: config.marketplaceGoal,
        instagramGoal: config.instagramGoal,
      });
    }
  }
}

// Helper to get cached responsibles
export function getLocalCachedResponsibles(): Responsible[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RESPONSIBLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local responsibles:', e);
  }
  // Fallback defaults (6 FB + 1 Marketplace + 1 Instagram = 8)
  return INITIAL_RESPONSIBLE_NAMES.map((name, index) => ({
    id: `resp_${name.toLowerCase()}`,
    name,
    active: true,
    dailyGoal: 8,
    facebookGoal: 6,
    marketplaceGoal: 1,
    instagramGoal: 1,
    order: index,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function saveLocalCachedResponsibles(list: Responsible[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_RESPONSIBLES, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local responsibles:', e);
  }
}

/**
 * Sorts records in descending order of fulfillment:
 * Top performers first (highest totalCount),
 * then status priority (completed > pending > justified > not_completed),
 * then alphabetical tie-breaker.
 */
export function sortRecordsByFulfillment(records: ResponsibleDailyRecord[]): ResponsibleDailyRecord[] {
  return [...records].sort((a, b) => {
    // 1. Highest total count first
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }
    // 2. Status priority: 'completed' > 'pending' > 'justified' > 'not_completed'
    const statusPriority: Record<ResponsibleStatus, number> = {
      completed: 4,
      pending: 3,
      justified: 2,
      not_completed: 1,
    };
    const priorityDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    // 3. Alphabetical tie-breaker
    return a.responsibleName.localeCompare(b.responsibleName);
  });
}

/**
 * Resets all publication checks and counts for a specific date (preserves responsibles & photos completely)
 */
export async function resetDailyPublicationRecords(
  date: string,
  responsibles: Responsible[]
): Promise<void> {
  const active = responsibles.filter((r) => r.active);
  const resetList: ResponsibleDailyRecord[] = [];

  for (const resp of active) {
    const fbGoal = resp.facebookGoal ?? 6;
    const mpGoal = resp.marketplaceGoal ?? 1;
    const igGoal = resp.instagramGoal ?? 1;
    const totalGoal = resp.dailyGoal ?? (fbGoal + mpGoal + igGoal);

    const resetRecord: ResponsibleDailyRecord = {
      responsibleId: resp.id,
      responsibleName: resp.name,
      photoUrl: resp.photoUrl || '',
      date,
      facebookChecks: Array(fbGoal).fill(false),
      marketplaceChecks: Array(mpGoal).fill(false),
      instagramCheck: false,
      metaChecks: Array(fbGoal + mpGoal).fill(false),
      facebookCount: 0,
      marketplaceCount: 0,
      metaCount: 0,
      instagramCount: 0,
      totalCount: 0,
      totalGoal,
      progressPercent: 0,
      status: 'pending',
      aiObservation: '',
      updatedAt: new Date().toISOString(),
    };
    resetList.push(resetRecord);

    const recordDocRef = doc(db, `${DAILY_REPORTS_COLLECTION}/${date}/records/${resp.id}`);
    try {
      await setDoc(recordDocRef, resetRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${DAILY_REPORTS_COLLECTION}/${date}/records/${resp.id}`);
    }
  }

  saveLocalCachedRecords(date, resetList);
}

// Local cache for daily records: key `${date}` -> ResponsibleDailyRecord[]
export function getLocalCachedRecords(date: string): ResponsibleDailyRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_RECORDS}_${date}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local records:', e);
  }
  return [];
}

export function saveLocalCachedRecords(date: string, records: ResponsibleDailyRecord[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_RECORDS}_${date}`, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving local records:', e);
  }
}

/**
 * Initializes and syncs responsibles from Firestore.
 * If empty in Firestore, auto-seeds the default 7 responsibles.
 */
export function subscribeToResponsibles(callback: (list: Responsible[]) => void) {
  // Emit local cache immediately for zero latency
  const initial = getLocalCachedResponsibles();
  callback(initial);

  const colRef = collection(db, RESPONSIBLES_COLLECTION);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed default 7 responsibles in Firestore
        const defaults = getLocalCachedResponsibles();
        for (const r of defaults) {
          try {
            await setDoc(doc(db, RESPONSIBLES_COLLECTION, r.id), r);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `${RESPONSIBLES_COLLECTION}/${r.id}`);
          }
        }
        callback(defaults);
        return;
      }

      const list: Responsible[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Responsible;
        list.push({
          ...item,
          dailyGoal: item.dailyGoal ?? 8,
          facebookGoal: item.facebookGoal ?? 6,
          marketplaceGoal: item.marketplaceGoal ?? 1,
          instagramGoal: item.instagramGoal ?? 1,
        });
      });

      // Sort by order or name
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      saveLocalCachedResponsibles(list);
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, RESPONSIBLES_COLLECTION);
    }
  );
}

/**
 * Add or update a responsible
 */
export async function saveResponsible(
  responsible: Partial<Responsible> & { name: string }
): Promise<Responsible> {
  const isNew = !responsible.id;
  const id = isNew ? `resp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` : responsible.id!;
  
  const fbGoal = responsible.facebookGoal ?? 6;
  const mpGoal = responsible.marketplaceGoal ?? 1;
  const igGoal = responsible.instagramGoal ?? 1;
  const dailyGoal = responsible.dailyGoal ?? (fbGoal + mpGoal + igGoal);

  const fullItem: Responsible = {
    id,
    name: responsible.name.trim(),
    photoUrl: responsible.photoUrl || '',
    active: responsible.active !== undefined ? responsible.active : true,
    dailyGoal,
    facebookGoal: fbGoal,
    marketplaceGoal: mpGoal,
    instagramGoal: igGoal,
    order: responsible.order ?? Date.now(),
    createdAt: responsible.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Update local cache first
  const current = getLocalCachedResponsibles();
  const index = current.findIndex((r) => r.id === id);
  if (index >= 0) {
    current[index] = fullItem;
  } else {
    current.push(fullItem);
  }
  saveLocalCachedResponsibles(current);

  // Sync to Firestore
  try {
    await setDoc(doc(db, RESPONSIBLES_COLLECTION, id), fullItem);
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, `${RESPONSIBLES_COLLECTION}/${id}`);
  }

  return fullItem;
}

/**
 * Soft delete a responsible (active = false) to preserve all historical data
 */
export async function softDeleteResponsible(id: string): Promise<void> {
  const current = getLocalCachedResponsibles();
  const target = current.find((r) => r.id === id);
  if (!target) return;

  target.active = false;
  target.updatedAt = new Date().toISOString();
  saveLocalCachedResponsibles(current);

  try {
    await updateDoc(doc(db, RESPONSIBLES_COLLECTION, id), {
      active: false,
      updatedAt: target.updatedAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESPONSIBLES_COLLECTION}/${id}`);
  }
}

/**
 * Subscribes to real-time daily publication records for a specific date
 */
export function subscribeToDailyRecords(
  date: string,
  responsibles: Responsible[],
  callback: (records: ResponsibleDailyRecord[]) => void
) {
  // Emit local cache immediately
  const cached = getLocalCachedRecords(date);
  if (cached.length > 0) {
    callback(sortRecordsByFulfillment(cached));
  }

  const subColRef = collection(db, `${DAILY_REPORTS_COLLECTION}/${date}/records`);
  return onSnapshot(
    subColRef,
    async (snapshot) => {
      const recordsMap: Record<string, any> = {};
      snapshot.forEach((d) => {
        recordsMap[d.id] = d.data();
      });

      // Ensure every active responsible has a record representation
      const activeResponsibles = responsibles.filter((r) => r.active);
      const combinedRecords: ResponsibleDailyRecord[] = activeResponsibles.map((r) => {
        const fbGoal = r.facebookGoal ?? 6;
        const mpGoal = r.marketplaceGoal ?? 1;
        const igGoal = r.instagramGoal ?? 1;
        const totalGoal = r.dailyGoal ?? (fbGoal + mpGoal + igGoal);

        if (recordsMap[r.id]) {
          const raw = recordsMap[r.id];
          
          // Reconstruct/normalize facebook checks array
          let fbChecks: boolean[];
          if (Array.isArray(raw.facebookChecks)) {
            fbChecks = Array.from({ length: fbGoal }, (_, i) => !!raw.facebookChecks[i]);
          } else if (Array.isArray(raw.metaChecks)) {
            fbChecks = Array.from({ length: fbGoal }, (_, i) => !!raw.metaChecks[i]);
          } else {
            fbChecks = Array(fbGoal).fill(false);
          }

          // Reconstruct/normalize marketplace checks array
          let mpChecks: boolean[];
          if (Array.isArray(raw.marketplaceChecks)) {
            mpChecks = Array.from({ length: mpGoal }, (_, i) => !!raw.marketplaceChecks[i]);
          } else if (Array.isArray(raw.metaChecks) && raw.metaChecks.length > fbGoal) {
            mpChecks = Array.from({ length: mpGoal }, (_, i) => !!raw.metaChecks[fbGoal + i]);
          } else {
            mpChecks = Array(mpGoal).fill(false);
          }

          const igCheck = !!raw.instagramCheck;
          const fbCount = fbChecks.filter(Boolean).length;
          const mpCount = mpChecks.filter(Boolean).length;
          const igCount = igCheck ? 1 : 0;
          const totalCount = fbCount + mpCount + igCount;
          const progressPercent = Math.min(100, Math.round((totalCount / totalGoal) * 100));

          let status: ResponsibleStatus = raw.status || 'pending';
          if (totalCount >= totalGoal) {
            status = 'completed';
          } else if (status === 'completed' && totalCount < totalGoal) {
            status = 'pending';
          }

          return {
            responsibleId: r.id,
            responsibleName: r.name,
            photoUrl: r.photoUrl || raw.photoUrl || '',
            date,
            facebookChecks: fbChecks,
            marketplaceChecks: mpChecks,
            instagramCheck: igCheck,
            metaChecks: [...fbChecks, ...mpChecks],
            facebookCount: fbCount,
            marketplaceCount: mpCount,
            metaCount: fbCount + mpCount,
            instagramCount: igCount,
            totalCount,
            totalGoal,
            progressPercent,
            status,
            aiObservation: raw.aiObservation || '',
            updatedAt: raw.updatedAt || new Date().toISOString(),
          };
        }

        // Initialize default empty record
        const fbChecks = Array(fbGoal).fill(false);
        const mpChecks = Array(mpGoal).fill(false);
        return {
          responsibleId: r.id,
          responsibleName: r.name,
          photoUrl: r.photoUrl || '',
          date,
          facebookChecks: fbChecks,
          marketplaceChecks: mpChecks,
          instagramCheck: false,
          metaChecks: [...fbChecks, ...mpChecks],
          facebookCount: 0,
          marketplaceCount: 0,
          metaCount: 0,
          instagramCount: 0,
          totalCount: 0,
          totalGoal,
          progressPercent: 0,
          status: 'pending',
          aiObservation: '',
          updatedAt: new Date().toISOString(),
        };
      });

      const sorted = sortRecordsByFulfillment(combinedRecords);
      saveLocalCachedRecords(date, sorted);
      callback(sorted);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${DAILY_REPORTS_COLLECTION}/${date}/records`);
    }
  );
}

/**
 * Toggle check on a responsible's daily record (Facebook, Marketplace, or Instagram)
 */
export async function togglePublicationCheck(
  date: string,
  responsible: Responsible,
  currentRecord: ResponsibleDailyRecord | undefined,
  platform: 'facebook' | 'marketplace' | 'instagram' | number,
  itemIndex: number = 0
): Promise<ResponsibleDailyRecord> {
  const fbGoal = responsible.facebookGoal ?? 6;
  const mpGoal = responsible.marketplaceGoal ?? 1;
  const igGoal = responsible.instagramGoal ?? 1;
  const totalGoal = responsible.dailyGoal ?? (fbGoal + mpGoal + igGoal);

  // Normalize current arrays
  let fbChecks = currentRecord?.facebookChecks
    ? [...currentRecord.facebookChecks]
    : currentRecord?.metaChecks
    ? currentRecord.metaChecks.slice(0, fbGoal)
    : Array(fbGoal).fill(false);
  while (fbChecks.length < fbGoal) fbChecks.push(false);
  fbChecks = fbChecks.slice(0, fbGoal);

  let mpChecks = currentRecord?.marketplaceChecks
    ? [...currentRecord.marketplaceChecks]
    : currentRecord?.metaChecks && currentRecord.metaChecks.length > fbGoal
    ? currentRecord.metaChecks.slice(fbGoal, fbGoal + mpGoal)
    : Array(mpGoal).fill(false);
  while (mpChecks.length < mpGoal) mpChecks.push(false);
  mpChecks = mpChecks.slice(0, mpGoal);

  let igCheck = currentRecord ? !!currentRecord.instagramCheck : false;

  // Handle toggle logic
  if (typeof platform === 'number') {
    const pt = platform;
    if (pt === 8 || pt >= fbGoal + mpGoal) {
      igCheck = !igCheck;
    } else if (pt < fbGoal) {
      fbChecks[pt] = !fbChecks[pt];
    } else {
      const mpIdx = pt - fbGoal;
      if (mpIdx < mpGoal) mpChecks[mpIdx] = !mpChecks[mpIdx];
    }
  } else if (platform === 'facebook') {
    if (itemIndex >= 0 && itemIndex < fbGoal) {
      fbChecks[itemIndex] = !fbChecks[itemIndex];
    }
  } else if (platform === 'marketplace') {
    if (itemIndex >= 0 && itemIndex < mpGoal) {
      mpChecks[itemIndex] = !mpChecks[itemIndex];
    }
  } else if (platform === 'instagram') {
    igCheck = !igCheck;
  }

  const fbCount = fbChecks.filter(Boolean).length;
  const mpCount = mpChecks.filter(Boolean).length;
  const igCount = igCheck ? 1 : 0;
  const totalCount = fbCount + mpCount + igCount;
  const progressPercent = Math.min(100, Math.round((totalCount / totalGoal) * 100));

  let status: ResponsibleStatus = currentRecord?.status || 'pending';
  if (totalCount >= totalGoal) {
    status = 'completed';
  } else if (status === 'completed' && totalCount < totalGoal) {
    status = 'pending';
  }

  const updatedRecord: ResponsibleDailyRecord = {
    responsibleId: responsible.id,
    responsibleName: responsible.name,
    photoUrl: responsible.photoUrl || currentRecord?.photoUrl || '',
    date,
    facebookChecks: fbChecks,
    marketplaceChecks: mpChecks,
    instagramCheck: igCheck,
    metaChecks: [...fbChecks, ...mpChecks],
    facebookCount: fbCount,
    marketplaceCount: mpCount,
    metaCount: fbCount + mpCount,
    instagramCount: igCount,
    totalCount,
    totalGoal,
    progressPercent,
    status,
    aiObservation: currentRecord?.aiObservation || '',
    updatedAt: new Date().toISOString(),
  };

  // Cache locally
  const cachedList = getLocalCachedRecords(date);
  const idx = cachedList.findIndex((r) => r.responsibleId === responsible.id);
  if (idx >= 0) {
    cachedList[idx] = updatedRecord;
  } else {
    cachedList.push(updatedRecord);
  }
  saveLocalCachedRecords(date, cachedList);

  // Write to Firestore subcollection
  const recordDocRef = doc(db, `${DAILY_REPORTS_COLLECTION}/${date}/records/${responsible.id}`);
  try {
    await setDoc(recordDocRef, updatedRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DAILY_REPORTS_COLLECTION}/${date}/records/${responsible.id}`);
  }

  return updatedRecord;
}

/**
 * Set full completion (quick check button) or non-completion (quick X button)
 */
export async function setQuickStatus(
  date: string,
  responsible: Responsible,
  currentRecord: ResponsibleDailyRecord | undefined,
  targetStatus: 'completed' | 'not_completed'
): Promise<ResponsibleDailyRecord> {
  const fbGoal = responsible.facebookGoal ?? 6;
  const mpGoal = responsible.marketplaceGoal ?? 1;
  const igGoal = responsible.instagramGoal ?? 1;
  const totalGoal = responsible.dailyGoal ?? (fbGoal + mpGoal + igGoal);
  const isComplete = targetStatus === 'completed';

  const fbChecks = Array(fbGoal).fill(isComplete);
  const mpChecks = Array(mpGoal).fill(isComplete);
  const igCheck = isComplete;

  const totalCount = isComplete ? totalGoal : 0;
  const progressPercent = isComplete ? 100 : 0;

  const updatedRecord: ResponsibleDailyRecord = {
    responsibleId: responsible.id,
    responsibleName: responsible.name,
    photoUrl: responsible.photoUrl || currentRecord?.photoUrl || '',
    date,
    facebookChecks: fbChecks,
    marketplaceChecks: mpChecks,
    instagramCheck: igCheck,
    metaChecks: [...fbChecks, ...mpChecks],
    facebookCount: isComplete ? fbGoal : 0,
    marketplaceCount: isComplete ? mpGoal : 0,
    metaCount: isComplete ? fbGoal + mpGoal : 0,
    instagramCount: isComplete ? 1 : 0,
    totalCount,
    totalGoal,
    progressPercent,
    status: targetStatus,
    aiObservation: currentRecord?.aiObservation || '',
    updatedAt: new Date().toISOString(),
  };

  // Cache locally
  const cachedList = getLocalCachedRecords(date);
  const idx = cachedList.findIndex((r) => r.responsibleId === responsible.id);
  if (idx >= 0) {
    cachedList[idx] = updatedRecord;
  } else {
    cachedList.push(updatedRecord);
  }
  saveLocalCachedRecords(date, cachedList);

  // Firestore update
  const recordDocRef = doc(db, `${DAILY_REPORTS_COLLECTION}/${date}/records/${responsible.id}`);
  try {
    await setDoc(recordDocRef, updatedRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DAILY_REPORTS_COLLECTION}/${date}/records/${responsible.id}`);
  }

  return updatedRecord;
}

/**
 * Manually set responsible status (completed, pending, not_completed, justified)
 */
export async function setResponsibleStatus(
  date: string,
  responsibleId: string,
  status: ResponsibleStatus,
  currentRecord: ResponsibleDailyRecord
): Promise<void> {
  const updatedRecord: ResponsibleDailyRecord = {
    ...currentRecord,
    status,
    updatedAt: new Date().toISOString(),
  };

  // Local cache
  const cachedList = getLocalCachedRecords(date);
  const idx = cachedList.findIndex((r) => r.responsibleId === responsibleId);
  if (idx >= 0) {
    cachedList[idx] = updatedRecord;
  }
  saveLocalCachedRecords(date, cachedList);

  const recordDocRef = doc(db, `${DAILY_REPORTS_COLLECTION}/${date}/records/${responsibleId}`);
  try {
    await setDoc(recordDocRef, updatedRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DAILY_REPORTS_COLLECTION}/${date}/records/${responsibleId}`);
  }
}

/**
 * Subscribes to the daily summary document (for aiObservation and aggregated stats)
 */
export function subscribeToDailySummary(
  date: string,
  callback: (summary: DailyReportSummary | null) => void
) {
  const docRef = doc(db, DAILY_REPORTS_COLLECTION, date);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as DailyReportSummary);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${DAILY_REPORTS_COLLECTION}/${date}`);
    }
  );
}

/**
 * Saves daily summary (including AI observation note)
 */
export async function saveDailySummary(
  date: string,
  data: Partial<DailyReportSummary>
): Promise<void> {
  const docRef = doc(db, DAILY_REPORTS_COLLECTION, date);
  const payload = {
    date,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DAILY_REPORTS_COLLECTION}/${date}`);
  }
}
