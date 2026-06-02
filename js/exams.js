import { db } from "./firebase-config.js";
import { 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const tableBody = document.getElementById("exams-table-body");
const countBadge = document.getElementById("waiting-exams-count");
const emptyState = document.getElementById("exams-empty-state");

let examStudents = [];

// =========================================================
// 1. مراقبة العداد (Badge) لايف وجلب البيانات عند تحميل الصفحة
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    // ⚡ تعديل: العداد بيعد الطلاب اللي خلصوا امتحان ومستنيين الكنترول يعتمد النتيجة (exam_completed)
    onSnapshot(collection(db, "applicants"), (snapshot) => {
        let waitingCount = 0;
        snapshot.forEach((doc) => {
            if (doc.data().status === 'exam_completed') {
                waitingCount++;
            }
        });
        countBadge.innerText = waitingCount;
    });

    // جلب الطلاب ورندرة الجدول لأول مرة
    loadWaitingStudents();
});

// دالة جلب الطلاب المنتظرين للاختبار
async function loadWaitingStudents() {
    try {
        const querySnapshot = await getDocs(collection(db, "applicants"));
        examStudents = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // ⚡ تعديل: نجلب فقط من أنهى الـ Assessment بنجاح وفي انتظار الكنترول
            if (data.status === 'exam_completed') {
                examStudents.push({ id: doc.id, ...data });
            }
        });

        renderExamsTable();
    } catch (error) {
        console.error("Error loading students: ", error);
    }
}

function translateSpec(spec) {
    const specs = { 
        'programming': 'تطوير برمجيات', 
        'networking': 'هندسة شبكات', 
        'electronics': 'إلكترونيات صناعية', 
        'telecom': 'اتصالات ونقل بيانات' 
    };
    return specs[spec] || spec;
}

