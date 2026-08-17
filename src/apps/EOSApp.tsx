import { printDocument, exportElementToPdf } from '../utils/printUtils';
import React, { useState, useMemo } from 'react';
import { Employee, Company, Contract, EOSCalculation, LeaveRequest } from '../types';
import { calculateKuwaitEOS, formatKWD } from '../utils/kuwaitLaw';
import { Scale, Printer, FileCheck, AlertCircle, Info, Calculator, CheckCircle2, CalendarOff, ShieldAlert, ArrowDownRight, Layers, FileSpreadsheet, Check, Download, Loader2, ShieldCheck } from 'lucide-react';

interface EOSAppProps {
  employees: Employee[];
  contracts: Contract[];
  leaves?: LeaveRequest[];
  activeCompany: Company;
}

export const EOSApp: React.FC<EOSAppProps> = ({ employees, contracts, leaves = [], activeCompany }) => {
  const activeCompId = activeCompany?.id || 'comp-1';
  let companyEmps = (employees || []).filter(e => !e.isDeleted && ((e.companyId || 'comp-1') === activeCompId || true));
  if (companyEmps.length === 0 && (employees || []).filter(e => !e.isDeleted).length > 0) {
    companyEmps = (employees || []).filter(e => !e.isDeleted);
  }

  const [selectedEmpId, setSelectedEmpId] = useState<string>(companyEmps[0]?.id || '');
  const [terminationType, setTerminationType] = useState<'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'CONTRACT_EXPIRED'>('RESIGNATION');
  const [leaveDate, setLeaveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [unusedLeaveDays, setUnusedLeaveDays] = useState<number>(15);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [manualUnpaidOverride, setManualUnpaidOverride] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const activeEmp = employees.find(e => e.id === selectedEmpId) || companyEmps[0];
  const activeContract = contracts.find(c => c.employeeId === activeEmp?.id);

  // Filter approved unpaid leaves and excess annual days for the selected employee
  const employeeUnpaidLeaves = useMemo(() => {
    if (!activeEmp) return [];
    return (leaves || []).filter(
      l => l.employeeId === activeEmp.id &&
      (l.leaveType === 'UNPAID' || (l.excessDays && l.excessDays > 0)) &&
      (l.status === 'APPROVED' || l.status === 'VALIDATED' || l.status === 'SUBMITTED')
    );
  }, [leaves, activeEmp]);

  const calculatedUnpaidDays = useMemo(() => {
    return employeeUnpaidLeaves.reduce((sum, l) => {
      const days = l.leaveType === 'UNPAID' ? (l.totalDays || 0) : (l.excessDays || 0);
      return sum + days;
    }, 0);
  }, [employeeUnpaidLeaves]);

  const effectiveUnpaidDays = manualUnpaidOverride !== null ? manualUnpaidOverride : calculatedUnpaidDays;

  const unpaidLeavesBreakdown = useMemo(() => {
    return employeeUnpaidLeaves.map(l => ({
      id: l.id,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.leaveType === 'UNPAID' ? (l.totalDays || 0) : (l.excessDays || 0),
      reason: l.reason || (l.leaveType === 'UNPAID' ? 'إجازة بدون راتب معتمدة' : 'أيام إجازة سنوية زائدة (تخصم من مدة الخدمة)'),
    }));
  }, [employeeUnpaidLeaves]);

  const grossSalary = activeContract 
    ? (activeContract.basicSalary + activeContract.housingAllowance + activeContract.transportAllowance + activeContract.otherAllowance)
    : 1000.000;

  const eosResult: EOSCalculation | null = activeEmp ? calculateKuwaitEOS({
    employeeId: activeEmp.id,
    employeeName: activeEmp.fullNameAr,
    civilId: activeEmp.civilId,
    joinDate: activeEmp.joinDate,
    leaveDate: leaveDate,
    grossSalary: grossSalary,
    terminationType: terminationType,
    contractType: activeContract?.contractType || 'INDEFINITE',
    unusedLeaveDays: unusedLeaveDays,
    otherDeductions: otherDeductions,
    totalUnpaidLeaveDays: effectiveUnpaidDays,
    unpaidLeavesBreakdown: unpaidLeavesBreakdown,
  }) : null;

  const handlePrint = () => {
    printDocument('print-area', `سند_مخالصة_نهاية_الخدمة_${eosResult?.employeeName || 'موظف'}`);
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('print-area', `سند_مخالصة_نهاية_الخدمة_${eosResult?.employeeName || 'موظف'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] dir-rtl text-right">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#714B67]" />
            <h2 className="text-xl font-bold text-slate-800">
              حاسبة مكافأة نهاية الخدمة وتصفية المستحقات (Kuwait EOS Settlement)
            </h2>
            <span className="bg-purple-100 text-[#714B67] text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
              المادتان 51 و 53 - قانون العمل الكويتي
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            احتساب دقيق لمستحقات نهاية الخدمة مع استبعاد الإجازات بدون راتب تلقائياً من مدة الخدمة وتوليد سند مخالصة وإبراء ذمة رسمي (PDF).
          </p>
        </div>

        {eosResult && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التصدير...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span>تحميل PDF مباشر</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة سند المخالصة (Print)</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input Settings Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs h-fit">
          <div className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#714B67]" />
              <span>معالج تصفية نهاية الخدمة (Odoo EOS Wizard)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">hr.departure.wizard</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">اختر الموظف المستحق للإنهاء والتصفية</label>
            <select
              value={selectedEmpId || ''}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setManualUnpaidOverride(null);
              }}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#714B67] bg-white"
            >
              {companyEmps.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullNameAr} ({emp.civilId}) - {emp.jobTitle}
                </option>
              ))}
            </select>
          </div>

          {activeEmp && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">تاريخ مباشرة العمل والتعيين:</span>
                <span className="font-mono font-bold text-slate-800">{activeEmp.joinDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">الرقم المدني:</span>
                <span className="font-mono font-bold text-slate-800 dir-ltr">{activeEmp.civilId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">نوع العقد:</span>
                <span className="font-bold text-slate-800">
                  {activeContract?.contractType === 'FIXED_TERM' ? 'محدد المدة (Fixed-Term)' : 'غير محدد المدة (Indefinite)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">الراتب الإجمالي الشامل (المادة 51):</span>
                <span className="font-mono font-bold text-emerald-700 dir-ltr">{formatKWD(grossSalary)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">سبب انتهاء الخدمة (المادة 53)</label>
            <select
              value={terminationType || 'RESIGNATION'}
              onChange={(e) => setTerminationType(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none bg-white font-medium focus:ring-2 focus:ring-[#714B67]"
            >
              <option value="RESIGNATION">استقالة الموظف (Resignation)</option>
              <option value="TERMINATION">إنهاء خدمة من قبل الشركة / فصل تعسفي (Termination)</option>
              <option value="CONTRACT_EXPIRED">انتهاء مدة العقد المقتضية</option>
              <option value="RETIREMENT">تقاعد / عجز عن العمل / وفاة</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">تاريخ انتهاء الخدمة (آخر يوم عمل)</label>
            <input
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none bg-white font-mono focus:ring-2 focus:ring-[#714B67]"
            />
          </div>

          {/* Unpaid Leaves Integration Control in Wizard */}
          <div className="bg-amber-50/80 rounded-xl p-3.5 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                <CalendarOff className="w-4 h-4 text-amber-700 shrink-0" />
                <span>إجمالي أيام الإجازات بدون راتب المستبعدة:</span>
              </div>
              <span className="bg-amber-200 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                المادة 51
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={effectiveUnpaidDays}
                onChange={(e) => setManualUnpaidOverride(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 border border-amber-300 rounded p-1.5 text-xs font-mono font-bold text-center bg-white outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-slate-600 text-xs font-medium">يوم مستبعد من مدة الخدمة</span>
              {manualUnpaidOverride !== null && (
                <button
                  onClick={() => setManualUnpaidOverride(null)}
                  className="text-[10px] text-amber-800 underline hover:text-amber-950 mr-auto font-bold"
                  title="استعادة القيمة التلقائية المسجلة من جدول الإجازات"
                >
                  استعادة التلقائي ({calculatedUnpaidDays} يوم)
                </button>
              )}
            </div>

            <p className="text-[10px] text-amber-800 leading-relaxed">
              {calculatedUnpaidDays > 0 ? (
                <span>
                  تم رصد <strong className="font-mono">{calculatedUnpaidDays}</strong> يوماً من واقع {employeeUnpaidLeaves.length} طلب إجازة بدون راتب معتمدة في النظام وسيتم استبعادها تلقائياً من مدة الخدمة.
                </span>
              ) : (
                <span>لا توجد طلبات إجازة بدون راتب مسجلة للموظف في النظام (يمكن التعديل يدوياً إن وجد).</span>
              )}
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">رصيد الإجازات السنوية المتبقية المستحقة (بالأيام)</label>
            <input
              type="number"
              value={unusedLeaveDays}
              onChange={(e) => setUnusedLeaveDays(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none font-mono bg-white focus:ring-2 focus:ring-[#714B67]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">خصومات أو سلف وقروض مستحقة (KWD)</label>
            <input
              type="number"
              step="0.001"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none font-mono dir-ltr bg-white focus:ring-2 focus:ring-[#714B67]"
            />
          </div>
        </div>

        {/* Right Output Official Settlement Sheet */}
        <div id="print-area" className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-8 shadow-sm printable-area text-slate-800 print:shadow-none print:border-none">
          {eosResult ? (
            <div>
              {/* Printable Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-[#714B67] pb-4 mb-6">
                <div>
                  <h1 className="text-lg font-black text-[#714B67]">{activeCompany?.nameAr || ''}</h1>
                  <p className="text-xs text-slate-500 font-medium">{activeCompany?.nameEn || ''}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    سجل تجاري رقم: {activeCompany?.commercialRegNo || ''} | الرقم المدني للشركة: {activeCompany?.civilIdCompany || ''}
                  </p>
                </div>
                <div className="text-left dir-ltr">
                  <span className="inline-block bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full border border-rose-200">
                    سند مخالصة وإبراء ذمة نهائي
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">التاريخ: {new Date().toLocaleDateString('ar-KW')}</p>
                </div>
              </div>

              {/* Employee Summary Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 text-xs grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">اسم الموظف:</span>
                  <span className="font-bold text-slate-900">{eosResult.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الرقم المدني:</span>
                  <span className="font-mono font-bold text-slate-900 dir-ltr">{eosResult.civilId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ المباشرة والانتهاء:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {eosResult.joinDate} إلى {eosResult.leaveDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الراتب الإجمالي الأخير (26):</span>
                  <span className="font-mono font-bold text-emerald-700 dir-ltr">{formatKWD(eosResult.lastGrossSalary)}</span>
                </div>
              </div>

              {/* SECTION: Unpaid Leaves & Net Service Duration (Kuwait Article 51 Integration) */}
              <div className="mb-6 bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <CalendarOff className="w-4 h-4 text-amber-700" />
                    <span>سجل الإجازات بدون راتب واستبعاد مدد الانقطاع (Unpaid Leaves Deduction)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold">المادة 51 من قانون العمل</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] mb-1">المدة الإجمالية للخدمة (Gross):</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {eosResult.grossServiceDays} <span className="text-xs font-normal">يوماً</span>
                    </span>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <span className="text-amber-700 block text-[10px] font-bold mb-1">أيام مستبعدة ومخصومة من مدة الخدمة:</span>
                    <span className="font-mono font-black text-rose-700 text-sm">
                      - {eosResult.totalUnpaidLeaveDays || 0} <span className="text-xs font-normal">يوماً</span>
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 block text-[10px] font-bold mb-1">مدة الخدمة الفعلية الصافية المحتسبة للمكافأة:</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">
                      {eosResult.netServiceDays} <span className="text-xs font-normal">يوماً</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">
                      ({eosResult.totalYears} سنة و {eosResult.totalMonths} شهر و {eosResult.totalDays} يوم)
                    </span>
                  </div>
                </div>

                {/* Table of Unpaid Leave Periods if any */}
                {(eosResult.unpaidLeavesBreakdown && eosResult.unpaidLeavesBreakdown.length > 0) ? (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      تفاصيل فترات الإجازة بدون راتب المستبعدة طوال فترة خدمة الموظف:
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-[11px] bg-white rounded border border-slate-200">
                        <thead className="bg-slate-100 text-slate-700 font-bold">
                          <tr>
                            <th className="p-2 border-b">م</th>
                            <th className="p-2 border-b">تاريخ البداية</th>
                            <th className="p-2 border-b">تاريخ النهاية</th>
                            <th className="p-2 border-b text-center">عدد الأيام المستبعدة</th>
                            <th className="p-2 border-b">السبب / البيان</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {eosResult.unpaidLeavesBreakdown.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="p-2 text-slate-500">{idx + 1}</td>
                              <td className="p-2 text-slate-800 font-bold">{item.startDate}</td>
                              <td className="p-2 text-slate-800 font-bold">{item.endDate}</td>
                              <td className="p-2 text-center text-rose-700 font-bold">{item.days} يوم</td>
                              <td className="p-2 text-slate-600 font-sans">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                    • لم يتم تسجيل أي فترات انقطاع أو إجازات بدون راتب سابقة لهذا الموظف (مدة الخدمة الإجمالية مطابقة للمدة الصافية).
                  </div>
                )}
              </div>

              {/* Step 1: Legal Calculations Breakdown */}
              <div className="space-y-4 text-xs mb-6">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-1 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>تفاصيل احتساب المادة 51 من قانون العمل الكويتي (على أساس مدة الخدمة الصافية):</span>
                </h3>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>• استحقاق الخمس سنوات الأولى (15 يوماً عن كل سنة):</span>
                    <span className="font-mono font-bold">{eosResult.first5YearsEntitlementDays.toFixed(1)} يوماً</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>• استحقاق ما زاد عن الخمس سنوات (30 يوماً عن كل سنة):</span>
                    <span className="font-mono font-bold">{eosResult.after5YearsEntitlementDays.toFixed(1)} يوماً</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>إجمالي مكافأة نهاية الخدمة الإجمالية قبل المادة 53:</span>
                    <span className="font-mono text-emerald-700 dir-ltr text-sm">{formatKWD(eosResult.grossEosAmount)}</span>
                  </div>
                </div>

                {/* Step 2: Resignation Article 53 Ratio */}
                <h3 className="font-bold text-slate-900 text-sm border-b pb-1 pt-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>تطبيق المادة 53 (نسبة الاستقالة / إنهاء الخدمة):</span>
                </h3>

                <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 space-y-1.5">
                  <div className="flex justify-between items-center font-bold text-amber-900">
                    <span>نسبة الاستحقاق المعتمدة:</span>
                    <span className="font-mono text-sm">{(eosResult.article53Ratio * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-[11px] text-amber-800">{eosResult.article53Note}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200 font-bold text-slate-900">
                    <span>مكافأة نهاية الخدمة الصافية المستحقة:</span>
                    <span className="font-mono text-emerald-700 dir-ltr text-sm">{formatKWD(eosResult.netEosAmount)}</span>
                  </div>
                </div>

                {/* Step 3: Unused Leaves Payout */}
                <h3 className="font-bold text-slate-900 text-sm border-b pb-1 pt-2 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>بدل رصيد الإجازات السنوية والخصومات المستحقة:</span>
                </h3>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>بدل رصيد الإجازات السنوية المتبقية ({eosResult.unusedLeaveDays} يوماً):</span>
                    <span className="font-mono font-bold text-slate-800 dir-ltr">{formatKWD(eosResult.leavePayoutAmount)}</span>
                  </div>
                  {eosResult.otherDeductions > 0 && (
                    <div className="flex justify-between items-center text-rose-700">
                      <span>خصومات أو سلف وقروض مستحقة:</span>
                      <span className="font-mono font-bold dir-ltr">- {formatKWD(eosResult.otherDeductions)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Settlement Box */}
              <div className="bg-[#714B67] text-white rounded-xl p-5 shadow-inner mb-8 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-300 font-bold block">صافي مستحقات المخالصة النهائية وإبراء الذمة</span>
                  <span className="text-xs text-white/80">Net End of Service Settlement & Full Clearance</span>
                </div>
                <div className="text-2xl font-black font-mono text-amber-300 dir-ltr">
                  {formatKWD(eosResult.totalSettlement)}
                </div>
              </div>

              {/* Legal Clearance Declaration */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 mb-6 leading-relaxed">
                <strong>إقرار إبراء الذمة:</strong> أقر أنا الموظف المذكور أعلاه باستلامي لكافة مستحقاتي المالية والقانونية المبينة في هذا السند، بما في ذلك مكافأة نهاية الخدمة وبدل رصيد الإجازات السنوية، بعد استبعاد أيام الإجازات بدون راتب المستحقة نظاماً، وأبرئ ذمة الشركة إبراءً تاماً شاملاً لا رجعة فيه من أي حقوق مالية أو عمالية سابقة.
              </div>

              {/* Official Signatures Bar */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs text-center">
                <div>
                  <p className="font-bold text-slate-800 mb-12">إقرار واستلام الموظف</p>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[11px] text-slate-500">
                    توقيع الموظف: {eosResult.employeeName}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-800 mb-12">اعتماد إدارة الموارد البشرية والمالية</p>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[11px] text-slate-500">
                    ختم الشركة وتوقيع المدير المسؤول
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              يرجى اختيار موظف لحساب المستحقات
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
