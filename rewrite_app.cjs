const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// We'll strip localStorage saving logic
appCode = appCode.replace(/useEffect\(\(\) => \{\s*const dataToSave = \{[\s\S]*?localStorage\.setItem\('aysedshr_2026_db', JSON\.stringify\(dataToSave\)\);\s*\}, \[.*?\]\);/, '');

// We'll strip Supabase logic
appCode = appCode.replace(/useEffect\(\(\) => \{\s*if \(\!supabase[\s\S]*?empChannel\.unsubscribe\(\);\s*\}\s*\}, \[\]\);/, '');

// Add imports
appCode = appCode.replace(/import React, \{ useState, useEffect \} from 'react';/, 
  "import React, { useState, useEffect } from 'react';\nimport { OdooLogin } from './components/OdooLogin';\nimport { useFirebaseSync } from './hooks/useFirebaseSync';");

// Update state initialization
const replaceStates = `  // Global Data State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const {
    companies, setCompanies,
    employees, setEmployees,
    documents, setDocuments,
    leaves, setLeaves,
    attendance, setAttendance,
    payslips, setPayslips,
    loading: dbLoading,
    saveToDb,
    deleteFromDb
  } = useFirebaseSync(isAuthenticated);`;

appCode = appCode.replace(/\/\/ Global Data State[\s\S]*?const \[payslips, setPayslips\] = useState<Payslip\[\]>\(.*?\]\)\);\s*\}\s*return docs;\s*\}\);/, replaceStates);

// Strip more initial data states that we might just keep local for now if they aren't in sync, but it's fine.
const saveEmpRegex = /const handleSaveEmployee = \(emp: Employee\) => \{[\s\S]*?\};/;
const saveEmpReplacement = `const handleSaveEmployee = (emp: Employee) => {
    saveToDb('employees', emp);
  };`;
appCode = appCode.replace(saveEmpRegex, saveEmpReplacement);

const saveLeaveRegex = /const handleSaveLeave = \(leave: LeaveRequest\) => \{[\s\S]*?\};/;
const saveLeaveReplacement = `const handleSaveLeave = (leave: LeaveRequest) => {
    saveToDb('leaves', leave);
  };`;
appCode = appCode.replace(saveLeaveRegex, saveLeaveReplacement);

const delLeaveRegex = /const handleDeleteLeave = \(id: string\) => \{[\s\S]*?\};/;
const delLeaveReplacement = `const handleDeleteLeave = (id: string) => {
    deleteFromDb('leaves', id);
  };`;
appCode = appCode.replace(delLeaveRegex, delLeaveReplacement);

const saveDocRegex = /const handleSaveDocument = \(doc: DocumentItem\) => \{[\s\S]*?\};/;
const saveDocReplacement = `const handleSaveDocument = (doc: DocumentItem) => {
    saveToDb('documents', doc);
  };`;
appCode = appCode.replace(saveDocRegex, saveDocReplacement);

const delDocRegex = /const handleDeleteDocument = \(id: string\) => \{[\s\S]*?\};/;
const delDocReplacement = `const handleDeleteDocument = (id: string) => {
    deleteFromDb('documents', id);
  };`;
appCode = appCode.replace(delDocRegex, delDocReplacement);

// Render wrap
const renderRegex = /return \(\s*<div className="min-h-screen bg-slate-100 flex font-sans dir-rtl text-right">/;
const renderReplacement = `
  if (!isAuthenticated) {
    return <OdooLogin onLoginSuccess={(uid, email) => {
      setCurrentUserId(uid);
      setCurrentUserEmail(email);
      setIsAuthenticated(true);
    }} />;
  }

  if (dbLoading) {
    return <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center">
      <div className="w-12 h-12 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-[#714B67] font-bold">جاري المزامنة السحابية (Firestore)...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans dir-rtl text-right">`;
appCode = appCode.replace(renderRegex, renderReplacement);

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx rewritten');
