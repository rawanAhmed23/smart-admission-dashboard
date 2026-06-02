import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// عناصر الواجهة
const studentNameEl = document.getElementById("student-name");
const studentSpecEl = document.getElementById("student-spec");
const startContainer = document.getElementById("start-container");
const quizContainer = document.getElementById("quiz-container");
const startExamBtn = document.getElementById("start-exam-btn");
const questionSectionTitle = document.getElementById("question-section-title");
const questionNumberEl = document.getElementById("question-number");
const questionTextEl = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const timerEl = document.getElementById("exam-timer");
const progressBar = document.getElementById("exam-progress");

let currentUser = null;
let currentStudentData = null;
let examQuestions = []; // سيتم ملؤها ديناميكياً من السيرفر
let currentQuestionIdx = 0;
let studentAnswers = {}; 
let timerInterval = null;
let timeLeft = 20 * 60; // 20 دقيقة بالثواني

// =========================================================
// ⚙️ دالات الخلط العشوائي وتكافؤ الصعوبة (Tiered Randomization)
// =========================================================

// دالة خلط عناصر المصفوفة عشوائياً
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// دالة تضمن اختيار: 2 سهل + 2 متوسط + 1 صعب لكل قسم
function generateBalancedSelection(questionsPool) {
    const easyPool = questionsPool.filter(q => q.difficulty === 'easy');
    const mediumPool = questionsPool.filter(q => q.difficulty === 'medium');
    const hardPool = questionsPool.filter(q => q.difficulty === 'hard');

    // خلط كل مستويات الصعوبة بشكل منفصل
    shuffleArray(easyPool);
    shuffleArray(mediumPool);
    shuffleArray(hardPool);

    // تجميع الـ 5 أسئلة المتكافئة
    const selection = [
        ...easyPool.slice(0, 2),
        ...mediumPool.slice(0, 2),
        ...hardPool.slice(0, 1)
    ];

    // حماية إضافية: إذا كان هناك نقص في بنك الفايربيس لمستوى معين، يتم إكمال الـ 5 أسئلة من المتاح عشوائياً
    if (selection.length < 5) {
        const remaining = questionsPool.filter(q => !selection.includes(q));
        shuffleArray(remaining);
        while (selection.length < 5 && remaining.length > 0) {
            selection.push(remaining.pop());
        }
    }

    // خلط ترتيب الـ 5 أسئلة النهائي حتى لا يأتي السؤال الصعب دائماً في النهاية
    return shuffleArray(selection);
}

// =========================================================
// 1. التحقق من حالة المستخدم وجلب الأسئلة العشوائية من Firestore
// =========================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    await checkStudentStatus();
});

async function checkStudentStatus() {
    try {
        const docRef = doc(db, "applicants", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentStudentData = docSnap.data();
            
            // التأكد إن الطالب حالته مؤهلة للاختبار ولم يقم بحله مسبقاً
            if (currentStudentData.status !== "exam_waiting" && currentStudentData.status !== "qualified") {
                if(currentStudentData.iq_score !== undefined) {
                    alert("لقد قمت بأداء هذا الاختبار مسبقاً! لا يُمكن إعادته.");
                    window.location.href = "apply.html";
                    return;
                }
            }

            // عرض البيانات الأساسية
            studentNameEl.innerText = `الطالب: ${currentStudentData.name}`;
            const specsTranslations = { 
                programming: "تتطوير برمجيات", 
                networking: "هندسة شبكات",
                electronics: "إلكترونيات صناعية",
                telecom: "اتصالات ونقل بيانات"
            };
            studentSpecEl.innerText = `التخصص المطلوب: ${specsTranslations[currentStudentData.specialization] || currentStudentData.specialization}`;

            // 🌟 سحب جميع الأسئلة الحية من كولكشن questions بـ Firestore
            const questionsRef = collection(db, "questions");
            const querySnapshot = await getDocs(questionsRef);
            
            let iqQuestionsPool = [];
            let techQuestionsPool = [];

            querySnapshot.forEach((doc) => {
                const qData = doc.data();
                const questionWithId = { id: doc.id, ...qData };

                // فرز الأسئلة بناءً على القسم والتخصص المطلوب للطالب الحالي
                if (qData.section === "iq") {
                    iqQuestionsPool.push(questionWithId);
                } else if (qData.section === "technical" && qData.specialization === currentStudentData.specialization) {
                    techQuestionsPool.push(questionWithId);
                }
            });

            // توليد الـ 5 أسئلة العشوائية المتوازنة لكل قسم
            const finalIqExam = generateBalancedSelection(iqQuestionsPool);
            const finalTechExam = generateBalancedSelection(techQuestionsPool);

            // دمج المصفوفات ليتكون الامتحان من 10 أسئلة ديناميكية كاملة
            examQuestions = [...finalIqExam, ...finalTechExam];

            if (examQuestions.length < 10) {
                console.warn("تنبيه: عدد الأسئلة المسترجعة من السيرفر أقل من 10 أسئلة.");
            }

        } else {
            alert("لم يتم العثور على ملف تقديم خاص بك.");
            window.location.href = "apply.html";
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات الطالب أو الأسئلة العشوائية:", error);
    }
}

// 2. مستمع زر بدء الاختبار وتشغيل التايمر
startExamBtn.addEventListener("click", () => {
    if (examQuestions.length === 0) {
        alert("جاري تحميل أسئلة الاختبار المتغيرة من السيرفر، برجاء الانتظار لحظة وإعادة الضغط.");
        return;
    }
    startContainer.classList.add("hidden");
    quizContainer.classList.remove("hidden");
    
    startTimer();
    renderQuestion();
});

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        timerEl.innerText = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("انتهى وقت الاختبار المحدد! سيتم إرسال إجاباتك تلقائياً.");
            submitExamResults();
        }
    }, 1000);
}

