import React, { useState, useMemo } from 'react';
import { ShiftProfile, EmployeeShift, Employee, Company } from '../types';
import { Calendar, Plus, Clock, Save, Edit, Trash2, ArrowRight, ArrowLeft, GripVertical, AlertCircle, Users } from 'lucide-react';

interface ShiftsAppProps {
  shifts: ShiftProfile[];
  employeeShifts: EmployeeShift[];
  employees: Employee[];
  activeCompany: Company;
  onSaveShift: (shift: ShiftProfile) => void;
  onDeleteShift: (shiftId: string) => void;
  onAssignShift: (assignment: EmployeeShift) => void;
  onRemoveAssignment: (assignmentId: string) => void;
}

export const ShiftsApp: React.FC<ShiftsAppProps> = ({
  shifts,
  employeeShifts,
  employees,
  activeCompany,
  onSaveShift,
  onDeleteShift,
  onAssignShift,
  onRemoveAssignment
}) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'PROFILES'>('SCHEDULE');
  
  // Weekly Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Partial<ShiftProfile>>({});
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState<{ employeeId: string, date: string, shiftId: string }>({ employeeId: '', date: '', shiftId: '' });

  // Helpers for Weekly Calendar
  const weekDates = useMemo(() => {
    const dates = [];
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); // Monday as first day, adjust for locale if needed, let's use standard Date math
    
    // Start from Sunday for Middle East
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay())); 
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentDate]);

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleSaveShift = () => {
    if (!editingShift.name || !editingShift.startTime || !editingShift.endTime) return;
    
    onSaveShift({
      id: editingShift.id || `shift-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      name: editingShift.name,
      startTime: editingShift.startTime,
      endTime: editingShift.endTime,
      type: editingShift.type || 'CONTINUOUS',
      color: editingShift.color || 'bg-blue-500'
    });
    
    setShowShiftModal(false);
    setEditingShift({});
  };

  const handleSaveAssignment = () => {
    if (!assignData.employeeId || !assignData.date || !assignData.shiftId) return;
    onAssignShift({
      id: `assign-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: assignData.employeeId,
      date: assignData.date,
      shiftId: assignData.shiftId
    });
    setShowAssignModal(false);
  };

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  const activeCompId = activeCompany?.id || 'comp-1';
  let companyEmps = (employees || []).filter(e => !e.isDeleted && ((e.companyId || 'comp-1') === activeCompId || true));
  if (companyEmps.length === 0 && (employees || []).filter(e => !e.isDeleted).length > 0) {
    companyEmps = (employees || []).filter(e => !e.isDeleted);
  }
  const companyShifts = (shifts || []).filter(s => s.companyId === (activeCompany?.id || 'comp-1'));

  const getShiftForEmpDate = (empId: string, dateStr: string) => {
    // Can return multiple if they have split shifts!
    return employeeShifts.filter(es => es.employeeId === empId && es.date === dateStr);
  };

  return (
    <div className="p-6 bg-transparent min-h-screen text-right" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#714B67]" />
            جدولة الشفتات (Shift Planning)
          </h1>
          <p className="text-sm text-slate-500 mt-1">تخطيط وجدولة مناوبات العمل للموظفين بمرونة، ودعم الشفتات المتعددة.</p>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('SCHEDULE')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'SCHEDULE' ? 'bg-white shadow text-[#714B67]' : 'text-slate-600'}`}
            >
              🗓️ الجدول الأسبوعي
            </button>
            <button 
              onClick={() => setActiveTab('PROFILES')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'PROFILES' ? 'bg-white shadow text-[#714B67]' : 'text-slate-600'}`}
            >
              ⚙️ إعدادات الشفتات
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'SCHEDULE' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          {/* Calendar Toolbar */}
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-4">
              <button onClick={handlePrevWeek} className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-100">
                <ArrowRight className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">
                الأسبوع: {weekDates[0].toLocaleDateString('ar-KW')} - {weekDates[6].toLocaleDateString('ar-KW')}
              </h2>
              <button onClick={handleNextWeek} className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-100">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div>
               <button 
                onClick={() => { setAssignData({ employeeId: '', date: weekDates[0].toISOString().split('T')[0], shiftId: '' }); setShowAssignModal(true); }}
                className="bg-[#714B67] hover:bg-[#5a3a52] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
               >
                 <Plus className="w-4 h-4" /> إسناد شفت لموظف
               </button>
            </div>
          </div>

          {/* Planning Grid */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-right border-collapse min-w-[1000px]">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr>
                  <th className="p-4 border-b border-l border-slate-200 bg-slate-100 w-48 sticky right-0 z-20">
                    الموظف
                  </th>
                  {weekDates.map((date, idx) => (
                    <th key={idx} className="p-3 border-b border-l border-slate-200 bg-slate-50 min-w-[140px] text-center">
                      <div className="font-bold text-slate-700">{dayNames[date.getDay()]}</div>
                      <div className="text-xs text-slate-500">{date.toLocaleDateString('ar-KW', { month: 'short', day: 'numeric' })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {companyEmps.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-l border-slate-200 font-semibold text-slate-800 sticky right-0 bg-white z-10 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {emp.fullNameAr.substring(0,2)}
                      </div>
                      <span className="truncate w-32">{emp.fullNameAr}</span>
                    </td>
                    {weekDates.map((date, idx) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const assignedShifts = getShiftForEmpDate(emp.id, dateStr);
                      return (
                        <td key={idx} className="p-2 border-l border-slate-200 relative group align-top h-24">
                          <div className="space-y-1">
                            {assignedShifts.map(assignment => {
                              const shiftProfile = companyShifts.find(s => s.id === assignment.shiftId);
                              if (!shiftProfile) return null;
                              return (
                                <div key={assignment.id} className={`relative p-2 rounded border shadow-sm text-xs ${shiftProfile.color} text-white group/shift`}>
                                  <div className="font-bold truncate">{shiftProfile.name}</div>
                                  <div className="opacity-90">{shiftProfile.startTime} - {shiftProfile.endTime}</div>
                                  <button 
                                    onClick={() => onRemoveAssignment(assignment.id)}
                                    className="absolute left-1 top-1 p-0.5 bg-black/20 rounded hover:bg-red-500/80 transition-colors opacity-0 group-hover/shift:opacity-100"
                                    title="حذف الشفت"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Add button inside cell on hover */}
                          <button
                            onClick={() => {
                              setAssignData({ employeeId: emp.id, date: dateStr, shiftId: '' });
                              setShowAssignModal(true);
                            }}
                            className="absolute inset-0 m-auto w-6 h-6 bg-[#714B67] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                            title="إضافة شفت إضافي (Split Shift)"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Profiles Tab */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">إعدادات الشفتات المتوفرة</h2>
            <button 
              onClick={() => { setEditingShift({}); setShowShiftModal(true); }}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> إضافة شفت جديد
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companyShifts.map(shift => (
              <div key={shift.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-2 h-full ${shift.color}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">{shift.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingShift(shift); setShowShiftModal(true); }} className="text-slate-400 hover:text-blue-600 transition"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteShift(shift.id)} className="text-slate-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    <Clock className="w-4 h-4 text-[#714B67]" />
                    <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">نوع الشفت:</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {shift.type === 'MORNING' ? 'صباحي' : shift.type === 'EVENING' ? 'مسائي' : shift.type === 'SPLIT' ? 'متقطع' : 'مستمر'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {companyShifts.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-500 font-medium">لم يتم تعريف أي شفتات بعد</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#714B67]" />
                {editingShift.id ? 'تعديل بيانات الشفت' : 'إنشاء شفت جديد'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">اسم الشفت (مثال: الشفت الصباحي)</label>
                  <input type="text" value={editingShift.name || ''} onChange={e => setEditingShift({...editingShift, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">وقت الحضور</label>
                    <input type="time" value={editingShift.startTime || ''} onChange={e => setEditingShift({...editingShift, startTime: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none font-mono text-left" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">وقت الانصراف</label>
                    <input type="time" value={editingShift.endTime || ''} onChange={e => setEditingShift({...editingShift, endTime: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none font-mono text-left" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">لون التمييز في الجدول</label>
                  <div className="flex gap-2">
                    {['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-[#714B67]', 'bg-indigo-500'].map(c => (
                      <button key={c} onClick={() => setEditingShift({...editingShift, color: c})} className={`w-8 h-8 rounded-full ${c} ${editingShift.color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''}`}></button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">تصنيف الشفت</label>
                  <select value={editingShift.type || 'CONTINUOUS'} onChange={e => setEditingShift({...editingShift, type: e.target.value as any})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none">
                    <option value="CONTINUOUS">مستمر (كامل)</option>
                    <option value="MORNING">صباحي</option>
                    <option value="EVENING">مسائي</option>
                    <option value="SPLIT">متقطع (Split)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setShowShiftModal(false)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">إلغاء</button>
              <button onClick={handleSaveShift} className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-lg shadow-sm transition flex items-center gap-2"><Save className="w-4 h-4"/> حفظ الشفت</button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#714B67]" />
                إسناد شفت للموظف
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الموظف</label>
                  <select value={assignData.employeeId || ''} onChange={e => setAssignData({...assignData, employeeId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none">
                    <option value="">-- اختر الموظف --</option>
                    {companyEmps.map(e => <option key={e.id} value={e.id}>{e.fullNameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">التاريخ</label>
                  <input type="date" value={assignData.date} onChange={e => setAssignData({...assignData, date: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none font-mono text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">اختر الشفت</label>
                  <select value={assignData.shiftId || ''} onChange={e => setAssignData({...assignData, shiftId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none">
                    <option value="">-- اختر الشفت --</option>
                    {companyShifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
                  </select>
                </div>
                <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded flex gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>تنويه: يمكنك إضافة شفتات متعددة (Split Shifts) لنفس الموظف في نفس اليوم بإضافة شفت إضافي آخر.</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setShowAssignModal(false)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">إلغاء</button>
              <button onClick={handleSaveAssignment} className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-lg shadow-sm transition">اعتماد الإسناد</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
