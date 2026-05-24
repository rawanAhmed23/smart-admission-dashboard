// 1. استيراد قاعدة البيانات والأدوات اللازمة من الفايربيس (تم إضافة collection)
import { db } from './firebase-config.js';
import { doc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function() {
    
    // ==========================================
    // 2. إعداد وتصميم الـ PIE CHART (Donut Style)
    // ==========================================
    const pieOptions = {
        chart: {
            type: 'donut',
            height: 350,
            fontFamily: 'Cairo, sans-serif'
        },
        // هنبدأ بـ series فاضية والفايربيس هو اللي هيملى الأرقام فوراً
        series: [0, 0, 0, 0], 
        labels: ['تطوير برمجيات', 'هندسة شبكات', 'إلكترونيات صناعية', 'اتصالات ونقل بيانات'],
        colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'],
        legend: {
            position: 'bottom',
            fontFamily: 'Cairo'
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return Math.round(val) + "%"
            }
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: { height: 300 },
                legend: { position: 'bottom' }
            }
        }]
    };

    const pieChart = new ApexCharts(document.querySelector("#pie-chart"), pieOptions);
    pieChart.render();


    // ==========================================
    // 3. إعداد وتصميم الـ BAR CHART (مقارنة الاختبارات)
    // ==========================================
    const barOptions = {
        chart: {
            type: 'bar',
            height: 350,
            fontFamily: 'Cairo, sans-serif',
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 6
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        // هنبدأ بـ بيانات صفرية والفايربيس هيحدثها
        series: [{
            name: 'متوسط اختبار المهارات الفنية',
            data: [0, 0, 0, 0],
            color: '#4f46e5'
        }, {
            name: 'متوسط اختبار الـ IQ المنطقي',
            data: [0, 0, 0, 0],
            color: '#06b6d4'
        }],
        xaxis: {
            categories: ['برمجة', 'شبكات', 'إلكترونيات', 'اتصالات'],
            labels: { style: { fontFamily: 'Cairo' } }
        },
        yaxis: {
            title: { text: 'الدرجة المتوسطة (من 100)', style: { fontFamily: 'Cairo' } }
        },
        tooltip: {
            y: { formatter: function (val) { return val + " درجة" } }
        }
    };

    const barChart = new ApexCharts(document.querySelector("#bar-chart"), barOptions);
    barChart.render();


    // ==========================================
    // 4. إعداد وتصميم الـ GANTT CHART (Timeline Style)
    // ==========================================
    const ganttOptions = {
        chart: {
            type: 'rangeBar',
            height: 350,
            fontFamily: 'Cairo, sans-serif',
            toolbar: { show: true }
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '70%',
                borderRadius: 4
            }
        },
        series: [{
            data: [
                {
                    x: 'مرحلة استكشاف المسارات التعليمية',
                    y: [new Date('2026-06-01').getTime(), new Date('2026-06-15').getTime()],
                    fillColor: '#4f46e5'
                },
                {
                    x: 'مرحلة الامتحانات التقنية والـ IQ',
                    y: [new Date('2026-06-16').getTime(), new Date('2026-06-30').getTime()],
                    fillColor: '#06b6d4'
                },
                {
                    x: 'المقابلات الشخصية ولجان التقييم',
                    y: [new Date('2026-07-01').getTime(), new Date('2026-07-12').getTime()],
                    fillColor: '#f59e0b'
                },
                {
                    x: 'فرز الدرجات وإعلان كشوف القبول',
                    y: [new Date('2026-07-13').getTime(), new Date('2026-07-20').getTime()],
                    fillColor: '#10b981'
                }
            ]
        }],
        xaxis: {
            type: 'datetime',
            labels: { style: { fontFamily: 'Cairo' } }
        },
        yaxis: {
            labels: { style: { fontWeight: 600, fontFamily: 'Cairo' } }
        },
        tooltip: {
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
                const start = new Date(data.y[0]).toLocaleDateString('ar-EG');
                const end = new Date(data.y[1]).toLocaleDateString('ar-EG');
                return '<div class="p-2 text-sm font-semibold text-gray-700 bg-white border shadow-md rounded-lg">' +
                    '<span>' + data.x + '</span><br/>' +
                    '<span class="text-xs text-gray-500">من: ' + start + ' إلى: ' + end + '</span>' +
                    '</div>';
            }
        }
    };

    const ganttChart = new ApexCharts(document.querySelector("#gantt-chart"), ganttOptions);
    ganttChart.render();


    // ==========================================
    // 5. الربط الحقيقي والحي (Live-Update) مع Firestore
    // ==========================================

    // جلب وتحديث بيانات الـ Pie Chart تلقائياً وبشكل حي من كولكشن الطلاب مباشرة
    onSnapshot(collection(db, "applicants"), (snapshot) => {
        // إنشاء عدّاد صفري للتخصصات
        const counts = {
            programming: 0, // تطوير برمجيات
            networking: 0,  // هندسة شبكات
            electronics: 0, // إلكترونيات صناعية
            telecom: 0      // اتصالات ونقل بيانات
        };

        // اللوب على جميع الطلاب وحساب التكرارات
        snapshot.forEach((docSnap) => {
            const studentData = docSnap.data();
            const spec = studentData.specialization;
            if (counts[spec] !== undefined) {
                counts[spec]++;
            }
        });

        // تحديث الرسمة البيانية مباشرة بالأرقام الحقيقية المحسوبة
        pieChart.updateSeries([
            counts.programming,
            counts.networking,
            counts.electronics,
            counts.telecom
        ]);
    });

    // جلب وتحديث بيانات الـ Bar Chart تلقائياً
    onSnapshot(doc(db, "charts_data", "scores"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            barChart.updateSeries([
                {
                    name: 'متوسط اختبار المهارات الفنية',
                    data: [
                        Number(data.prog_skills || 0),
                        Number(data.net_skills || 0),
                        Number(data.elec_skills || 0),
                        Number(data.tel_skills || 0)
                    ]
                },
                {
                    name: 'متوسط اختبار الـ IQ المنطقي',
                    data: [
                        Number(data.prog_iq || 0),
                        Number(data.net_iq || 0),
                        Number(data.elec_iq || 0),
                        Number(data.tel_iq || 0)
                    ]
                }
            ]);
        }
    });

});