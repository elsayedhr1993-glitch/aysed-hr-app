sed -i '/{\/\* Notifications Dropdown Trigger \*\//i \
        {isDeveloperMode && (\
          <button\
            className="p-1.5 rounded hover:bg-white/10 transition flex items-center justify-center cursor-pointer mr-1 text-white/90"\
            title="أدوات المطورين (Developer Mode)"\
            onClick={() => {\
              if (onNavigateToApp) onNavigateToApp("SETTINGS" as any);\
            }}\
          >\
            <Bug className="w-4 h-4 text-emerald-400" />\
          </button>\
        )}\
' src/components/OdooTopBar.tsx
