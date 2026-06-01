import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CreateInvoice = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState([{ productName: '', category: '', price: '', qty: 1 }]);
  const [submitting, setSubmitting] = useState(false);

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

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
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
        items: items.map(item => ({
          productName: item.productName,
          category: item.category || 'General',
          price: Number(item.price),
          qty: Number(item.qty)
        }))
      };

      const res = await api.post('/invoices', payload);
      toast.success(res.data.message || 'Invoice created successfully!');
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setItems([{ productName: '', category: '', price: '', qty: 1 }]);
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <FileText size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Create New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details */}
        <div className="glass p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-700 border-b pb-2">Customer Details</h2>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Customer Address (Optional)</label>
              <input 
                type="text" 
                value={customerAddress} 
                onChange={(e) => setCustomerAddress(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="46, PATTELSHA STREET, Kadathur, Dharmapuri..."
              />
            </div>
          </div>
        </div>

        {/* Invoice Items */}
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
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm relative">
                <div className="md:col-span-4">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Product</label>
                  <input 
                    required
                    placeholder="Product Name" 
                    value={item.productName} 
                    onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Category</label>
                  <input 
                    placeholder="Category" 
                    value={item.category} 
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 md:col-span-4 gap-3">
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
                <div className="md:col-span-1 flex justify-end md:justify-center">
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

          {/* Totals */}
          <div className="mt-6 border-t pt-4 flex justify-end">
            <div className="text-right">
              <p className="text-slate-500">Subtotal</p>
              <h3 className="text-3xl font-bold text-slate-800">₹{calculateTotal().toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={submitting}
            className="bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-primary/30 flex items-center transition-all disabled:opacity-70"
          >
            {submitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <FileText size={20} className="mr-2" />}
            {submitting ? 'Generating Invoice...' : 'Complete Billing'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateInvoice;
