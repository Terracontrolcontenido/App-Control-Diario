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
  INITIAL_RESPONSIBLE_NAMES,
} from '../types';

const RESPONSIBLES_COLLECTION = 'responsibles';
const DAILY_REPORTS_COLLECTION = 'dailyReports';

const LOCAL_STORAGE_KEY_RESPONSIBLES = 'terra_responsibles_cache';
const LOCAL_STORAGE_KEY_RECORDS = 'terra_daily_records_cache';

// Helper to get cached responsibles
export function getLocalCachedResponsibles(): Responsible[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RESPONSIBLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local responsibles:', e);
  }
  // Fallback defaults
  return INITIAL_RESPONSIBLE_NAMES.map((name, index) => ({
    id: `resp_${name.toLowerCase()}`,
    name,
    active: true,
    dailyGoal: 9,
    facebookGoal: 8,
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
        list.push(docSnap.data() as Responsible);
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
  
  const fullItem: Responsible = {
    id,
    name: responsible.name.trim(),
    photoUrl: responsible.photoUrl || '',
    active: responsible.active !== undefined ? responsible.active : true,
    dailyGoal: responsible.dailyGoal || 9,
    facebookGoal: responsible.facebookGoal || 8,
    instagramGoal: responsible.instagramGoal || 1,
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
  if (target) {
    target.active = false;
    target.updatedAt = new Date().toISOString();
    saveLocalCachedResponsibles(current);
  }

  try {
    await updateDoc(doc(db, RESPONSIBLES_COLLECTION, id), {
      active: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESPONSIBLES_COLLECTION}/${id}`);
  }
}

/**
 * Subscribes to records of a specific date in real-time
 */
export function subscribeToDailyRecords(
  date: string,
  responsibles: Responsible[],
  callback: (records: ResponsibleDailyRecord[]) => void
) {
  // Emit local cache immediately
  const cached = getLocalCachedRecords(date);
  if (cached.length > 0) {
    callback(cached);
  }

  const subColRef = collection(db, `${DAILY_REPORTS_COLLECTION}/${date}/records`);
  return onSnapshot(
    subColRef,
    async (snapshot) => {
      const recordsMap: Record<string, ResponsibleDailyRecord> = {};
      snapshot.forEach((d) => {
        recordsMap[d.id] = d.data() as ResponsibleDailyRecord;
      });

      // Ensure every active responsible has a record representation
      const activeResponsibles = responsibles.filter((r) => r.active);
      const combinedRecords: ResponsibleDailyRecord[] = activeResponsibles.map((r) => {
        if (recordsMap[r.id]) {
          return {
            ...recordsMap[r.id],
            responsibleName: r.name,
          };
        }
        // Initialize default empty record
        return {
          responsibleId: r.id,
          responsibleName: r.name,
          date,
          metaChecks: [false, false, false, false, false, false, false, false],
          instagramCheck: false,
          metaCount: 0,
          instagramCount: 0,
          totalCount: 0,
          totalGoal: 9,
          progressPercent: 0,
          status: 'pending',
          updatedAt: new Date().toISOString(),
        };
      });

      saveLocalCachedRecords(date, combinedRecords);
      callback(combinedRecords);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${DAILY_REPORTS_COLLECTION}/${date}/records`);
    }
  );
}

/**
 * Toggle check on a responsible's daily record (point 1-8 for Meta, 9 for Instagram)
 */
export async function togglePublicationCheck(
  date: string,
  responsible: Responsible,
  currentRecord: ResponsibleDailyRecord | undefined,
  pointIndex: number // 0 to 7 for Meta, 8 for Instagram
): Promise<ResponsibleDailyRecord> {
  const isInstagram = pointIndex === 8;
  const metaChecks = currentRecord?.metaChecks ? [...currentRecord.metaChecks] : [false, false, false, false, false, false, false, false];
  let instagramCheck = currentRecord ? !!currentRecord.instagramCheck : false;

  if (isInstagram) {
    instagramCheck = !instagramCheck;
  } else {
    metaChecks[pointIndex] = !metaChecks[pointIndex];
  }

  const metaCount = metaChecks.filter(Boolean).length;
  const instagramCount = instagramCheck ? 1 : 0;
  const totalCount = metaCount + instagramCount;
  const progressPercent = Math.min(100, Math.round((totalCount / 9) * 100));

  // Determine status
  let status: ResponsibleStatus = currentRecord?.status || 'pending';
  if (totalCount >= 9) {
    status = 'completed';
  } else if (status === 'completed' && totalCount < 9) {
    status = 'pending';
  }

  const updatedRecord: ResponsibleDailyRecord = {
    responsibleId: responsible.id,
    responsibleName: responsible.name,
    date,
    metaChecks,
    instagramCheck,
    metaCount,
    instagramCount,
    totalCount,
    totalGoal: 9,
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
  const isComplete = targetStatus === 'completed';
  const metaChecks = isComplete
    ? [true, true, true, true, true, true, true, true]
    : currentRecord?.metaChecks || [false, false, false, false, false, false, false, false];
  const instagramCheck = isComplete ? true : (currentRecord?.instagramCheck ?? false);

  const metaCount = metaChecks.filter(Boolean).length;
  const instagramCount = instagramCheck ? 1 : 0;
  const totalCount = isComplete ? 9 : (metaCount + instagramCount);
  const progressPercent = isComplete ? 100 : Math.round((totalCount / 9) * 100);

  const updatedRecord: ResponsibleDailyRecord = {
    responsibleId: responsible.id,
    responsibleName: responsible.name,
    date,
    metaChecks,
    instagramCheck,
    metaCount,
    instagramCount,
    totalCount,
    totalGoal: 9,
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
