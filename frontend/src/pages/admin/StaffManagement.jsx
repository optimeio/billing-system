import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldOff, Trash2, Plus, Loader2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/common/Modal';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Staff Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', staffId: '', password: '', role: 'staff' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/all');
      setStaffList(res.data);
    } catch {
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/staff/${currentId}`, formData);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/staff/create', formData);
        toast.success('Staff created successfully');
      }
      setShowAddForm(false);
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', email: '', phone: '', staffId: '', password: '', role: 'staff' });
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (staff) => {
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      staffId: staff.staffId,
      password: '', // Don't show password
      role: staff.role
    });
    setCurrentId(staff._id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleToggleBlock = async (id, isBlocked) => {
    try {
      if (isBlocked) {
        await api.patch(`/staff/unblock/${id}`);
        toast.success('Staff unblocked');
      } else {
        await api.patch(`/staff/block/${id}`);
        toast.success('Staff blocked');
      }
      fetchStaff();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff deleted');
      fetchStaff();
    } catch {
      toast.error('Failed to delete staff');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
        <button 
          onClick={() => {
            setIsEditing(false);
            setFormData({ name: '', email: '', phone: '', staffId: '', password: '', role: 'staff' });
            setShowAddForm(true);
          }}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
        >
          <Plus size={18} className="mr-2" />
          Add Staff
        </button>
      </div>

      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title={isEditing ? "Edit Staff" : "Add New Staff Member"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input required placeholder="e.g. John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input required placeholder="john@example.com" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input required placeholder="1234567890" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Staff ID</label>
                <input required placeholder="S001" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select 
                  required 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})} 
                  className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="staff">Staff</option>
                  <option value="inventory">Inventory Manager</option>
                </select>
              </div>
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            )}
            <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50">
              {submitting ? 'Processing...' : isEditing ? 'Update Staff' : 'Create Staff Member'}
            </button>
          </form>
      </Modal>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left" aria-label="Staff List">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Name & ID</th>
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.staffId}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{staff.email}</p>
                      <p className="text-xs text-slate-500">{staff.phone}</p>
                    </td>
                    <td className="p-4 capitalize text-sm">{staff.role}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleEdit(staff)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleToggleBlock(staff._id, staff.isBlocked)} className={`p-2 rounded-lg ${staff.isBlocked ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`} title={staff.isBlocked ? "Unblock" : "Block"}>
                        {staff.isBlocked ? <Shield size={16} /> : <ShieldOff size={16} />}
                      </button>
                      <button onClick={() => handleDelete(staff._id)} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StaffManagement;
