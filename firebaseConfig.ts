import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDXEMahXygRdPUN1KZxXT0hnMf4hIbeUlY",
  authDomain: "okaratelecom-3ccc7.firebaseapp.com",
  projectId: "okaratelecom-3ccc7",
  storageBucket: "okaratelecom-3ccc7.firebasestorage.app",
  messagingSenderId: "628362760310",
  appId: "1:628362760310:web:f731edd7aa577c3d304f57",
  measurementId: "G-6Y4GM2QYV0"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 