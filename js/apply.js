import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const form = document.getElementById("application-form");
const submitBtn = document.getElementById("submit-btn");

// عناصر رسائل الخطأ والمدخلات
const nameInput = document.getElementById("student-name");
const govInput = document.getElementById("student-gov");
const specInput = document.getElementById("student-spec");

const nameError = document.getElementById("name-error");
const govError = document.getElementById("gov-error");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // إعادة تهيئة رسائل الخطأ قبل الفحص الجديد
    nameError.classList.add("hidden");
    govError.classList.add("hidden");
    nameInput.classList.remove("border-red-500");
    govInput.classList.remove("border-red-500");

    const name = nameInput.value.trim();
    const governorate = govInput.value.trim();
    const specialization = specInput.value;
    
    let isValid = true;

    // 1. Validation الاسم (حروف عربية فقط + رباعي على الأقل)
    const arabicPattern = /^[\u0600-\u06FF\s]+$/; 
    const wordCount = name.split(/\s+/).filter(word => word.length > 0).length;

    if (!arabicPattern.test(name) || wordCount < 4) {
        nameError.classList.remove("hidden");
        nameInput.classList.add("border-red-500");
        isValid = false;
    }

    // 2. Validation المحافظة (حروف عربية فقط وبدون أرقام)
    if (!arabicPattern.test(governorate) || governorate.length < 3) {
        govError.classList.remove("hidden");
        govInput.classList.add("border-red-500");
        isValid = false;
    }

    // لو فيه أي خطأ، نوقف عملية الإرسال فوراً
    if (!isValid) return;

    // تجهيز تاريخ اليوم الحالي
    const today = new Date().toISOString().split('T')[0];

    // تغيير شكل الزرار أثناء الرفع
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> جاري إرسال الطلب...`;

    try {
        await addDoc(collection(db, "applicants"), {
            name: name,
            governorate: governorate,
            specialization: specialization,
            date: today,
            status: 'pending'
        });

        alert("تم إرسال طلبك بنجاح وبانتظار المراجعة! بالتوفيق.");
        form.reset();

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> إرسال طلب التقديم`;
    }
});