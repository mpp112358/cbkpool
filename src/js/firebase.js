import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, get, update, remove, onValue } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebase Configuration (Replace with active project credentials)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = getAnalytics(app);

export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function logout() {
  return signOut(auth);
}

// Database Operations
export function subscribeToData(path, callback) {
  const dbRef = ref(db, path);
  return onValue(
    dbRef,
    (snapshot) => {
      callback(snapshot.val() || {});
    },
    (error) => {
      console.error(`Firebase subscription error on standard path /${path}:`, error);
    }
  );
}

export function writeData(path, data) {
  return set(ref(db, path), data);
}

export function updateData(path, data) {
  return update(ref(db, path), data);
}

export function deleteData(path) {
  return remove(ref(db, path));
}
