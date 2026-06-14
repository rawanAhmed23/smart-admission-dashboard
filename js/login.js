import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const errorAlert = document.getElementById("error-alert");
const errorMessage = document.getElementById("error-message");
const btnSubmit = document.getElementById("btn-submit");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    // تغيير حالة الزرار أثناء التحميل لتجربة مستخدم أفضل
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> جاري التحقق...`;
    errorAlert.classList.add("hidden");

    try {
        // 1. محاولة تسجيل الدخول من خلال Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. جلب وثيقة المستخدم من كولكشن users للتأكد من الصلاحية (Role)
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
            // نجاح باهر! المستخدم أدمن.. توجه للوحة التحكم الرئيسية
            window.location.href = "admin-dashboard.html"; 
        } else {
            // الحساب سليم لكنه مش أدمن (مثلاً طالب بيحاول يخترق الكنترول)
            await signOut(auth); // تسجيل خروج فوري
            showError("عذراً، هذا الحساب لا يملك صلاحيات دخول لوحة التحكم.");
        }

    } catch (error) {
        console.error("Login Error: ", error);
        // تخصيص رسائل الخطأ الشائعة من الفايربيس للمستخدم
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
            showError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        } else if (error.code === "auth/too-many-requests") {
            showError("تم حظر المحاولات مؤقتاً بسبب كثرة الأخطاء، حاول لاحقاً.");
        } else {
            showError("حدث خطأ في النظام، يرجى المحاولة مرة أخرى.");
        }
    } finally {
        // إرجاع الزرار لحالته الطبيعية
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>تسجيل الدخول</span> <i class="fa-solid fa-arrow-left-to-bracket text-sm"></i>`;
    }
});

// دالة مساعدة لإظهار التنبيه
function showError(msg) {
    errorMessage.innerText = msg;
    errorAlert.classList.remove("hidden");
}