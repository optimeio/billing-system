import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Users, Send, MessageCircle, User, Check, Search, Loader2, Globe, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isGlobal: true,
    recipients: []
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [annRes, staffRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/staff/all')
      ]);
      setAnnouncements(annRes.data);
      setStaffList(staffRes.data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (id) => {
    const updated = formData.recipients.includes(id)
      ? formData.recipients.filter(r => r !== id)
      : [...formData.recipients, id];
    setFormData({ ...formData, recipients: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.isGlobal && formData.recipients.length === 0) {
      return toast.error('Please select at least one recipient');
    }

    setSubmitting(true);
    try {
      await api.post('/announcements', formData);
      toast.success('Announcement sent successfully!');
      setIsModalOpen(false);
      setFormData({ title: '', content: '', isGlobal: true, recipients: [] });
      fetchData();
    } catch {
      toast.error('Failed to send announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-700 rounded-xl text-white shadow-lg shadow-red-100">
            <Megaphone size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Announcement Center</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl flex items-center font-bold shadow-lg shadow-red-500/30 transition-all hover:scale-105"
        >
          <Send size={18} className="mr-2" /> Broadcast Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 size={32} className="animate-spin text-indigo-500 inline" /></div>
        ) : announcements.map((ann) => (
          <motion.div 
            key={ann._id} 
            layout
            className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-100 flex flex-col hover:shadow-xl hover:shadow-red-500/10 transition-all group relative overflow-hidden h-64"
          >
            {ann.isGlobal ? (
              <span className="absolute top-5 right-5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center shadow-sm">
                <Globe size={10} className="mr-1" /> Public
              </span>
            ) : (
              <span className="absolute top-5 right-5 bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center shadow-sm">
                <Shield size={10} className="mr-1" /> Private
              </span>
            )}

            <h3 className="font-bold text-slate-800 text-lg mb-3 pr-16 leading-tight">{ann.title}</h3>
            <p className="text-slate-500 text-[14px] line-clamp-3 mb-4 flex-1 leading-relaxed">
              {ann.content}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100/60">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                    {ann.senderId?.name?.charAt(0) || 'A'}
                  </div>
                 <div className="flex flex-col">
                   <span className="text-[11px] text-slate-400 font-medium">Sent by</span>
                   <span className="text-xs text-slate-700 font-bold">{ann.senderId?.name}</span>
                 </div>
               </div>
               <div className="flex items-center text-slate-400 space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                 <MessageCircle size={14} className="text-red-400" />
                 <span className="text-xs font-bold text-slate-600">{ann.replies?.length || 0}</span>
               </div>
            </div>
          </motion.div>
        ))}
        {announcements.length === 0 && !loading && (
          <div className="col-span-full py-32 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Megaphone size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No announcements broadcasted yet.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Broadcast">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Announcement Title</label>
            <input 
              required 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all bg-slate-50 focus:bg-white" 
              placeholder="e.g. Important System Maintenance"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Detailed Message</label>
            <textarea 
              required 
              rows="5"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all bg-slate-50 focus:bg-white resize-none" 
              placeholder="Type your message here..."
            />
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Target Audience</p>
            <div className="flex space-x-3">
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, isGlobal: true, recipients: []})}
                 className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${formData.isGlobal ? 'bg-white text-red-600 border-2 border-red-500 shadow-sm' : 'bg-white border-2 border-transparent text-slate-500 hover:bg-slate-100'}`}
               >
                 <Globe size={16} className="mr-2" /> All Staff
               </button>
               <button 
                 type="button"
                 onClick={() => {
                   setFormData({...formData, isGlobal: false});
                   setIsStaffPickerOpen(true);
                 }}
                 className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${!formData.isGlobal ? 'bg-white text-red-600 border-2 border-red-500 shadow-sm' : 'bg-white border-2 border-transparent text-slate-500 hover:bg-slate-100'}`}
               >
                 <Shield size={16} className="mr-2" /> Specific Staff {formData.recipients.length > 0 && <span className="ml-2 bg-red-100 px-2 py-0.5 rounded-full text-xs">{formData.recipients.length}</span>}
               </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold shadow-xl shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} className="mr-2" />}
            Broadcast Now
          </button>
        </form>
      </Modal>

      {/* Staff Picker Modal */}
      <Modal isOpen={isStaffPickerOpen} onClose={() => setIsStaffPickerOpen(false)} title="Select Recipients">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all"
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredStaff.map(staff => (
              <div 
                key={staff._id} 
                onClick={() => toggleRecipient(staff._id)}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-2 ${formData.recipients.includes(staff._id) ? 'bg-red-50/50 border-red-500 shadow-sm' : 'hover:bg-slate-50 border-transparent bg-white'}`}
              >
                <div className="flex items-center space-x-4">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase transition-colors ${formData.recipients.includes(staff._id) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                     {staff.name.charAt(0)}
                   </div>
                   <div>
                     <p className={`font-bold transition-colors ${formData.recipients.includes(staff._id) ? 'text-red-900' : 'text-slate-700'}`}>{staff.name}</p>
                     <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{staff.role}</p>
                   </div>
                </div>
                {formData.recipients.includes(staff._id) ? (
                  <div className="bg-red-600 text-white rounded-full p-1.5 shadow-sm scale-110 transition-transform"><Check size={14} /></div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>
                )}
              </div>
            ))}
            {filteredStaff.length === 0 && (
              <div className="text-center py-10 text-slate-400">No staff members found matching "{searchTerm}"</div>
            )}
          </div>
          <button 
            onClick={() => setIsStaffPickerOpen(false)}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md"
          >
            Confirm Selection
          </button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AnnouncementManagement;
