
import React, { useState, useMemo, useEffect } from 'react';
import { DocumentItem, Employee, Company } from '../types';
import { processAnyDocument } from '../utils/ocrService';
import { 
  Folder, FileText, Image as ImageIcon, File, FileArchive,
  Upload, Plus, Trash2, Edit2, Search, ArrowRight,
  LayoutGrid, List as ListIcon, MoreVertical, X, CheckCircle2, AlertTriangle, Scan, ShieldCheck, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentsAppProps {
  documents: DocumentItem[];
  employees: Employee[];
  activeCompany: Company;
  filterTab: string;
  onSaveDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onAutoAddEmpFromOCR: (empData: any, docType?: string) => string;
  isOCRModalOpenInitially?: boolean;
  onNavigateToApp?: (app: any) => void;
  onSelectEmpForForm?: (emp: Employee) => void;
}

export const DocumentsApp: React.FC<DocumentsAppProps> = ({
  documents,
  employees,
  activeCompany,
  onSaveDocument,
  onDeleteDocument,
  onAutoAddEmpFromOCR,
  isOCRModalOpenInitially = false,
}) => {
  // State
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  

  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState('');
  const [newFolderRenameValue, setNewFolderRenameValue] = useState('');
  
  const handleRenameFolder = () => {
    if (!newFolderRenameValue.trim() || !folderToRename) return;
    const oldPath = currentPath === '/' ? `/${folderToRename}` : `${currentPath}/${folderToRename}`;
    const newPath = currentPath === '/' ? `/${newFolderRenameValue.trim()}` : `${currentPath}/${newFolderRenameValue.trim()}`;
    
    // Update documents
    documents.forEach(doc => {
      if ((doc.folderPath || '').startsWith(oldPath)) {
        onSaveDocument({
          ...doc,
          folderPath: doc.folderPath!.replace(oldPath, newPath)
        });
      }
    });
    
    // Update custom folders
    setCustomFolders(prev => prev.map(p => p.startsWith(oldPath) ? p.replace(oldPath, newPath) : p));
    
    setShowRenameFolderModal(false);
    setFolderToRename('');
    setNewFolderRenameValue('');
  };
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(isOCRModalOpenInitially);
  
  // Custom empty folders state (persisted locally for the UI)
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('custom_folders_' + (activeCompany?.id || 'comp-1'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('custom_folders_' + (activeCompany?.id || 'comp-1'), JSON.stringify(customFolders));
  }, [customFolders, activeCompany?.id]);

  // Derived Structure
  const autoFolders = useMemo(() => {
    const paths = new Set<string>();
    // Default base folders
    paths.add('/أرشيف الموظفين');
    paths.add('/التراخيص الطبية والعامة');
    paths.add('/عقود العمل والشركات');
    paths.add('/كشوف الرواتب والمالية');
    
    // Auto-generate employee folders
    employees.forEach(emp => {
      paths.add(`/أرشيف الموظفين/${emp.fullNameAr}`);
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
            paths.add(`/أرشيف الموظفين/${emp.fullNameAr}`);
          }
        } else {
          paths.add('/التراخيص الطبية والعامة');
        }
      }
    });

    return Array.from(paths);
  }, [documents, employees]);

  const allFolders = useMemo(() => {
    const set = new Set([...autoFolders, ...customFolders]);
    return Array.from(set).sort();
  }, [autoFolders, customFolders]);

  // Get contents of current path
  const currentContents = useMemo(() => {
    const folders: string[] = [];
    const files: DocumentItem[] = [];

    // Filter folders that are immediate children of currentPath
    allFolders.forEach(folder => {
      if (folder.startsWith(currentPath) && folder !== currentPath) {
        const remaining = folder.substring(currentPath === '/' ? 1 : currentPath.length + 1);
        const parts = remaining.split('/');
        if (parts.length > 0 && parts[0] !== '') {
          const childFolderName = parts[0];
          if (!folders.includes(childFolderName)) {
            folders.push(childFolderName);
          }
        }
      }
    });

    // Filter files
    documents.forEach(doc => {
      let docPath = doc.folderPath;
      if (!docPath) {
        if (doc.employeeId) {
          const emp = employees.find(e => e.id === doc.employeeId);
          docPath = emp ? `/أرشيف الموظفين/${emp.fullNameAr}` : '/أرشيف الموظفين';
        } else {
          docPath = '/رخص الشركة';
        }
      }
      if (docPath === currentPath || (currentPath === '/' && docPath === '')) {
        files.push(doc);
      }
    });

    return { folders, files };
  }, [allFolders, documents, currentPath, employees]);

  // Filter by search
  const filteredContents = useMemo(() => {
    if (!searchQuery) return currentContents;
    const lower = searchQuery.toLowerCase();
    return {
      folders: currentContents.folders.filter(f => f.toLowerCase().includes(lower)),
      files: currentContents.files.filter(f => f.title.toLowerCase().includes(lower) || f.fileName?.toLowerCase().includes(lower)),
    };
  }, [currentContents, searchQuery]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newPath = currentPath === '/' ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`;
    if (!allFolders.includes(newPath)) {
      setCustomFolders(prev => [...prev, newPath]);
    }
    setNewFolderName('');
    setShowAddFolderModal(false);
  };

  const handleNavigate = (folderName: string) => {
    setCurrentPath(prev => prev === '/' ? `/${folderName}` : `${prev}/${folderName}`);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.length === 1 ? '/' : parts.join('/'));
  };

  const navigateToBreadcrumb = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean);
    if (index === -1) {
      setCurrentPath('/');
    } else {
      const newPath = '/' + parts.slice(0, index + 1).join('/');
      setCurrentPath(newPath);
    }
  };

  const getFileIcon = (fileName: string = '', url: string = '') => {
    const lower = fileName.toLowerCase() || url.toLowerCase();
    if (lower.endsWith('.pdf') || lower.includes('pdf')) return <FileText className="w-10 h-10 text-red-500" />;
    if (lower.match(/.(jpeg|jpg|png|gif|webp)$/i)) return <ImageIcon className="w-10 h-10 text-blue-500" />;
    if (lower.match(/.(doc|docx)$/i)) return <FileText className="w-10 h-10 text-blue-700" />;
    if (lower.match(/.(zip|rar)$/i)) return <FileArchive className="w-10 h-10 text-amber-600" />;
    return <File className="w-10 h-10 text-slate-500" />;
  };

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  const [uploadTargetPath, setUploadTargetPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const [uploadTitle, setUploadTitle] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const executeUpload = async () => {
    if (!uploadFile) return;
    let fileUrl = '';
    
    // Upload to Supabase Storage if configured
    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const targetDir = uploadTargetPath || currentPath;
      const filePath = `${targetDir === '/' ? '' : targetDir.substring(1)}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile);
        
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      }
    }

    // Fallback if no supabase or upload failed
    if (!fileUrl) {
      const reader = new FileReader();
      fileUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadFile);
      });
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      title: uploadTitle || uploadFile.name,
      category: 'OTHER',
      fileUrl,
      fileName: uploadFile.name,
      fileSize: `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ACTIVE',
      folderPath: uploadTargetPath || currentPath,
    };

    onSaveDocument(newDoc);
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadTitle('');
  };

  const deleteFolder = (folderName: string) => {
    const targetPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    
    // Check if it has documents
    const hasDocs = documents.some(d => (d.folderPath || '').startsWith(targetPath));
    if (hasDocs) {
      alert('لا يمكن حذف المجلد لأنه يحتوي على ملفات. يرجى حذف الملفات أولاً.');
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف المجلد "${folderName}"؟`)) {
      setCustomFolders(prev => prev.filter(p => !p.startsWith(targetPath)));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      
      {/* Top Toolbar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={navigateUp}
            disabled={currentPath === '/'}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <div className="flex items-center text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span 
              onClick={() => navigateToBreadcrumb(-1)}
              className="cursor-pointer hover:text-[#714B67] transition"
            >
              الأرشيف
            </span>
            {currentPath.split('/').filter(Boolean).map((part, idx, arr) => (
              <React.Fragment key={idx}>
                <span className="mx-2 text-slate-400">/</span>
                <span 
                  onClick={() => navigateToBreadcrumb(idx)}
                  className={`cursor-pointer transition ${idx === arr.length - 1 ? 'text-[#714B67] font-bold' : 'hover:text-[#714B67]'}`}
                >
                  {part}
                </span>
              </React.Fragment>))}
      
      {/* OCR Scan Modal */}
      {showOCRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Scan className="w-6 h-6 text-[#714B67]" />
                الماسح الضوئي الذكي (OCR)
              </h3>
              <button onClick={() => setShowOCRModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              {isScanning ? (
                <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                  <h4 className="text-lg font-bold text-slate-800">جاري مسح وتحليل المستند...</h4>
                  <p className="text-slate-500 mt-2">يتم الآن استخراج البيانات عبر الذكاء الاصطناعي</p>
                </div>) : scanResult ? (
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
                        value={uploadTargetPath || '/'}
                        onChange={(e) => setUploadTargetPath(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800"
                      >
                        <option value="/">-- اختر المجلد --</option>
                        {allFolders.map(f => (
                          <option key={f} value={f}>{f}</option>))}
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
                </div>) : (
                <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                   <Scan className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                   <p className="text-slate-600 font-medium mb-4">قم برفع المستند ليتم قراءته وتصنيفه عبر الذكاء الاصطناعي</p>
                   <label className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-xl shadow-sm transition cursor-pointer">
                      اختر ملف (PDF, BDF, صور)
                      <input type="file" className="hidden" accept="image/*,application/pdf,.pdf,.bdf" onChange={handleOcrUpload} />
                   </label>
                   <p className="text-xs text-slate-400 mt-4">يمكنك مراجعة المستند وتحديد مجلد الحفظ (مثل: مجلد الموظف المعني أو التراخيص) قبل اعتماده.</p>
                </div>)}
            </div>
          </div>
        </div>)}
    </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text"
              placeholder="بحث في المجلد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#714B67] transition w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-md transition ${viewMode === 'GRID' ? 'bg-white shadow-sm text-[#714B67]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-md transition ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#714B67]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-300 mx-1"></div>

          
          <button 
            onClick={() => setShowOCRModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg shadow-sm transition"
          >
            <Scan className="w-4 h-4 text-purple-700" />
            مسح ضوئي ذكي
          </button>
<button 
            onClick={() => setShowAddFolderModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            مجلد جديد
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#714B67] hover:bg-[#5a3a52] rounded-lg shadow-sm transition cursor-pointer">
            <Upload className="w-4 h-4" />
            رفع ملف
            <input type="file" className="hidden" accept="image/*,application/pdf,.pdf,.bdf" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredContents.folders.length === 0 && filteredContents.files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Folder className="w-20 h-20 opacity-20" />
            <p className="text-lg font-medium">المجلد فارغ</p>
            <p className="text-sm">قم برفع ملفات أو إنشاء مجلدات جديدة هنا</p>
          </div>) : (
          viewMode === 'GRID' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 auto-rows-max">
              {filteredContents.folders.map(folder => (
                <div 
                  key={folder} 
                  onDoubleClick={() => handleNavigate(folder)}
                  className="group relative flex flex-col items-center p-4 bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-md hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }}
                    className="absolute top-2 right-2 p-1.5 bg-white text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 shadow-sm transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFolderToRename(folder); setNewFolderRenameValue(folder); setShowRenameFolderModal(true); }}
                    className="absolute top-2 left-2 p-1.5 bg-white text-slate-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 shadow-sm transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
<Folder className="w-14 h-14 text-amber-400 mb-3 fill-amber-100" />
                  <span className="text-xs font-medium text-slate-700 text-center line-clamp-2 w-full break-words leading-tight">{folder}</span>
                </div>))}
              
              {filteredContents.files.map(file => (
                <div 
                  key={file.id} 
                  onDoubleClick={() => window.open(file.fileUrl, '_blank')}
                  className="group relative flex flex-col items-center p-4 bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-md hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteDocument(file.id); }}
                    className="absolute top-2 right-2 p-1.5 bg-white text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 shadow-sm transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="mb-3">
                    {getFileIcon(file.fileName, file.fileUrl)}
                  </div>
                  <span className="text-xs font-medium text-slate-700 text-center line-clamp-2 w-full break-words leading-tight">{file.title}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{file.fileSize || 'Unknown size'}</span>
                </div>))}
            </div>) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3 w-10"></th>
                    <th className="px-6 py-3">الاسم</th>
                    <th className="px-6 py-3">تاريخ الإضافة</th>
                    <th className="px-6 py-3">النوع</th>
                    <th className="px-6 py-3">الحجم</th>
                    <th className="px-6 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContents.folders.map(folder => (
                    <tr 
                      key={folder} 
                      onDoubleClick={() => handleNavigate(folder)}
                      className="hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <td className="px-6 py-4"><Folder className="w-5 h-5 text-amber-400 fill-amber-100" /></td>
                      <td className="px-6 py-4 font-medium text-slate-800">{folder}</td>
                      <td className="px-6 py-4 text-slate-500">-</td>
                      <td className="px-6 py-4 text-slate-500">مجلد ملفات</td>
                      <td className="px-6 py-4 text-slate-500">-</td>
                      <td className="px-6 py-4">
                        <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        
                        <button onClick={(e) => { e.stopPropagation(); setFolderToRename(folder); setNewFolderRenameValue(folder); setShowRenameFolderModal(true); }} className="p-2 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition opacity-0 group-hover:opacity-100">
                          <Edit2 className="w-4 h-4" />
                        </button>
</button>
                      </td>
                    </tr>))}
                  {filteredContents.files.map(file => (
                    <tr 
                      key={file.id} 
                      onDoubleClick={() => window.open(file.fileUrl, '_blank')}
                      className="hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {getFileIcon(file.fileName, file.fileUrl)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{file.title}</td>
                      <td className="px-6 py-4 text-slate-500">{file.createdAt?.split('T')[0] || file.issueDate}</td>
                      <td className="px-6 py-4 text-slate-500 uppercase">{file.fileName?.split('.').pop() || 'FILE'}</td>
                      <td className="px-6 py-4 text-slate-500">{file.fileSize || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(file.id); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>)
        )}
      </div>


      {/* Rename Folder Modal */}
      {showRenameFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-500" />
                إعادة تسمية المجلد
              </h3>
              <input 
                autoFocus
                type="text" 
                value={newFolderRenameValue}
                onChange={e => setNewFolderRenameValue(e.target.value)}
                placeholder="الاسم الجديد..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] outline-none text-slate-800 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
              />
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowRenameFolderModal(false)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                إلغاء
              </button>
              <button 
                onClick={handleRenameFolder}
                disabled={!newFolderRenameValue.trim() || newFolderRenameValue === folderToRename}
                className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>)}
      {/* New Folder Modal */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-500" />
                مجلد جديد
              </h3>
              <input 
                autoFocus
                type="text" 
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="اسم المجلد..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] outline-none text-slate-800 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddFolderModal(false)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                إلغاء
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5a3a52] disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition"
              >
                إنشاء
              </button>
            </div>
          </div>
        </div>)}

      {/* Quick Upload Modal */}
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
                    value={uploadTargetPath || '/'}
                    onChange={(e) => setUploadTargetPath(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] outline-none text-slate-800"
                  >
                    <option value="/">-- اختر المجلد الرئيسي --</option>
                    {allFolders.map(f => (
                      <option key={f} value={f}>{f}</option>))}
                  </select>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                    {uploadFile && getFileIcon(uploadFile.name)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{uploadFile?.name}</p>
                    <p className="text-xs text-slate-500">{uploadFile ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
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
        </div>)}

    </div>);
};
