import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// بيانات الاتصال الحقيقية الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyCD6I42kverL_99h0aiEsSglS5DzIhH3Y0",
  authDomain: "smart-admission-dashboard.firebaseapp.com",
  projectId: "smart-admission-dashboard",
  storageBucket: "smart-admission-dashboard.firebasestorage.app",
  messagingSenderId: "1068762320933",
  appId: "1:1068762320933:web:a7a8d295c41028ae136fcc",
  measurementId: "G-H0T2J55NPN"
};

// تهيئة تطبيق فايربيس
const app = initializeApp(firebaseConfig);

// تصدير الأدوات لاستخدامها في ملف الـ Dashboard
export { app };
export const db = getFirestore(app);
export const auth = getAuth(app);