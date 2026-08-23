const fs = require('fs');

let file = 'src/components/HolidayWorkManagementView.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const handleSave = async \(e: React\.FormEvent\) => \{[\s\S]*?  const handleApprove = async/m, `const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error('يرجى اختيار الموظف');
      return;
    }
    setSubmitting(true);
    try {
      const newRec: WorkOnHolidayRecord = {
        employeeId,
        date,
        holidayName,
        hoursWorked: Number(hoursWorked),
        compensationType,
        state: 'draft'
      };

      await addDoc(collection(db, 'work_on_holidays'), newRec);

      toast.success('تم تسجيل العمل في العطلة بنجاح');
      setIsModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ السجل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async`);

fs.writeFileSync(file, c);
console.log('Fixed HolidayWorkManagementView.');
