sed -i '/window.location.href = '\''\/web?debug=1'\'';/a\
              }}\
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 mx-auto cursor-pointer"\
            >\
              <Sparkles className="w-5 h-5" />\
              <span>تفعيل وضع المطورين (Active Debug Mode)</span>\
            </button>\
            <div className="pt-6 mt-6 border-t border-purple-200">\
              <h3 className="text-lg font-bold text-purple-900 mb-2">الترقية البرمجية (Script Equivalent)</h3>\
              <p className="text-xs text-purple-700 mb-4 max-w-md mx-auto">\
                محاكاة أمر قاعدة البيانات لترقية المستخدم إلى مدير نظام كامل (ERP Manager) وتفعيل المنطقة الزمنية (Asia/Kuwait).\
              </p>\
              <button\
                onClick={async () => {\
                  try {\
                    await setDoc(doc(db, "res_users", "user_2_sayed"), {\
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
' src/apps/SettingsApp.tsx
