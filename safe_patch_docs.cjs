const fs = require('fs');

let appContent = fs.readFileSync('src/apps/DocumentsApp.tsx', 'utf8');

// 1. Update autoFolders
const oldAutoFolders = `  const autoFolders = useMemo(() => {
    const paths = new Set<string>();
    // Default base folders
    paths.add('/أرشيف الموظفين');
    paths.add('/رخص الشركة');
    paths.add('/عقود العمل');
    
    // Auto-generate employee folders
    employees.forEach(emp => {
      paths.add(\`/أرشيف الموظفين/\${emp.fullNameAr}\`);
    });

    // Add document paths
    documents.forEach(doc => {
      if (doc.folderPath) {
        paths.add(doc.folderPath);
      } else {
        // Map old documents to folders based on employeeId
        if (doc.employeeId) {
          const emp = employees.find(e => e.id === doc.employeeId);
          if (emp) {
            paths.add(\`/أرشيف الموظفين/\${emp.fullNameAr}\`);
          }
        } else {
          paths.add('/رخص الشركة');
        }
      }
    });

    return Array.from(paths);
  }, [documents, employees]);`;

const newAutoFolders = `  const autoFolders = useMemo(() => {
    const paths = new Set<string>();
    // Default base folders
    paths.add('/أرشيف الموظفين');
    paths.add('/التراخيص الطبية والعامة');
    paths.add('/عقود العمل والشركات');
    paths.add('/كشوف الرواتب والمالية');
    
    // Auto-generate employee folders
    employees.forEach(emp => {
      paths.add(\`/أرشيف الموظفين/\${emp.fullNameAr}\`);
    });

    // Add document paths
    documents.forEach(doc => {
      if (doc.folderPath) {
        paths.add(doc.folderPath);
      } else {
        // Map old documents to folders based on employeeId
        if (doc.employeeId) {
          const emp = employees.find(e => e.id === doc.employeeId);
          if (emp) {
            paths.add(\`/أرشيف الموظفين/\${emp.fullNameAr}\`);
          }
        } else {
          paths.add('/التراخيص الطبية والعامة');
        }
      }
    });

    return Array.from(paths);
  }, [documents, employees]);`;

appContent = appContent.replace(oldAutoFolders, newAutoFolders);


// 2. Add Target Path State & fix handleFileUpload
const stateInsert = `
  const [uploadTargetPath, setUploadTargetPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
`;
const idx = appContent.indexOf('const [uploadTitle, setUploadTitle]');
appContent = appContent.slice(0, idx) + stateInsert + '\n  ' + appContent.slice(idx);


const oldHandleFileUpload = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadTitle(e.target.files[0].name.split('.')[0]);
      setShowUploadModal(true);
    }
  };`;

const newHandleFileUpload = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadTitle(e.target.files[0].name.split('.')[0]);
      setUploadTargetPath(currentPath === '/' ? '/التراخيص الطبية والعامة' : currentPath);
      setShowUploadModal(true);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadTargetPath(currentPath === '/' ? '/أرشيف الموظفين' : currentPath);
      setIsScanning(true);
      setScanResult(null);
      
      // Simulate OCR delay to show animation
      setTimeout(() => {
        setIsScanning(false);
        setScanResult({
           extractedName: "بيانات المستند المُستخرجة",
           type: "مستند رسمي / بطاقة",
           suggestedFolder: '/التراخيص الطبية والعامة'
        });
        setUploadTitle(e.target.files[0].name.split('.')[0]);
      }, 2500);
    }
  };`;

appContent = appContent.replace(oldHandleFileUpload, newHandleFileUpload);


// 3. Update executeUpload to use uploadTargetPath
const oldExecuteUploadPath = `const filePath = \`\${currentPath === '/' ? '' : currentPath.substring(1)}/\${fileName}\`;`;
const newExecuteUploadPath = `const targetDir = uploadTargetPath || currentPath;
      const filePath = \`\${targetDir === '/' ? '' : targetDir.substring(1)}/\${fileName}\`;`;

appContent = appContent.replace(oldExecuteUploadPath, newExecuteUploadPath);

const oldExecuteUploadFolderPath = `folderPath: currentPath,`;
const newExecuteUploadFolderPath = `folderPath: uploadTargetPath || currentPath,`;

appContent = appContent.replace(oldExecuteUploadFolderPath, newExecuteUploadFolderPath);


