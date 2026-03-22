import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

/**
 * FIRESTORE SCHEMA DOCUMENTATION
 * 
 * Collection: societies
 * - societyId (string, auto-generated)
 * - name (string) — society/building name
 * - city (string)
 * - adminId (string) — uid of the secretary
 * - memberIds (array of strings) — uids of all residents
 * - inviteCode (string) — unique 6-char code e.g. "VESIT1"
 * - createdAt (timestamp)
 * 
 * Collection: discounts
 * - discountId (auto-generated)
 * - userId (string)
 * - societyId (string)
 * - percent (number 0-100)
 * - note (string) — reason from admin
 * - setBy (string) — admin uid
 * - updatedAt (timestamp)
 * 
 * Collection: invites
 * - code (string, document ID)
 * - societyId (string)
 * - createdBy (string) — admin uid
 * - expiresAt (timestamp)
 * - uses (number)
 */

export async function getUserRole(uid) {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) return docSnap.data().role || "resident";
  } catch (err) {
    console.error("Error fetching role:", err);
  }
  return "resident";
}

export default app;
