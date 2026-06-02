import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// الإمساك بعناصر الواجهة المشتركة
const loginForm = document.getElementById("student-login-form");
const signupForm = document.getElementById("student-signup-form");
const authAlert = document.getElementById("auth-alert");
const alertIcon = document.getElementById("alert-icon");
const alertMessage = document.getElementById("alert-message");

/**
 * دالة مساعدة لإظهار التنبيهات (خطأ / نجاح) متناسقة مع تصميم الصفحة
 */
function displayAlert(message, type = "error") {
    authAlert.classList.remove("hidden", "bg-red-50", "border-red-500", "text-red-700", "bg-green-50", "border-green-500", "text-green-700");
    
    if (type === "error") {
        authAlert.classList.add("bg-red-50", "border-red-500", "text-red-700");
        alertIcon.className = "fa-solid fa-circle-exclamation text-base";
    } else {
        authAlert.classList.add("bg-green-50", "border-green-500", "text-green-700");
        alertIcon.className = "fa-solid fa-circle-check text-base";
    }
    
    alertMessage.innerText = message;
}

// -------------------------------------------------------------
// 1️⃣ منطق تسجيل دخول الطلاب (Student Login)
// -------------------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        // تسجيل الدخول في Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // خطوة أمنية دفاعية: التأكد إن اللي بيدخل هنا مش أدمن عشان ميبوظش الـ Flow
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists() && userDoc.data().role === "admin") {
            displayAlert("عذراً، هذا الحساب خاص بالإدارة. يرجى الدخول من بوابة الكنترول الحصريّة.", "error");
            return;
        }

        displayAlert("تم تسجيل الدخول بنجاح! جاري تحويلك لقاعة الطلاب...", "success");
        
        setTimeout(() => {
            window.location.href = "apply.html";
        }, 1200);

    } catch (error) {
        console.error("Login Error:", error);
        let errorMsg = "حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى.";
        
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            errorMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (error.code === "auth/invalid-email") {
            errorMsg = "صيغة البريد الإلكتروني غير صالحة.";
        }
        
        displayAlert(errorMsg, "error");
    }
});

// -------------------------------------------------------------
// 2️⃣ منطق إنشاء حساب طالب جديد (Student Sign Up)
// -------------------------------------------------------------
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const phone = document.getElementById("signup-phone").value.trim();
    const specialization = document.getElementById("signup-spec").value;
    const password = document.getElementById("signup-password").value;

    // فحص طول كلمة المرور قبل الإرسال لفايربيس
    if (password.length < 6) {
        displayAlert("يجب ألا تقل كلمة المرور عن 6 أحرف.", "error");
        return;
    }

    try {
        // أ. إنشاء الحساب الأساسي في Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // ب. تسجيل الصلاحية في كولكشن الدخول الموحد users بـ role: student
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            role: "student"
        });

        // جـ. إنشاء وثيقة المتقدم الرسمية في كولكشن applicants وجعل حالته "بانتظار الاختبار" فوراً
        await setDoc(doc(db, "applicants", user.uid), {
            id: user.uid,
            name: fullName,
            email: email,
            phone: phone,
            specialization: specialization,
            status: "exam_waiting", // هذه الحالة هي اللي بتنور زرار الامتحان في apply.html
            createdAt: new Date().toISOString()
        });

        displayAlert("تم تسجيل حسابك بنجاح! جاري تحضير ملف التقديم...", "success");
        
        setTimeout(() => {
            window.location.href = "apply.html";
        }, 1500);

    } catch (error) {
        console.error("Signup Error:", error);
        let errorMsg = "حدث خطأ أثناء إنشاء الحساب.";
        
        if (error.code === "auth/email-already-in-use") {
            errorMsg = "هذا البريد الإلكتروني مسجل بالفعل في المنصة.";
        } else if (error.code === "auth/invalid-email") {
            errorMsg = "صيغة البريد الإلكتروني المكتوبة غير صحيحة.";
        } else if (error.code === "auth/weak-password") {
            errorMsg = "كلمة المرور ضعيفة، يرجى اختيار كلمة مرور أقوى.";
        }
        
        displayAlert(errorMsg, "error");
    }
});