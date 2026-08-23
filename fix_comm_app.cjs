const fs = require('fs');
let file = 'src/apps/CommencementApp.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/onSaveCommencement: \(comm: EmploymentCommencement\) => void;/, `onSaveCommencement: (comm: EmploymentCommencement) => void;
  onDeleteCommencement?: (id: string) => void;`);

c = c.replace(/onSaveContract,\n  onNavigateToApp,\n\}\) => \{/, `onSaveContract,
  onNavigateToApp,
  onDeleteCommencement,
}) => {`);

c = c.replace(/<Pencil className="w-3.5 h-3.5" \/>\n                            <span>تعديل<\/span>\n                          <\/button>/, `<Pencil className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          {onDeleteCommencement && (
                            <button
                              onClick={() => {
                                if(window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                  onDeleteCommencement(comm.id);
                                }
                              }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                              title="حذف نموذج المباشرة"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          )}`);

fs.writeFileSync(file, c);
console.log('CommencementApp.tsx updated');
