import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// 1️⃣ الإمساك بعناصر واجهة لوحة التحكم الجديدة
const loadingCard = document.getElementById("loading-card");
const mainDashboardCard = document.getElementById("main-dashboard-card");
const studentNameEl = document.getElementById("welcome-student-name");
const specEl = document.getElementById("display-spec");
const phoneEl = document.getElementById("display-phone");
const statusEl = document.getElementById("display-status");

const examReadyBox = document.getElementById("exam-ready-box");
const examPassedBox = document.getElementById("exam-passed-box");
const examFailedBox = document.getElementById("exam-failed-box");
const logoutBtn = document.getElementById("btn-logout");

// 2️⃣ مراقبة حالة الطالب وجلب بياناته من الـ Firestore تلقائياً
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // لو مش مسجل دخول.. يرجعه لصفحة الدخول فوراً
        window.location.href = "student-auth.html";
        return;
    }

    try {
        // جلب وثيقة الطالب من كولكشن المتقدمين باستخدام الـ UID بتاعه
        const applicantRef = doc(db, "applicants", user.uid);
        const applicantSnap = await getDoc(applicantRef);

        if (applicantSnap.exists()) {
            const studentData = applicantSnap.data();

            // طباعة بيانات الطالب في لوحة التحكم
            studentNameEl.innerText = studentData.name;
            phoneEl.innerText = studentData.phone || "غير مسجل";

            // ترجمة التخصص لشكل جمالي باللغة العربية
            const specsTranslations = {
                programming: "تطوير برمجيات (Software)",
                networking: "هندسة شبكات (Networking)",
                electronics: "إلكترونيات صناعية",
                telecom: "اتصالات ونقل بيانات"
            };
            specEl.innerText = specsTranslations[studentData.specialization] || studentData.specialization;

            // إخفاء كل كروت الحالات أولاً قبل الفحص
            examReadyBox.classList.add("hidden");
            examPassedBox.classList.add("hidden");
            examFailedBox.classList.add("hidden");

            // 3️⃣ التحكم الديناميكي في الأزرار والكروت حسب حالة الطالب (Status)
            if (studentData.status === "exam_waiting") {
                statusEl.innerText = "بانتظار أداء الاختبار";
                statusEl.className = "font-bold px-3 py-1 rounded-lg text-xs bg-amber-100 text-amber-700 border border-amber-200";
                
                // إظهار صندوق وزرار دخول الامتحان فوراً
                examReadyBox.classList.remove("hidden"); 
            } 
            else if (studentData.status === "accepted_initial") {
                statusEl.innerText = "مقبول مبدئياً 🎉";
                statusEl.className = "font-bold px-3 py-1 rounded-lg text-xs bg-emerald-100 text-emerald-700 border border-emerald-200";
                
                examPassedBox.classList.remove("hidden");
            } 
            else if (studentData.status === "rejected") {
                statusEl.innerText = "لم يوفق";
                statusEl.className = "font-bold px-3 py-1 rounded-lg text-xs bg-rose-100 text-rose-700 border border-rose-200";
                
                examFailedBox.classList.remove("hidden");
            } 
            else {
                statusEl.innerText = "قيد المراجعة";
                statusEl.className = "font-bold px-3 py-1 rounded-lg text-xs bg-gray-100 text-gray-700 border border-gray-200";
            }

            // إخفاء شاشة التحميل وإظهار لوحة التحكم كاملة للطالب
            loadingCard.classList.add("hidden");
            mainDashboardCard.classList.remove("hidden");

        } else {
            console.error("لم يتم العثور على وثيقة الطالب في كولكشن applicants");
            loadingCard.innerHTML = `<p class="text-red-500 font-bold">خطأ: لم يتم العثور على ملف تقديم مرتبط بهذا الحساب.</p>`;
        }
    } catch (error) {
        console.error("Error loading student dashboard:", error);
        loadingCard.innerHTML = `<p class="text-red-500 font-bold">حدث خطأ أثناء تحميل البيانات. يرجى إعادة المحاولة.</p>`;
    }
});

// 4️⃣ منطق زر تسجيل الخروج (Logout) للطلاب
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        if (confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) {
            try {
                await signOut(auth);
                window.location.href = "student-auth.html";
            } catch (err) {
                console.error("خطأ أثناء تسجيل الخروج:", err);
            }
        }
    });
}