// =========================================================
// 2. رندرة جدول الكنترول وعرض درجات الـ Assessment تلقائياً
// =========================================================
function renderExamsTable() {
    tableBody.innerHTML = "";

    if (examStudents.length === 0) {
        emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");

        examStudents.forEach(student => {
            // جلب الدرجات القادمة من الـ Assessment (لو مش موجودة بنحط فاضي أو صفر)
            const currentIQ = student.iq_score !== undefined ? student.iq_score : "";
            const currentTech = student.technical_score !== undefined ? student.technical_score : "";

            const tr = document.createElement("tr");
            tr.className = "border-b border-gray-200 hover:bg-gray-50 transition-all text-right";
            tr.innerHTML = `
                <td class="py-4 px-6 font-semibold text-gray-800">${student.name}</td>
                <td class="py-4 px-6 font-medium text-purple-700">${translateSpec(student.specialization)}</td>
                <td class="py-4 px-6 text-center">
                    <input type="number" min="0" max="50" id="iq-${student.id}" value="${currentIQ}" placeholder="0" class="w-20 text-center px-2 py-1 border rounded-lg focus:outline-none focus:border-blue-500 font-bold text-gray-700">
                </td>
                <td class="py-4 px-6 text-center">
                    <input type="number" min="0" max="50" id="tech-${student.id}" value="${currentTech}" placeholder="0" class="w-20 text-center px-2 py-1 border rounded-lg focus:outline-none focus:border-blue-500 font-bold text-gray-700">
                </td>
                <td class="py-4 px-6 text-center font-bold text-gray-800 text-base">
                    <span id="total-${student.id}">0</span>%
                </td>
                <td class="py-4 px-6 text-center">
                    <button data-id="${student.id}" class="save-score-btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm">
                        <i class="fa-solid fa-floppy-disk ml-1"></i> اعتماد وحفظ النتيجة
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);

            const iqInput = document.getElementById(`iq-${student.id}`);
            const techInput = document.getElementById(`tech-${student.id}`);
            const totalSpan = document.getElementById(`total-${student.id}`);

            // دالة الحساب والتلوين الديناميكي للمجموع
            const calculateTotal = () => {
                const iqVal = parseFloat(iqInput.value) || 0;
                const techVal = parseFloat(techInput.value) || 0;
                const total = iqVal + techVal;
                totalSpan.innerText = total;

                if (total >= 60) {
                    totalSpan.className = "text-green-600 font-bold text-base";
                } else {
                    totalSpan.className = "text-red-600 font-bold text-base";
                }
            };

            // ⚡ تشغيل الحساب فوراً عند رندرة الصفحة ليظهر المجموع المحسوب للطالب تلقائياً
            calculateTotal();

            // الاستماع لأي تعديل يدوي قد يقوم به الأدمن (بونص أو تعديل خطأ)
            iqInput.addEventListener("input", calculateTotal);
            techInput.addEventListener("input", calculateTotal);
        });

        // ربط أزرار الحفظ بالدالة
        document.querySelectorAll(".save-score-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const studentId = e.currentTarget.getAttribute("data-id");
                saveStudentScore(studentId);
            });
        });
    }
}

// =========================================================
// 3. حفظ النتيجة الفردية وتحديث حالة الطالب النهائية
// =========================================================
async function saveStudentScore(id) {
    const iqScore = parseFloat(document.getElementById(`iq-${id}`).value) || 0;
    const techScore = parseFloat(document.getElementById(`tech-${id}`).value) || 0;
    const finalPercentage = iqScore + techScore;

    // شرط النجاح (المجموع 60% فأكثر)
    const finalStatus = (finalPercentage >= 60) ? 'accepted_initial' : 'rejected';

    try {
        const studentRef = doc(db, "applicants", id);
        
        // تحديث وثيقة الطالب وتغيير حالته من منتهى لـ مقبول أو مرفوض نهائياً
        await updateDoc(studentRef, {
            iq_score: iqScore,
            technical_score: techScore,
            total_score: finalPercentage,
            status: finalStatus
        });

        // تحديث المتوسطات العامة فوراً في الـ Database للـ Bar Chart
        await updateOverallAverages();

        alert("تم اعتماد درجات الطالب، وترحيلها للإحصائيات بنجاح!");
        
        // إعادة تحميل الجدول لإخفاء الطالب المعتمَد نتيجته بنجاح
        loadWaitingStudents();

    } catch (error) {
        console.error("Error saving score: ", error);
        alert("حدثت مشكلة في الكنترول أثناء حفظ النتيجة.");
    }
}

// =========================================================
// 4. الدالة المحركة للـ Bar Chart (حساب المتوسطات العامة تلقائياً)
// =========================================================
async function updateOverallAverages() {
    try {
        const querySnapshot = await getDocs(collection(db, "applicants"));
        
        const stats = {
            programming: { totalSkills: 0, totalIQ: 0, count: 0 },
            networking: { totalSkills: 0, totalIQ: 0, count: 0 },
            electronics: { totalSkills: 0, totalIQ: 0, count: 0 },
            telecom: { totalSkills: 0, totalIQ: 0, count: 0 }
        };

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.iq_score !== undefined && data.technical_score !== undefined) {
                const spec = data.specialization;
                if (stats[spec]) {
                    stats[spec].totalSkills += data.technical_score;
                    stats[spec].totalIQ += data.iq_score;
                    stats[spec].count++;
                }
            }
        });

        const scoresRef = doc(db, "charts_data", "scores");
        await updateDoc(scoresRef, {
            prog_skills: stats.programming.count > 0 ? Math.round(stats.programming.totalSkills / stats.programming.count) : 0,
            prog_iq: stats.programming.count > 0 ? Math.round(stats.programming.totalIQ / stats.programming.count) : 0,
            
            net_skills: stats.networking.count > 0 ? Math.round(stats.networking.totalSkills / stats.networking.count) : 0,
            net_iq: stats.networking.count > 0 ? Math.round(stats.networking.totalIQ / stats.networking.count) : 0,
            
            elec_skills: stats.electronics.count > 0 ? Math.round(stats.electronics.totalSkills / stats.electronics.count) : 0,
            elec_iq: stats.electronics.count > 0 ? Math.round(stats.electronics.totalIQ / stats.electronics.count) : 0,
            
            tel_skills: stats.telecom.count > 0 ? Math.round(stats.telecom.totalSkills / stats.telecom.count) : 0,
            tel_iq: stats.telecom.count > 0 ? Math.round(stats.telecom.totalIQ / stats.telecom.count) : 0
        });

        console.log("تمت إعادة احتساب المتوسطات بنجاح وتغذية الـ Bar Chart!");
    } catch (error) {
        console.error("خطأ أثناء تحديث إحصائيات الـ Bar Chart:", error);
    }
}