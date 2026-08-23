import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. تعريف الهوية التقنية للنظام (طبق الأصل من Odoo Context)
interface AysedContextType {
  user: { id: number | string; name: string; email: string; role: string };
  company: { id: number | string; name: string; currency: string };
  isStable: boolean;
  refreshSystem: () => void;
}

const AysedContext = createContext<AysedContextType | undefined>(undefined);

// تهيئة Supabase إذا توفرت المتغيرات وصحتها، وإلا توفير عميل وهمي آمن لمنع تعطل التطبيق
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isValidUrl = rawSupabaseUrl.startsWith('http://') || rawSupabaseUrl.startsWith('https://');
const supabase = isValidUrl && supabaseAnonKey ? createClient(rawSupabaseUrl, supabaseAnonKey) : null;

export const AysedCoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemState, setSystemState] = useState<any>({
    user: { id: 1, name: 'د. طارق خالد العازمي', email: '66968180@aysedhr.com', role: 'admin' },
    company: { id: 'comp-fanar', name: 'مجموعة الفنار الطبية والخدمات المخبرية', currency: 'KWD' },
    isStable: true
  });
  const [loading, setLoading] = useState(false);

  const initializeSystem = async () => {
    try {
      if (!supabase) {
        // حالة الاستقرار المحلية عند عدم توفر Supabase
        setSystemState({
          user: { id: 1, name: 'د. طارق خالد العازمي', email: '66968180@aysedhr.com', role: 'admin' },
          company: { id: 'comp-fanar', name: 'مجموعة الفنار الطبية والخدمات المخبرية', currency: 'KWD' },
          isStable: true
        });
        return;
      }

      // 2. جدار العزل (Tenant Guard): جلب بيانات المستخدم والشركة النشطة
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from('res_users')
          .select('id, name, login, company_id, res_groups_id')
          .eq('login', authUser.email)
          .single();

        if (profile) {
          const { data: company } = await supabase
            .from('res_company')
            .select('id, name, currency_id')
            .eq('id', profile.company_id)
            .single();

          setSystemState({
            user: { id: profile.id, name: profile.name, email: profile.login, role: 'admin' },
            company: { id: company?.id || 'comp-fanar', name: company?.name || 'مجموعة الفنار الطبية', currency: 'KWD' },
            isStable: true
          });
        }
      }
    } catch (error) {
      console.error("🚨 ملاحظة في استقرار النظام (وضع الحماية المحلي مفعل):", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    initializeSystem(); 
  }, []);

  if (loading) return <div className="starting-server flex items-center justify-center min-h-screen bg-slate-900 text-white font-bold text-lg">جاري تشغيل محرك Aysed S HR 2026...</div>;

  return (
    <AysedContext.Provider value={{ ...systemState, refreshSystem: initializeSystem }}>
      {/* 4. حقن كود الأناقة والاستقرار البصري (Enterprise CSS) */}
      <style>{`
        :root { --odoo-primary: #71639e; --odoo-secondary: #008784; }
        .o_main_content { 
            margin-right: 0px !important; /* حل مشكلة تداخل اللوحة الجانبية والتكيف مع التصميم */
            transition: all 0.3s ease; 
        }
        .o_stat_value { font-family: 'Inter', sans-serif; font-weight: 700; color: var(--odoo-primary); }
        body { font-family: 'Tajawal', sans-serif; background-color: #f8f9fa; }
      `}</style>
      {children}
    </AysedContext.Provider>);
};

// هوك (Hook) لاستدعاء النظام في أي صفحة
export const useAysedSystem = () => {
  const context = useContext(AysedContext);
  if (!context) throw new Error("يجب استخدام useAysedSystem داخل AysedCoreProvider");
  return context;
};
