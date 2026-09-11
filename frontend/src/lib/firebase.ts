import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, getRedirectResult } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration keys read from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let auth: Auth;

// Determine if config is incomplete
const isConfigComplete = 
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId;

if (!isConfigComplete) {
  if (typeof window !== "undefined") {
    console.warn(
      "Firebase Client configuration is missing or incomplete. " +
      "Check your .env or .env.local file."
    );
  }
  // Initialize standard dummy values so build doesn't fail
  app = getApps().length === 0 
    ? initializeApp({
        apiKey: "mock-api-key",
        authDomain: "mock-project.firebaseapp.com",
        projectId: "mock-project",
        storageBucket: "mock-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123:web:abc"
      }) 
    : getApp();
  auth = getAuth(app);
} else {
  // Initialize Firebase app if not already initialized
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
}

const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account' // This forces the "Choose an account" screen
});

const signInWithGoogle = () => signInWithPopup(auth, provider);

export { app, auth, db, isConfigComplete, signInWithGoogle, getRedirectResult };

