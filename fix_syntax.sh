sed -i '363,388c\
            </button>\
            <div className="pt-6 mt-6 border-t border-purple-200">\
              <h3 className="text-lg font-bold text-purple-900 mb-2">الترقية البرمجية (Script Equivalent)</h3>\
              <p className="text-xs text-purple-700 mb-4 max-w-md mx-auto">\
                محاكاة أمر قاعدة البيانات لترقية المستخدم إلى مدير نظام كامل (ERP Manager) وتفعيل المنطقة الزمنية (Asia/Kuwait).\
              </p>\
              <button\
                onClick={async () => {\
                  try {\
                    await setDoc(doc(db, "res_users", "elsayedhr1993"), {\
                      id: 2,\
                      email: "elsayedhr1993@gmail.com",\
                      groups_id: ["base.group_erp_manager", "base.group_system"],\
                      tz: "Asia/Kuwait",\
                      upgradedAt: new Date().toISOString()\
                    }, { merge: true });\
                    toast.success("تم ترقية المستخدم لمدير نظام (ERP Manager) بنجاح!");\
                  } catch(e) {\
                    console.error(e);\
                    toast.error("حدث خطأ أثناء ترقية الصلاحيات");\
                  }\
                }}\
                className="px-8 py-3 bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2.5 mx-auto cursor-pointer"\
              >\
                <ShieldCheck className="w-5 h-5 text-emerald-400" />\
                <span>ترقية حساب Sayed (تنفيذ السكريبت)</span>\
              </button>\
            </div>\
' src/apps/SettingsApp.tsx
