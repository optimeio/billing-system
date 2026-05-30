import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Camera, Shield, Save, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const fileInputRef = useRef(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put('/profile/me', formData);
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('profilePic', file);

    try {
      const res = await api.post('/profile/upload-pic', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser({ profilePic: res.data.profilePic });
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error('Failed to upload picture');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>

      <div className="glass p-8 rounded-2xl border border-slate-200">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {user?.profilePic ? (
              <img 
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${user.profilePic}`} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold border-4 border-white shadow-lg">
                {user?.name?.charAt(0)}
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-200 text-slate-600 hover:text-primary transition-colors group-hover:scale-110">
              <Camera size={16} />
            </button>
          </div>

          <div className="flex-1 w-full space-y-6">
            {!isEditing ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{user?.name}</h2>
                  <p className="text-slate-500 capitalize">{user?.role} - The SM Groups</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 text-slate-600">
                    <Mail size={18} className="text-primary" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600">
                    <Phone size={18} className="text-primary" />
                    <span>{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600">
                    <Shield size={18} className="text-primary" />
                    <span>ID: {user?.staffId || 'ADMIN'}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-primary/30 hover:bg-red-700 transition-all"
                  >
                    Edit Profile
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-center space-x-4 pt-4 border-t border-slate-100">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:bg-green-600 transition-all flex items-center disabled:opacity-50"
                  >
                    <Save size={18} className="mr-2" /> Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium shadow-sm hover:bg-slate-300 transition-all flex items-center"
                  >
                    <X size={18} className="mr-2" /> Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
