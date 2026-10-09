import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function updateGoalsConfig() {
  console.log('--- UPDATING GOALS CONFIG TO 6 FB + 1 MARKETPLACE + 1 INSTAGRAM = 8 ---');

  // 1. Update settings/goalsConfig
  const goalsConfig = {
    facebookGoal: 6,
    marketplaceGoal: 1,
    instagramGoal: 1,
    dailyGoal: 8,
  };
  await setDoc(doc(db, 'settings', 'goalsConfig'), goalsConfig, { merge: true });
  console.log('✅ Global goalsConfig saved to Firestore.');

  // 2. Update all responsibles in Firestore
  const responsiblesSnap = await getDocs(collection(db, 'responsibles'));
  console.log(`Updating ${responsiblesSnap.size} responsibles with 6 FB + 1 Mkt + 1 IG...`);

  for (const respDoc of responsiblesSnap.docs) {
    const data = respDoc.data();
    await setDoc(
      doc(db, 'responsibles', respDoc.id),
      {
        ...data,
        dailyGoal: 8,
        facebookGoal: 6,
        marketplaceGoal: 1,
        instagramGoal: 1,
      },
      { merge: true }
    );
  }
  console.log('✅ Responsibles updated with new goals.');

  // 3. Update today's records (2026-10-06)
  const today = '2026-10-06';
  for (const respDoc of responsiblesSnap.docs) {
    const resp = respDoc.data();
    const resetRecord = {
      responsibleId: resp.id,
      responsibleName: resp.name,
      photoUrl: resp.photoUrl || '',
      date: today,
      facebookChecks: [false, false, false, false, false, false],
      marketplaceChecks: [false],
      instagramCheck: false,
      metaChecks: [false, false, false, false, false, false, false],
      facebookCount: 0,
      marketplaceCount: 0,
      metaCount: 0,
      instagramCount: 0,
      totalCount: 0,
      totalGoal: 8,
      progressPercent: 0,
      status: 'pending',
      aiObservation: '',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, `dailyReports/${today}/records`, resp.id), resetRecord, { merge: true });
  }

  console.log('✅ Ready! Daily records initialized with 8 total goal.');
  process.exit(0);
}

updateGoalsConfig().catch((err) => {
  console.error('Error updating goals:', err);
  process.exit(1);
});
