const fs = require('fs');
let file = 'src/apps/EmployeesApp.tsx';
let c = fs.readFileSync(file, 'utf8');

// Insert local state
c = c.replace(
  /const \[isAddJobTitleModalOpen, setIsAddJobTitleModalOpen\] = useState\(false\);/,
  `const [isAddJobTitleModalOpen, setIsAddJobTitleModalOpen] = useState(false);
  const [localViewMode, setLocalViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('employees_view_mode') as ViewMode) || 'KANBAN';
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setLocalViewMode(mode);
    localStorage.setItem('employees_view_mode', mode);
    if (onViewModeChange) onViewModeChange(mode);
  };`
);

// Replace viewMode uses with localViewMode, except in props
c = c.replace(/viewMode === 'KANBAN'/g, "localViewMode === 'KANBAN'");
c = c.replace(/viewMode === 'LIST'/g, "localViewMode === 'LIST'");
c = c.replace(/onViewModeChange\('KANBAN'\)/g, "handleViewModeChange('KANBAN')");
c = c.replace(/onViewModeChange\('LIST'\)/g, "handleViewModeChange('LIST')");

fs.writeFileSync(file, c);
console.log('Fixed viewMode in EmployeesApp');
