import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Filter, FileText, CheckCircle, Clock, XCircle, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { socket } from '../../services/socket';
import DynamicInvoiceHeader from '../../components/DynamicInvoiceHeader';
import { companies as staticCompanies } from '../../data/companyConfig';

// ── Number to Words (Indian Rupees) ─────────────────────────────
const numberToWords = (num) => {
  if (!num || isNaN(num)) return '';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + convert(n%100) : '');
    if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + convert(n%1000) : '');
    if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + convert(n%100000) : '');
    return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + convert(n%10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Preview States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [modalScale, setModalScale] = useState(1);
  const modalPreviewWrapperRef = useRef(null);

  // Client PDF Generation States
  const [invoiceForPdf, setInvoiceForPdf] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const pdfTemplateRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

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

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff/all');
      setEmployees(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStaff();

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

  const getCompanyConfig = (companyObjOrId) => {
    if (!companyObjOrId) return staticCompanies.smgroups;
    
    let compName = '';
    let compId = '';
    
    if (typeof companyObjOrId === 'object') {
      compName = companyObjOrId.name || '';
      compId = companyObjOrId._id || '';
    } else if (typeof companyObjOrId === 'string') {
      compId = companyObjOrId;
    }
    
    if (compName) {
      const found = Object.values(staticCompanies).find(
        c => c.name.toLowerCase() === compName.toLowerCase()
      );
      if (found) {
        return { ...found, ...companyObjOrId };
      }
    }
    
    const foundById = Object.values(staticCompanies).find(
      c => c._id === compId || c.id === compId
    );
    if (foundById) return foundById;
    
    if (typeof companyObjOrId === 'object') {
      return companyObjOrId;
    }
    return staticCompanies.smgroups;
  };

  // Trigger Client-Side PDF Download
  const handleDownload = (invoice) => {
    setInvoiceForPdf(invoice);
    setGeneratingPDF(true);
  };

  useEffect(() => {
    if (!invoiceForPdf || !pdfTemplateRef.current) return;

    const generate = async () => {
      try {
        const canvas = await html2canvas(pdfTemplateRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdf.internal.pageSize.getHeight());
        pdf.save(`Invoice_${invoiceForPdf.invoiceNumber || 'Draft'}.pdf`);
        toast.success('PDF downloaded successfully!');
      } catch (err) {
        console.error("PDF generation failed:", err);
        toast.error('Failed to generate PDF');
      } finally {
        setGeneratingPDF(false);
        setInvoiceForPdf(null);
      }
    };

    const timer = setTimeout(generate, 300);
    return () => clearTimeout(timer);
  }, [invoiceForPdf]);

  // Handle ResizeObserver for scaling preview inside modal
  useEffect(() => {
    if (!showPreviewModal || !modalPreviewWrapperRef.current) return;
    const updateModalScale = () => {
      const wrapperWidth = modalPreviewWrapperRef.current.getBoundingClientRect().width;
      const targetWidth = 794; // A4 template width
      if (wrapperWidth < targetWidth) {
        setModalScale((wrapperWidth - 16) / targetWidth);
      } else {
        setModalScale(1);
      }
    };

    updateModalScale();
    const timer = setTimeout(updateModalScale, 50);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateModalScale);
      resizeObserver.observe(modalPreviewWrapperRef.current);
    }

    window.addEventListener('resize', updateModalScale);
    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateModalScale);
    };
  }, [showPreviewModal]);

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

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee = selectedEmployeeId ? inv.createdBy?._id === selectedEmployeeId : true;
    return matchesSearch && matchesEmployee;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* PDF Generating Overlay */}
      {generatingPDF && (
        <div className="pdf-loading-overlay">
          <div className="spinner" />
          <p>Generating PDF...</p>
        </div>
      )}

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

      {/* Employee filter header */}
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border border-slate-200">
        <span className="text-sm font-semibold text-slate-500 mr-2">Filter by Employee:</span>
        <button
          onClick={() => setSelectedEmployeeId('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !selectedEmployeeId ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Employees
        </button>
        {employees.map(emp => (
          <button
            key={emp._id}
            onClick={() => setSelectedEmployeeId(emp._id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedEmployeeId === emp._id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {emp.name}
          </button>
        ))}
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
                  <td className="p-4">
                    <p className="font-semibold text-slate-800">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-500 font-normal">
                      Created by: <span className="font-bold">{inv.createdBy?.name || 'System'}</span>
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold">{inv.customerName}</p>
                    <p className="text-xs text-slate-500">{inv.customerPhone}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-800">₹{inv.grandTotal}</td>
                  <td className="p-4 text-sm text-slate-500">
                    <p className="font-medium">
                      {new Date(inv.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </td>
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
                      onClick={() => handleDownload(inv)}
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

      {/* ── Invoice Preview Modal (Actual Styled Layout) ───────────────── */}
      {showPreviewModal && selectedInvoice && (() => {
        const company = getCompanyConfig(selectedInvoice.companyId);
        const subtotal = selectedInvoice.subtotal || 0;
        const tax = selectedInvoice.tax || 0;
        const grandTotal = selectedInvoice.grandTotal || 0;
        const qtyLabel = selectedInvoice.qtyLabel || 'Qty';
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Invoice Preview</h3>
                  <p className="text-xs text-slate-500">Invoice No: {selectedInvoice.invoiceNumber}</p>
                </div>
                <button 
                  onClick={() => { setShowPreviewModal(false); setSelectedInvoice(null); }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body with viewport fit scaling */}
              <div className="p-4 overflow-y-auto flex-1 flex justify-center items-start bg-slate-100" ref={modalPreviewWrapperRef}>
                <div 
                  style={{
                    height: modalScale < 1 ? `${1123 * modalScale}px` : 'auto',
                    minHeight: modalScale < 1 ? `${1123 * modalScale}px` : '1123px',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    className="w-[794px] min-h-[1123px] bg-white border border-black p-4 text-sm flex flex-col relative"
                    style={{
                      transform: `scale(${modalScale})`,
                      transformOrigin: 'top center',
                      flexShrink: 0,
                      margin: '0 auto',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      fontFamily: 'Segoe UI, Arial, sans-serif'
                    }}
                  >
                    <DynamicInvoiceHeader company={company} />

                    <div 
                      className="border border-black text-center py-2 mb-4 text-white"
                      style={
                        company.name === 'THE SRI TECH ENGINEERING'
                          ? { background: 'linear-gradient(to right, #dc2626, #000000)' }
                          : company.name === 'MBK TECHNOLOGY'
                          ? { background: 'linear-gradient(to right, #f97316, #dc2626)' }
                          : company.name === 'OPTIME'
                          ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)' }
                          : company.name === 'WINKBENCH'
                          ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)' }
                          : company.name === 'PAVECH'
                          ? { background: 'linear-gradient(to right, #0d9488, #16a34a)' }
                          : { backgroundColor: company.themeColor || '#d60000' }
                      }
                    >
                      <h2 className="text-2xl font-bold tracking-widest">TAX INVOICE</h2>
                    </div>

                    <div className="grid grid-cols-2 border border-black mb-4">
                      <div className="border-r border-black">
                        <div className="bg-slate-100 p-2 font-bold border-b border-black">
                          Invoice On (Bill To):
                        </div>
                        <div className="p-2 space-y-1">
                          <p><span className="font-semibold">Name:</span> {selectedInvoice.customerName}</p>
                          <p><span className="font-semibold">Address:</span> {selectedInvoice.customerAddress || 'No Address Provided'}</p>
                          <p><span className="font-semibold">Phone:</span> {selectedInvoice.customerPhone}</p>
                        </div>
                      </div>

                      <div>
                        <div className="bg-slate-100 p-2 font-bold border-b border-black">
                          Invoice Details:
                        </div>
                        <div className="grid grid-cols-2 p-2 gap-y-2">
                          <p className="font-semibold">Invoice No:</p>
                          <p>{selectedInvoice.invoiceNumber || '—'}</p>

                          <p className="font-semibold">Date:</p>
                          <p>{formatDate(selectedInvoice.invoiceDate || selectedInvoice.createdAt)}</p>

                          <p className="font-semibold">Time:</p>
                          <p>{new Date(selectedInvoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                        </div>
                      </div>
                    </div>

                    {/* Approval Photo Proof */}
                    {selectedInvoice.approvalPhoto && (
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-4 flex flex-col items-center">
                        <span className="text-xs uppercase font-bold text-slate-400 mb-1">Approval Photo Proof:</span>
                        <img 
                          src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${selectedInvoice.approvalPhoto}`} 
                          alt="Approval Proof" 
                          className="max-h-36 object-contain rounded border border-slate-200 cursor-pointer"
                          onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${selectedInvoice.approvalPhoto}`, '_blank')}
                        />
                      </div>
                    )}

                    <table className="w-full border-collapse border border-black mb-4">
                      <thead>
                        <tr 
                          className="text-white"
                          style={
                            company.name === 'THE SRI TECH ENGINEERING'
                              ? { background: 'linear-gradient(to right, #dc2626, #000000)' }
                              : company.name === 'MBK TECHNOLOGY'
                              ? { background: 'linear-gradient(to right, #f97316, #dc2626)' }
                              : company.name === 'OPTIME'
                              ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)' }
                              : company.name === 'WINKBENCH'
                              ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)' }
                              : company.name === 'PAVECH'
                              ? { background: 'linear-gradient(to right, #0d9488, #16a34a)' }
                              : { backgroundColor: company.themeColor || '#991b1b' }
                          }
                        >
                          <th className="border border-black p-2 text-center w-10">S.No</th>
                          <th className="border border-black p-2 text-left">Product Name</th>
                          <th className="border border-black p-2 text-center w-16">HSN/SAC</th>
                          <th className="border border-black p-2 text-center w-10">{qtyLabel}</th>
                          <th className="border border-black p-2 text-center w-14">Rate</th>
                          <th className="border border-black p-2 text-center w-16">Taxable</th>
                          <th className="border border-black p-2 text-center w-12">GST %</th>
                          <th className="border border-black p-2 text-center w-16">GST Amt</th>
                          <th className="border border-black p-2 text-center w-20">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items?.map((item, index) => {
                          const rate = item.price || 0;
                          const qty = item.qty || 1;
                          const taxable = rate * qty;
                          const gstRate = selectedInvoice.taxRate || 0;
                          const gstAmt = taxable * (gstRate / 100);
                          const total = item.total || (taxable + gstAmt);

                          return (
                            <tr key={index} className="h-10">
                              <td className="border-l border-r border-black p-2 text-center">{index + 1}</td>
                              <td className="border-l border-r border-black p-2">{item.name}</td>
                              <td className="border-l border-r border-black p-2 text-center">{selectedInvoice.hsnCode || '99'}</td>
                              <td className="border-l border-r border-black p-2 text-center">{qty}</td>
                              <td className="border-l border-r border-black p-2 text-center">{rate}</td>
                              <td className="border-l border-r border-black p-2 text-center">{taxable.toFixed(2)}</td>
                              <td className="border-l border-r border-black p-2 text-center">{gstRate}</td>
                              <td className="border-l border-r border-black p-2 text-center">{gstAmt.toFixed(2)}</td>
                              <td className="border-l border-r border-black p-2 text-center font-medium">{total.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        {Array.from({ length: Math.max(0, 8 - (selectedInvoice.items?.length || 0)) }).map((_, idx) => (
                          <tr key={`empty-${idx}`} className="h-10">
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                            <td className="border-l border-r border-black p-2"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="grid grid-cols-2 border border-black mb-4 flex-grow-0">
                      <div className="border-r border-black p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-700">Amount In Words</h3>
                          <p className="font-semibold text-xs">{grandTotal > 0 ? numberToWords(grandTotal).toUpperCase() : ''}</p>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-sm font-bold text-gray-700 mb-2">Bank Details</h3>
                          <table className="text-[10px]" style={{ borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr>
                                <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">Account Name</td>
                                <td className="pr-2 py-0.5 align-top">:</td>
                                <td className="py-0.5 align-top">THE SM GROUPS</td>
                              </tr>
                              <tr>
                                <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">Bank Name</td>
                                <td className="pr-2 py-0.5 align-top">:</td>
                                <td className="py-0.5 align-top">CITY UNION BANK</td>
                              </tr>
                              <tr>
                                <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">Account Number</td>
                                <td className="pr-2 py-0.5 align-top">:</td>
                                <td className="py-0.5 align-top">510909010317651</td>
                              </tr>
                              <tr>
                                <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">IFSC Code</td>
                                <td className="pr-2 py-0.5 align-top">:</td>
                                <td className="py-0.5 align-top">CIUB0000188</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="p-0 text-xs">
                        <div className="flex justify-between p-2 border-b border-black">
                          <span className="font-semibold">Taxable Amount</span>
                          <span>{selectedInvoice.taxableValue > 0 ? selectedInvoice.taxableValue.toFixed(2) : subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-2 border-b border-black">
                          <span className="font-semibold">GST</span>
                          <span>{tax > 0 ? (tax / 2).toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between p-2 border-b border-black">
                          <span className="font-semibold">Total Tax</span>
                          <span>{tax > 0 ? tax.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-slate-100 font-bold text-sm">
                          <span>Grand Total</span>
                          <span className="text-red-700">₹ {grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow"></div>

                    <div className="flex justify-between items-end mt-8 pt-4">
                      <div className="font-bold border-t-2 border-black pt-2 w-48 text-center text-xs">Customer Signature</div>
                      <div className="font-bold border-t-2 border-black pt-2 w-48 text-center relative flex flex-col items-center text-xs">
                        Authorized Signature
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
                    handleDownload(selectedInvoice);
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
        );
      })()}

      {/* ── Hidden off-screen template for client-side PDF generation ──────── */}
      {invoiceForPdf && (() => {
        const company = getCompanyConfig(invoiceForPdf.companyId);
        const subtotal = invoiceForPdf.subtotal || 0;
        const tax = invoiceForPdf.tax || 0;
        const grandTotal = invoiceForPdf.grandTotal || 0;
        const qtyLabel = invoiceForPdf.qtyLabel || 'Qty';

        return (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div
              ref={pdfTemplateRef}
              className="w-[794px] min-h-[1123px] border border-black p-4 text-sm flex flex-col relative"
              style={{ transform: 'none', margin: '0', fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#ffffff', color: '#000000' }}
            >
              <DynamicInvoiceHeader company={company} />

              <div 
                className="border border-black text-center py-2 mb-4 text-white"
                style={
                  company.name === 'THE SRI TECH ENGINEERING'
                    ? { background: 'linear-gradient(to right, #dc2626, #000000)' }
                    : company.name === 'MBK TECHNOLOGY'
                    ? { background: 'linear-gradient(to right, #f97316, #dc2626)' }
                    : company.name === 'OPTIME'
                    ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)' }
                    : company.name === 'WINKBENCH'
                    ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)' }
                    : company.name === 'PAVECH'
                    ? { background: 'linear-gradient(to right, #0d9488, #16a34a)' }
                    : { backgroundColor: company.themeColor || '#d60000' }
                }
              >
                <h2 className="text-2xl font-bold tracking-widest">TAX INVOICE</h2>
              </div>

              <div className="grid grid-cols-2 border border-black mb-4">
                <div className="border-r border-black">
                  <div className="p-2 font-bold border-b border-black" style={{ backgroundColor: '#f1f5f9' }}>
                    Invoice On (Bill To):
                  </div>
                  <div className="p-2 space-y-1">
                    <p><span className="font-semibold">Name:</span> {invoiceForPdf.customerName}</p>
                    <p><span className="font-semibold">Address:</span> {invoiceForPdf.customerAddress || 'No Address Provided'}</p>
                    <p><span className="font-semibold">Phone:</span> {invoiceForPdf.customerPhone}</p>
                  </div>
                </div>

                <div>
                  <div className="p-2 font-bold border-b border-black" style={{ backgroundColor: '#f1f5f9' }}>
                    Invoice Details:
                  </div>
                  <div className="grid grid-cols-2 p-2 gap-y-2">
                    <p className="font-semibold">Invoice No:</p>
                    <p>{invoiceForPdf.invoiceNumber || '—'}</p>

                    <p className="font-semibold">Date:</p>
                    <p>{formatDate(invoiceForPdf.invoiceDate || invoiceForPdf.createdAt)}</p>

                    <p className="font-semibold">Time:</p>
                    <p>{new Date(invoiceForPdf.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              </div>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr 
                    style={
                      company.name === 'THE SRI TECH ENGINEERING'
                        ? { background: 'linear-gradient(to right, #dc2626, #000000)', color: '#ffffff' }
                        : company.name === 'MBK TECHNOLOGY'
                        ? { background: 'linear-gradient(to right, #f97316, #dc2626)', color: '#ffffff' }
                        : company.name === 'OPTIME'
                        ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)', color: '#ffffff' }
                        : company.name === 'WINKBENCH'
                        ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)', color: '#ffffff' }
                        : company.name === 'PAVECH'
                        ? { background: 'linear-gradient(to right, #0d9488, #16a34a)', color: '#ffffff' }
                        : { backgroundColor: company.themeColor || '#991b1b', color: '#ffffff' }
                    }
                  >
                    <th className="border border-black p-2 text-center w-10">S.No</th>
                    <th className="border border-black p-2 text-left">Product Name</th>
                    <th className="border border-black p-2 text-center w-16">HSN/SAC</th>
                    <th className="border border-black p-2 text-center w-10">{qtyLabel}</th>
                    <th className="border border-black p-2 text-center w-14">Rate</th>
                    <th className="border border-black p-2 text-center w-16">Taxable</th>
                    <th className="border border-black p-2 text-center w-12">GST %</th>
                    <th className="border border-black p-2 text-center w-16">GST Amt</th>
                    <th className="border border-black p-2 text-center w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceForPdf.items?.map((item, index) => {
                    const rate = item.price || 0;
                    const qty = item.qty || 1;
                    const taxable = rate * qty;
                    const gstRate = invoiceForPdf.taxRate || 0;
                    const gstAmt = taxable * (gstRate / 100);
                    const total = item.total || (taxable + gstAmt);

                    return (
                      <tr key={index} className="h-10">
                        <td className="border-l border-r border-black p-2 text-center">{index + 1}</td>
                        <td className="border-l border-r border-black p-2">{item.name}</td>
                        <td className="border-l border-r border-black p-2 text-center">{invoiceForPdf.hsnCode || '99'}</td>
                        <td className="border-l border-r border-black p-2 text-center">{qty}</td>
                        <td className="border-l border-r border-black p-2 text-center">{rate}</td>
                        <td className="border-l border-r border-black p-2 text-center">{taxable.toFixed(2)}</td>
                        <td className="border-l border-r border-black p-2 text-center">{gstRate}</td>
                        <td className="border-l border-r border-black p-2 text-center">{gstAmt.toFixed(2)}</td>
                        <td className="border-l border-r border-black p-2 text-center font-medium">{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 10 - (invoiceForPdf.items?.length || 0)) }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-10">
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                      <td className="border-l border-r border-black p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 border border-black mb-4 flex-grow-0">
                <div className="border-r border-black p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold" style={{ color: '#374151' }}>Amount In Words</h3>
                    <p className="font-semibold text-xs">{grandTotal > 0 ? numberToWords(grandTotal).toUpperCase() : ''}</p>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-sm font-bold mb-2" style={{ color: '#374151' }}>Bank Details</h3>
                    <table className="text-[10px]" style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">Account Name</td>
                          <td className="pr-2 py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">THE SM GROUPS</td>
                        </tr>
                        <tr>
                          <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">Bank Name</td>
                          <td className="pr-2 py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">CITY UNION BANK</td>
                        </tr>
                        <tr>
                          <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">Account Number</td>
                          <td className="pr-2 py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">510909010317651</td>
                        </tr>
                        <tr>
                          <td className="font-semibold pr-2 py-0.5 whitespace-nowrap align-top">IFSC Code</td>
                          <td className="pr-2 py-0.5 align-top">:</td>
                          <td className="py-0.5 align-top">CIUB0000188</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-0 text-xs">
                  <div className="flex justify-between p-2 border-b border-black">
                    <span className="font-semibold">Taxable Amount</span>
                    <span>{invoiceForPdf.taxableValue > 0 ? invoiceForPdf.taxableValue.toFixed(2) : subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-black">
                    <span className="font-semibold">GST</span>
                    <span>{tax > 0 ? (tax / 2).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-black">
                    <span className="font-semibold">Total Tax</span>
                    <span>{tax > 0 ? tax.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between p-3 font-bold text-sm" style={{ backgroundColor: '#f1f5f9' }}>
                    <span>Grand Total</span>
                    <span style={{ color: '#b91c1c' }}>₹ {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex-grow"></div>

              <div className="flex justify-between items-end mt-8 pt-4">
                <div className="font-bold border-t-2 border-black pt-2 w-48 text-center text-xs">Customer Signature</div>
                <div className="font-bold border-t-2 border-black pt-2 w-48 text-center relative flex flex-col items-center text-xs">
                  Authorized Signature
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};

export default AdminInvoices;
