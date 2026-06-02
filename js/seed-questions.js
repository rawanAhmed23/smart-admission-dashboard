import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// بنك الأسئلة الشامل المتكامل مقسم حسب الصعوبة والتخصص
const fullQuestionsBank = [
    // ==================== أسئلة الـ IQ ====================
    { section: "iq", difficulty: "easy", text: "إذا كان خالد أطول من علي، وعلي أطول من فادي، فمن يكون الأقصر؟", options: ["خالد", "علي", "فادي", "لا يمكن المعرفة"], correct: 2 },
    { section: "iq", difficulty: "easy", text: "إذا كان اليوم هو الأحد، فماذا يكون اليوم الذي بعد غد؟", options: ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس"], correct: 1 },
    { section: "iq", difficulty: "medium", text: "أكمل المتسلسلة التالية رقمياً: 2، 4، 8، 16، ...؟", options: ["20", "24", "32", "64"], correct: 2 },
    { section: "iq", difficulty: "medium", text: "كلمة 'مبتكر' عكسها كلمة:", options: ["مبدع", "مقلد", "ذكي", "نشيط"], correct: 1 },
    { section: "iq", difficulty: "hard", text: "ما هو الشكل الذي يكمل المجموعة؟ (دائرة : خطين ، مثلث : 3 خطوط ، مربع : ...)", options: ["خط واحد", "4 خطوط", "5 خطوط", "دائرة"], correct: 1 },

    // ==================== تخصص البرمجيات (programming) ====================
    { section: "technical", specialization: "programming", difficulty: "easy", text: "ما وظيفة وسوم <html> داخل ملف الويب؟", options: ["تلوين الصفحة", "تحديد هيكل المستند الأساسي", "الاتصال بقاعدة البيانات", "تأمين بروتوكول الشبكة"], correct: 1 },
    { section: "technical", specialization: "programming", difficulty: "easy", text: "في البرمجة، ماذا تعني حلقة التكرار 'Loop'؟", options: ["إنهاء البرنامج فجأة", "تكرار كود معين بناءً على شرط", "حذف دالة برمجية", "تعديل اسم الكلاس"], correct: 1 },
    { section: "technical", specialization: "programming", difficulty: "medium", text: "أي مما يلي يُستخدم لتعريف متغير لا يمكن تغيير قيمته في JavaScript؟", options: ["var", "let", "const", "set"], correct: 2 },
    { section: "technical", specialization: "programming", difficulty: "medium", text: "ما الاختصار الصحيح لـ API؟", options: ["Application Programming Interface", "Advanced Protocol Internet", "Automated Program Integration", "Apple Process Identifier"], correct: 0 },
    { section: "technical", specialization: "programming", difficulty: "hard", text: "ما هي بنية البيانات التي تعمل بمبدأ (Last In, First Out - LIFO)؟", options: ["Queue", "Stack", "Array", "Tree"], correct: 1 },

    // ==================== تخصص الشبكات (networking) ====================
    { section: "technical", specialization: "networking", difficulty: "easy", text: "ما هو الجهاز المستخدم لربط شبكتين مختلفتين تماماً ببعضهما؟", options: ["Switch", "Hub", "Router", "Access Point"], correct: 2 },
    { section: "technical", specialization: "networking", difficulty: "easy", text: "ما هي الوظيفة الأساسية لبروتوكول DHCP في الشبكات؟", options: ["تشفير الملفات", "توزيع الـ IP تلقائياً", "ترجمة الأسماء إلى أرقام", "منع الفيروسات"], correct: 1 },
    { section: "technical", specialization: "networking", difficulty: "medium", text: "أي من العناوين التالية يمثل IP Address من النوع IPv4 بشكل صحيح؟", options: ["192.168.1.1", "256.100.0.5", "10.0.0.1.1", "G1.A2.C3.D4"], correct: 0 },
    { section: "technical", specialization: "networking", difficulty: "medium", text: "في أي طبقة (Layer) من طبقات الـ OSI Model يعمل بروتوكول IP؟", options: ["Data Link Layer", "Network Layer", "Transport Layer", "Application Layer"], correct: 1 },
    { section: "technical", specialization: "networking", difficulty: "hard", text: "ما المنفذ (Port) الافتراضي الذي يستخدمه بروتوكول تصفح الويب الآمن HTTPS؟", options: ["80", "21", "443", "25"], correct: 2 },

    // ==================== تخصص الإلكترونيات (electronics) ====================
    { section: "technical", specialization: "electronics", difficulty: "easy", text: "ما هي وحدة قياس المقاومة الكهربائية؟", options: ["الفولت", "الأمبير", "الأوم", "الوات"], correct: 2 },
    { section: "technical", specialization: "electronics", difficulty: "easy", text: "جهاز يستخدم لقياس الجهد والتيار والمقاومة معاً يسمى:", options: ["أوسيلوسكوب", "الأفووميتر (Multimeter)", "الونش الكهروستاتيكي", "الميكروميتر"], correct: 1 },
    { section: "technical", specialization: "electronics", difficulty: "medium", text: "ما العنصر الإلكتروني الذي يسمح بمرور التيار الكهربائي في اتجاه واحد فقط؟", options: ["المقاومة", "المكثف", "الدايود (Diode)", "الملف"], correct: 2 },
    { section: "technical", specialization: "electronics", difficulty: "medium", text: "المكثف الكهربائي (Capacitor) يقوم بـ:", options: ["توليد الطاقة", "تخزين الشحنة الكهربائية", "زيادة المقاومة", "تحويل التيار المستمر لمتردد"], correct: 1 },
    { section: "technical", specialization: "electronics", difficulty: "hard", text: "أي من البوابات المنطقية التالية تعطي مخرجاً (1) فقط إذا كانت جميع المدخلات (1)؟", options: ["OR Gate", "AND Gate", "NOT Gate", "NAND Gate"], correct: 1 },

    // ==================== تخصص الاتصالات (telecom) ====================
    { section: "technical", specialization: "telecom", difficulty: "easy", text: "ما هو نوع الكابلات الذي ينقل البيانات عن طريق الضوء ويتميز بسرعته الفائقة؟", options: ["الكابلات المحورية (Coaxial)", "الألياف الضوئية (Fiber Optics)", "الكابلات المجدولة (UTP)", "أسلاك النحاس"], correct: 1 },
    { section: "technical", specialization: "telecom", difficulty: "easy", text: "ماذا يعني الاختصار GSM في عالم الاتصالات المحمولة؟", options: ["Global System for Mobile communications", "General Security Management", "Geographic Signal Modulation", "Giga System Media"], correct: 0 },
    { section: "technical", specialization: "telecom", difficulty: "medium", text: "عملية تحميل إشارة المعلومات على إشارة حاملة عالية التردد تسمى:", options: ["Demodulation", "Modulation (التعديل)", "Amplification", "Filtering"], correct: 1 },
    { section: "technical", specialization: "telecom", difficulty: "medium", text: "تتميز شبكات الجيل الخامس 5G عن الجيل الرابع بـ:", options: ["سرعة أقل", "زمن استجابة (Latency) منخفض جداً", "تغطية أقل في المسافات المفتوحة", "استهلاك طاقة أعلى"], correct: 1 },
    { section: "technical", specialization: "telecom", difficulty: "hard", text: "أي نوع من أنواع التعديل الرقمي يعتمد على تغيير زاوية الطور (Phase) للإشارة الحاملة؟", options: ["ASK", "FSK", "PSK", "AM"], correct: 2 }
];

async function seedQuestions() {
    console.log("جاري رفع الأسئلة إلى Firestore... انتظر قليلاً.");
    const questionsRef = collection(db, "questions");
    
    for (const question of fullQuestionsBank) {
        try {
            await addDoc(questionsRef, question);
        } catch (error) {
            console.error("خطأ في رفع السؤال: ", question.text, error);
        }
    }
    console.log("✅ ممتاز يا روان! تم رفع جميع الأسئلة بنجاح وكولكشن questions أصبح جاهزاً للاستخدام.");
    alert("تم إنشاء بنك الأسئلة بنجاح في الفايربيس الخاص بك!");
}

// تشغيل الرفع تلقائياً
seedQuestions();