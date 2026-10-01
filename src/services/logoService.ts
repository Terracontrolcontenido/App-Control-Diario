import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const LOCAL_STORAGE_KEY_LOGO = 'terra_custom_logo_data';
const SETTINGS_DOC_PATH = 'settings/branding';

// Event listener for logo changes across the app
type LogoChangeCallback = (logoUrl: string) => void;
const listeners: LogoChangeCallback[] = [];

export function subscribeToLogo(callback: LogoChangeCallback): () => void {
  listeners.push(callback);
  // Emit current logo immediately
  callback(getCurrentLogo());
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyLogoChange(newLogo: string) {
  listeners.forEach((fn) => fn(newLogo));
}

/**
 * Returns current logo: either user-uploaded custom logo or transparent fallback
 */
export function getCurrentLogo(): string {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_LOGO);
    if (stored && (stored.startsWith('data:image/') || stored.startsWith('http') || stored.startsWith('/'))) {
      return stored;
    }
  } catch (e) {
    console.warn('Error reading logo from localStorage:', e);
  }
  return '/icon.svg';
}

/**
 * Loads logo from Firestore on initial startup,
 * and if local storage already has the uploaded logo, completes the upload to Firestore!
 */
export async function initLogoFromFirestore(): Promise<void> {
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_LOGO);

    const snap = await getDoc(doc(db, 'settings', 'branding'));
    if (snap.exists() && snap.data()?.logoDataUrl) {
      const remoteLogo = snap.data().logoDataUrl;
      localStorage.setItem(LOCAL_STORAGE_KEY_LOGO, remoteLogo);
      notifyLogoChange(remoteLogo);
      return;
    }

    // Complete the upload: sync local uploaded logo to Firestore permanently
    if (local && (local.startsWith('data:image/') || local.startsWith('http'))) {
      await setDoc(
        doc(db, 'settings', 'branding'),
        {
          logoDataUrl: local,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      notifyLogoChange(local);
    }
  } catch (e) {
    console.warn('Error syncing logo with Firestore:', e);
  }
}
