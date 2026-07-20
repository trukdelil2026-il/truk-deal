import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqWAGFU9q0x2LOAct5YEKrKOqr5lSyzLM",
  authDomain: "gen-lang-client-0057551455.firebaseapp.com",
  projectId: "gen-lang-client-0057551455",
  storageBucket: "gen-lang-client-0057551455.firebasestorage.app",
  messagingSenderId: "150693583142",
  appId: "1:150693583142:web:dcac02e2d1f1abf63649e7"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific custom database ID
export const db = initializeFirestore(app, {}, "ai-studio-e572ee47-398c-40be-a28d-71811ddbae6d");
export default app;
