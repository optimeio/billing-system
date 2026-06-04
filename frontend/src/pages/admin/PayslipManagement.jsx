import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User as UserIcon, Coins, ShieldAlert, History, Mail, Receipt, Download } from 'lucide-react';
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
  const [deductions, setDeductions] = useState(0);
  const [netSalary, setNetSalary] = useState(0);
  const [daysInMonth, setDaysInMonth] = useState(30);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  
  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
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

  // Pre-calculate payroll details when staff & month are selected
  useEffect(() => {
    if (!selectedStaffId || !selectedMonth) {
      setBasicSalary(0);
      setLopDays(0);
      setLopDeduction(0);
      setAllowances(0);
      setDeductions(0);
      setNetSalary(0);
      setAlreadyGenerated(false);
      return;
    }

    const calculate = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/payslips/calculate?userId=${selectedStaffId}&month=${selectedMonth}`);
        const { employee, lopDays: calcLop, lopDeduction: calcDeduct, netSalary: calcNet, daysInMonth: calcDays, alreadyGenerated: exists } = res.data;
        
        setBasicSalary(employee.basicSalary || 0);
        setDaysInMonth(calcDays);
        setLopDays(calcLop);
        setLopDeduction(calcDeduct);
        setAllowances(0);
        setDeductions(0);
        setNetSalary(calcNet);
        setAlreadyGenerated(exists);

        if (exists) {
          toast.error(`Payslip for ${selectedMonth} has already been generated!`);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to calculate payslip details');
      } finally {
        setLoading(false);
      }
    };

    calculate();
  }, [selectedStaffId, selectedMonth]);

  // Handle live recalculation in frontend when allowances, deductions, lopDays, basicSalary, or lopDeduction change
  const handleRecalculate = (updatedLopDays, updatedAllowances, updatedDeductions, updatedBasicSalary, updatedLopDeduction) => {
    const sal = updatedBasicSalary !== undefined ? Number(updatedBasicSalary) : Number(basicSalary);
    const lDays = updatedLopDays !== undefined ? Number(updatedLopDays) : Number(lopDays);
    const allow = updatedAllowances !== undefined ? Number(updatedAllowances) : Number(allowances);
    const deduct = updatedDeductions !== undefined ? Number(updatedDeductions) : Number(deductions);
    
    let calculatedLopDeduction = lopDeduction;
    if (updatedLopDeduction !== undefined) {
      calculatedLopDeduction = Number(updatedLopDeduction);
    } else if (updatedBasicSalary !== undefined || updatedLopDays !== undefined) {
      calculatedLopDeduction = daysInMonth > 0 ? Math.round(((sal / daysInMonth) * lDays) * 100) / 100 : 0;
    }
    
    const calculatedNetSalary = Math.max(0, Math.round((sal + allow - deduct - calculatedLopDeduction) * 100) / 100);
    
    if (updatedBasicSalary !== undefined) setBasicSalary(updatedBasicSalary);
    if (updatedLopDays !== undefined) setLopDays(updatedLopDays);
    if (updatedLopDeduction !== undefined || updatedBasicSalary !== undefined || updatedLopDays !== undefined) {
      setLopDeduction(calculatedLopDeduction);
    }
    if (updatedAllowances !== undefined) setAllowances(updatedAllowances);
    if (updatedDeductions !== undefined) setDeductions(updatedDeductions);
    setNetSalary(calculatedNetSalary);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (alreadyGenerated) {
      toast.error('Payslip already exists for this month. Cannot overwrite.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/payslips/generate', {
        userId: selectedStaffId,
        month: selectedMonth,
        basicSalary,
        allowances,
        deductions,
        lopDays,
        lopDeduction,
        netSalary
      });
      toast.success('Payslip generated and emailed successfully!');
      
      // Reset form
      setSelectedStaffId('');
      setSelectedMonth('');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setSubmitting(false);
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


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Staff Payroll & LOP</h1>
          <p className="text-sm text-slate-500 mt-1">Generate payslips, calculate loss-of-pay deductions, and notify staff members via email.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payroll Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Coins className="text-primary" size={20} />
              Process Monthly Pay
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Select Employee</label>
                <div className="relative">
                  <select
                    required
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-white text-slate-700"
                  >
                    <option value="">-- Choose Staff member --</option>
                    {staffList.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name} ({staff.staffId} - {staff.role})
                      </option>
                    ))}
                  </select>
                  <UserIcon className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Target Month</label>
                <div className="relative">
                  <input
                    type="month"
                    required
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700"
                  />
                  <Calendar className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              {loading && (
                <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Calculating LOP & default rates...</span>
                </div>
              )}

              {!loading && selectedStaffId && selectedMonth && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-slate-100">
                  {alreadyGenerated && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2 text-xs">
                      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                      <span>Warning: A payslip has already been generated and processed for this month. You cannot submit again.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Basic Salary (INR)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={basicSalary === 0 ? '' : basicSalary}
                        onChange={(e) => handleRecalculate(lopDays, allowances, deductions, e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-semibold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Days in Month</label>
                      <input
                        type="number"
                        disabled
                        value={daysInMonth}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">LOP Days (Unpaid)</label>
                      <input
                        type="number"
                        min="0"
                        max={daysInMonth}
                        step="0.5"
                        placeholder="0"
                        value={lopDays === 0 ? '' : lopDays}
                        onChange={(e) => handleRecalculate(e.target.value, allowances, deductions, basicSalary)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">LOP Deduction (INR)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={lopDeduction === 0 ? '' : lopDeduction}
                        onChange={(e) => handleRecalculate(lopDays, allowances, deductions, basicSalary, e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-red-500 font-semibold bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Allowances / Bonus</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={allowances === 0 ? '' : allowances}
                        onChange={(e) => handleRecalculate(lopDays, e.target.value, deductions, basicSalary)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Other Deductions</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={deductions === 0 ? '' : deductions}
                        onChange={(e) => handleRecalculate(lopDays, allowances, e.target.value, basicSalary)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center mt-6">
                    <span className="text-sm font-bold text-slate-600">Net Take-Home Salary</span>
                    <span className="text-xl font-black text-slate-800">₹{netSalary.toLocaleString('en-IN')}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || alreadyGenerated}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Generate & Email Payslip
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </form>
          </div>
        </div>

        {/* Audit Log / History List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="text-primary" size={20} />
              Payroll Audit Log & History
            </h2>

            {historyLoading ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium mt-2">Loading historical records...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-24 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Receipt size={36} />
                <span className="text-sm font-medium">No payslips have been generated yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse" aria-label="Payslip audit list">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Employee</th>
                      <th className="p-4">Month</th>
                      <th className="p-4 text-right">Basic Pay</th>
                      <th className="p-4 text-right">LOP Ded.</th>
                      <th className="p-4 text-right">Net Take-Home</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {history.map((payslip) => (
                      <tr key={payslip._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{payslip.userId?.name || 'Removed Employee'}</div>
                          <div className="text-xs text-slate-400">{payslip.userId?.staffId} • {payslip.userId?.role}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                            {getMonthName(payslip.month)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium">₹{payslip.basicSalary.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right text-red-500 font-medium">
                          {payslip.lopDays > 0 ? `-₹${payslip.lopDeduction.toLocaleString('en-IN')} (${payslip.lopDays}d)` : 'None'}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-800">₹{payslip.netSalary.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(payslip.generatedAt || payslip.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedPayslip(payslip);
                                setIsDetailOpen(true);
                              }}
                              className="bg-slate-100 hover:bg-primary hover:text-white text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeletePayslip(payslip._id)}
                              className="bg-red-50 hover:bg-red-650 hover:text-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Detail Modal */}
      {selectedPayslip && (
        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Payslip Statement Details">
          <div className="p-4 space-y-6" id="printable-payslip">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">SM GROUPS</h3>
                <p className="text-xs text-slate-400">Payroll & LOP Slip</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase">
                  {selectedPayslip.status}
                </span>
                <p className="text-xs text-slate-500 mt-1">{getMonthName(selectedPayslip.month)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee Name</span>
                <span className="font-bold text-slate-800">{selectedPayslip.userId?.name || 'Removed Staff'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff ID</span>
                <span className="font-bold text-slate-800">{selectedPayslip.userId?.staffId || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</span>
                <span className="font-semibold text-slate-600 capitalize">{selectedPayslip.userId?.role || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</span>
                <span className="font-semibold text-slate-600">{selectedPayslip.userId?.email || '-'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">Earnings & Deductions Summary</h4>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-semibold text-slate-800">₹{selectedPayslip.basicSalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Allowances / Bonuses</span>
                  <span className="font-semibold text-green-600">+ ₹{selectedPayslip.allowances.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Other Deductions</span>
                  <span className="font-semibold text-red-500">- ₹{selectedPayslip.deductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2.5">
                  <span className="text-slate-600">Loss of Pay Deduction ({selectedPayslip.lopDays} days)</span>
                  <span className="font-semibold text-red-500">- ₹{selectedPayslip.lopDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold text-slate-800 text-lg">
                  <span>Net Salary</span>
                  <span>₹{selectedPayslip.netSalary.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center text-xs text-slate-400 space-y-1">
              <div>Generated by: <strong className="text-slate-500">{selectedPayslip.generatedBy?.name || 'Admin'}</strong></div>
              <div>Processed on: <strong>{new Date(selectedPayslip.generatedAt || selectedPayslip.createdAt).toLocaleString()}</strong></div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedPayslip)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex justify-center items-center gap-2 shadow-md shadow-slate-800/10"
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-all"
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
