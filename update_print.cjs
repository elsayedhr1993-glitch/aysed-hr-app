const fs = require('fs');

const filePath = 'src/components/LeaveSettlementCalculator.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The block to replace:
const startMarker = '<div \n                id="leave-clearance-print-area" \n                className="p-8 sm:p-10 bg-white text-slate-900 text-right max-w-3xl mx-auto border border-slate-300 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0"\n                style={{ direction: \'rtl\', textAlign: \'right\', fontFamily: "\'Cairo\', \'Tajawal\', sans-serif" }}\n              >';

// In the code it is formatted as:
//              <div 
//                id="leave-clearance-print-area" 
//                className="p-8 sm:p-10 bg-white text-slate-900 text-right max-w-3xl mx-auto border border-slate-300 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0"
//                style={{ direction: 'rtl', textAlign: 'right', fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
//              >

// To be safe, I'll extract using regex
const regex = /<div\s+id="leave-clearance-print-area"[\s\S]*?{showPrintModal &&/g;

// Actually I want to replace just the interior of id="leave-clearance-print-area" or the whole thing.
// A more precise regex:
const replacementRegex = /<div\s+id="leave-clearance-print-area"[\s\S]*?<!-- الإقرار والتوقيعات -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)}\s*<\/div>\s*\);\s*};\s*export default LeaveSettlementCalculator;/g;

