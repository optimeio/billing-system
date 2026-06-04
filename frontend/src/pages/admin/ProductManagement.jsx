import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Package, Edit2, Trash2, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { socket } from '../../services/socket';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', barcode: '', price: '', stock: '', category: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      console.error('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    const handleProductUpdate = () => {
      fetchProducts();
    };

    const handleCategoryUpdate = () => {
      fetchCategories();
    };

    socket.on('productCreated', handleProductUpdate);
    socket.on('productUpdated', handleProductUpdate);
    socket.on('productDeleted', handleProductUpdate);
    socket.on('stockUpdated', handleProductUpdate);
    socket.on('lowStock', handleProductUpdate);

    socket.on('categoryCreated', handleCategoryUpdate);
    socket.on('categoryUpdated', handleCategoryUpdate);
    socket.on('categoryDeleted', handleCategoryUpdate);

    return () => {
      socket.off('productCreated', handleProductUpdate);
      socket.off('productUpdated', handleProductUpdate);
      socket.off('productDeleted', handleProductUpdate);
      socket.off('stockUpdated', handleProductUpdate);
      socket.off('lowStock', handleProductUpdate);

      socket.off('categoryCreated', handleCategoryUpdate);
      socket.off('categoryUpdated', handleCategoryUpdate);
      socket.off('categoryDeleted', handleCategoryUpdate);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/products/${currentId}`, formData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData);
        toast.success('Product added successfully');
      }
      setShowAddForm(false);
      setFormData({ name: '', barcode: '', price: '', stock: '', category: '' });
      setIsEditing(false);
      setCurrentId(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      price: product.price,
      stock: product.stock,
      category: product.category?._id || ''
    });
    setCurrentId(product._id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Product Inventory</h1>
        <button 
          onClick={() => {
            setIsEditing(false);
            setFormData({ name: '', barcode: '', price: '', stock: '', category: '' });
            setShowAddForm(true);
          }}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </button>
      </div>

      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title={isEditing ? "Edit Product" : "Add New Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Barcode / SKU</label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Save Product'}
          </button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {products.slice(0, 4).map((p, i) => (
           <div key={i} className="glass p-4 rounded-xl border border-slate-200">
             <div className="flex items-center space-x-3">
               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package size={20}/></div>
               <div>
                 <p className="text-xs text-slate-500 font-medium">In Stock</p>
                 <p className="text-lg font-bold text-slate-800">{p.stock}</p>
               </div>
             </div>
           </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left" aria-label="Product Inventory Table">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Product Name</th>
                <th className="p-4 font-medium">Barcode</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
              ) : products.map((product) => (
                <tr key={product._id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4 text-sm text-slate-500">{product.barcode || 'N/A'}</td>
                  <td className="p-4 text-sm capitalize">{product.category?.name || 'Uncategorized'}</td>
                  <td className="p-4 font-bold text-slate-800">₹{product.price}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${product.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {product.stock} units
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="p-2 text-slate-400 hover:text-primary transition-colors"
                    >
                      <Edit2 size={16}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductManagement;
