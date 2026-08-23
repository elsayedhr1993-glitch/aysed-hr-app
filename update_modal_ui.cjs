const fs = require('fs');
let content = fs.readFileSync('src/components/OfficialLeaveModal.tsx', 'utf8');

// Update imports
content = content.replace(
  /import \{ X, Calendar, Calculator, Save, AlertTriangle \} from 'lucide-react';/,
  "import { X, Calendar, Calculator, Save, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';"
);

// Replace return statement
const returnStatementPattern = /  return \([\s\S]*\);\n\};\n\nexport default OfficialLeaveModal;/;

const newReturnStatement = `  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[95vh] font-['Tajawal']">
        
        {/* الشريط العلوي - Odoo Enterprise Header */}
        <div className="flex justify-between items-center bg-white p-4 border-b border-gray-100 shadow-sm">
          <div className="flex gap-3">
            <button
              type="submit" form="official-leave-form"
              className="bg-[#71639e] text-white px-6 py-2 rounded-md font-bold hover:bg-[#5b4f80] shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle size={18} /> حفظ واعتماد رسمي
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white text-gray-600 border border-gray-300 px-5 py-2 rounded-md font-medium hover:bg-gray-50 transition-all"
            >
              إلغاء
            </button>
          </div>
          <div className="flex items-center gap-2 text-[#71639e] font-bold">
            <span className="bg-purple-50 px-3 py-1 rounded-full text-sm border border-purple-100">
              {selectedEmp?.fullNameAr || 'طلب إجازة رسمي (hr.leave)'}
            </span>
          </div>
        </div>

        {/* شريط الإشعار التوجيهي */}
        <div className="bg-[#f1f0f7] text-[#71639e] px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 border-b border-purple-100">
          <Info size={16} />
          <span>حسبة نظام Aysed: يتم استهلاك الرصيد بالأقدمية، والراتب المعتمد على أساس 26 يوم عمل (المادة 70).</span>
        </div>

        {/* ورقة العمل - The Enterprise Sheet */}
        <div className="overflow-y-auto p-8 bg-white">
          <form id="official-leave-form" onSubmit={handleSubmit}>
              {/* أزرار الإحصائيات (Stat Buttons) */}
              <div className="flex justify-end gap-4 mb-8">
                <div className="border border-gray-200 rounded-lg p-3 w-44 text-center bg-gray-50/50 hover:bg-purple-50 transition-colors">
                  <div className="text-2xl font-black text-[#71639e] font-mono">{calcResult ? calcResult.totalAvailable.toFixed(2) : '0.00'}</div>
                  <div className="text-xs text-gray-500 font-medium">إجمالي الرصيد المتاح (يوم)</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 w-44 text-center bg-gray-50/50 hover:bg-teal-50 transition-colors">
                  <div className="text-2xl font-black text-[#008784] font-mono">{calcResult ? calcResult.netPayable.toFixed(3) : '0.000'} د.ك</div>
                  <div className="text-xs text-gray-500 font-medium">المستحق المالي الصافي</div>
                </div>
              </div>

              {/* جسم النموذج */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* الجانب الأيمن: التواريخ والفترة */}
                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-800 border-r-4 border-[#71639e] pr-3">📅 تفاصيل الفترة الزمنية</h3>
                  <div className="space-y-4">
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">الموظف</label>
                      <select
                        value={formData.employeeId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        required
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#71639e] outline-none font-bold text-slate-900"
                      >
                        <option value="">-- اختر الموظف --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">نوع الإجازة</label>
                      <select
                        value={formData.leaveType || 'ANNUAL'}
                        onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value as any }))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#71639e] outline-none"
                      >
                        <option value="ANNUAL">إجازة سنوية اعتيادية (Annual Leave)</option>
                        <option value="SICK">إجازة مرضية (Sick Leave)</option>
                        <option value="UNPAID">بدون راتب (Unpaid)</option>
                        <option value="MATERNITY">أمومة (Maternity)</option>
                        <option value="OTHER">أخرى (Other)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">السبب / الملاحظات</label>
                      <input
                        type="text"
                        value={formData.reason || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="سبب الإجازة..."
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#71639e]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">من تاريخ</label>
                        <input
                          type="date"
                          value={formData.startDate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          required
                          className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#71639e] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">إلى تاريخ</label>
                        <input
                          type="date"
                          value={formData.endDate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                          required
                          className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#71639e] font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">صافي أيام العمل المطلوبة</label>
                      <div className="w-full p-3 bg-purple-50/60 border border-purple-200 rounded-lg font-bold text-lg text-[#71639e] text-center font-mono">
                        {calcResult ? calcResult.totalNetDays : 0} يوم
                      </div>
                    </div>
                  </div>
                </div>

                {/* الجانب الأيسر: التحليل المالي والمستحقات */}
                <div className="space-y-5">
                  <h3 className="text-md font-bold text-gray-800 border-r-4 border-[#008784] pr-3">💰 التحليل المالي (المادة 70)</h3>
                  <div className="bg-gray-50 rounded-xl p-5 space-y-3.5 border border-gray-200/70">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">أجر اليوم الواحد (أساس 26):</span>
                      <span className="font-bold text-gray-800 font-mono">{calcResult ? calcResult.dailyWage.toFixed(3) : '0.000'} د.ك</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">أيام مغطاة بالرصيد:</span>
                      <span className="font-bold text-teal-700 font-mono">{calcResult ? calcResult.paidDays.toFixed(2) : '0.00'} يوم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">أيام بدون راتب (تتجاوز الرصيد):</span>
                      <span className="font-bold text-rose-600 font-mono">{calcResult ? calcResult.unpaidDays.toFixed(2) : '0.00'} يوم</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-base">صافي مستحق الإجازة:</span>
                      <span className="text-2xl font-black text-[#008784] font-mono">{calcResult ? calcResult.netPayable.toFixed(3) : '0.000'} د.ك</span>
                    </div>
                  </div>
                  
                  {/* تنبيه التجاوز الذكي إن وجد */}
                  {calcResult && calcResult.unpaidDays > 0 && (
                    <div className="mt-6 p-3.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-3 text-amber-900 text-sm">
                      <AlertCircle className="text-amber-600 shrink-0" size={20} />
                      <p>
                        <strong>تنبيه تجاوز الرصيد:</strong> سيتم احتساب {calcResult.unpaidDays.toFixed(2)} يوم كإجازة بدون راتب وترحيل الخصم تلقائياً لمسير الرواتب.
                      </p>
                    </div>
                  )}
                  {calcResult && formData.leaveType === 'UNPAID' && (
                    <div className="mt-6 p-3.5 bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-3 text-rose-900 text-sm">
                      <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                      <p>
                        <strong>إجازة بدون راتب:</strong> سيتم خصم {calcResult.totalNetDays.toFixed(2)} أيام من مسير الرواتب تلقائياً.
                      </p>
                    </div>
                  )}
                </div>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OfficialLeaveModal;`

content = content.replace(returnStatementPattern, newReturnStatement);

fs.writeFileSync('src/components/OfficialLeaveModal.tsx', content);
