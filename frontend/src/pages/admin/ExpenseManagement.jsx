import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import useAuthStore from '../../store/authStore';

const ExpenseManagement = () => {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'General',
    description: '',
    file: null
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const data = new FormData();
    data.append('title', formData.title);
    data.append('amount', formData.amount);
    data.append('category', formData.category);
    data.append('description', formData.description);
    if (formData.file) {
      data.append('file', formData.file);
    }

    try {
      await api.post('/expenses', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Expense added successfully');
      setIsModalOpen(false);
      setFormData({ title: '', amount: '', category: 'General', description: '', file: null });
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/expenses/${id}/${status}`);
      toast.success(`Expense ${status}`);
      fetchExpenses();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Expense Tracking</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
        >
          <Plus size={18} className="mr-2" /> Add Expense
        </button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title / Reason</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Office Supplies"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="General">General</option>
                <option value="Travel">Travel</option>
                <option value="Supplies">Supplies</option>
                <option value="Utilities">Utilities</option>
                <option value="Salary">Salary</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 h-24"
              placeholder="Additional details..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Receipt / Scanner (Optional)</label>
            <input
              type="file"
              onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              accept="image/*,.pdf"
            />
            <p className="text-xs text-slate-500 mt-1">Upload proof of payment or scanner screenshot.</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Expense'}
          </button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass p-6 rounded-xl border border-slate-200">
           <p className="text-slate-500 text-sm">Monthly Outflow</p>
           <p className="text-2xl font-bold text-red-600 mt-1">₹{expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</p>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-600">{new Date(exp.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium">
                    <div className="flex flex-col">
                      <span>{exp.category || 'General'}</span>
                      {exp.billFile && (
                        <a 
                          href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${exp.billFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-xs mt-1 flex items-center"
                        >
                          View Receipt
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-800">₹{exp.amount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      exp.status === 'approved' ? 'bg-green-100 text-green-600' : 
                      exp.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {user?.role === 'admin' && exp.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusUpdate(exp._id, 'approve')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={18}/></button>
                        <button onClick={() => handleStatusUpdate(exp._id, 'reject')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><XCircle size={18}/></button>
                      </>
                    )}
                    <button onClick={() => handleDelete(exp._id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default ExpenseManagement;
