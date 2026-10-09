import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function resetAllPublications() {
  console.log('--- RESETTING DAILY PUBLICATION RECORDS ---');
  
  // 1. Fetch all responsibles so we keep their identities and photos intact
  const responsiblesSnap = await getDocs(collection(db, 'responsibles'));
  const responsibles: any[] = [];
  responsiblesSnap.forEach((d) => {
    responsibles.push(d.data());
  });
  console.log(`Found ${responsibles.length} responsibles (Names & Photos preserved intact).`);

  // 2. Fetch all dailyReports
  const dailyReportsSnap = await getDocs(collection(db, 'dailyReports'));
  console.log(`Found ${dailyReportsSnap.size} daily reports.`);

  for (const reportDoc of dailyReportsSnap.docs) {
    const dateStr = reportDoc.id;
    console.log(`Cleaning records for date: ${dateStr}...`);
    
    // Fetch subcollection records
    const subColSnap = await getDocs(collection(db, `dailyReports/${dateStr}/records`));
    for (const recordDoc of subColSnap.docs) {
      const respId = recordDoc.id;
      const resp = responsibles.find((r) => r.id === respId);
      
      // Reset publication checks to 0, status to pending, but keep photoUrl and name!
      const resetRecord = {
        responsibleId: respId,
        responsibleName: resp?.name || recordDoc.data().responsibleName || 'Responsable',
        photoUrl: resp?.photoUrl || recordDoc.data().photoUrl || '',
        date: dateStr,
        metaChecks: [false, false, false, false, false, false, false, false],
        instagramCheck: false,
        metaCount: 0,
        instagramCount: 0,
        totalCount: 0,
        totalGoal: 9,
        progressPercent: 0,
        status: 'pending',
        aiObservation: '',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, `dailyReports/${dateStr}/records`, respId), resetRecord);
    }

    // Reset daily summary doc
    await setDoc(
      doc(db, 'dailyReports', dateStr),
      {
        date: dateStr,
        completed: 0,
        notCompleted: 0,
        pending: responsibles.length,
        justified: 0,
        completionRate: 0,
        aiObservation: 'Todos los registros sincronizados en tiempo real en la base de datos de Terra.',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  // Also reset for today's date if not yet created: 2026-10-01
  const today = '2026-10-01';
  for (const resp of responsibles) {
    const resetRecord = {
      responsibleId: resp.id,
      responsibleName: resp.name,
      photoUrl: resp.photoUrl || '',
      date: today,
      metaChecks: [false, false, false, false, false, false, false, false],
      instagramCheck: false,
      metaCount: 0,
      instagramCount: 0,
      totalCount: 0,
      totalGoal: 9,
      progressPercent: 0,
      status: 'pending',
      aiObservation: '',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, `dailyReports/${today}/records`, resp.id), resetRecord);
  }

  console.log('✅ ALL DAILY PUBLICATION RECORDS SUCCESSFULLY RESET TO 0!');
  process.exit(0);
}

resetAllPublications().catch((err) => {
  console.error('Error resetting publications:', err);
  process.exit(1);
});