// 3. دالة رندرة الأسئلة والخيارات
function renderQuestion() {
    if (examQuestions.length === 0) return;
    const q = examQuestions[currentQuestionIdx];
    
    // تحديث الهيدر العلوي بناءً على نوع السؤال الحالي في المصفوفة المدمجة
    if (currentQuestionIdx < 5) {
        questionSectionTitle.innerText = "قسم الـ IQ والمنطق";
        questionSectionTitle.className = "bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full";
    } else {
        questionSectionTitle.innerText = "القسم المعرفي والفني";
        questionSectionTitle.className = "bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full";
    }

    // تحديث الرقم ونص السؤال
    questionNumberEl.innerText = `السؤال ${currentQuestionIdx + 1} من ${examQuestions.length}`;
    questionTextEl.innerText = q.text;

    // تحديث الـ Progress Bar العلوي
    const progressPercent = ((currentQuestionIdx + 1) / examQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // رندرة الاختيارات الـ 4
    optionsContainer.innerHTML = "";
    q.options.forEach((option, idx) => {
        const optionBtn = document.createElement("button");
        optionBtn.className = `w-full text-right p-4 border rounded-xl font-medium transition-all flex items-center justify-between border-gray-200 hover:bg-gray-50 text-gray-700`;
        
        // التحقق مما إذا كان الطالب قد اختار هذا الخيار مسبقاً لتثبيته ملوناً
        if (studentAnswers[q.id] === idx) {
            optionBtn.className = `w-full text-right p-4 border rounded-xl font-bold transition-all flex items-center justify-between border-indigo-600 bg-indigo-50/50 text-indigo-700`;
        }

        optionBtn.innerHTML = `<span>${option}</span> <div class="w-4 h-4 border rounded-full flex items-center justify-center ${studentAnswers[q.id] === idx ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}"></div>`;
        
        optionBtn.addEventListener("click", () => selectOption(q.id, idx));
        optionsContainer.appendChild(optionBtn);
    });

    // التحكم في ظهور الأزرار وسلوك زر التسليم النهائي
    prevBtn.style.visibility = currentQuestionIdx === 0 ? "hidden" : "visible";
    if (currentQuestionIdx === examQuestions.length - 1) {
        nextBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up ml-1"></i> إنهاء وتسليم الاختبار`;
        nextBtn.className = "bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl transition-all text-sm font-semibold shadow-sm";
    } else {
        nextBtn.innerHTML = `التالي <i class="fa-solid fa-arrow-left mr-1"></i>`;
        nextBtn.className = "bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl transition-all text-sm font-semibold shadow-sm";
    }
}

function selectOption(questionId, optionIdx) {
    studentAnswers[questionId] = optionIdx;
    renderQuestion(); 
}

// 4. أزرار التالي والسابق للتحرك داخل المصفوفة الديناميكية
prevBtn.addEventListener("click", () => {
    if (currentQuestionIdx > 0) {
        currentQuestionIdx--;
        renderQuestion();
    }
});

nextBtn.addEventListener("click", () => {
    if (currentQuestionIdx === examQuestions.length - 1) {
        if (confirm("هل أنت متأكد من رغبتك في تسليم الإجابات وإنهاء الاختبار؟")) {
            submitExamResults();
        }
    } else {
        currentQuestionIdx++;
        renderQuestion();
    }
});

// =========================================================
// 5. تصحيح الإجابات ديناميكياً وحفظ النتيجة في Firestore
// =========================================================
async function submitExamResults() {
    clearInterval(timerInterval);
    
    let iqScore = 0;
    let technicalScore = 0;

    // تصحيح الـ 10 أسئلة التي سُحبت عشوائياً للطالب ومطابقتها مع الإجابة الصحيحة المقترنة بها بالسيرفر
    examQuestions.forEach((q, idx) => {
        // نضمن تحويل القيمتين إلى Number منعاً لأي اختلاف في نوع البيانات
        if (Number(studentAnswers[q.id]) === Number(q.correct)) {
            if (idx < 5) {
                iqScore += 10;        // أول 5 أسئلة تذهب لسكور الذكاء
            } else {
                technicalScore += 10; // من السؤال السادس للعاشر تذهب لسكور الفني
            }
        }
    });

    const totalPercentage = iqScore + technicalScore; 
    
    try {
        const studentRef = doc(db, "applicants", currentUser.uid);
        
        // رفع الدرجات الحقيقية وتغيير حالة الطالب تلقائياً لتظهر فوراً في الكنترول
        await updateDoc(studentRef, {
            iq_score: iqScore,
            technical_score: technicalScore,
            total_score: totalPercentage,
            status: "exam_completed" 
        });

        alert(`تم إنهاء الاختبار ورصد إجاباتك بنجاح! النتيجة في انتظار اعتماد الكنترول.`);
        window.location.href = "apply.html"; 

    } catch (error) {
        console.error("Error saving dynamic exam scores: ", error);
        alert("حدث خطأ أثناء حفظ درجتك، يرجى التواصل مع إدارة الدعم الفني للمدرسة.");
    }
}