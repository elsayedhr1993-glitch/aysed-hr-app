const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const appsBlock = `
            {activeApp === 'RECRUITMENT' && (
              <RecruitmentApp
                candidates={[]}
                activeCompany={activeCompany}
                onSaveCandidate={() => {}}
                onConvertCandidateToEmployee={() => {}}
              />
            )}
            {activeApp === 'CONTRACTS' && (
              <ContractsApp
                contracts={contracts}
                employees={employees}
                activeCompany={activeCompany}
                viewMode={viewMode}
                searchTerm={searchTerm}
                filterTab={filterTab}
                onSaveContract={(c) => setContracts(prev => {
                  const idx = prev.findIndex(x => x.id === c.id);
                  if (idx >= 0) { const a=[...prev]; a[idx]=c; return a; }
                  return [c, ...prev];
                })}
                onDeleteContract={(id) => setContracts(prev => prev.filter(c => c.id !== id))}
                onViewModeChange={setViewMode}
              />
            )}
            {activeApp === 'HOLIDAYS' && (
              <KuwaitHolidaysApp
                employees={employees}
                leaves={leaves}
              />
            )}
            {activeApp === 'LEAVES' && (
              <LeavesApp
                leaves={leaves}
                employees={employees}
                contracts={contracts}
                attendance={attendance}
                activeCompany={activeCompany}
                viewMode={viewMode}
                searchTerm={searchTerm}
                filterTab={filterTab}
                onSaveLeave={(l) => setLeaves(prev => {
                  const idx = prev.findIndex(x => x.id === l.id);
                  if (idx >= 0) { const a=[...prev]; a[idx]=l; return a; }
                  return [l, ...prev];
                })}
                onUpdateLeaveStatus={(id, status) => setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l))}
                onSaveEmployee={handleSaveEmployee}
                initialEmployeeId={selectedEmployeeForLeavesFilter}
              />
            )}
            {activeApp === 'ATTENDANCE' && (
              <AttendanceApp
                attendance={attendance}
                employees={employees}
                contracts={contracts}
                leaves={leaves}
                payslips={payslips}
                activeCompany={activeCompany}
                onSaveAttendance={(a) => setAttendance(prev => {
                  const idx = prev.findIndex(x => x.id === a.id);
                  if (idx >= 0) { const o=[...prev]; o[idx]=a; return o; }
                  return [a, ...prev];
                })}
                onSaveAttendanceBatch={(batch) => setAttendance(prev => [...batch, ...prev])}
                onPostAttendanceToPayroll={() => {}}
              />
            )}
            {activeApp === 'PAYROLL' && (
              <PayrollApp
                payslips={payslips}
                employees={employees}
                contracts={contracts}
                loans={loans}
                attendance={attendance}
                activeCompany={activeCompany}
                filterTab={filterTab}
                searchTerm={searchTerm}
                onGenerateMonthlyPayslips={handleGenerateMonthlyPayslips}
                onSaveContract={(c) => setContracts(prev => {
                  const idx = prev.findIndex(x => x.id === c.id);
                  if (idx >= 0) { const a=[...prev]; a[idx]=c; return a; }
                  return [c, ...prev];
                })}
                onSavePayslip={(p) => setPayslips(prev => {
                  const idx = prev.findIndex(x => x.id === p.id);
                  if (idx >= 0) { const a=[...prev]; a[idx]=p; return a; }
                  return [p, ...prev];
                })}
                onNavigateToApp={(app) => setActiveApp(app)}
              />
            )}
            {activeApp === 'EOS' && (
              <EOSApp
                employees={employees}
                contracts={contracts}
                activeCompany={activeCompany}
              />
            )}
            {activeApp === 'DOCUMENTS' && (
              <DocumentsApp
                documents={documents}
                employees={employees}
                activeCompany={activeCompany}
                filterTab={filterTab}
                onSaveDocument={(d) => setDocuments(prev => {
                  const idx = prev.findIndex(x => x.id === d.id);
                  if (idx >= 0) { const a=[...prev]; a[idx]=d; return a; }
                  return [d, ...prev];
                })}
                onDeleteDocument={(id) => setDocuments(prev => prev.filter(d => d.id !== id))}
                onAutoAddEmpFromOCR={handleAutoAddEmpFromOCR}
                isOCRModalOpenInitially={isOCRModalOpen}
                onNavigateToApp={(app) => setActiveApp(app)}
                onSelectEmpForForm={(emp) => setSelectedEmpForForm(emp)}
              />
            )}
            {activeApp === 'DOCUMENT_TEMPLATES' && (
              <DocumentTemplatesApp
                templates={documentTemplates}
                generatedDocs={generatedDocs}
                employees={employees.filter(e => !e.isDeleted)}
                contracts={contracts}
                activeCompany={activeCompany}
                onSaveTemplate={handleSaveDocumentTemplate}
                onDeleteTemplate={handleDeleteDocumentTemplate}
                onIssueDocument={handleIssueDocument}
                onAddAuditLog={handleAddAuditLog}
              />
            )}
            {activeApp === 'AUDIT_LOGS' && (
              <AuditLogsApp
                auditLogs={auditLogs}
                activeCompany={activeCompany}
                employees={employees}
                contracts={contracts}
                leaves={leaves}
                attendance={attendance}
                payslips={payslips}
                generatedDocs={generatedDocs}
                documentTemplates={documentTemplates}
                onAddEmployee={handleSaveEmployee}
                onAddAttendance={(rec) => setAttendance(prev => [rec, ...prev])}
                onAddLeave={(lv) => setLeaves(prev => [lv, ...prev])}
                onIssueDocument={handleIssueDocument}
                onAddAuditLog={handleAddAuditLog}
              />
            )}
            {activeApp === 'CUSTODY_LOANS' && (
              <CustodyLoansApp
                employees={employees}
                custodies={custodies}
                loans={loans}
                warnings={warnings}
                employeeNotes={employeeNotes}
                activeCompany={activeCompany}
                viewMode={viewMode}
                searchTerm={searchTerm}
                filterTab={filterTab}
                onSaveCustody={handleSaveCustody}
                onDeleteCustody={handleDeleteCustody}
                onSaveLoan={handleSaveLoan}
                onDeleteLoan={handleDeleteLoan}
                onSaveWarning={handleSaveWarning}
                onDeleteWarning={handleDeleteWarning}
                onSaveNote={handleSaveNote}
                onDeleteNote={handleDeleteNote}
              />
            )}
            {activeApp === 'AUTOMATION' && (
              <AutomationApp
                automationRules={automationRules}
                activeCompany={activeCompany}
                onToggleRule={(id) => setAutomationRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))}
                onAddRule={(r) => setAutomationRules(prev => [r, ...prev])}
              />
            )}
            {activeApp === 'AI_COPILOT' && (
              <AICopilotApp
                activeCompany={activeCompany}
                employees={employees}
                contracts={contracts}
                leaves={leaves}
              />
            )}
            {activeApp === 'SHIFTS' && (
              <ShiftsApp
                shifts={shifts}
                employeeShifts={employeeShifts}
                employees={employees}
                activeCompany={activeCompany}
                onSaveShift={handleSaveShift}
                onDeleteShift={handleDeleteShift}
                onAssignShift={handleAssignShift}
                onRemoveAssignment={handleRemoveAssignment}
              />
            )}
            {activeApp === 'COMMENCEMENT' && (
              <CommencementApp
                employees={employees}
                contracts={contracts}
                shifts={shifts}
                commencements={commencements}
                activeCompany={activeCompany}
                filterTab={filterTab}
                onSaveCommencement={handleSaveCommencement}
                onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
              />
            )}
            {activeApp === 'SAAS_ADMIN' && (
              <CompaniesSubscriptionApp
                subscriptions={subscriptions}
                onUpdateSubscription={handleUpdateSubscription}
                currentUserEmail={currentUserEmail}
              />
            )}
            {activeApp === 'SETTINGS' && (
              <SettingsApp
                companies={companies}
                activeCompany={activeCompany}
`;

code = code.replace(/;\s*if \(activeCompany\.id === c\.id\)/, appsBlock + '\n                onSaveCompany={(c) => {\n                  setCompanies(prev => {\n                    const exists = prev.some(comp => comp.id === c.id);\n                    if (exists) {\n                      return prev.map(comp => comp.id === c.id ? c : comp);\n                    }\n                    return [...prev, c];\n                  });\n                  if (activeCompany.id === c.id)');

fs.writeFileSync('src/App.tsx', code);
