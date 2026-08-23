import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, type Employee, type LeaveBalance } from '@/lib/supabase';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { calcAnnualAccrual, getAnnualRemaining, getSickRemaining, getCasualRemaining } from '@/lib/kuwaitiLaw';
import { Search, Save, Check, Scale, AlertTriangle, Info, CalendarDays, TrendingUp } from 'lucide-react';
import { Avatar, EmptyState, LoadingState, SectionCard, Badge } from '@/components/ui';

type Row = Employee & { balance: LeaveBalance | null };

export function LeaveBalances({ overrideCompanyId }: { overrideCompanyId?: string }) {
  const { t, lang } = useLang();
  const { profile } = useAuth();
  const companyId = overrideCompanyId ?? profile?.company_id;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingCarry, setEditingCarry] = useState<Record<string, string>>({});
  const [savingCarry, setSavingCarry] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!companyId || !isSupabaseConfigured) { setLoading(false); return; }
    setError(null);
    try {
      const [{ data: emps, error: empErr }, { data: bals, error: balErr }] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', companyId).eq('status', 'active').order('full_name_ar'),
        supabase.from('leave_balances').select('*').eq('company_id', companyId),
      ]);
      if (empErr || balErr) { setError(empErr?.message ?? balErr?.message ?? 'Error'); setLoading(false); return; }
      const balMap = new Map<string, LeaveBalance>();
      (bals as LeaveBalance[] | null)?.forEach((b) => balMap.set(b.employee_id, b));
      const joined = ((emps as Employee[]) ?? []).map((e) => ({ ...e, balance: balMap.get(e.id) ?? null }));
      setRows(joined);
    } catch (err) {
      console.warn('LeaveBalance fetch skipped/error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ensureBalance = async (empId: string): Promise<LeaveBalance | null> => {
    if (!companyId) return null;
    const { data, error } = await supabase.from('leave_balances').insert({
      company_id: companyId,
      employee_id: empId,
      year: new Date().getFullYear(),
      annual_balance: 0,
      annual_used: 0,
      used_balance: 0,
      remaining_balance: 0,
      sick_balance: 15,
      sick_used: 0,
      casual_balance: 5,
      casual_used: 0,
      carry_forward: 0,
      hajj_used: 0,
      hajj_taken: false,
      maternity_used: 0,
      last_reset_date: '2026-01-01',
    }).select('*').single();
    if (error) { setError(error.message); return null; }
    return data as LeaveBalance;
  };

  const saveCarryForward = async (empId: string) => {
    const value = Number(editingCarry[empId]);
    if (!Number.isFinite(value) || value < 0) return;
    const existing = rows.find((r) => r.id === empId)?.balance;
    setSavingCarry(empId);
    setError(null);
    try {
      if (existing) {
        const { error } = await supabase.from('leave_balances').update({ carry_forward: value }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const created = await ensureBalance(empId);
        if (!created) throw new Error('Failed to create balance row');
        const { error } = await supabase.from('leave_balances').update({ carry_forward: value }).eq('id', created.id);
        if (error) throw error;
      }
      if (profile) await logAction(profile, 'update', 'leave_balance', empId, `Updated carry-forward 2025 to ${value}`);
      setSavedTick(empId);
      setTimeout(() => setSavedTick(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingCarry(null);
      setEditingCarry((prev) => { const n = { ...prev }; delete n[empId]; return n; });
      fetchData();
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.full_name_ar?.toLowerCase().includes(q) || r.full_name_en?.toLowerCase().includes(q) || r.employee_code?.toLowerCase().includes(q);
  });

  const accruedByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.id, calcAnnualAccrual(new Date(), r.hire_date ?? null));
    return map;
  }, [rows]);

  const stats = useMemo(() => {
    let totalRemaining = 0;
    let lowCount = 0;
    let totalAccrued = 0;
    for (const r of rows) {
      const acc = accruedByEmployee.get(r.id) ?? 0;
      totalAccrued += acc;
      const rem = getAnnualRemaining(r.balance, acc);
      totalRemaining += rem;
      if (rem <= 5) lowCount++;
    }
    return {
      total: rows.length,
      accrued: Math.round(totalAccrued),
      totalRemaining: Math.round(totalRemaining),
      lowCount,
    };
  }, [rows, accruedByEmployee]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">{t('leave_balances')}</h1>
        <p className="page-subtitle">
          {lang === 'ar' ? 'أرصدة الإجازات — بداية 1 يناير 2026' : 'Leave balances — from Jan 1, 2026'}
        </p>
      </div>

      {/* Law banner */}
      <div className="card p-4 flex items-start gap-3 bg-gradient-to-r from-brand-50 to-info-50 border-brand-100">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
          <Scale className="w-5 h-5 text-brand-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-surface-800">{lang === 'ar' ? 'القاعدة' : 'The Rule'}</p>
          <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">
            {lang === 'ar'
              ? 'كل يوم 28 من الشهر الساعة 11:59م يُضاف 2.5 يوم سنوي لكل موظف، حد أقصى 30 يوم في السنة. البداية 1 يناير 2026: 0 سنوي + 10 مرضي + 5 عرضي. المتبقي = (مكتسب 2026 + متراكم 2025) - المستخدم.'
              : 'Every 28th of the month at 23:59, 2.5 annual days are added to each employee, capped at 30/year. Starting Jan 1, 2026: 0 annual + 10 sick + 5 casual. Remaining = (Accrued 2026 + Carry 2025) - Used.'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center"><Scale className="w-5 h-5 text-brand-600" /></div>
          <div><p className="text-2xl font-bold text-surface-900 tabular">{stats.total}</p><p className="text-xs text-surface-500">{lang === 'ar' ? 'الموظفين' : 'Employees'}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-info-50 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-info-600" /></div>
          <div><p className="text-2xl font-bold text-surface-900 tabular">{stats.accrued}</p><p className="text-xs text-surface-500">{lang === 'ar' ? 'مكتسب 2026' : 'Accrued 2026'}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-success-600" /></div>
          <div><p className="text-2xl font-bold text-surface-900 tabular">{stats.totalRemaining}</p><p className="text-xs text-surface-500">{lang === 'ar' ? 'إجمالي المتبقي' : 'Total Remaining'}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-warning-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning-600" /></div>
          <div><p className="text-2xl font-bold text-surface-900 tabular">{stats.lowCount}</p><p className="text-xs text-surface-500">{lang === 'ar' ? 'رصيد منخفض' : 'Low Balance'}</p></div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0" />
          <p className="text-sm text-danger-700">{error}</p>
          <button onClick={() => setError(null)} className="ms-auto text-danger-600 text-sm font-medium">{lang === 'ar' ? 'إغلاق' : 'Dismiss'}</button>
        </div>)}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-surface-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search...'} className="input ps-11" />
      </div>

      {/* Table */}
      <SectionCard noPadding>
        {filteredRows.length === 0 ? (
          <EmptyState icon={Scale} title={t('no_data')} message="" />) : (
          <div className="table-wrap overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="text-center">{lang === 'ar' ? 'سنوي مكتسب 2026' : 'Accrued 2026'}</th>
                  <th className="text-center">{lang === 'ar' ? 'متراكم 2025' : 'Carry 2025'}</th>
                  <th className="text-center">{lang === 'ar' ? 'مرضي' : 'Sick'}</th>
                  <th className="text-center">{lang === 'ar' ? 'عرضي' : 'Casual'}</th>
                  <th className="text-center">{lang === 'ar' ? 'بدون راتب' : 'Unpaid'}</th>
                  <th className="text-center">{lang === 'ar' ? 'المستخدم' : 'Used'}</th>
                  <th className="text-center">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const carry = r.balance?.carry_forward ?? 0;
                  const used = r.balance?.annual_used ?? 0;
                  const empAccrued = accruedByEmployee.get(r.id) ?? 0;
                  const remaining = getAnnualRemaining(r.balance, empAccrued);
                  const sickRem = getSickRemaining(r.balance);
                  const casualRem = getCasualRemaining(r.balance);
                  const isEditing = editingCarry[r.id] !== undefined;
                  const isSaving = savingCarry === r.id;
                  const isSaved = savedTick === r.id;
                  const lowBal = remaining <= 5;

                  return (
                    <tr key={r.id} className="hover:bg-surface-50/50 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={r.full_name_ar} src={r.photo_url ?? undefined} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-surface-800 truncate">{r.full_name_ar}</p>
                            {r.employee_code && <p className="text-xs text-surface-400 font-mono">{r.employee_code}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="text-sm font-semibold text-brand-600 tabular">{empAccrued}</span>
                        <span className="text-[10px] text-surface-400"> / 30</span>
                      </td>
                      <td className="text-center">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              autoFocus
                              value={editingCarry[r.id]}
                              onChange={(e) => setEditingCarry((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveCarryForward(r.id); if (e.key === 'Escape') setEditingCarry((prev) => { const n = { ...prev }; delete n[r.id]; return n; }); }}
                              disabled={isSaving}
                              className="w-16 px-2 py-1 text-center text-sm rounded-lg border border-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none tabular disabled:opacity-50"
                            />
                            <button onClick={() => saveCarryForward(r.id)} disabled={isSaving} className="btn-icon text-success-600 hover:bg-success-50" title={t('save')}>
                              {isSaving ? <div className="w-3.5 h-3.5 border-2 border-success-400 border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                          </div>) : isSaved ? (
                          <span className="inline-flex items-center gap-1 text-success-600 animate-scale-in">
                            <Check className="w-4 h-4" /> <span className="text-sm tabular">{carry}</span>
                          </span>) : (
                          <button
                            onClick={() => setEditingCarry((prev) => ({ ...prev, [r.id]: String(carry) }))}
                            className="inline-flex items-center gap-1 text-sm tabular text-surface-600 hover:text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors"
                            title={lang === 'ar' ? 'اضغط للتعديل' : 'Click to edit'}
                          >
                            {carry}
                          </button>)}
                      </td>
                      <td className="text-center">
                        <span className={`text-sm tabular ${sickRem <= 3 ? 'text-warning-600 font-medium' : 'text-surface-600'}`}>{sickRem}</span>
                        <span className="text-[10px] text-surface-400">/10</span>
                      </td>
                      <td className="text-center">
                        <span className={`text-sm tabular ${casualRem <= 1 ? 'text-warning-600 font-medium' : 'text-surface-600'}`}>{casualRem}</span>
                        <span className="text-[10px] text-surface-400">/5</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm tabular text-warning-700 font-medium">{r.balance?.unpaid_used ?? 0}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm tabular text-surface-700 font-medium">{used}</span>
                      </td>
                      <td className="text-center">
                        <Badge tone={lowBal ? 'danger' : remaining > 20 ? 'success' : 'warning'} dot>
                          <span className="tabular font-semibold">{remaining}</span>
                        </Badge>
                      </td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>)}
      </SectionCard>

      {/* Info */}
      <div className="card p-4 flex items-start gap-3 bg-info-50/50 border-info-100">
        <div className="w-8 h-8 rounded-lg bg-info-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-info-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-surface-700">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</p>
          <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">
            {lang === 'ar'
              ? '• المكتسب يُحسب تلقائياً كل يوم 28 من الشهر. • اضغط على خانة "متراكم 2025" لإدخالها يدوياً. • المتبقي = (مكتسب 2026 + متراكم 2025) - المستخدم. • عند الموافقة على إجازة يُخصم تلقائياً.'
              : '• Accrued is calculated automatically every 28th of the month. • Click "Carry 2025" cell to enter it manually. • Remaining = (Accrued 2026 + Carry 2025) - Used. • Approving a leave deducts automatically.'}
          </p>
        </div>
      </div>
    </div>);
}
