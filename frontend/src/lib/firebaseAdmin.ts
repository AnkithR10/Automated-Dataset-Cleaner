import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let db: any = {};
let auth: any = {};

// Protect against multiple initialization in development
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace literal \n with actual newlines if present in string
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      db = getFirestore();
      auth = getAuth();
    } else {
      console.warn("FIREBASE_PRIVATE_KEY is missing. Mocking firebase-admin.");
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
} else {
  db = getFirestore();
  auth = getAuth();
}

export { db, auth };
