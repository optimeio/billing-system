import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Folder, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      console.error('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/categories/${currentId}`, { name });
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', { name });
        toast.success('Category added successfully');
      }
      setIsModalOpen(false);
      setName('');
      setIsEditing(false);
      setCurrentId(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat) => {
    setName(cat.name);
    setCurrentId(cat._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This may affect products in this category.')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
        <button 
          onClick={() => {
            setIsEditing(false);
            setName('');
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
        >
          <Plus size={18} className="mr-2" /> Add Category
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "Edit Category" : "Add New Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Beverages"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
          </button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat._id} className="glass p-6 rounded-xl border border-slate-200 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Folder size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{cat.name}</h3>
                <p className="text-sm text-slate-500">{cat.productCount || 0} Products</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <button onClick={() => handleEdit(cat)} aria-label="Edit Category" className="text-slate-400 hover:text-primary p-2 transition-colors" title="Edit"><Edit2 size={18} /></button>
              <button onClick={() => handleDelete(cat._id)} aria-label="Delete Category" className="text-slate-400 hover:text-red-500 p-2 transition-colors" title="Delete"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CategoryManagement;