const newHTML = `<div 
                id="leave-clearance-print-area" 
                className="p-8 sm:p-12 bg-white text-slate-900 text-right max-w-4xl mx-auto border border-slate-200 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0 print:max-w-none"
                style={{ direction: 'rtl', textAlign: 'right', fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
              >
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-[3px] border-[#71639e] pb-6 mb-8">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-black text-[#71639e]">نموذج تسوية وتصفية إجازة</h1>
                    <p className="text-sm font-bold text-slate-500">Leave Settlement & Clearance Report</p>
                    <p className="text-xs text-slate-400 mt-2 font-mono">Reference: LVE-{new Date().getFullYear()}-{(Math.random() * 10000).toFixed(0).padStart(4, '0')}</p>
                  </div>
                  <div className="text-left space-y-1">
                    <h2 className="text-xl font-black text-slate-800">{activeCompany?.nameAr || 'الشركة'}</h2>
                    <p className="text-xs font-bold text-slate-500">نظام Aysed S HR 2026</p>
                    <p className="text-xs text-slate-400">دولة الكويت - قانون العمل (المادة 70)</p>
                  </div>
                </div>

                {/* Employee Information Card */}
                <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#71639e] mb-4 flex items-center gap-2">
                    <User size={16} />
                    البيانات الأساسية للموظف
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">اسم الموظف</p>
                      <p className="font-bold text-slate-900">{selectedEmp?.fullNameAr || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">الرقم الوظيفي</p>
                      <p className="font-bold text-slate-900 font-mono">{selectedEmp?.employeeCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">الرقم المدني</p>
                      <p className="font-bold text-slate-900 font-mono">{selectedEmp?.civilId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">تاريخ المباشرة</p>
                      <p className="font-bold text-slate-900 font-mono">{selectedEmp?.joinDate || (selectedEmp as any)?.joiningDate || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 1. Days Summary (FIFO) */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-[#71639e] mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    ١. ملخص الأرصدة (Days Summary - FIFO)
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-center">
                      <thead>
                        <tr className="bg-[#71639e] text-white">
                          <th className="py-3 px-2 font-bold">المكتسب {new Date().getFullYear()}</th>
                          <th className="py-3 px-2 font-bold bg-[#5e5284]">صافي المتاح</th>
                          <th className="py-3 px-2 font-bold text-amber-200">إجمالي المستهلك</th>
                          <th className="py-3 px-2 font-bold text-emerald-200">أيام مدفوعة</th>
                          <th className="py-3 px-2 font-bold text-rose-200">بدون راتب</th>
                          <th className="py-3 px-2 font-bold">المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        <tr>
                          <td className="py-4 px-2 font-mono font-semibold text-slate-600">{(accruedBalance || 0).toFixed(2)} يوم</td>
                          <td className="py-4 px-2 font-mono font-black text-[#71639e] bg-purple-50/30">{(settlementData?.available_paid || 0).toFixed(2)} يوم</td>
                          <td className="py-4 px-2 font-mono font-bold text-amber-600">{(settlementData?.requested_days || 0).toFixed(2)} يوم</td>
                          <td className="py-4 px-2 font-mono font-bold text-emerald-600">{(settlementData?.aysed_paid_days || 0).toFixed(2)} يوم</td>
                          <td className="py-4 px-2 font-mono font-bold text-rose-600">{(settlementData?.aysed_unpaid_days || 0).toFixed(2)} يوم</td>
                          <td className="py-4 px-2 font-mono font-bold text-slate-800">
                            {Math.max(0, (settlementData?.available_paid || 0) - (settlementData?.aysed_paid_days || 0)).toFixed(2)} يوم
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Financial Settlement */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-[#008784] mb-3 flex items-center gap-2">
                    <DollarSign size={16} />
                    ٢. التسوية المالية (Financial Settlement)
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex flex-col">
                      {/* Row 1 */}
                      <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-200">
                        <span className="font-bold text-slate-700">
                          إجمالي المبلغ المستحق للإجازة 
                          <span className="text-slate-400 font-normal mr-2 text-xs">
                            ({(settlementData?.aysed_paid_days || 0).toFixed(2)} يوم × أجر اليوم {dailyWage.toFixed(3)} د.ك)
                          </span>
                        </span>
                        <span className="font-mono font-bold text-lg text-slate-800" dir="ltr">{settlementAmount.toFixed(3)} د.ك</span>
                      </div>
                      
                      {/* Ticket Allowance */}
                      {ticketAllowanceInput > 0 && (
                        <div className="flex justify-between items-center p-4 bg-white border-b border-slate-200">
                          <span className="font-bold text-slate-700">بدل تذاكر السفر المعتمد</span>
                          <span className="font-mono font-bold text-lg text-slate-800" dir="ltr">{ticketAllowanceInput.toFixed(3)} د.ك</span>
                        </div>
                      )}
                      
                      {/* Deductions */}
                      {deductionsInput > 0 && (
                        <div className="flex justify-between items-center p-4 bg-rose-50/50 border-b border-rose-100">
                          <span className="font-bold text-rose-700">استقطاعات وسلفيات مسجلة</span>
                          <span className="font-mono font-bold text-lg text-rose-600" dir="ltr">-{deductionsInput.toFixed(3)} د.ك</span>
                        </div>
                      )}
                      
                      {/* Net Payable */}
                      <div className="flex justify-between items-center p-5 bg-[#008784]">
                        <span className="font-black text-white text-lg">صافي المستحق النهائي (NET PAYABLE)</span>
                        <span className="font-mono font-black text-2xl text-white drop-shadow-sm" dir="ltr">{netPayable.toFixed(3)} د.ك</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notice */}
                  {settlementData?.aysed_unpaid_days > 0 && (
                    <div className="mt-3 flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-medium leading-relaxed">
                        <strong>تنبيه:</strong> تم ترحيل الأيام بدون راتب ({(settlementData?.aysed_unpaid_days || 0).toFixed(2)} يوم) لخصمها من مدة الخدمة القانونية وحساب نهاية الخدمة وفق المادة (70) من قانون العمل الكويتي.
                      </p>
                    </div>
                  )}
                </div>

                {/* Declaration & Signatures */}
                <div className="mt-12">
                  <div className="border-l-4 border-[#71639e] bg-slate-50 p-4 rounded-r-lg text-xs text-slate-700 mb-8 leading-relaxed shadow-sm">
                    <strong className="text-[#71639e]">إقرار وتعهد: </strong> 
                    أقر أنا الموظف الموقع أدناه باستلام كامل المبلغ والمستحقات الموضحة أعلاه، وبموجبه أبرئ ذمة المؤسسة من أي مطالبات مالية أو إدارية عن هذه الإجازة وتعتبر هذه التسوية نهائية وملزمة بعد التوقيع.
                  </div>
                  
                  <div className="grid grid-cols-4 gap-6 text-center pt-8 border-t-2 border-slate-200">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">المحاسبة</p>
                      <div className="mt-10 border-b border-dashed border-slate-400 mx-4"></div>
                      <p className="text-slate-400 mt-2 text-[10px]">التوقيع / التاريخ</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">الموارد البشرية (HR)</p>
                      <div className="mt-10 border-b border-dashed border-slate-400 mx-4"></div>
                      <p className="text-slate-400 mt-2 text-[10px]">التوقيع / التاريخ</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">المدير العام / الإداري</p>
                      <div className="mt-10 border-b border-dashed border-slate-400 mx-4"></div>
                      <p className="text-slate-400 mt-2 text-[10px]">الختم والتوقيع</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 pb-0 -mt-2">
                      <p className="font-bold text-slate-900 text-sm">توقيع واستلام الموظف</p>
                      <div className="mt-10 border-b border-slate-400 mx-2"></div>
                      <p className="text-slate-500 mt-2 text-[10px] font-bold">بصمة / توقيع</p>
                    </div>
                  </div>
                  
                  <div className="mt-12 text-center text-[10px] text-slate-400 font-mono">
                    Generated by Aysed S HR 2026 Engine • {new Date().toLocaleString('en-US')}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveSettlementCalculator;
`

let updatedContent = content.replace(regex, newHTML);
fs.writeFileSync(filePath, updatedContent);
console.log('Update script executed.');
