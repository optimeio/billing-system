import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Filter, FileText, CheckCircle, Clock, XCircle, Loader2, Trash2, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice permanently?')) return;
    
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete invoice';
      toast.error(message);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">All Invoices</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl border border-blue-100 bg-blue-50/30">
          <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0).toLocaleString()}</p>
        </div>
        <div className="glass p-6 rounded-xl border border-green-100 bg-green-50/30">
          <p className="text-slate-500 text-sm font-medium">Paid Invoices</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{invoices.filter(i => i.paymentStatus === 'paid').length}</p>
        </div>
        <div className="glass p-6 rounded-xl border border-amber-100 bg-amber-50/30">
          <p className="text-slate-500 text-sm font-medium">Pending Approvals</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{invoices.filter(i => i.paymentStatus === 'pending').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Invoice No</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
              ) : filteredInvoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{inv.invoiceNumber}</td>
                  <td className="p-4">
                    <p className="text-sm font-semibold">{inv.customerName}</p>
                    <p className="text-xs text-slate-500">{inv.customerPhone}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-800">₹{inv.grandTotal}</td>
                  <td className="p-4 text-sm text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center w-fit ${
                      inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 
                      inv.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {inv.paymentStatus === 'paid' ? <CheckCircle size={12} className="mr-1"/> : 
                       inv.paymentStatus === 'pending' ? <Clock size={12} className="mr-1"/> : <XCircle size={12} className="mr-1"/>}
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDownload(inv._id, inv.invoiceNumber)}
                      className="text-primary hover:text-blue-700 p-2" 
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button className="text-slate-600 hover:text-slate-800 p-2" title="View Details">
                      <FileText size={18} />
                    </button>
                    <Link 
                      to={`/admin/edit-invoice/${inv._id}`}
                      className="text-slate-600 hover:text-slate-800 p-2 inline-block"
                      title="Edit Invoice"
                    >
                      <Pencil size={18} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(inv._id)}
                      className="text-red-500 hover:text-red-700 p-2" 
                      title="Delete Invoice"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredInvoices.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminInvoices;
