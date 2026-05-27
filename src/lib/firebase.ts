import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBELJEJAYHSI7PSZZsq5SQ6uuYrQ4VDN0k",
  authDomain: "pecker-8096d.firebaseapp.com",
  projectId: "pecker-8096d",
  storageBucket: "pecker-8096d.firebasestorage.app",
  messagingSenderId: "151786678717",
  appId: "1:151786678717:web:e682b3840cb155be324ad4",
  measurementId: "G-7DMSQ811DC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export default app;
