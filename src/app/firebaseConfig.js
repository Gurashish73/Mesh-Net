import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQmkIQR0QeN8T15pxL3gvIC1XY6ZFkvWo",
  authDomain: "mesh-net-c3a07.firebaseapp.com",
  projectId: "mesh-net-c3a07",
  storageBucket: "mesh-net-c3a07.firebasestorage.app",
  messagingSenderId: "857889131165",
  appId: "1:857889131165:web:192b123fc3c121ea82a274",
  measurementId: "G-NYDPS3FYTL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);