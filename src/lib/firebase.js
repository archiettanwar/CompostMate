import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCCT0a1lrIwZLf3NjqaGm4fhsI0sNFi4G8",
  authDomain: "compostmate-fa8da.firebaseapp.com",
  projectId: "compostmate-fa8da",
  storageBucket: "compostmate-fa8da.firebasestorage.app",
  messagingSenderId: "769858490112",
  appId: "1:769858490112:web:64893815d6a5f41a00ade5",
  measurementId: "G-K313DK1V2J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export default app;