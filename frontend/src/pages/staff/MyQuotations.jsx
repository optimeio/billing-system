import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, FileText, CheckCircle, Clock, XCircle, Loader2, Trash2, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MyQuotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Preview States
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchMyQuotations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices?type=quotation');
      setQuotations(res.data);
    } catch {
      toast.error('Failed to load your quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyQuotations();
  }, []);

  const handleDownload = async (id, quotationNumber) => {
    try {
      const response = await api.get(`/invoices/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation_${quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation permanently?')) return;
    
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Quotation deleted successfully');
      fetchMyQuotations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete quotation');
    }
  };

  const handlePreview = (quotation) => {
    setSelectedQuotation(quotation);
    setShowPreviewModal(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">My Quotations</h1>
        <Link to="/staff/create-quotation" className="bg-primary text-white px-4 py-2 rounded-lg flex items-center shadow-md hover:bg-blue-600 transition-all self-start sm:self-auto">
          <Plus size={18} className="mr-2" /> New Quotation
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Quotation No</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
              ) : quotations.map((q) => (
                <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium">{q.invoiceNumber}</td>
                  <td className="p-4 text-sm">
                    <p className="font-semibold">{q.customerName}</p>
                    <p className="text-xs text-slate-500">{q.customerPhone}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-800">₹{q.grandTotal}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center w-fit ${
                      q.paymentStatus === 'approved' ? 'bg-green-100 text-green-600' : 
                      q.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {q.paymentStatus === 'approved' ? <CheckCircle size={12} className="mr-1"/> : 
                       q.paymentStatus === 'pending' ? <Clock size={12} className="mr-1"/> : <XCircle size={12} className="mr-1"/>}
                      {q.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button 
                      onClick={() => handleDownload(q._id, q.invoiceNumber)}
                      className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => handlePreview(q)}
                      className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                      title="View Preview"
                    >
                      <FileText size={18} />
                    </button>
                    <Link 
                      to={`/staff/edit-quotation/${q._id}`}
                      className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors inline-block"
                      title="Edit Quotation"
                    >
                      <Pencil size={18} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(q._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Quotation"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && quotations.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">You haven't created any quotations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotation Preview Modal */}
      {showPreviewModal && selectedQuotation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Quotation Preview</h3>
                <p className="text-xs text-slate-500">Quotation No: {selectedQuotation.invoiceNumber}</p>
              </div>
              <button 
                onClick={() => { setShowPreviewModal(false); setSelectedQuotation(null); }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                  <div className="inline-block bg-red-700 text-white font-bold px-4 py-1.5 rounded text-sm mb-2">QUOTATION</div>
                  <h4 className="font-bold text-base text-slate-800">THE SM GROUPS</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Quotation No:</p>
                  <p className="font-bold text-sm text-slate-800">{selectedQuotation.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 mt-2">Date:</p>
                  <p className="font-bold text-sm text-slate-800">{new Date(selectedQuotation.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl">
                <h5 className="text-xs uppercase font-bold text-slate-400 mb-1.5">Quotation On (Bill To):</h5>
                <p className="font-bold text-sm">{selectedQuotation.customerName}</p>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{selectedQuotation.customerAddress || 'No Address Provided'}</p>
                <p className="text-xs text-slate-500 mt-1">Phone: {selectedQuotation.customerPhone}</p>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
                    <tr>
                      <th className="p-3 text-center w-12">S.No</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right w-24">Price</th>
                      <th className="p-3 text-center w-16">Qty</th>
                      <th className="p-3 text-right w-28">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {selectedQuotation.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="p-3 text-right">₹{item.price.toLocaleString()}</td>
                        <td className="p-3 text-center">{item.qty}</td>
                        <td className="p-3 text-right font-bold text-slate-800">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end border-t pt-4 border-slate-100">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{selectedQuotation.subtotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-800 border-t pt-1.5 border-slate-100">
                    <span>Grand Total</span>
                    <span>₹{selectedQuotation.grandTotal?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-2">
              <button 
                onClick={() => { setShowPreviewModal(false); setSelectedQuotation(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  handleDownload(selectedQuotation._id, selectedQuotation.invoiceNumber);
                  setShowPreviewModal(false);
                  setSelectedQuotation(null);
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-blue-600 shadow-md shadow-primary/25 transition-colors flex items-center"
              >
                <Download size={16} className="mr-1.5" /> Download PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default MyQuotations;
