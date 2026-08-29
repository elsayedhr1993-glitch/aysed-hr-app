import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Calculator, Save, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Employee, LeaveRequest, Contract } from '../types';
import { computeLeaveRequest, calculateAysedLeaveMetrics } from '../utils/leaveEngine';
import { computeFifoLeaveAllocations, buildEmployeeBaselineAllocations } from '../services/leaveService';
import { computeUniversalLeaveLedger } from '../utils/kuwaitLaw';
import { toast } from 'react-hot-toast';

export interface OfficialLeaveModalProps {
  editingLeave: Partial<LeaveRequest>;
  onClose: () => void;
  employees: Employee[];
  contracts: Contract[];
  allocations: any[];
  allLeaves: LeaveRequest[];
  holidaysList: any[];
  onSave: (req: Partial<LeaveRequest>) => void;
}

export const OfficialLeaveModal: React.FC<OfficialLeaveModalProps> = ({
  editingLeave,
  onClose,
  employees,
  contracts,
  allocations,
  allLeaves,
  holidaysList,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({
    ...editingLeave,
    leaveType: editingLeave.leaveType || 'ANNUAL'
  });

  const selectedEmp = employees.find(e => e.id === formData.employeeId);
  const selectedContract = selectedEmp ? contracts.find(c => c.employeeId === selectedEmp.id && (c.status === 'RUNNING' || (c.status as string) === 'ACTIVE' || (c.status as string) === 'active')) : null;

  // Recompute available balance if employee changes or when opening
  const totalAvailable = useMemo(() => {
    if (!selectedEmp) return 0;
    const empFifo = computeFifoLeaveAllocations(selectedEmp, buildEmployeeBaselineAllocations(selectedEmp, allocations), allLeaves);
    return empFifo.netAvailable;
  }, [selectedEmp, allocations, allLeaves]);

  const calcResult = useMemo(() => {
    if (!selectedEmp || !formData.startDate || !formData.endDate) return null;
    
    // Use basic salary only for leave daily wage calculation (Basic Salary / 26)
    const basicSalary = selectedContract 
      ? Number(selectedContract.basicSalary || 0) 
      : Number((selectedEmp as any).basicSalary || (selectedEmp as any).basic_salary || (selectedEmp as any).salary || 0);
    
    // Get opening balance
    const empFifo = computeFifoLeaveAllocations(selectedEmp, buildEmployeeBaselineAllocations(selectedEmp, allocations), allLeaves);
    const carriedForward = empFifo.allocations.filter(a => a.allocationType === 'regular').reduce((sum, a) => sum + (a.numberOfDays || 0), 0);
    
    // Get previous approved leaves count (from empFifo.totalConsumed or similar)
    const previousApprovedLeaves = empFifo.totalConsumed || 0;

    const publicHolidaysStr = holidaysList.map(h => {
       if (h.date) return h.date;
       if (h.startDate) return h.startDate; // Simplification, could be expanded
       return '';
    }).filter(Boolean);

    const metrics = calculateAysedLeaveMetrics(
      formData.startDate,
      formData.endDate,
      empFifo.netAvailable,
      basicSalary,
      selectedEmp.joinDate || '2026-01-01',
      previousApprovedLeaves,
      publicHolidaysStr,
      formData.leaveType || 'ANNUAL',
      (formData.bereavementDegree as any) || 'FIRST'
    );

    // Map metrics to the expected output for the component
    return {
      totalNetDays: metrics.paidDays + metrics.unpaidDays, // or calculate working days
      totalAvailable: metrics.totalBalance,
      paidDays: metrics.paidDays,
      unpaidDays: metrics.unpaidDays,
      balanceAfter: metrics.endingBalance,
      dailyWage: metrics.dailyWage,
      paidLeavePay: metrics.totalLeavePay,
      netPayable: metrics.totalLeavePay,
      bereavementStatutoryDays: metrics.bereavementStatutoryDays || 0,
      annualDeductedDays: metrics.annualDeductedDays || 0,
      isSplitBereavement: metrics.isSplitBereavement || false,
      explanation: metrics.explanation || ''
    };
  }, [selectedEmp, formData.startDate, formData.endDate, formData.leaveType, formData.bereavementDegree, holidaysList, allocations, allLeaves, selectedContract]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast.error('الرجاء تعبئة الحقول المطلوبة');
      return;
    }

    if (calcResult) {
      onSave({
        ...formData,
        totalDays: calcResult.totalNetDays,
        excessDays: calcResult.unpaidDays,
        unpaidDays: calcResult.unpaidDays,
        paidDays: calcResult.paidDays,
        totalAvailableBalance: calcResult.totalAvailable,
        dailyWage: calcResult.dailyWage,
        leaveAmount: calcResult.paidLeavePay,
        bereavementDegree: formData.bereavementDegree || ((formData.leaveType === 'BEREAVEMENT' || formData.leaveType === 'COMPASSIONATE') ? 'FIRST' : undefined),
        bereavementRelation: formData.bereavementRelation,
        bereavementStatutoryDays: calcResult.bereavementStatutoryDays,
        isSplitBereavement: calcResult.isSplitBereavement,
        annualDeductedDays: calcResult.annualDeductedDays
      });
    } else {
      onSave(formData);
    }
  };

  return (
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
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          leaveType: e.target.value as any,
                          bereavementDegree: (e.target.value === 'BEREAVEMENT' || e.target.value === 'COMPASSIONATE') ? (prev.bereavementDegree || 'FIRST') : undefined
                        }))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#71639e] outline-none font-bold text-slate-800"
                      >
                        <option value="ANNUAL">إجازة سنوية اعتيادية (Annual Leave)</option>
                        <option value="BEREAVEMENT">🖤 إجازة وفاة / عزاء - المادة 77 (Bereavement Leave)</option>
                        <option value="COMPENSATORY">🎁 يوم تعويضي / إجازة بديلة (Compensatory Off)</option>
                        <option value="SICK">إجازة مرضية (Sick Leave)</option>
                        <option value="UNPAID">بدون راتب (Unpaid)</option>
                        <option value="MATERNITY">أمومة (Maternity)</option>
                        <option value="OTHER">أخرى (Other)</option>
                      </select>
                    </div>

                    {/* حقول إجازة الوفاة والعزاء وفق المادة 77 */}
                    {(formData.leaveType === 'BEREAVEMENT' || formData.leaveType === 'COMPASSIONATE') && (
                      <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-3 shadow-sm border border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                            ⚖️ إجازة وفاة (المادة 77 - قانون العمل الكويتي)
                          </span>
                          <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                            3 أيام مدفوعة قانوناً
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">درجة القرابة *</label>
                            <select
                              value={formData.bereavementDegree || 'FIRST'}
                              onChange={(e) => setFormData(prev => ({ ...prev, bereavementDegree: e.target.value as any }))}
                              className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white font-bold outline-none focus:border-amber-400"
                            >
                              <option value="FIRST">الدرجة الأولى (أب، أم، زوج/ة، أبناء)</option>
                              <option value="SECOND">الدرجة الثانية (أجداد، إخوة/أخوات، أحفاد)</option>
                              <option value="OTHER">قرابة أخرى (تخصم من السنوي)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">صلة القرابة بالتفصيل</label>
                            <input
                              type="text"
                              value={formData.bereavementRelation || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, bereavementRelation: e.target.value }))}
                              placeholder="مثال: والد الموظف / شقيق الموظف"
                              className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>

                        {/* بطاقة توضيح التقسيم التلقائي للأيام */}
                        {calcResult && (
                          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 text-[11px] space-y-1.5">
                            <div className="text-amber-300 font-bold">
                              {calcResult.totalNetDays <= 3 ? (
                                <span>✓ تستحق بالكامل كإجازة عزاء رسمية (3 أيام مدفوعة بدون خصم من الرصيد).</span>
                              ) : (
                                <span>✓ تمديد الإجازة ودمجها بالسنوية (المادة 77):</span>
                              )}
                            </div>
                            {calcResult.totalNetDays > 3 && (
                              <div className="grid grid-cols-3 gap-1.5 text-center pt-1 font-mono">
                                <div className="p-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded text-emerald-300">
                                  <div className="text-[10px]">عزاء مدفوع</div>
                                  <div className="font-bold text-xs">{calcResult.bereavementStatutoryDays} أيام</div>
                                  <div className="text-[8px] text-emerald-400">(0 خصم سنوي)</div>
                                </div>
                                <div className="p-1.5 bg-purple-950/80 border border-purple-500/40 rounded text-purple-300">
                                  <div className="text-[10px]">خصم من السنوي</div>
                                  <div className="font-bold text-xs">{calcResult.annualDeductedDays} يوم</div>
                                  <div className="text-[8px] text-purple-400">(من رصيد الموظف)</div>
                                </div>
                                <div className="p-1.5 bg-slate-800 border border-slate-600 rounded text-slate-300">
                                  <div className="text-[10px]">بدون راتب</div>
                                  <div className="font-bold text-xs">{calcResult.unpaidDays} يوم</div>
                                  <div className="text-[8px] text-slate-400">(تجاوز الرصيد)</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">السبب / الملاحظات</label>
                      <input
                        type="text"
                        value={formData.reason || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder={formData.leaveType === 'BEREAVEMENT' ? "تفاصيل حالة الوفاة والعزاء..." : "سبب الإجازة..."}
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
                  <h3 className="text-md font-bold text-gray-800 border-r-4 border-[#008784] pr-3">💰 التحليل المالي والمستحقات</h3>
                  <div className="bg-gray-50 rounded-xl p-5 space-y-3.5 border border-gray-200/70">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">أجر اليوم الواحد (الراتب الأساسي ÷ 26):</span>
                      <span className="font-bold text-gray-800 font-mono">{calcResult ? calcResult.dailyWage.toFixed(3) : '0.000'} د.ك</span>
                    </div>

                    {(formData.leaveType === 'BEREAVEMENT' || formData.leaveType === 'COMPASSIONATE') && (
                      <div className="flex justify-between text-sm bg-amber-50/80 p-2 rounded-lg border border-amber-200 text-amber-950 font-bold">
                        <span>أيام إجازة عزاء (مادة 77 - مدفوعة بالكامل):</span>
                        <span className="font-mono text-amber-900">{calcResult ? calcResult.bereavementStatutoryDays : 0} أيام (خصم 0)</span>
                      </div>
                    )}

                    {(formData.leaveType === 'BEREAVEMENT' || formData.leaveType === 'COMPASSIONATE') && (calcResult?.annualDeductedDays || 0) > 0 && (
                      <div className="flex justify-between text-sm bg-purple-50/80 p-2 rounded-lg border border-purple-200 text-purple-950">
                        <span>أيام مخصومة من الرصيد السنوي (تمديد):</span>
                        <span className="font-bold text-purple-800 font-mono">{calcResult ? calcResult.annualDeductedDays.toFixed(2) : '0.00'} يوم</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">إجمالي الأيام المدفوعة للأجر:</span>
                      <span className="font-bold text-teal-700 font-mono">{calcResult ? calcResult.paidDays.toFixed(2) : '0.00'} يوم</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">أيام بدون راتب (تتجاوز الرصيد):</span>
                      <span className="font-bold text-rose-600 font-mono">{calcResult ? calcResult.unpaidDays.toFixed(2) : '0.00'} يوم</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الرصيد السنوي المتبقي بعد الإجازة:</span>
                      <span className="font-bold text-indigo-700 font-mono">{calcResult ? calcResult.balanceAfter.toFixed(2) : '0.00'} يوم</span>
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

export default OfficialLeaveModal;