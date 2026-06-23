import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Loader2, ArrowLeft, Download, Save, Eye } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import api from '../../services/api';
import CompanyDropdown from '../../components/CompanyDropdown';
import { companies as staticCompanies } from '../../data/companyConfig';
import DynamicInvoiceHeader from '../../components/DynamicInvoiceHeader';
import './InvoiceTemplateEditor.css';

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

// ── Format Date ─────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const InvoiceTemplateEditor = ({ isQuotation = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = false;
  const templateRef = useRef(null);
  
  // Modal Preview States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [modalScale, setModalScale] = useState(1);
  const modalPreviewWrapperRef = useRef(null);

  const [qtyLabel, setQtyLabel] = useState('Qty');
  const [createdAtTime, setCreatedAtTime] = useState(new Date());
  const [approvalPhoto, setApprovalPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState('smgroups');
  const selectedCompany = staticCompanies[selectedCompanyId];
  const companiesList = Object.values(staticCompanies);

  const [dbCompanies, setDbCompanies] = useState([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/companies');
        setDbCompanies(res.data);
      } catch (err) {
        console.error("Failed to load companies from DB:", err);
      }
    };
    fetchCompanies();
  }, []);

  // ── State ─────────────────────────────────────────────────────
  const [documentType, setDocumentType] = useState('invoice');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState('');

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  // Discount
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'

  // Products (up to 10 rows visible on template)
  const [items, setItems] = useState([
    { productName: '', hsnCode: '99', qty: 1, rate: 0, gstPercent: 0 }
  ]);

  // UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // ── ResizeObserver for Modal Preview ─────────────────────────
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

  // ── Sync documentType with prop ───────────────────────────────
  useEffect(() => {
    setDocumentType(isQuotation ? 'quotation' : 'invoice');
  }, [isQuotation]);

  // ── Load existing invoice data in edit mode ───────────────────
  useEffect(() => {
    if (!isEditMode) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invoices/${id}`);
        const inv = res.data;
        setDocumentType(inv.type || 'invoice');
        setCustomerName(inv.customerName || '');
        setCustomerPhone(inv.customerPhone || '');
        setCustomerAddress(inv.customerAddress || '');
        setInvoiceNumber(inv.invoiceNumber || '');
        if (inv.invoiceDate || inv.createdAt) {
          setInvoiceDate(new Date(inv.invoiceDate || inv.createdAt).toISOString().split('T')[0]);
        }
        if (inv.createdAt) {
          setCreatedAtTime(new Date(inv.createdAt));
        }
        setQtyLabel(inv.qtyLabel || 'Qty');
        setApprovalPhoto(inv.approvalPhoto || '');
        if (inv.discount) {
          setDiscountInput(String(inv.discount));
          setDiscountType('amount');
        } else {
          setDiscountInput('');
          setDiscountType('percentage');
        }
        if (inv.companyId) {
          const compName = typeof inv.companyId === 'object' ? inv.companyId.name : '';
          const compIdStr = typeof inv.companyId === 'object' ? inv.companyId._id : inv.companyId;
          const foundKey = Object.keys(staticCompanies).find(
            key => (compName && staticCompanies[key].name.toLowerCase() === compName.toLowerCase()) || 
                   staticCompanies[key].id === compIdStr || 
                   staticCompanies[key]._id === compIdStr
          );
          if (foundKey) {
            setSelectedCompanyId(foundKey);
          }
        }
        if (inv.items?.length > 0) {
          setItems(inv.items.map(item => ({
            productName: item.name || '',
            hsnCode: inv.hsnCode || '99',
            qty: item.qty || 1,
            rate: item.price || 0,
            gstPercent: inv.taxRate || 0
          })));
        }
      } catch {
        toast.error('Failed to load invoice data');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode, navigate]);

  // ── Calculations ──────────────────────────────────────────────
  const calculateItemTaxableValue = (item) => {
    return (Number(item.rate) || 0) * (Number(item.qty) || 0);
  };

  const calculateItemGST = (item) => {
    const taxable = calculateItemTaxableValue(item);
    return taxable * ((Number(item.gstPercent) || 0) / 100);
  };

  const calculateItemTotal = (item) => {
    return calculateItemTaxableValue(item) + calculateItemGST(item);
  };

  const totalTaxableAmount = items.reduce((sum, item) => sum + calculateItemTaxableValue(item), 0);
  const totalGSTAmount = items.reduce((sum, item) => sum + calculateItemGST(item), 0);
  const halfGST = totalGSTAmount / 2;
  
  const discountValParsed = parseFloat(discountInput) || 0;
  const discountAmount = discountType === 'percentage'
    ? (totalTaxableAmount + totalGSTAmount) * discountValParsed / 100
    : discountValParsed;

  const grandTotal = Math.max(0, totalTaxableAmount + totalGSTAmount - discountAmount);
  const amountInWords = numberToWords(grandTotal);

  // ── Item Handlers ─────────────────────────────────────────────
  const handleAddItem = () => {
    if (items.length >= 10) {
      toast.error('Maximum 10 items allowed on template');
      return;
    }
    setItems([...items, { productName: '', hsnCode: '99', qty: 1, rate: 0, gstPercent: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    setUploadingPhoto(true);
    try {
      const res = await api.post('/invoices/upload-approval-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setApprovalPhoto(res.data.photoPath);
      toast.success('Photo proof uploaded successfully!');
    } catch {
      toast.error('Failed to upload proof photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save to Database ──────────────────────────────────────────
  const handleSave = async () => {
    if (items.some(item => !item.productName || !item.rate)) {
      toast.error('Please fill all product names and prices');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName,
        customerPhone,
        customerAddress,
        customerIdNumber,
        invoiceNumber: invoiceNumber ? invoiceNumber.trim() : undefined,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
        type: documentType,
        items: items.map(item => ({
          productName: item.productName,
          category: 'General',
          price: Number(item.rate),
          qty: Number(item.qty)
        })),
        hsnCode: items[0]?.hsnCode || '99',
        taxRate: Number(items[0]?.gstPercent) || 0,
        tax: totalGSTAmount,
        taxableValue: totalTaxableAmount,
        discount: discountAmount,
        companyId: dbCompanies.find(c => c.name === selectedCompany?.name)?._id || selectedCompany?._id,
        qtyLabel,
        approvalPhoto
      };

      if (isEditMode) {
        await api.put(`/invoices/${id}`, payload);
        toast.success(`${documentType === 'quotation' ? 'Quotation' : 'Invoice'} updated!`);
      } else {
        const res = await api.post('/invoices', payload);
        toast.success(res.data.message || `${documentType === 'quotation' ? 'Quotation' : 'Invoice'} created!`);
        // Set the auto-generated invoice number
        if (res.data.invoice?.invoiceNumber) {
          setInvoiceNumber(res.data.invoice.invoiceNumber);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Generate PDF ──────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!templateRef.current) return;
    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdf.internal.pageSize.getHeight());
      pdf.save(`${documentType === 'quotation' ? 'Quotation' : 'Invoice'}_${invoiceNumber || 'Draft'}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error("PDF generate error:", err);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ── Loading State ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={48} className="animate-spin text-primary mb-4" />
        <p className="text-slate-600 font-medium">Loading details...</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* PDF Generating Overlay */}
      {generatingPDF && (
        <div className="pdf-loading-overlay">
          <div className="spinner" />
          <p>Generating PDF...</p>
        </div>
      )}

      {/* Page Header */}
      <div className="editor-page-header">
        <h1>
          <FileText size={24} />
          {isEditMode ? 'Edit' : 'Create'} {documentType === 'quotation' ? 'Quotation' : 'Invoice'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            className="text-slate-600 hover:text-slate-800 flex items-center text-sm font-medium border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1.5" /> Back
          </button>
        </div>
      </div>

      <div className="invoice-editor-container justify-center">
        {/* ═══════════ FORM PANEL (Full Width & Centered) ═══════════ */}
        <div className="invoice-form-panel max-w-2xl">
          {/* Company Selection */}
          <div className="form-section">
            <div className="form-section-title">Select Company</div>
            <CompanyDropdown 
              companies={companiesList} 
              selectedCompanyId={selectedCompanyId}
              onChange={setSelectedCompanyId}
            />
          </div>

          {/* Header Fields */}
          <div className="form-section">
            <div className="form-section-title">{documentType === 'quotation' ? 'Quotation' : 'Invoice'} Details</div>
            <div className="form-row">
              <div className="form-field">
                <label>{documentType === 'quotation' ? 'Quotation' : 'Invoice'} Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Auto-generated"
                />
              </div>
              <div className="form-field">
                <label>{documentType === 'quotation' ? 'Quotation' : 'Invoice'} Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Challan Number</label>
                <input
                  type="text"
                  value={challanNumber}
                  onChange={e => setChallanNumber(e.target.value)}
                  placeholder="CH-001"
                />
              </div>
              <div className="form-field">
                <label>Challan Date</label>
                <input
                  type="date"
                  value={challanDate}
                  onChange={e => setChallanDate(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Quantity Column Label (Custom)</label>
                <input
                  type="text"
                  value={qtyLabel}
                  onChange={e => setQtyLabel(e.target.value)}
                  placeholder="Qty"
                />
              </div>
            </div>
          </div>

          {/* Customer Section */}
          <div className="form-section">
            <div className="form-section-title">Customer Details (Bill To)</div>
            <div className="form-row full">
              <div className="form-field">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                />
              </div>
            </div>
            <div className="form-row full">
              <div className="form-field">
                <label>Address</label>
                <textarea
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="Full Address"
                  rows={2}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+91..."
                />
              </div>
              <div className="form-field">
                <label>Place Of Supply</label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={e => setPlaceOfSupply(e.target.value)}
                  placeholder="Tamil Nadu"
                />
              </div>
            </div>
            <div className="form-row full">
              <div className="form-field">
                <label>Aadhar Number / GST Number / PAN Number</label>
                <input
                  type="text"
                  value={customerIdNumber}
                  onChange={e => setCustomerIdNumber(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-XXXX or 22AAAAA0000A1Z5 or ABCDE1234F"
                />
              </div>
            </div>
          </div>

          {/* Product Items */}
          <div className="form-section">
            <div className="form-section-title">Products ({items.length}/10)</div>
            {items.map((item, index) => (
              <div key={index} className="product-item-row">
                <div className="product-item-header">
                  <span className="product-item-number">#{index + 1}</span>
                  <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    aria-label={`Remove product #${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Product Name</label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={e => handleItemChange(index, 'productName', e.target.value)}
                      placeholder="Product"
                    />
                  </div>
                  <div className="form-field">
                    <label>HSN/SAC</label>
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={e => handleItemChange(index, 'hsnCode', e.target.value)}
                      placeholder="99"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>{qtyLabel}</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => handleItemChange(index, 'qty', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={e => handleItemChange(index, 'rate', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>GST %</label>
                    <input
                      type="number"
                      min="0"
                      max="28"
                      step="0.5"
                      value={item.gstPercent}
                      onChange={e => handleItemChange(index, 'gstPercent', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Total</label>
                    <input
                      type="text"
                      value={`₹${calculateItemTotal(item).toFixed(2)}`}
                      readOnly
                      style={{ background: '#f1f5f9', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="btn-add-item" onClick={handleAddItem}>
              <Plus size={16} /> Add Product
            </button>
          </div>

          {/* Bank Details */}
          <div className="form-section">
            <div className="form-section-title">Bank Details (Auto-filled from Company Master)</div>
            <div className="form-row full">
              <div className="form-field">
                <label>Account Name</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCompany?.bankDetails?.accountName || ''}
                  className="bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            <div className="form-row full">
              <div className="form-field">
                <label>Bank Name</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCompany?.bankDetails?.bankName || ''}
                  className="bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Account Number</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCompany?.bankDetails?.accountNumber || ''}
                  className="bg-gray-50 text-gray-500"
                />
              </div>
              <div className="form-field">
                <label>IFSC Code</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCompany?.bankDetails?.ifscCode || ''}
                  className="bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>


          {/* Discount Section */}
          <div className="form-section">
            <div className="form-section-title">Discount (Optional)</div>
            <div className="form-row">
              <div className="form-field" style={{ flex: '2' }}>
                <label>Discount Value</label>
                <input
                  type="text"
                  value={discountInput}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setDiscountInput(val);
                    }
                  }}
                  placeholder="e.g. 10 or 500"
                />
              </div>
              <div className="form-field" style={{ flex: '1' }}>
                <label>Discount Type</label>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value)}
                  className="p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 font-semibold"
                  style={{ height: '42px', marginTop: '4px' }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Flat Amount (₹)</option>
                </select>
              </div>
            </div>
          </div>


          {/* Summary (read-only) */}
          <div className="form-section">
            <div className="form-section-title">Summary</div>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taxable Amount:</span>
                <strong>₹{totalTaxableAmount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CGST:</span>
                <span>₹{halfGST.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SGST:</span>
                <span>₹{halfGST.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Tax:</span>
                <span>₹{totalGSTAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 'bold' }}>
                  <span>Discount ({discountType === 'percentage' ? `${discountInput || 0}%` : '₹'}):</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '6px', marginTop: '6px' }}>
                <strong style={{ color: '#1e293b' }}>Grand Total:</strong>
                <strong style={{ color: '#b91c1c', fontSize: '16px' }}>₹{grandTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-preview"
              onClick={() => setShowPreviewModal(true)}
            >
              <Eye size={18} /> Preview
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-generate-pdf"
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
            >
              {generatingPDF ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── PREVIEW POP-UP MODAL ────────────────────────────────────────── */}
      {showPreviewModal && selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {documentType === 'quotation' ? 'Quotation' : 'Invoice'} Preview
                </h3>
                <p className="text-xs text-slate-500">Previewing layout for {selectedCompany.name}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
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
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  <DynamicInvoiceHeader company={selectedCompany} />

                  <div 
                    className="border border-black text-center py-2 mb-4 text-white"
                    style={
                      selectedCompany.name === 'THE SRI TECH ENGINEERING'
                        ? { background: 'linear-gradient(to right, #dc2626, #000000)' }
                        : selectedCompany.name === 'MBK TECHNOLOGY'
                        ? { background: 'linear-gradient(to right, #f97316, #dc2626)' }
                        : selectedCompany.name === 'OPTIME'
                        ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)' }
                        : selectedCompany.name === 'WINKBENCH'
                        ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)' }
                        : selectedCompany.name === 'PAVECH'
                        ? { background: 'linear-gradient(to right, #0d9488, #16a34a)' }
                        : { backgroundColor: selectedCompany.themeColor || '#d60000' }
                    }
                  >
                    <h2 className="text-2xl font-bold tracking-widest">
                      {documentType === "quotation" ? "QUOTATION" : "TAX INVOICE"}
                    </h2>
                  </div>

                  {/* Customer Details */}
                  <div className="grid grid-cols-2 border border-black mb-4">
                    <div className="border-r border-black">
                      <div className="bg-slate-100 p-2 font-bold border-b border-black">
                        Invoice On (Bill To):
                      </div>
                      <div className="p-2 space-y-1">
                        <p><span className="font-semibold">Name:</span> {customerName}</p>
                        <p><span className="font-semibold">Address:</span> {customerAddress}</p>
                        <p><span className="font-semibold">Phone:</span> {customerPhone}</p>
                        <p><span className="font-semibold">Place Of Supply:</span> {placeOfSupply}</p>
                        {customerIdNumber && (
                          <p><span className="font-semibold">Aadhar/GST/PAN:</span> {customerIdNumber}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="bg-slate-100 p-2 font-bold border-b border-black">
                        {documentType === 'quotation' ? 'Quotation' : 'Invoice'} Details:
                      </div>
                      <div className="grid grid-cols-2 p-2 gap-y-2">
                        <p className="font-semibold">{documentType === 'quotation' ? 'Quotation' : 'Invoice'} No:</p>
                        <p>{invoiceNumber || '—'}</p>

                        <p className="font-semibold">Date:</p>
                        <p>{formatDate(invoiceDate)}</p>

                        <p className="font-semibold">Time:</p>
                        <p>{createdAtTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>

                        <p className="font-semibold">Challan No:</p>
                        <p>{challanNumber || '—'}</p>

                        <p className="font-semibold">Challan Date:</p>
                        <p>{formatDate(challanDate) || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-black mb-4">
                    <thead>
                      <tr 
                        className="text-white"
                        style={
                          selectedCompany.name === 'THE SRI TECH ENGINEERING'
                            ? { background: 'linear-gradient(to right, #dc2626, #000000)' }
                            : selectedCompany.name === 'MBK TECHNOLOGY'
                            ? { background: 'linear-gradient(to right, #f97316, #dc2626)' }
                            : selectedCompany.name === 'OPTIME'
                            ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)' }
                            : selectedCompany.name === 'WINKBENCH'
                            ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)' }
                            : selectedCompany.name === 'PAVECH'
                            ? { background: 'linear-gradient(to right, #0d9488, #16a34a)' }
                            : { backgroundColor: selectedCompany.themeColor || '#991b1b' }
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
                      {items.map((item, index) => (
                        <tr key={index} className="h-10">
                          <td className="border-l border-r border-black p-2 text-center">{index + 1}</td>
                          <td className="border-l border-r border-black p-2">{item.productName}</td>
                          <td className="border-l border-r border-black p-2 text-center">{item.hsnCode}</td>
                          <td className="border-l border-r border-black p-2 text-center">{item.qty}</td>
                          <td className="border-l border-r border-black p-2 text-center">{item.rate}</td>
                          <td className="border-l border-r border-black p-2 text-center">{calculateItemTaxableValue(item).toFixed(2)}</td>
                          <td className="border-l border-r border-black p-2 text-center">{item.gstPercent}</td>
                          <td className="border-l border-r border-black p-2 text-center">{calculateItemGST(item).toFixed(2)}</td>
                          <td className="border-l border-r border-black p-2 text-center font-medium">{calculateItemTotal(item).toFixed(2)}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, idx) => (
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
                        <p className="font-semibold">{grandTotal > 0 ? amountInWords : ''}</p>
                      </div>
                      <div className="mt-6">
                        <h3 className="text-base font-bold text-gray-700 mb-2">Bank Details</h3>
                        <table className="text-xs" style={{ borderCollapse: 'collapse' }}>
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

                    <div className="p-0">
                      <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-semibold">Taxable Amount</span>
                        <span>{totalTaxableAmount > 0 ? totalTaxableAmount.toFixed(2) : ''}</span>
                      </div>
                      <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-semibold">GST</span>
                        <span>{halfGST > 0 ? halfGST.toFixed(2) : ''}</span>
                      </div>
                      <div className="flex justify-between p-2 border-b border-black">
                        <span className="font-semibold">Total Tax</span>
                        <span>{totalGSTAmount > 0 ? totalGSTAmount.toFixed(2) : ''}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between p-2 border-b border-black text-green-700 font-semibold">
                          <span>Discount</span>
                          <span>-₹ {discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-3 bg-slate-100 font-bold text-lg">
                        <span>Grand Total</span>
                        <span className="text-red-700">{grandTotal > 0 ? `₹ ${grandTotal.toFixed(2)}` : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow"></div>

                  <div className="flex justify-between items-end mt-8 pt-4">
                    <div className="font-bold border-t-2 border-black pt-2 w-48 text-center">Customer Signature</div>
                    <div className="font-bold border-t-2 border-black pt-2 w-48 text-center relative flex flex-col items-center">
                      Authorized Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OFF-SCREEN TEMPLATE FOR PDF GENERATION (Scale 1) ───────────────── */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div 
          id="invoice-template-render"
          ref={templateRef}
          className="w-[794px] min-h-[1123px] border border-black p-4 text-sm flex flex-col relative"
          style={{ transform: 'none', margin: '0', backgroundColor: '#ffffff', color: '#000000' }}
        >
          {selectedCompany && (
            <>
              <DynamicInvoiceHeader company={selectedCompany} />

              <div 
                className="border border-black text-center py-2 mb-4 text-white"
                style={
                  selectedCompany.name === 'THE SRI TECH ENGINEERING'
                    ? { background: 'linear-gradient(to right, #dc2626, #000000)' }
                    : selectedCompany.name === 'MBK TECHNOLOGY'
                    ? { background: 'linear-gradient(to right, #f97316, #dc2626)' }
                    : selectedCompany.name === 'OPTIME'
                    ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)' }
                    : selectedCompany.name === 'WINKBENCH'
                    ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)' }
                    : selectedCompany.name === 'PAVECH'
                    ? { background: 'linear-gradient(to right, #0d9488, #16a34a)' }
                    : { backgroundColor: selectedCompany.themeColor || '#d60000' }
                }
              >
                <h2 className="text-2xl font-bold tracking-widest">
                  {documentType === "quotation" ? "QUOTATION" : "TAX INVOICE"}
                </h2>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 border border-black mb-4">
                <div className="border-r border-black">
                  <div className="p-2 font-bold border-b border-black" style={{ backgroundColor: '#f1f5f9' }}>
                    Invoice On (Bill To):
                  </div>
                  <div className="p-2 space-y-1">
                    <p><span className="font-semibold">Name:</span> {customerName}</p>
                    <p><span className="font-semibold">Address:</span> {customerAddress}</p>
                    <p><span className="font-semibold">Phone:</span> {customerPhone}</p>
                    <p><span className="font-semibold">Place Of Supply:</span> {placeOfSupply}</p>
                    {customerIdNumber && (
                      <p><span className="font-semibold">Aadhar/GST/PAN:</span> {customerIdNumber}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="p-2 font-bold border-b border-black" style={{ backgroundColor: '#f1f5f9' }}>
                    {documentType === 'quotation' ? 'Quotation' : 'Invoice'} Details:
                  </div>
                  <div className="grid grid-cols-2 p-2 gap-y-2">
                    <p className="font-semibold">{documentType === 'quotation' ? 'Quotation' : 'Invoice'} No:</p>
                    <p>{invoiceNumber || '—'}</p>

                    <p className="font-semibold">Date:</p>
                    <p>{formatDate(invoiceDate)}</p>

                    <p className="font-semibold">Time:</p>
                    <p>{createdAtTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>

                    <p className="font-semibold">Challan No:</p>
                    <p>{challanNumber || '—'}</p>

                    <p className="font-semibold">Challan Date:</p>
                    <p>{formatDate(challanDate) || '—'}</p>
                  </div>
                </div>
              </div>

              <table className="w-full border-collapse border border-black mb-4">
                <thead>
                  <tr 
                    style={
                      selectedCompany.name === 'THE SRI TECH ENGINEERING'
                        ? { background: 'linear-gradient(to right, #dc2626, #000000)', color: '#ffffff' }
                        : selectedCompany.name === 'MBK TECHNOLOGY'
                        ? { background: 'linear-gradient(to right, #f97316, #dc2626)', color: '#ffffff' }
                        : selectedCompany.name === 'OPTIME'
                        ? { background: 'linear-gradient(to right, #1e3a8a, #3b82f6)', color: '#ffffff' }
                        : selectedCompany.name === 'WINKBENCH'
                        ? { background: 'linear-gradient(to right, #1e3a8a, #6b7280)', color: '#ffffff' }
                        : selectedCompany.name === 'PAVECH'
                        ? { background: 'linear-gradient(to right, #0d9488, #16a34a)', color: '#ffffff' }
                        : { backgroundColor: selectedCompany.themeColor || '#991b1b', color: '#ffffff' }
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
                  {items.map((item, index) => (
                    <tr key={index} className="h-10">
                      <td className="border-l border-r border-black p-2 text-center">{index + 1}</td>
                      <td className="border-l border-r border-black p-2">{item.productName}</td>
                      <td className="border-l border-r border-black p-2 text-center">{item.hsnCode}</td>
                      <td className="border-l border-r border-black p-2 text-center">{item.qty}</td>
                      <td className="border-l border-r border-black p-2 text-center">{item.rate}</td>
                      <td className="border-l border-r border-black p-2 text-center">{calculateItemTaxableValue(item).toFixed(2)}</td>
                      <td className="border-l border-r border-black p-2 text-center">{item.gstPercent}</td>
                      <td className="border-l border-r border-black p-2 text-center">{calculateItemGST(item).toFixed(2)}</td>
                      <td className="border-l border-r border-black p-2 text-center font-medium">{calculateItemTotal(item).toFixed(2)}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, idx) => (
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
                    <p className="font-semibold">{grandTotal > 0 ? amountInWords : ''}</p>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-base font-bold mb-2" style={{ color: '#374151' }}>Bank Details</h3>
                    <table className="text-xs" style={{ borderCollapse: 'collapse' }}>
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

                <div className="p-0">
                  <div className="flex justify-between p-2 border-b border-black">
                    <span className="font-semibold">Taxable Amount</span>
                    <span>{totalTaxableAmount > 0 ? totalTaxableAmount.toFixed(2) : ''}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-black">
                    <span className="font-semibold">GST</span>
                    <span>{halfGST > 0 ? halfGST.toFixed(2) : ''}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-black">
                    <span className="font-semibold">Total Tax</span>
                    <span>{totalGSTAmount > 0 ? totalGSTAmount.toFixed(2) : ''}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between p-2 border-b border-black font-semibold" style={{ color: '#15803d' }}>
                      <span>Discount</span>
                      <span>-₹ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3 font-bold text-lg" style={{ backgroundColor: '#f1f5f9' }}>
                    <span>Grand Total</span>
                    <span style={{ color: '#b91c1c' }}>{grandTotal > 0 ? `₹ ${grandTotal.toFixed(2)}` : ''}</span>
                  </div>
                </div>
              </div>

              <div className="flex-grow"></div>

              <div className="flex justify-between items-end mt-8 pt-4">
                <div className="font-bold border-t-2 border-black pt-2 w-48 text-center">Customer Signature</div>
                <div className="font-bold border-t-2 border-black pt-2 w-48 text-center relative flex flex-col items-center">
                  Authorized Signature
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplateEditor;
