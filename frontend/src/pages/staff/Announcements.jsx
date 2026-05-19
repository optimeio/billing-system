import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, MessageSquare, Send, Globe, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const Announcements = () => {
  const { user: currentUser } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [replyToAll, setReplyToAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
      if (res.data.length > 0 && !selectedAnn) {
        setSelectedAnn(res.data[0]);
      }
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/announcements/reply/${selectedAnn._id}`, {
        message: replyMsg,
        replyToAll
      });
      toast.success('Reply sent!');
      setReplyMsg('');
      const res = await api.get('/announcements');
      const updated = res.data.find(a => a._id === selectedAnn._id);
      setAnnouncements(res.data);
      setSelectedAnn(updated);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex space-x-6 overflow-hidden">
      {/* Sidebar: Notice List */}
      <div className="w-80 flex flex-col space-y-4">
        <div className="flex items-center space-x-3 mb-2 px-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Megaphone size={20} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Notices</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {loading ? (
             <div className="py-20 text-center"><Loader2 size={24} className="animate-spin text-primary inline" /></div>
          ) : announcements.map((ann) => {
            const isSelected = selectedAnn?._id === ann._id;
            return (
              <motion.div 
                key={ann._id}
                onClick={() => setSelectedAnn(ann)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                  isSelected 
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-600 border-transparent shadow-xl shadow-indigo-600/20' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                   <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center ${
                     isSelected ? 'bg-white/20 text-white' : ann.isGlobal ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                   }`}>
                     {ann.isGlobal ? <Globe size={10} className="mr-1" /> : <Shield size={10} className="mr-1" />}
                     {ann.isGlobal ? 'Global' : 'Private'}
                   </span>
                   <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                     {new Date(ann.createdAt).toLocaleDateString()}
                   </span>
                </div>
                <h3 className={`font-bold text-base line-clamp-1 mb-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {ann.title}
                </h3>
                <p className={`text-xs line-clamp-2 leading-relaxed ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {ann.content}
                </p>
              </motion.div>
            );
          })}
          {!loading && announcements.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Conversation Thread */}
      <div className="flex-1 flex flex-col glass rounded-[2rem] border border-white/50 shadow-xl overflow-hidden bg-white/40 backdrop-blur-xl relative">
        {selectedAnn ? (
          <>
            {/* Header */}
            <div className="px-8 py-6 bg-white/60 backdrop-blur-md border-b border-white/40 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedAnn.title}</h2>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {selectedAnn.senderId?.name.charAt(0)}
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Broadcast from <span className="font-bold text-slate-800">{selectedAnn.senderId?.name}</span>
                  </p>
                  {!selectedAnn.isGlobal && (
                    <span className="ml-3 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">
                      Admin sent this to you
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
              {/* Original Broadcast Card */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full"></div>
                <div className="ml-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap">{selectedAnn.content}</p>
                  <p className="text-xs text-slate-400 font-medium mt-4">{new Date(selectedAnn.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Replies Thread */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 text-slate-400 my-8">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200"></div>
                  <MessageSquare size={16} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Discussion</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200"></div>
                </div>

                {selectedAnn.replies?.map((reply, idx) => {
                  const isOwn = reply.senderId?._id === currentUser?._id;
                  
                  const canSee = selectedAnn.isGlobal || 
                                 reply.replyToAll || 
                                 isOwn || 
                                 currentUser.role === 'admin' || 
                                 reply.senderId?.role === 'admin';

                  if (!canSee) return null;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx} 
                      className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[75%] space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${
                          isOwn ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {reply.senderId?.name.charAt(0)}
                        </div>
                        <div className={`p-4 rounded-[1.5rem] shadow-sm flex flex-col ${
                          isOwn 
                          ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                        }`}>
                          <div className="flex items-center space-x-2 mb-1.5">
                            <span className={`text-[11px] font-bold ${isOwn ? 'text-indigo-100' : 'text-slate-800'}`}>
                              {reply.senderId?.name}
                            </span>
                            {reply.replyToAll && (
                               <span className="bg-white/20 text-indigo-50 border border-white/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">To All</span>
                            )}
                          </div>
                          <p className={`text-[14px] leading-relaxed ${isOwn ? 'text-white' : 'text-slate-600'}`}>{reply.message}</p>
                          <p className={`text-[10px] mt-2 self-end font-medium ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Reply Input */}
            <div className="p-6 bg-white/60 backdrop-blur-md border-t border-white/40 z-10">
              <form onSubmit={handleReply} className="flex flex-col space-y-3 max-w-4xl mx-auto">
                <div className="flex items-center space-x-2 ml-2">
                   <label className="flex items-center cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={replyToAll}
                          onChange={(e) => setReplyToAll(e.target.checked)}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-0 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                        />
                        <CheckCircle2 size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                      </div>
                      <span className="ml-2 text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Reply to everyone in this thread</span>
                   </label>
                </div>
                <div className="flex space-x-3 items-end">
                  <textarea 
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 bg-white border border-slate-200 rounded-3xl px-6 py-4 text-[15px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply(e);
                      }
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={submitting || !replyMsg.trim()}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
                  >
                    {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-slate-50/50">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Megaphone size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Select a Notice</h3>
            <p className="text-sm font-medium text-slate-500 max-w-xs">Choose an announcement from the sidebar to view details and join the discussion.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
