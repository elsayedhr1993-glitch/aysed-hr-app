const fs = require('fs');
let file = 'src/apps/EmployeesApp.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /const \[isFilterMenuOpen, setIsFilterMenuOpen\] = useState\(false\);/,
  `const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [localViewMode, setLocalViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('employees_view_mode') as ViewMode) || 'KANBAN';
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setLocalViewMode(mode);
    localStorage.setItem('employees_view_mode', mode);
    if (onViewModeChange) onViewModeChange(mode);
  };`
);

fs.writeFileSync(file, c);
console.log('Fixed viewMode state in EmployeesApp');
