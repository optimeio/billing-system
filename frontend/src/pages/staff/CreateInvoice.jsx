import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CreateInvoice = ({ isQuotation = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  
  const [items, setItems] = useState([{ productName: '', category: '', price: '', qty: 1 }]);
  const [hsnCode, setHsnCode] = useState('99');
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [taxableValue, setTaxableValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch details if in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchInvoiceDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invoices/${id}`);
        const inv = res.data;
        
        setCustomerName(inv.customerName || '');
        setCustomerPhone(inv.customerPhone || '');
        setCustomerAddress(inv.customerAddress || '');
        setCustomerIdNumber(inv.customerIdNumber || '');
        setInvoiceNumber(inv.invoiceNumber || '');
        
        // Format ISO date to YYYY-MM-DD for date input
        if (inv.createdAt) {
          const dateStr = new Date(inv.createdAt).toISOString().split('T')[0];
          setInvoiceDate(dateStr);
        } else {
          setInvoiceDate('');
        }
        
        setHsnCode(inv.hsnCode || '99');
        setTaxRate(inv.taxRate || 0);
        setTaxAmount(inv.tax || 0);
        setTaxableValue(inv.taxableValue || '');

        // Map items
        if (inv.items && inv.items.length > 0) {
          setItems(inv.items.map(item => ({
            productId: item.productId?._id || item.productId || '',
            productName: item.name || '',
            category: item.productId?.category || 'General',
            price: item.price || '',
            qty: item.qty || 1
          })));
        }
      } catch (err) {
        toast.error(`Failed to load ${isQuotation ? 'quotation' : 'invoice'} details for editing`);
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [id, isEditMode, navigate, isQuotation]);

  const handleAddItem = () => {
    setItems([...items, { productName: '', category: '', price: '', qty: 1 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
  };

  const subtotal = calculateSubtotal();

  useEffect(() => {
    const rate = Number(taxRate) || 0;
    const base = Number(taxableValue) > 0 ? Number(taxableValue) : subtotal;
    setTaxAmount((base * (rate / 100)).toFixed(2));
  }, [subtotal, taxableValue, taxRate]);

  const handleTaxRateChange = (rate) => {
    setTaxRate(rate);
  };

  const calculateGrandTotal = () => {
    return subtotal + Number(taxAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (items.some(item => !item.productName || !item.price)) {
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
        type: isQuotation ? 'quotation' : 'invoice',
        items: items.map(item => ({
          productId: item.productId || undefined,
          productName: item.productName,
          category: item.category || 'General',
          price: Number(item.price),
          qty: Number(item.qty)
        })),
        hsnCode,
        taxRate: Number(taxRate),
        tax: Number(taxAmount),
        taxableValue: taxableValue ? Number(taxableValue) : 0,
        discount: 0
      };

      if (isEditMode) {
        const res = await api.put(`/invoices/${id}`, payload);
        toast.success(res.data.message || `${isQuotation ? 'Quotation' : 'Invoice'} updated successfully!`);
        navigate(-1);
      } else {
        const res = await api.post('/invoices', payload);
        toast.success(res.data.message || `${isQuotation ? 'Quotation' : 'Invoice'} created successfully!`);
        
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerIdNumber('');
        setInvoiceNumber('');
        setInvoiceDate('');
        setItems([{ productName: '', category: '', price: '', qty: 1 }]);
        setHsnCode('99');
        setTaxRate(0);
        setTaxAmount(0);
        setTaxableValue('');
      }
      
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to submit ${isQuotation ? 'quotation' : 'invoice'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={48} className="animate-spin text-primary mb-4" />
        <p className="text-slate-600 font-medium">Loading details...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
            <FileText size={22} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            {isEditMode ? `Edit ${isQuotation ? 'Quotation' : 'Invoice'}` : `Create New ${isQuotation ? 'Quotation' : 'Invoice'}`}
          </h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-slate-600 hover:text-slate-800 flex items-center text-sm font-medium border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Settings */}
        <div className="glass p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-700 border-b pb-2">
            Customer & {isQuotation ? 'Quotation' : 'Invoice'} Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Customer Name (Optional)</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Walk-in Customer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number (Optional)</label>
              <input 
                type="text" 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="+91..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {isQuotation ? 'Quotation' : 'Invoice'} Number (Optional)
              </label>
              <input 
                type="text" 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary bg-white"
                placeholder={`e.g. ${isQuotation ? 'QT' : 'INV'}1005 (Leave blank to auto-generate)`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {isQuotation ? 'Quotation' : 'Invoice'} Date (Optional)
              </label>
              <input 
                type="date" 
                value={invoiceDate} 
                onChange={(e) => setInvoiceDate(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Customer Address (Optional)</label>
              <input 
                type="text" 
                value={customerAddress} 
                onChange={(e) => setCustomerAddress(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Address Details..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Aadhar Number / GST Number / PAN Number (Optional)</label>
              <input 
                type="text" 
                value={customerIdNumber} 
                onChange={(e) => setCustomerIdNumber(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="e.g. XXXX-XXXX-XXXX or 22AAAAA0000A1Z5 or ABCDE1234F"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="glass p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold text-slate-700">Line Items</h2>
            <button 
              type="button" 
              onClick={handleAddItem}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg flex items-center transition-colors"
            >
              <Plus size={16} className="mr-1" /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm relative">
                <div className="sm:col-span-4">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Product</label>
                  <input
                    required
                    placeholder="Product Name"
                    value={item.productName}
                    onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Category</label>
                  <input
                    placeholder="Category"
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 sm:col-span-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Price</label>
                    <input
                      required
                      type="number"
                      min="0"
                      placeholder="₹"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Qty</label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="sm:col-span-1 flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-30 transition-colors"
                    aria-label="Remove Item"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tax Settings */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tax Settings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Taxable Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Leave blank to auto-calculate"
                  value={taxableValue}
                  onChange={(e) => setTaxableValue(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">HSN/SAV Code</label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Tax Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4 flex flex-col items-end gap-1">
            <div className="text-right flex items-center justify-end w-full max-w-xs text-sm text-slate-500">
              <span className="w-24">Subtotal:</span>
              <span className="w-24 font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            {Number(taxAmount) > 0 && (
              <div className="text-right flex items-center justify-end w-full max-w-xs text-sm text-slate-500">
                <span className="w-24">Tax:</span>
                <span className="w-24 font-medium">+ ₹{Number(taxAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="text-right mt-2 flex items-end justify-end w-full">
              <p className="text-slate-600 font-semibold mr-4 pb-1 uppercase text-xs">Grand Total</p>
              <h3 className="text-3xl font-black text-slate-850">₹{calculateGrandTotal().toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-stretch sm:justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-primary hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center transition-all disabled:opacity-70"
          >
            {submitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <FileText size={20} className="mr-2" />}
            {submitting ? `Saving ${isQuotation ? 'Quotation' : 'Invoice'}...` : isEditMode ? 'Save Changes' : isQuotation ? 'Save Quotation' : 'Complete Billing'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateInvoice;
