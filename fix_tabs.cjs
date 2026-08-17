const fs = require('fs');

let content = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

const regex = /if \(activeTab === 'requests'\) \{[\s\S]*?\{\/\* Odoo KPI Summary Cards \*\/\}/;

const replacement = `  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] text-right" dir="rtl">

      {/* Odoo Control Panel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg w-fit mb-2 border border-purple-100">
            <Shield className="w-3.5 h-3.5" />
            <span>نظام أودو الموحد لإدارة العقود والاشتراكات المتكررة (Odoo Subscriptions & Contracts)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">إدارة اشتراكات الشركات وعقود SaaS</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم المطلق بالإيرادات المتكررة (MRR)، تواريخ التجديد، تفعيل وإيقاف الشركات عبر السحابة
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {activeTab === 'subscriptions' && (
            <>
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الشركة أو البريد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={\`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition \${
                    viewMode === 'kanban' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }\`}
                  title="عرض البطاقات (Kanban)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={\`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition \${
                    viewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }\`}
                  title="عرض القائمة (List View)"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handlePurgeAllCompanies}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="حذف وتطهير كافة الشركات نهائياً"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">تطهير</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="bg-[#714B67] hover:bg-[#5e3f55] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">إنشاء عقد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-2xl px-6 pt-4 gap-6">
        <button 
          onClick={() => setActiveTab('subscriptions')}
          className={\`pb-3 px-2 font-bold text-sm border-b-2 transition-colors \${activeTab === 'subscriptions' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
        >
          الاشتراكات النشطة
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={\`pb-3 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 \${activeTab === 'requests' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
        >
          طلبات الاشتراك الجديدة
          {pendingRequests.filter(r => r.status === 'new').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
              {pendingRequests.filter(r => r.status === 'new').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
              لا توجد طلبات اشتراك جديدة
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{req.companyName}</h3>
                      <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                        <span>المالك: {req.requesterName}</span>
                        <span>•</span>
                        <span>الهاتف: <span className="dir-ltr font-mono inline-block">{req.phone}</span></span>
                        <span>•</span>
                        <span>الموظفين: {req.empCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {req.status === 'new' ? (
                      <>
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          تفعيل الشركة
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          رفض
                        </button>
                      </>
                    ) : (
                      <span className={\`px-3 py-1 text-xs font-bold rounded-full \${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}\`}>
                        {req.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Odoo KPI Summary Cards */}`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', content);
console.log("File patched.");
