import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, History, Receipt, Download, FileText, Printer } from 'lucide-react';
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
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold uppercase text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Official Statement
                </span>
                <span className="text-slate-500 font-medium">Format: Official A4 PDF Layout</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('printable-staff-payslip')?.innerHTML;
                    if (!printContents) return;
                    const printWin = window.open('', '_blank');
                    printWin.document.write(`
                      <html>
                        <head>
                          <title>Payslip - ${selectedPayslip.userId?.name || 'My Payslip'}</title>
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
                id="printable-staff-payslip"
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
                      <span className="font-medium text-slate-800">: {getMonthName(selectedPayslip.month)}</span>
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

export default PayslipHistory;
