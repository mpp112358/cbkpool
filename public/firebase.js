import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC-2QSzbbEcXIC14sgyC0j3DqbKLRzmLFE",
  authDomain: "cbkpool-4a3a3.firebaseapp.com",
  projectId: "cbkpool-4a3a3",
  storageBucket: "cbkpool-4a3a3.firebasestorage.app",
  messagingSenderId: "115888726454",
  appId: "1:115888726454:web:39f68fb58c7c3a5eb52117",
  measurementId: "G-CFHGKCY75L",
  databaseURL: 'https://cbkpool-4a3a3-default-rtdb.europe-west1.firebasedatabase.app'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
