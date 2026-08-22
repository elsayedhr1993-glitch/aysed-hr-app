/**
 * Aysed HR 2026 UI Integrity Test
 * وظيفته: كشف التداخل البرمجي في شاشة السوبر أدمن وتوافق RTL
 */
export function validateAysedLayout() {
    console.log("%c جاري فحص استقرار واجهة نظام Aysed S HR... ", "background: #71639e; color: white; padding: 5px;");

    const errors: string[] = [];
    const navbars = document.querySelectorAll('.o_main_navbar, .aysed_admin_bar');
    const sidebar = document.querySelector('.o_sidebar');
    const mainContent = document.querySelector('.o_action_manager, .aysed_dashboard_content');

    // 1. فحص ازدواجية أشرطة الأدوات
    if (navbars.length > 1) {
        errors.push("🚨 تـنبيه: يوجد أكثر من شريط أدوات نشط (Overlap detected). يرجى تفعيل العزل البرمجي.");
    }

    // 2. فحص تداخل اللوحة الجانبية (RTL Check)
    if (sidebar && mainContent) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const contentRect = mainContent.getBoundingClientRect();

        // في العربي (RTL) يجب ألا تتقاطع حافة السايدبار اليسرى مع حافة المحتوى اليمنى
        if (sidebarRect.left < contentRect.right && document.dir === 'rtl') {
            errors.push("❌ خطأ: اللوحة الجانبية تغطي جزءاً من البيانات. يرجى استخدام (Margin-right) للمحتوى.");
        }
    }

    // 3. فحص "العناصر التائهة" (Viewport Clipping)
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
            if(el.clientWidth > 300) { // تجاهل العناصر الصغيرة جداً
                errors.push(`⚠️ عنصر تائه: ${el.className} يخرج عن حدود الشاشة.`);
            }
        }
    });

    // عرض التقرير النهائي
    if (errors.length === 0) {
        console.log("%c ✅ الواجهة مستقرة وطبق الأصل من أودو! ", "color: #008784; font-weight: bold;");
    } else {
        console.table(errors);
    }
    return errors;
}

// ربط الدالة بالمتصفح للاختبار المباشر
if (typeof window !== 'undefined') {
    (window as any).validateAysedLayout = validateAysedLayout;
}
