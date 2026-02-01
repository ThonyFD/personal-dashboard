import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '../generated/esm/index.esm.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mail-reader-433802',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Data Connect
export const dataConnect = getDataConnect(app, connectorConfig);

// Initialize Firebase Messaging
import { getMessaging } from 'firebase/messaging';

export const messaging = getMessaging(app);

// VAPID public key from Firebase Console
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
