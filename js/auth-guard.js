import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// تشغيل الفحص فوراً
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().role === 'admin') {
                console.log("مرحباً بك في لوحة التحكم");
                
                // ➕ إضافة وظيفية زر الخروج هنا
                const signoutBtn = document.getElementById("signout-btn");
                if (signoutBtn) {
                    signoutBtn.addEventListener("click", async () => {
                        try {
                            await signOut(auth);
                            window.location.href = "login.html";
                        } catch (err) {
                            console.error("خطأ أثناء تسجيل الخروج:", err);
                        }
                    });
                }
            } else {
                window.location.href = "apply.html";
            }
        } catch (error) {
            console.error("خطأ في صلاحيات الدخول:", error);
            window.location.href = "login.html";
        }
    }
});