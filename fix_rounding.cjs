const fs = require('fs');
let content = fs.readFileSync('src/components/LeaveSettlementCalculator.tsx', 'utf8');

// I need to find all instances of `{().toFixed(2)}` and put the correct variables back.
content = content.replace(
  /<td className="p-2\.5 border border-slate-300 font-mono font-bold text-purple-800">\{\(\)\.toFixed\(2\)\} يوم<\/td>/g,
  '<td className="p-2.5 border border-slate-300 font-mono font-bold text-purple-800">{(accruedBalance || 0).toFixed(2)} يوم</td>'
);

content = content.replace(
  /<td className="p-2\.5 border border-slate-300 font-mono font-black text-\[#71639e\]">\{\(\)\.toFixed\(2\)\} يوم<\/td>/g,
  '<td className="p-2.5 border border-slate-300 font-mono font-black text-[#71639e]">{(settlementData?.available_paid || 0).toFixed(2)} يوم</td>'
);

content = content.replace(
  /<td className="p-2\.5 border border-slate-300 font-mono font-bold text-rose-700">\{\(\)\.toFixed\(2\)\} يوم<\/td>\s*<td className="p-2\.5 border border-slate-300 font-mono font-bold text-blue-900">\{\(\)\.toFixed\(2\)\} يوم<\/td>\s*<td className="p-2\.5 border border-slate-300 font-mono font-bold text-rose-700">\{\(\)\.toFixed\(2\)\} يوم<\/td>/g,
  `<td className="p-2.5 border border-slate-300 font-mono font-bold text-rose-700">{(settlementData?.requested_days || 0).toFixed(2)} يوم</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-blue-900">{(settlementData?.aysed_paid_days || 0).toFixed(2)} يوم</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-rose-700">{(settlementData?.aysed_unpaid_days || 0).toFixed(2)} يوم</td>`
);

fs.writeFileSync('src/components/LeaveSettlementCalculator.tsx', content);
