import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  ShieldAlert, 
  History, 
  Mail, 
  Receipt, 
  Download, 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  Info,
  Building2,
  CreditCard,
  CalendarDays,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const PayslipManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  // Form fields
  const [basicSalary, setBasicSalary] = useState(0);
  const [lopDays, setLopDays] = useState(0);
  const [lopDeduction, setLopDeduction] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [netSalary, setNetSalary] = useState(0);
  const [daysInMonth, setDaysInMonth] = useState(30);

  // Metadata fields for Payslip Statement
  const [department, setDepartment] = useState('Operations');
  const [designation, setDesignation] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [hasSavedBank, setHasSavedBank] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [payDate, setPayDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(null); // 'draft' | 'publish' | 'publish_and_email'
  const [existingRecord, setExistingRecord] = useState(null);
  
  // History & Filter
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'published' | 'draft'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Modal for detail view
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch all staff on mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/staff/all');
        setStaffList(res.data);
      } catch (err) {
        toast.error('Failed to load staff list');
      }
    };
    fetchStaff();
    fetchHistory();
  }, []);

  // Fetch Payslip History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/payslips/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const getFullMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  // Pre-calculate payroll details when staff & month are selected
  useEffect(() => {
    if (!selectedStaffId || !selectedMonth) {
      setBasicSalary(0);
      setLopDays(0);
      setLopDeduction(0);
      setAllowances(0);
      setBonus(0);
      setDeductions(0);
      setNetSalary(0);
      setExistingRecord(null);
      setDepartment('Operations');
      setDesignation('');
      setBankAccount('');
      setIfscCode('');
      setHasSavedBank(false);
      setIsEditingBank(false);
      setPayDate('');
      return;
    }

    const calculate = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/payslips/calculate?userId=${selectedStaffId}&month=${selectedMonth}`);
        const { 
          employee, 
          lopDays: calcLop, 
          lopDeduction: calcDeduct, 
          netSalary: calcNet, 
          daysInMonth: calcDays, 
          existingPayslip 
        } = res.data;
        
        setDaysInMonth(calcDays);

        // Auto compute default pay date (last day of month)
        const [yearStr, monthStr] = selectedMonth.split('-');
        const lastDay = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
        const defaultPayDate = `${lastDay} ${getFullMonthName(selectedMonth)}`;

        const empBank = employee.bankAccount || '';
        const empIfsc = employee.ifscCode || '';
        const hasBank = Boolean(empBank || empIfsc);
        setHasSavedBank(hasBank);

        if (existingPayslip) {
          // If record exists (draft or published), pre-populate saved values
          setExistingRecord(existingPayslip);
          setBasicSalary(existingPayslip.basicSalary ?? employee.basicSalary ?? 0);
          setLopDays(existingPayslip.lopDays ?? calcLop ?? 0);
          setLopDeduction(existingPayslip.lopDeduction ?? calcDeduct ?? 0);
          setAllowances(existingPayslip.allowances ?? 0);
          setBonus(existingPayslip.bonus ?? 0);
          setDeductions(existingPayslip.deductions ?? 0);
          setNetSalary(existingPayslip.netSalary ?? calcNet ?? 0);
          setDepartment(existingPayslip.department || employee.department || 'Operations');
          setDesignation(existingPayslip.designation || employee.designation || employee.role?.toUpperCase() || 'Staff');
          setBankAccount(existingPayslip.bankAccount || empBank || '');
          setIfscCode(existingPayslip.ifscCode || empIfsc || '');
          setPaymentMode(existingPayslip.paymentMode || 'Bank Transfer');
          setPayDate(existingPayslip.payDate || defaultPayDate);
          setIsEditingBank(!hasBank);
          
          if (existingPayslip.status === 'draft') {
            toast('Draft found for this month. You can edit and publish.', { icon: '📝' });
          } else {
            toast('Payslip already published for this month.', { icon: 'ℹ️' });
          }
        } else {
          // New calculation
          setExistingRecord(null);
          setBasicSalary(employee.basicSalary || 0);
          setLopDays(calcLop || 0);
          setLopDeduction(calcDeduct || 0);
          setAllowances(0);
          setBonus(0);
          setDeductions(0);
          setNetSalary(calcNet || 0);
          setDepartment(employee.department || 'Operations');
          setDesignation(employee.designation || employee.role?.toUpperCase() || 'Staff');
          setBankAccount(empBank);
          setIfscCode(empIfsc);
          setIsEditingBank(!hasBank);
          setPaymentMode('Bank Transfer');
          setPayDate(defaultPayDate);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to calculate payslip details');
      } finally {
        setLoading(false);
      }
    };

    calculate();
  }, [selectedStaffId, selectedMonth]);

  // Handle direct save/update of Bank Account & IFSC to Staff Profile
  const handleSaveStaffBankDetails = async () => {
    if (!selectedStaffId) {
      toast.error('Please select a staff member first');
      return;
    }
    setSavingBank(true);
    try {
      await api.put(`/staff/${selectedStaffId}`, {
        bankAccount,
        ifscCode
      });
      setHasSavedBank(Boolean(bankAccount || ifscCode));
      setIsEditingBank(false);
      toast.success('Staff Bank Account & IFSC saved successfully!');
      // Update local staff list cache
      setStaffList(prev => prev.map(s => s._id === selectedStaffId ? { ...s, bankAccount, ifscCode } : s));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save staff bank details');
    } finally {
      setSavingBank(false);
    }
  };

  // Handle live recalculation in frontend
  const handleRecalculate = (updatedLopDays, updatedAllowances, updatedBonus, updatedDeductions, updatedBasicSalary, updatedLopDeduction) => {
    const sal = updatedBasicSalary !== undefined ? Number(updatedBasicSalary) : Number(basicSalary);
    const lDays = updatedLopDays !== undefined ? Number(updatedLopDays) : Number(lopDays);
    const allow = updatedAllowances !== undefined ? Number(updatedAllowances) : Number(allowances);
    const bon = updatedBonus !== undefined ? Number(updatedBonus) : Number(bonus);
    const deduct = updatedDeductions !== undefined ? Number(updatedDeductions) : Number(deductions);
    
    let calculatedLopDeduction = lopDeduction;
    if (updatedLopDeduction !== undefined) {
      calculatedLopDeduction = Number(updatedLopDeduction);
    } else if (updatedBasicSalary !== undefined || updatedLopDays !== undefined) {
      calculatedLopDeduction = daysInMonth > 0 ? Math.round(((sal / daysInMonth) * lDays) * 100) / 100 : 0;
    }
    
    const calculatedNetSalary = Math.max(0, Math.round((sal + allow + bon - deduct - calculatedLopDeduction) * 100) / 100);
    
    if (updatedBasicSalary !== undefined) setBasicSalary(updatedBasicSalary);
    if (updatedLopDays !== undefined) setLopDays(updatedLopDays);
    if (updatedLopDeduction !== undefined || updatedBasicSalary !== undefined || updatedLopDays !== undefined) {
      setLopDeduction(calculatedLopDeduction);
    }
    if (updatedAllowances !== undefined) setAllowances(updatedAllowances);
    if (updatedBonus !== undefined) setBonus(updatedBonus);
    if (updatedDeductions !== undefined) setDeductions(updatedDeductions);
    setNetSalary(calculatedNetSalary);
  };

  // Submit action: 'draft' | 'publish' | 'publish_and_email'
  const handleSubmitAction = async (actionType) => {
    if (!selectedStaffId) {
      toast.error('Please select an employee first');
      return;
    }
    if (!selectedMonth) {
      toast.error('Please choose the target month');
      return;
    }

    setSubmittingAction(actionType);
    try {
      const res = await api.post('/payslips/generate', {
        userId: selectedStaffId,
        month: selectedMonth,
        basicSalary,
        allowances,
        bonus,
        deductions,
        lopDays,
        lopDeduction,
        netSalary,
        department,
        designation,
        bankAccount,
        ifscCode,
        paymentMode,
        payDate,
        saveBankToProfile: true,
        action: actionType
      });

      if (actionType === 'draft') {
        toast.success(res.data.message || 'Saved as Draft (Admin Only)');
      } else if (actionType === 'publish') {
        toast.success(res.data.message || 'Published to Staff Dashboard');
      } else {
        if (res.data.emailSent) {
          toast.success(res.data.message || 'Generated, Published & Emailed!');
        } else {
          toast.success('Payslip published to staff dashboard!', { duration: 4000 });
          if (res.data.emailError) {
            toast.error(`Email delivery failed: ${res.data.emailError}`, { duration: 6000 });
          }
        }
      }
      
      // Reset form
      setSelectedStaffId('');
      setSelectedMonth('');
      setExistingRecord(null);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmittingAction(null);
    }
  };

  // Quick Publish from history table
  const handleQuickPublish = async (id, employeeName, month) => {
    setActionLoadingId(id);
    try {
      const res = await api.post(`/payslips/${id}/publish`);
      toast.success(res.data.message || `Published payslip for ${month} to staff dashboard!`);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish draft');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Send / Resend Email
  const handleSendEmail = async (id, staffEmail) => {
    setActionLoadingId(id);
    try {
      const res = await api.post(`/payslips/${id}/send-email`);
      toast.success(res.data.message || `Email sent successfully to ${staffEmail}`);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to send email to ${staffEmail}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Load an existing record into the form for editing
  const handleEditRecord = (payslip) => {
    setSelectedStaffId(payslip.userId?._id || payslip.userId);
    setSelectedMonth(payslip.month);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPDF = async (payslip) => {
    try {
      const response = await api.get(`/payslips/${payslip._id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Payslip_${payslip.userId?.name?.replace(/\s+/g, '_') || 'Staff'}_${payslip.month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('PDF Payslip downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download PDF Payslip');
      console.error(err);
    }
  };

  const handleDeletePayslip = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payslip permanently? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/payslips/${id}`);
      toast.success('Payslip deleted successfully');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete payslip');
      console.error(err);
    }
  };

  // Filtered History
  const filteredHistory = history.filter(p => {
    if (activeTab === 'published') return p.status === 'published' || p.status === 'paid';
    if (activeTab === 'draft') return p.status === 'draft';
    return true;
  });

  const draftCount = history.filter(p => p.status === 'draft').length;
  const publishedCount = history.filter(p => p.status !== 'draft').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Staff Payroll & Payslips</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate SM Groups Payslip Statements, save drafts, publish directly to employee dashboards, or dispatch via email.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Generate Monthly Payslip (Full Page Top Section) */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <Coins className="text-primary" size={22} />
                Generate Monthly Payslip
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Calculate earnings, LOP deductions & issue official SM Groups payslip statements
              </p>
            </div>
            {existingRecord && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                existingRecord.status === 'draft' 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {existingRecord.status === 'draft' ? 'Draft' : 'Finalized'}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {/* Top Row: Employee & Month Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Select Employee */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Select Staff Member
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-medium bg-white appearance-none cursor-pointer hover:border-slate-300 transition-colors text-xs sm:text-sm"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name} ({staff.staffId || 'No ID'} - {staff.role?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              {/* Target Month */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Statement Month
                </label>
                <div className="relative">
                  <input
                    type="month"
                    required
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-medium bg-white hover:border-slate-300 transition-colors text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {loading && (
              <div className="py-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium">Calculating LOP & fetching employee payroll rates...</span>
              </div>
            )}

            {!loading && selectedStaffId && selectedMonth && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4 border-t border-slate-100">
                
                {/* Status Banner */}
                {existingRecord ? (
                  existingRecord.status === 'draft' ? (
                    <div className="p-3.5 rounded-xl flex items-start gap-2.5 text-xs bg-amber-50 text-amber-800 border border-amber-200">
                      <Info size={18} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <strong className="font-bold">Draft in Progress:</strong>
                        <p className="mt-0.5">
                          Saved in admin drafts. You can adjust values and choose to update draft, publish to staff dashboard, or email.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl flex items-start gap-2.5 text-xs bg-rose-50 text-rose-800 border border-rose-200">
                      <ShieldAlert size={18} className="shrink-0 mt-0.5 text-rose-600" />
                      <div className="space-y-1">
                        <strong className="font-bold text-rose-900">Payslip Finalized for {getMonthName(selectedMonth)}:</strong>
                        <p className="leading-relaxed">
                          This payslip has already been generated and published. Duplicate generation for the same month is locked.
                        </p>
                      </div>
                    </div>
                  )
                ) : null}

                {/* Section A (Earnings) & Section B (Deductions) in a 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Section A: Earnings */}
                  <div className="bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200/60 pb-2">
                      3. Earnings & Inclusions
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Basic Salary (₹)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={basicSalary === 0 ? '' : basicSalary}
                          onChange={(e) => handleRecalculate(lopDays, allowances, bonus, deductions, e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Days in Month</label>
                        <input
                          type="number"
                          disabled
                          value={daysInMonth}
                          className="w-full p-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Allowance (+ ₹)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={allowances === 0 ? '' : allowances}
                          onChange={(e) => handleRecalculate(lopDays, e.target.value, bonus, deductions, basicSalary)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-emerald-600 font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Bonus (+ ₹)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={bonus === 0 ? '' : bonus}
                          onChange={(e) => handleRecalculate(lopDays, allowances, e.target.value, deductions, basicSalary)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-emerald-600 font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: Deductions & LOP */}
                  <div className="bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200/60 pb-2">
                      4. Loss of Pay & Deductions
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">LOP Days (Unpaid)</label>
                        <input
                          type="number"
                          min="0"
                          max={daysInMonth}
                          step="0.5"
                          placeholder="0"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={lopDays === 0 ? '' : lopDays}
                          onChange={(e) => handleRecalculate(e.target.value, allowances, bonus, deductions, basicSalary)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">LOP Deduction (- ₹)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={lopDeduction === 0 ? '' : lopDeduction}
                          onChange={(e) => handleRecalculate(lopDays, allowances, bonus, deductions, basicSalary, e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-red-500 font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Other Deductions (- ₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        disabled={existingRecord && existingRecord.status !== 'draft'}
                        value={deductions === 0 ? '' : deductions}
                        onChange={(e) => handleRecalculate(lopDays, allowances, bonus, e.target.value, basicSalary)}
                        className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-red-500 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C (Bank Details) & Section D (Statement Metadata) in a 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Section C: Staff Bank Account & IFSC Code */}
                  <div className="bg-slate-50/90 p-4 sm:p-5 rounded-xl border border-slate-200/90 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={15} className="text-primary" />
                        5. Bank Account & IFSC Code
                      </label>
                      {hasSavedBank && !isEditingBank && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={11} /> Saved in Profile
                        </span>
                      )}
                    </div>

                    {!isEditingBank && hasSavedBank ? (
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bank Account</span>
                            <span className="font-mono font-bold text-slate-900">{bankAccount || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">IFSC Code</span>
                            <span className="font-mono font-bold text-slate-900 uppercase">{ifscCode || '-'}</span>
                          </div>
                        </div>
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsEditingBank(true)}
                            className="text-xs font-semibold text-primary hover:text-blue-700 flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <Edit3 size={12} /> Edit Bank Info
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Bank Account</label>
                            <input
                              type="text"
                              placeholder="e.g. 123456789012"
                              value={bankAccount}
                              onChange={(e) => setBankAccount(e.target.value)}
                              className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-mono bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">IFSC Code</label>
                            <input
                              type="text"
                              placeholder="e.g. SBIN0001234"
                              value={ifscCode}
                              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                              className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-mono uppercase bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleSaveStaffBankDetails}
                            disabled={savingBank}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {savingBank ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} className="text-white" />
                            )}
                            {hasSavedBank ? 'Save & Update Profile' : 'Save to Staff Profile'}
                          </button>
                          {hasSavedBank && (
                            <button
                              type="button"
                              onClick={() => setIsEditingBank(false)}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section D: Statement Options */}
                  <div className="bg-slate-50/90 p-4 sm:p-5 rounded-xl border border-slate-200/90 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={15} className="text-primary" />
                        6. Department, Role & Pay Details
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Department</label>
                        <input
                          type="text"
                          placeholder="Operations"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg text-slate-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Designation</label>
                        <input
                          type="text"
                          placeholder="Specialist / Developer"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg text-slate-800 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Payment Mode</label>
                        <input
                          type="text"
                          placeholder="Bank Transfer"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg text-slate-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Pay Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 31 March 2026"
                          disabled={existingRecord && existingRecord.status !== 'draft'}
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Take-Home Statement Summary Box */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-5 sm:p-6 rounded-2xl shadow-md shadow-blue-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-blue-400/20">
                  <div>
                    <span className="text-xs font-bold text-blue-100 uppercase tracking-wider block">Net Take-Home Pay</span>
                    <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-1">
                      Basic (₹{basicSalary}) + Allow (₹{allowances}) + Bonus (₹{bonus}) - LOP (₹{lopDeduction}) - Deduct (₹{deductions})
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-sm">₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {existingRecord && existingRecord.status !== 'draft' ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      To re-issue a new payslip, delete the existing record from the history table below.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPayslip(existingRecord);
                        setIsDetailOpen(true);
                      }}
                      className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-xl font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      View Payslip Statement Preview
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {/* Live Preview Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const previewObj = {
                          userId: staffList.find(s => s._id === selectedStaffId) || { name: 'Staff Member', staffId: 'ID' },
                          month: selectedMonth,
                          basicSalary: Number(basicSalary),
                          allowances: Number(allowances),
                          bonus: Number(bonus),
                          lopDays: Number(lopDays),
                          lopDeduction: Number(lopDeduction),
                          deductions: Number(deductions),
                          netSalary: Number(netSalary),
                          department: department || 'Operations',
                          designation: designation || 'Staff Member',
                          bankAccount: bankAccount || '-',
                          ifscCode: ifscCode || '-',
                          paymentMode: paymentMode || 'Bank Transfer',
                          payDate: payDate || 'End of Month',
                          status: existingRecord ? existingRecord.status : 'draft'
                        };
                        setSelectedPayslip(previewObj);
                        setIsDetailOpen(true);
                      }}
                      className="w-full bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm border border-indigo-200/80 shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={16} className="text-indigo-600" />
                      Preview Statement Layout
                    </button>

                    {/* 1. Save as Draft */}
                    <button
                      type="button"
                      disabled={!!submittingAction}
                      onClick={() => handleSubmitAction('draft')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 disabled:opacity-50"
                    >
                      {submittingAction === 'draft' ? (
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FileText size={16} className="text-amber-600" />
                      )}
                      <span>{existingRecord ? 'Update Draft' : 'Save as Draft'}</span>
                    </button>

                    {/* 2. Publish to Dashboard */}
                    <button
                      type="button"
                      disabled={!!submittingAction}
                      onClick={() => handleSubmitAction('publish')}
                      className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingAction === 'publish' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span>Publish to Dashboard</span>
                    </button>

                    {/* 3. Publish & Email */}
                    <button
                      type="button"
                      disabled={!!submittingAction}
                      onClick={() => handleSubmitAction('publish_and_email')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingAction === 'publish_and_email' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Mail size={16} />
                      )}
                      <span>Publish & Send Email</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* 2. Payroll Records & History (Full Page Bottom Section) */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <History className="text-primary" size={22} />
                Payroll Records & History
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                View, manage, email and download all generated monthly employee payslips
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setActiveTab('published')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'published' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Dashboard ({publishedCount})
              </button>
              <button
                onClick={() => setActiveTab('draft')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'draft' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Drafts ({draftCount})
              </button>
            </div>
          </div>

          {historyLoading ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium mt-2">Loading historical records...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-20 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Receipt size={36} />
                <span className="text-sm font-medium">No payslips found in this view.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse" aria-label="Payslip audit list">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Month</th>
                      <th className="p-3.5 text-right">Net Pay</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {filteredHistory.map((payslip) => {
                      const isDraft = payslip.status === 'draft';
                      const isLoadingThis = actionLoadingId === payslip._id;

                      return (
                        <tr key={payslip._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800">{payslip.userId?.name || 'Removed Employee'}</div>
                            <div className="text-xs text-slate-400">{payslip.userId?.staffId} • {payslip.designation || payslip.userId?.role}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                              {getMonthName(payslip.month)}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="font-extrabold text-slate-900">₹{payslip.netSalary.toLocaleString('en-IN')}</div>
                            <div className="text-xs text-slate-400">Basic: ₹{payslip.basicSalary.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {isDraft ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={12} />
                                  Draft (Admin Only)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={12} />
                                  On Dashboard
                                </span>
                              )}

                              {payslip.emailSent && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">
                                  <Mail size={10} />
                                  Emailed
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* If Draft: Quick Publish */}
                              {isDraft && (
                                <button
                                  onClick={() => handleQuickPublish(payslip._id, payslip.userId?.name, payslip.month)}
                                  disabled={isLoadingThis}
                                  title="Publish to Staff Dashboard"
                                  className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                >
                                  {isLoadingThis ? <div className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Send size={12} />}
                                  Publish
                                </button>
                              )}

                              {/* Send Email Button */}
                              <button
                                onClick={() => handleSendEmail(payslip._id, payslip.userId?.email)}
                                disabled={isLoadingThis}
                                title={payslip.emailSent ? "Resend Email" : "Send to Email"}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                                  payslip.emailSent 
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' 
                                    : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700'
                                }`}
                              >
                                <Mail size={12} />
                                {payslip.emailSent ? 'Resend' : 'Email'}
                              </button>

                              {/* Edit in form */}
                              {isDraft && (
                                <button
                                  onClick={() => handleEditRecord(payslip)}
                                  title="Edit draft in form"
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                >
                                  <Edit3 size={12} />
                                  Edit
                                </button>
                              )}

                              {/* View Details Modal */}
                              <button
                                onClick={() => {
                                  setSelectedPayslip(payslip);
                                  setIsDetailOpen(true);
                                }}
                                className="bg-slate-100 hover:bg-primary hover:text-white text-slate-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              >
                                View
                              </button>

                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadPDF(payslip)}
                                title="Download Statement PDF"
                                className="bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 p-1.5 rounded-lg text-xs font-semibold transition-all"
                              >
                                <Download size={13} />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeletePayslip(payslip._id)}
                                title="Delete payslip"
                                className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 p-1.5 rounded-lg text-xs font-semibold transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Payslip Statement Detail Modal - PDF Document View */}
      {selectedPayslip && (
        <Modal 
          isOpen={isDetailOpen} 
          onClose={() => setIsDetailOpen(false)} 
          title="Payslip Statement Preview"
          maxWidth="max-w-4xl sm:max-w-4xl w-full"
        >
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold uppercase text-[11px] ${
                  selectedPayslip.status === 'draft' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedPayslip.status === 'draft' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {selectedPayslip.status === 'draft' ? 'Draft Statement' : 'Official Statement'}
                </span>
                <span className="text-slate-500 font-medium">Format: Official A4 PDF Layout</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('printable-pdf-document')?.innerHTML;
                    if (!printContents) return;
                    const printWin = window.open('', '_blank');
                    printWin.document.write(`
                      <html>
                        <head>
                          <title>Payslip - ${selectedPayslip.userId?.name || 'Staff'}</title>
                          <style>
                            @page { size: A4; margin: 0; }
                            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                            th { background: #0f172a; color: white; padding: 8px 12px; }
                            td { padding: 8px 12px; border: 1px solid #cbd5e1; }
                          </style>
                        </head>
                        <body onload="window.print();window.close();">
                          ${printContents}
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedPayslip)}
                  className="bg-primary hover:bg-primary-dark text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-sm shadow-primary/20 transition-all text-xs"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>

            {/* Document Paper Container (Exact A4 PDF Background & Layout) */}
            <div className="w-full overflow-x-auto p-1 sm:p-2 flex justify-center bg-slate-200/50 rounded-2xl border border-slate-200">
              <div 
                id="printable-pdf-document"
                style={{ 
                  backgroundImage: "url('/templates/payslip-bg.png')", 
                  backgroundSize: '100% 100%', 
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  minHeight: '940px'
                }}
                className="relative bg-white border border-slate-300 rounded-xl shadow-xl p-8 sm:p-12 overflow-hidden text-slate-800 font-sans w-[720px] max-w-full flex flex-col justify-between"
              >
                <div>
                  {/* Header Content: Official Logo */}
                  <div className="relative z-10 pb-2">
                    <div className="flex justify-center pt-1 pb-2">
                      <img 
                        src="/templates/sm-groups-logo.png" 
                        alt="The SM Groups - Behind a thing" 
                        className="h-16 sm:h-20 w-auto max-w-[340px] object-contain" 
                      />
                    </div>

                    {/* Building Sketch & Statement Title */}
                    <div className="mt-2 flex items-center gap-5 sm:gap-6">
                      <img 
                        src="/templates/building_sketch.png" 
                        alt="Building Sketch" 
                        className="h-20 sm:h-24 md:h-28 w-auto object-contain shrink-0 drop-shadow-sm" 
                      />
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0B1528] tracking-wider uppercase font-sans">
                        PAYSLIP STATEMENT
                      </h3>
                    </div>

                    {/* Divider Line */}
                    <div className="w-full h-[2px] bg-slate-500 mt-2 mb-1"></div>
                  </div>

                  {/* Employee Details (Vertical List, No Box) */}
                  <div className="relative z-10 my-4 space-y-1.5 text-xs text-slate-900">
                    <div className="flex items-center">
                      <span className="font-bold text-slate-900 w-36 shrink-0">Month</span>
                      <span className="font-medium text-slate-800">: {getFullMonthName(selectedPayslip.month)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-slate-900 w-36 shrink-0">Employee Name</span>
                      <span className="font-extrabold text-slate-900">: {selectedPayslip.userId?.name || 'Staff Member'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-slate-900 w-36 shrink-0">Employee ID</span>
                      <span className="font-medium text-slate-800">: {selectedPayslip.userId?.staffId || '-'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-slate-900 w-36 shrink-0">Department</span>
                      <span className="font-medium text-slate-800">: {selectedPayslip.department || 'Operations'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-slate-900 w-36 shrink-0">Designation</span>
                      <span className="font-medium text-slate-800">: {selectedPayslip.designation || selectedPayslip.userId?.role?.toUpperCase() || '-'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-slate-900 w-36 shrink-0">Pay Date</span>
                      <span className="font-medium text-slate-800">: {selectedPayslip.payDate || 'End of Month'}</span>
                    </div>
                  </div>

                  {/* Earnings Table */}
                  <div className="relative z-10 space-y-2 mb-6">
                    <h4 className="text-sm font-bold text-slate-900">Earnings</h4>
                    
                    <div className="border border-slate-900 overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-black text-white font-bold">
                            <th className="p-2.5 px-5 text-center border-r border-slate-900 w-1/2">Description</th>
                            <th className="p-2.5 px-5 text-center w-1/2">Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-800">
                          <tr className="border-b border-slate-900">
                            <td className="p-2 px-5 font-medium border-r border-slate-900">Basic Salary</td>
                            <td className="p-2 px-5 text-center font-medium">₹{Number(selectedPayslip.basicSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-2 px-5 font-medium border-r border-slate-900">Allowance</td>
                            <td className="p-2 px-5 text-center font-medium">
                              {Number(selectedPayslip.allowances || 0) > 0 ? `₹${Number(selectedPayslip.allowances).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-2 px-5 font-medium border-r border-slate-900">Performance Bonus</td>
                            <td className="p-2 px-5 text-center font-medium">
                              {Number(selectedPayslip.bonus || 0) > 0 ? `₹${Number(selectedPayslip.bonus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-900">
                            <td className="p-2 px-5 font-medium border-r border-slate-900">
                              LOP Deduction ({selectedPayslip.lopDays || 0} days)
                            </td>
                            <td className="p-2 px-5 text-center font-medium">
                              {selectedPayslip.lopDeduction > 0 ? `- ₹${Number(selectedPayslip.lopDeduction).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                            </td>
                          </tr>
                          {selectedPayslip.deductions > 0 && (
                            <tr className="border-b border-slate-900">
                              <td className="p-2 px-5 font-medium border-r border-slate-900">Other Deductions</td>
                              <td className="p-2 px-5 text-center font-medium">- ₹{Number(selectedPayslip.deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          )}
                          <tr className="font-bold border-t-2 border-slate-900 text-slate-900">
                            <td className="p-2.5 px-5 text-center border-r border-slate-900 font-bold">
                              Total Earnings
                            </td>
                            <td className="p-2.5 px-5 text-center font-bold">
                              ₹{Number(selectedPayslip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bottom Payment Details (Vertical List, No Box) */}
                  <div className="relative z-10 grid grid-cols-2 gap-6 pt-1 text-xs">
                    {/* Left: Net Pay, Bank Account, IFSC Code & Payment Mode */}
                    <div className="space-y-1.5 text-slate-900">
                      <div className="flex items-center">
                        <span className="font-bold w-28 shrink-0">Net Pay</span>
                        <span className="font-bold text-slate-900">: ₹{Number(selectedPayslip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold w-28 shrink-0">Bank Account</span>
                        <span className="font-medium text-slate-800">: {selectedPayslip.bankAccount || selectedPayslip.userId?.bankAccount || '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold w-28 shrink-0">IFSC Code</span>
                        <span className="font-medium text-slate-800 uppercase">: {selectedPayslip.ifscCode || selectedPayslip.userId?.ifscCode || '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold w-28 shrink-0">Payment Mode</span>
                        <span className="font-medium text-slate-800">: {selectedPayslip.paymentMode || 'Bank Transfer'}</span>
                      </div>
                    </div>

                    {/* Right spacer for background template signature */}
                    <div className="flex flex-col justify-end items-end p-2 text-right opacity-0 pointer-events-none select-none">
                      <p className="text-[11px] font-medium">Authorized by:</p>
                      <p className="text-xs font-semibold">Managing Director– The SM Groups</p>
                      <div className="mt-4 pt-1.5 w-44 text-center">
                        <p className="font-black text-sm tracking-wider">Ganga</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedPayslip)}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-md shadow-primary/25"
              >
                <Download size={15} /> Download PDF
              </button>
              <button
                type="button"
                onClick={() => handleSendEmail(selectedPayslip._id, selectedPayslip.userId?.email)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-md shadow-emerald-600/10"
              >
                <Mail size={15} /> {selectedPayslip.emailSent ? 'Resend Email' : 'Send to Staff Email'}
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

export default PayslipManagement;