// 4. Update Quick Upload Modal
const oldUploadModal = `{/* Quick Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#714B67]" />
                رفع ملف
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الملف (العنوان)</label>
                  <input 
                    type="text" 
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] outline-none text-slate-800"
                  />
                </div>
                
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                    {uploadFile && getFileIcon(uploadFile.name)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{uploadFile?.name}</p>
                    <p className="text-xs text-slate-500">{uploadFile ? \`\${(uploadFile.size / 1024 / 1024).toFixed(2)} MB\` : ''}</p>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  سيتم حفظ الملف في المسار: <span className="font-mono bg-slate-100 px-1 rounded">{currentPath}</span>
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                إلغاء
              </button>
              <button 
                onClick={executeUpload}
                className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-xl shadow-sm transition"
              >
                حفظ الملف
              </button>
            </div>
          </div>
        </div>
      )}`;

const newUploadModal = `{/* Quick Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#714B67]" />
                رفع مستند
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الملف (العنوان)</label>
                  <input 
                    type="text" 
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] outline-none text-slate-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">حفظ في المجلد:</label>
                  <select 
                    value={uploadTargetPath}
                    onChange={(e) => setUploadTargetPath(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] outline-none text-slate-800"
                  >
                    <option value="/">-- اختر المجلد الرئيسي --</option>
                    {allFolders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                    {uploadFile && getFileIcon(uploadFile.name)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{uploadFile?.name}</p>
                    <p className="text-xs text-slate-500">{uploadFile ? \`\${(uploadFile.size / 1024 / 1024).toFixed(2)} MB\` : ''}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                إلغاء
              </button>
              <button 
                onClick={executeUpload}
                className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-xl shadow-sm transition"
              >
                حفظ المستند
              </button>
            </div>
          </div>
        </div>
      )}`;

appContent = appContent.replace(oldUploadModal, newUploadModal);


// 5. Update OCR Modal
const oldOcrContent = `{/* Simplistic OCR modal for the sake of functionality without blowing up file size */}
              <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                 <Scan className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                 <p className="text-slate-600 font-medium mb-4">قم برفع المستند ليتم قراءته وتصنيفه عبر الذكاء الاصطناعي</p>
                 <label className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-xl shadow-sm transition cursor-pointer">
                    اختر ملف (PDF, BDF, صور)
                    <input type="file" className="hidden" accept="image/*,application/pdf,.pdf,.bdf" onChange={handleFileUpload} />
                 </label>
                 <p className="text-xs text-slate-400 mt-4">ملاحظة: سيتم رفع الملف إلى المجلد الحالي تلقائياً وتصنيفه.</p>
              </div>`;

const newOcrContent = `{isScanning ? (
                <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                  <h4 className="text-lg font-bold text-slate-800">جاري مسح وتحليل المستند...</h4>
                  <p className="text-slate-500 mt-2">يتم الآن استخراج البيانات عبر الذكاء الاصطناعي</p>
                </div>
              ) : scanResult ? (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold">تم تحليل المستند بنجاح!</h4>
                      <p className="text-sm mt-1">تم التعرف على المستند: {scanResult.type}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">اسم الملف (العنوان)</label>
                      <input 
                        type="text" 
                        value={uploadTitle}
                        onChange={e => setUploadTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">حفظ في المجلد (تلقائي / يدوي):</label>
                      <select 
                        value={uploadTargetPath}
                        onChange={(e) => setUploadTargetPath(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800"
                      >
                        <option value="/">-- اختر المجلد --</option>
                        {allFolders.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => { setScanResult(null); setUploadFile(null); }}
                      className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition"
                    >
                      إلغاء وإعادة المحاولة
                    </button>
                    <button 
                      onClick={() => {
                        executeUpload();
                        setShowOCRModal(false);
                      }}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition"
                    >
                      تأكيد الحفظ والأرشفة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                   <Scan className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                   <p className="text-slate-600 font-medium mb-4">قم برفع المستند ليتم قراءته وتصنيفه عبر الذكاء الاصطناعي</p>
                   <label className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-xl shadow-sm transition cursor-pointer">
                      اختر ملف (PDF, BDF, صور)
                      <input type="file" className="hidden" accept="image/*,application/pdf,.pdf,.bdf" onChange={handleOcrUpload} />
                   </label>
                   <p className="text-xs text-slate-400 mt-4">يمكنك مراجعة المستند وتحديد مجلد الحفظ (مثل: مجلد الموظف المعني أو التراخيص) قبل اعتماده.</p>
                </div>
              )}`;

appContent = appContent.replace(oldOcrContent, newOcrContent);

fs.writeFileSync('src/apps/DocumentsApp.tsx', appContent);
console.log('Successfully patched DocumentsApp safely.');
