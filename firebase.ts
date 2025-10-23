import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// IMPORTANT: Replace the placeholder values below with your own Firebase project configuration.
// You can get this from the Firebase console: https://console.firebase.google.com/
const firebaseConfig = {
apiKey: "AIzaSyBNz5VI9ruPvxMVn3R34Bjl-Do3n68L6rg",
  authDomain: "nexusai-e068c.firebaseapp.com",
  projectId: "nexusai-e068c",
  storageBucket: "nexusai-e068c.firebasestorage.app",
  messagingSenderId: "98574320833",
  appId: "1:98574320833:web:25be08ee9ed9ff03820040",
  measurementId: "G-3FC0MYV0SW"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

// A basic check to see if placeholders have been replaced.
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.authDomain) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // App will continue to run, but auth features will be disabled.
    }
} else {
    console.warn("Firebase config is not set. Update firebase.ts with your project credentials. Authentication will be disabled.");
}

// Export auth and db, which will be undefined if initialization fails
export { auth, db, storage };
