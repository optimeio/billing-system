import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, FileText, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MyInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch {
      toast.error('Failed to load your invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInvoices();
  }, []);

  const handleDownload = async (id, invoiceNumber) => {
    try {
      const response = await api.get(`/invoices/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">My Invoices</h1>
        <Link to="/staff/create-invoice" className="bg-primary text-white px-4 py-2 rounded-lg flex items-center shadow-md hover:bg-blue-600 transition-all">
          <Plus size={18} className="mr-2" /> New Invoice
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Invoice No</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium">{inv.invoiceNumber}</td>
                  <td className="p-4 text-sm">
                    <p className="font-semibold">{inv.customerName}</p>
                    <p className="text-xs text-slate-500">{inv.customerPhone}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-800">₹{inv.grandTotal}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center w-fit ${
                      inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 
                      inv.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {inv.paymentStatus === 'paid' ? <CheckCircle size={12} className="mr-1"/> : 
                       inv.paymentStatus === 'pending' ? <Clock size={12} className="mr-1"/> : <XCircle size={12} className="mr-1"/>}
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button 
                      onClick={() => handleDownload(inv._id, inv.invoiceNumber)}
                      className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">You haven't created any invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default MyInvoices;
