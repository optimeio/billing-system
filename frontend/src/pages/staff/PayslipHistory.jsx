import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, History, Receipt, Download, FileText } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const PayslipHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payslips/history');
      setHistory(res.data);
    } catch (err) {
      toast.error('Failed to load payslip history');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Payslips</h1>
        <p className="text-sm text-slate-500 mt-1">View and print your monthly payslips, allowances, and loss-of-pay details.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <History className="text-primary" size={20} />
          Payslip History
        </h2>

        {loading ? (
          <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium mt-2">Loading your payslips...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-24 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Receipt size={36} />
            <span className="text-sm font-medium">No payslips generated for your account yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse" aria-label="Personal payslip list">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Month</th>
                  <th className="p-4 text-right">Basic Pay</th>
                  <th className="p-4 text-right">Allowances</th>
                  <th className="p-4 text-right">LOP Deduction</th>
                  <th className="p-4 text-right">Net Take-Home</th>
                  <th className="p-4">Processed Date</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {history.map((payslip) => (
                  <tr key={payslip._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <Calendar size={16} className="text-primary" />
                      {getMonthName(payslip.month)}
                    </td>
                    <td className="p-4 text-right font-medium">₹{payslip.basicSalary.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right text-green-600 font-medium">+₹{payslip.allowances.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right text-red-500 font-medium">
                      {payslip.lopDays > 0 ? `-₹${payslip.lopDeduction.toLocaleString('en-IN')} (${payslip.lopDays}d)` : 'None'}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-850">₹{payslip.netSalary.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(payslip.generatedAt || payslip.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedPayslip(payslip);
                          setIsDetailOpen(true);
                        }}
                        className="bg-slate-100 hover:bg-primary hover:text-white text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 mx-auto"
                      >
                        <FileText size={12} />
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
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
                <span className="font-bold text-slate-800">{selectedPayslip.userId?.name || 'My Account'}</span>
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

            <div className="flex gap-2 text-center items-center justify-center">
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

export default PayslipHistory;
