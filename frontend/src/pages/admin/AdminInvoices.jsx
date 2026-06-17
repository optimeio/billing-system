import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Filter, FileText, CheckCircle, Clock, XCircle, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { socket } from '../../services/socket';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Preview States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

    const handleUpdate = () => {
      fetchInvoices();
    };

    socket.on('invoiceCreated', handleUpdate);
    socket.on('invoiceUpdated', handleUpdate);
    socket.on('invoiceDeleted', handleUpdate);
    socket.on('paymentApproved', handleUpdate);
    socket.on('paymentRejected', handleUpdate);

    return () => {
      socket.off('invoiceCreated', handleUpdate);
      socket.off('invoiceUpdated', handleUpdate);
      socket.off('invoiceDeleted', handleUpdate);
      socket.off('paymentApproved', handleUpdate);
      socket.off('paymentRejected', handleUpdate);
    };
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

  const handleStatusUpdate = async (id, status) => {
    const actionText = status === 'paid' ? 'approve and mark this invoice as paid' : 'cancel this invoice';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;
    
    try {
      await api.patch(`/invoices/${id}/${status}`);
      toast.success(`Invoice successfully ${status === 'paid' ? 'marked as paid' : 'cancelled'}`);
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update invoice status');
    }
  };

  const handlePreview = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreviewModal(true);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">All Invoices</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex-shrink-0">
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
                    {inv.paymentStatus === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(inv._id, 'paid')}
                          className="text-green-600 hover:text-green-800 p-2" 
                          title="Approve / Mark Paid"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(inv._id, 'cancel')}
                          className="text-red-500 hover:text-red-700 p-2" 
                          title="Cancel Invoice"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDownload(inv._id, inv.invoiceNumber)}
                      className="text-primary hover:text-blue-700 p-2" 
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => handlePreview(inv)}
                      className="text-slate-600 hover:text-slate-800 p-2" 
                      title="View & Preview Details"
                    >
                      <FileText size={18} />
                    </button>

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

      {/* Invoice Preview Modal */}
      {showPreviewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Invoice Preview</h3>
                <p className="text-xs text-slate-500">Invoice: {selectedInvoice.invoiceNumber}</p>
              </div>
              <button 
                onClick={() => { setShowPreviewModal(false); setSelectedInvoice(null); }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors text-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Invoice Header Style Replica */}
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                  <div className="inline-block bg-red-700 text-white font-bold px-4 py-1.5 rounded text-sm mb-2">INVOICE</div>
                  <h4 className="font-bold text-base text-slate-800">THE SM GROUPS</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Invoice No:</p>
                  <p className="font-bold text-sm text-slate-800">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 mt-2">Date:</p>
                  <p className="font-bold text-sm text-slate-800">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Bill To / Ship To Grid */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl">
                <div>
                  <h5 className="text-xs uppercase font-bold text-slate-400 mb-1.5">Invoice On (Bill To):</h5>
                  <p className="font-bold text-sm">{selectedInvoice.customerName}</p>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{selectedInvoice.customerAddress || 'No Address Provided'}</p>
                  <p className="text-xs text-slate-500 mt-1">Phone: {selectedInvoice.customerPhone}</p>
                </div>
                <div>
                  <h5 className="text-xs uppercase font-bold text-slate-400 mb-1.5">Consignee To (Ship To):</h5>
                  <p className="font-bold text-sm">{selectedInvoice.customerName}</p>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{selectedInvoice.customerAddress || 'No Address Provided'}</p>
                  <p className="text-xs text-slate-500 mt-1">Phone: {selectedInvoice.customerPhone}</p>
                </div>
              </div>

              {/* Items Table */}
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
                    {selectedInvoice.items?.map((item, idx) => (
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

              {/* Totals */}
              <div className="flex flex-col items-end border-t pt-4 border-slate-100">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{selectedInvoice.subtotal?.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Tax</span>
                      <span>₹{selectedInvoice.tax?.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Discount</span>
                      <span>-₹{selectedInvoice.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-800 border-t pt-1.5 border-slate-100">
                    <span>Grand Total</span>
                    <span>₹{selectedInvoice.grandTotal?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-2">
              <button 
                onClick={() => { setShowPreviewModal(false); setSelectedInvoice(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {selectedInvoice.paymentStatus === 'pending' && (
                <>
                  <button 
                    onClick={() => {
                      handleStatusUpdate(selectedInvoice._id, 'paid');
                      setShowPreviewModal(false);
                      setSelectedInvoice(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Approve & Pay
                  </button>
                  <button 
                    onClick={() => {
                      handleStatusUpdate(selectedInvoice._id, 'cancel');
                      setShowPreviewModal(false);
                      setSelectedInvoice(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center"
                  >
                    <XCircle size={16} className="mr-1.5" /> Cancel Invoice
                  </button>
                </>
              )}
              <button 
                onClick={() => {
                  handleDownload(selectedInvoice._id, selectedInvoice.invoiceNumber);
                  setShowPreviewModal(false);
                  setSelectedInvoice(null);
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

export default AdminInvoices;
