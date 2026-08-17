const fs = require('fs');
let code = fs.readFileSync('src/components/OdooTopBar.tsx', 'utf8');

if (!code.includes('const isDebug =')) {
    code = code.replace("export const OdooTopBar", "export const isDebug = typeof window !== 'undefined' ? window.location.search.includes('debug=1') : false;\n\nexport const OdooTopBar");
}

if (!code.includes('<Bug className=')) {
    const target = `{/* Ambient Sound Control (Optional) */}`;
    const replacement = `{isDebug && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-600/20 text-rose-300 rounded border border-rose-500/30 font-mono text-[10px] mx-2" title="وضع المطور النشط">
            <Bug className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Debug Mode</span>
          </div>
        )}
        
        {/* Ambient Sound Control (Optional) */}`;
    code = code.replace(target, replacement);
}

fs.writeFileSync('src/components/OdooTopBar.tsx', code);
