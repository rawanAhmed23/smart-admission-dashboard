import { db } from "./firebase-config.js";
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const tableBody = document.getElementById("applicants-table-body");
const totalCountBadge = document.getElementById("total-applicants-count");
const searchInput = document.getElementById("search-name");
const specFilter = document.getElementById("filter-specialization");
const statusFilter = document.getElementById("filter-status");
const emptyState = document.getElementById("empty-state");

// عناصر الـ Modal
const modal = document.getElementById("details-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const modalName = document.getElementById("modal-student-name");
const modalGov = document.getElementById("modal-student-gov");
const modalSpec = document.getElementById("modal-student-spec");
const modalDate = document.getElementById("modal-student-date");
const modalStatus = document.getElementById("modal-student-status");
const acceptBtn = document.getElementById("action-accept-btn");
const rejectBtn = document.getElementById("action-reject-btn");

// ➕ متغيرات وعناصر الـ Pagination المضافة حديثاً دون المساس بالأساسيات
let currentPage = 1;
const rowsPerPage = 5; // يمكنكِ تعديل العدد (مثلاً 5 أو 10 صفوف لكل صفحة)

const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageNumbersContainer = document.getElementById("page-numbers");
const currentRangeLabel = document.getElementById("current-range");
const filteredTotalLabel = document.getElementById("filtered-total");

let allApplicants = []; 
let selectedStudentId = null; // لحفظ آي دي الطالب المفتوح حالياً

// الاستماع لايف لقاعدة البيانات
onSnapshot(collection(db, "applicants"), (snapshot) => {
    allApplicants = [];
    snapshot.forEach((doc) => {
        allApplicants.push({ id: doc.id, ...doc.data() });
    });
    totalCountBadge.innerText = allApplicants.length;
    filterAndRenderTable();
});

function translateSpec(spec) {
    const specs = { 'programming': 'تطوير برمجيات', 'networking': 'هندسة شبكات', 'electronics': 'إلكترونيات صناعية', 'telecom': 'اتصالات ونقل بيانات' };
    return specs[spec] || spec;
}

function getStatusBadge(status) {
    switch(status) {
        case 'pending': return `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><i class="fa-solid fa-clock"></i> قيد المراجعة</span>`;
        case 'exam_waiting': return `<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><i class="fa-solid fa-pen"></i> بانتظار الاختبار</span>`;
        case 'accepted_initial': return `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><i class="fa-solid fa-circle-check"></i> مقبول مبدئياً</span>`;
        case 'rejected': return `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><i class="fa-solid fa-circle-xmark"></i> مرفوض</span>`;
        default: return `<span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold w-max">${status}</span>`;
    }
}

function filterAndRenderTable() {
    const searchValue = searchInput.value.toLowerCase().trim();
    const selectedSpec = specFilter.value;
    const selectedStatus = statusFilter.value;

    const filtered = allApplicants.filter(student => {
        const matchesName = student.name ? student.name.toLowerCase().includes(searchValue) : false;
        const matchesSpec = selectedSpec === 'all' || student.specialization === selectedSpec;
        const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
        return matchesName && matchesSpec && matchesStatus;
    });

    // ➕ حماية الـ Pagination: إرجاع الصفحة للبدء إذا تقلصت الداتا المفلترة عن النطاق المتاح
    const maxPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > maxPages) {
        currentPage = 1;
    }

    tableBody.innerHTML = "";

    if (filtered.length === 0) {
        emptyState.classList.remove("hidden");
        updatePaginationControls(filtered, 0); // تحديث الأشرطة بصفر نتائج
    } else {
        emptyState.classList.add("hidden");

        // ➕ حساب نقطة البداية والنهاية للصفحة الحالية من أجل الاقتصاص الموضعي (Slice)
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedItems = filtered.slice(startIndex, endIndex);

        // تعديل الدورة لتعمل على البيانات المقتطعة فقط بدلاً من الداتا كاملة
        paginatedItems.forEach(student => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-gray-200 hover:bg-gray-50 transition-all text-right";
            tr.innerHTML = `
                <td class="py-4 px-6 font-semibold text-gray-800">${student.name || '---'}</td>
                <td class="py-4 px-6 text-gray-500">${student.governorate || '---'}</td>
                <td class="py-4 px-6 font-medium text-indigo-600">${translateSpec(student.specialization)}</td>
                <td class="py-4 px-6 text-gray-400">${student.date || '---'}</td>
                <td class="py-4 px-6">${getStatusBadge(student.status)}</td>
                <td class="py-4 px-6 text-center">
                    <button data-id="${student.id}" class="view-details-btn bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-600 px-3 py-1.5 rounded-lg transition-all font-medium text-xs shadow-sm">
                        <i class="fa-regular fa-eye ml-1"></i> عرض التفاصيل
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // ربط أزرار عرض التفاصيل بعد رندرتها
        document.querySelectorAll(".view-details-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const studentId = e.currentTarget.getAttribute("data-id");
                openModal(studentId);
            });
        });

        // ➕ تحديث شريط الصفحات بناءً على البيانات الفلترية الحالية
        updatePaginationControls(filtered, startIndex);
    }
}

// ➕ دالة تحكم وتحديث شريط أزرار الـ Pagination
function updatePaginationControls(filteredList, startIndex) {
    const totalItems = filteredList.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

    // تحديث أرقام نطاق العرض الفعلي والإجمالي بأسفل الجدول
    filteredTotalLabel.innerText = totalItems;
    const endRange = Math.min(startIndex + rowsPerPage, totalItems);
    currentRangeLabel.innerText = totalItems === 0 ? "0 - 0" : `${startIndex + 1} - ${endRange}`;

    // تفعيل وإلغاء تفعيل أزرار التالي والسابق لمنع تعدي الصفحات المتاحة
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    // توليد أرقام الصفحات (1، 2، 3...) حركياً وتحديد النشط منها بستايل مميز
    pageNumbersContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = `px-3 py-1 rounded-md text-sm font-semibold border transition-all ${
            i === currentPage 
            ? 'bg-[#5c5fc8] text-white border-[#5c5fc8]' 
            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
        }`;
        
        btn.addEventListener("click", () => {
            currentPage = i;
            filterAndRenderTable();
        });
        pageNumbersContainer.appendChild(btn);
    }
}

// دالة فتح الـ Modal وملء البيانات
function openModal(id) {
    const student = allApplicants.find(s => s.id === id);
    if (!student) return;

    selectedStudentId = id;
    modalName.innerText = student.name || '---';
    modalGov.innerText = student.governorate || '---';
    modalSpec.innerText = translateSpec(student.specialization);
    modalDate.innerText = student.date || '---';
    modalStatus.innerHTML = getStatusBadge(student.status);

    // إخفاء أو إظهار أزرار التحكم بناءً على الحالة
    if (student.status !== 'pending') {
        acceptBtn.classList.add("hidden");
        rejectBtn.classList.add("hidden");
    } else {
        acceptBtn.classList.remove("hidden");
        rejectBtn.classList.remove("hidden");
    }

    modal.classList.remove("hidden");
}

// دالة إغلاق الـ Modal
function closeModal() {
    modal.classList.add("hidden");
    selectedStudentId = null;
}

// دالة تحديث الحالة في الفايربيس
async function updateStudentStatus(newStatus) {
    if (!selectedStudentId) return;
    try {
        const studentRef = doc(db, "applicants", selectedStudentId);
        await updateDoc(studentRef, { status: newStatus });
        closeModal();
    } catch (error) {
        console.error("Error updating status: ", error);
        alert("حدث خطأ أثناء تحديث حالة الطالب.");
    }
}

// ➕ ربط أحداث أزرار التنقل (السابق والتالي) بالـ Pagination
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        filterAndRenderTable();
    }
});

nextPageBtn.addEventListener("click", () => {
    const maxPages = Math.ceil(allApplicants.filter(student => {
        const searchValue = searchInput.value.toLowerCase().trim();
        const selectedSpec = specFilter.value;
        const selectedStatus = statusFilter.value;
        const matchesName = student.name ? student.name.toLowerCase().includes(searchValue) : false;
        const matchesSpec = selectedSpec === 'all' || student.specialization === selectedSpec;
        const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
        return matchesName && matchesSpec && matchesStatus;
    }).length / rowsPerPage);

    if (currentPage < maxPages) {
        currentPage++;
        filterAndRenderTable();
    }
});

// ربط أحداث الـ Modal
closeModalBtn.addEventListener("click", closeModal);
acceptBtn.addEventListener("click", () => updateStudentStatus('exam_waiting'));
rejectBtn.addEventListener("click", () => updateStudentStatus('rejected'));

searchInput.addEventListener("input", filterAndRenderTable);
specFilter.addEventListener("change", filterAndRenderTable);
statusFilter.addEventListener("change", filterAndRenderTable);