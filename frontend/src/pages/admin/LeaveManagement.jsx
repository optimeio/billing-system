import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, CheckCircle, XCircle, Clock, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { socket } from '../../services/socket';

const LeaveManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewLeave, setReviewLeave] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInitialData();

    const handleUpdate = () => {
      fetchInitialData();
    };

    socket.on('leaveApplied', handleUpdate);
    socket.on('leaveStatusUpdated', handleUpdate);
    socket.on('staffCreated', handleUpdate);
    socket.on('staffDeleted', handleUpdate);

    return () => {
      socket.off('leaveApplied', handleUpdate);
      socket.off('leaveStatusUpdated', handleUpdate);
      socket.off('staffCreated', handleUpdate);
      socket.off('staffDeleted', handleUpdate);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [staffRes, leavesRes] = await Promise.all([
        api.get('/staff/all'),
        api.get('/leaves/all')
      ]);
      setStaffList(staffRes.data);
      setLeaves(leavesRes.data);
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (leave) => {
    setReviewLeave(leave);
    setAdminComment('');
    setIsReviewModalOpen(true);
  };

  const submitReview = async (status) => {
    setProcessing(true);
    try {
      await api.patch(`/leaves/${reviewLeave._id}/status`, { status, adminComment });
      toast.success(`Leave ${status} successfully`);
      setIsReviewModalOpen(false);
      fetchInitialData();
    } catch (err) {
      toast.error('Review submission failed');
    } finally {
      setProcessing(false);
    }
  };

  const viewHistory = (staff) => {
    setSelectedStaff(staff);
    setIsHistoryModalOpen(true);
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Calendar size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
        </div>
        <div className="flex space-x-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium uppercase">Pending Requests</p>
            <p className="text-xl font-bold text-amber-600">{pendingLeaves.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Pending Requests Queue */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
            <Clock size={16} className="mr-2" /> Pending Queue
          </h2>
          <div className="space-y-3">
            {pendingLeaves.length === 0 ? (
              <div className="glass p-8 text-center text-slate-400 rounded-2xl border-dashed border-2 border-slate-200">
                All caught up! No pending requests.
              </div>
            ) : pendingLeaves.map(leave => (
              <motion.div 
                layout
                key={leave._id}
                className="glass p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xs">
                      {leave.userId?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{leave.userId?.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{leave.leaveType}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReview(leave)}
                    className="p-1.5 bg-primary text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg">"{leave.reason}"</p>
                <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                  <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Staff List for History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
            <Users size={16} className="mr-2" /> Staff Roster & History
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-semibold text-sm">Staff Member</th>
                  <th className="p-4 font-semibold text-sm">Role</th>
                  <th className="p-4 font-semibold text-sm text-center">Total Leaves</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="4" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
                ) : staffList.map(staff => (
                  <tr key={staff._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{staff.name}</p>
                          <p className="text-xs text-slate-500">{staff.staffId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 capitalize text-xs font-medium text-slate-600">{staff.role}</td>
                    <td className="p-4 text-center">
                      <span className="text-sm font-bold text-slate-800">
                        {leaves.filter(l => l.userId?._id === staff._id).length}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => viewHistory(staff)}
                        className="text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal 
        isOpen={isReviewModalOpen} 
        onClose={() => setIsReviewModalOpen(false)} 
        title="Review Leave Application"
      >
        {reviewLeave && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Application Details</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Staff</p>
                  <p className="font-bold">{reviewLeave.userId?.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Dates</p>
                  <p className="font-bold">{new Date(reviewLeave.startDate).toLocaleDateString()} - {new Date(reviewLeave.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-slate-500 text-xs">Reason</p>
                <p className="text-slate-800 italic">"{reviewLeave.reason}"</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <MessageSquare size={14} className="mr-1" /> Admin Remark (Sent via Email)
              </label>
              <textarea 
                rows="3"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Approved. Please handover tasks..."
                className="w-full border border-slate-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button 
                onClick={() => submitReview('rejected')}
                disabled={processing}
                className="py-3 px-4 rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center"
              >
                {processing ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} className="mr-2" />}
                Reject
              </button>
              <button 
                onClick={() => submitReview('approved')}
                disabled={processing}
                className="py-3 px-4 rounded-xl font-bold bg-green-600 text-white shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center"
              >
                {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} className="mr-2" />}
                Approve
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        title={`Leave History: ${selectedStaff?.name}`}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {leaves.filter(l => l.userId?._id === selectedStaff?._id).length === 0 ? (
            <p className="text-center py-8 text-slate-400">No applications found for this staff.</p>
          ) : (
            leaves.filter(l => l.userId?._id === selectedStaff?._id).map(leave => (
              <div key={leave._id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-800">{leave.leaveType}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    leave.status === 'approved' ? 'bg-green-100 text-green-700' : 
                    leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {leave.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</p>
                {leave.adminComment && (
                  <p className="mt-2 text-[11px] text-slate-600 border-t border-slate-200 pt-2 italic">
                    <span className="font-bold not-italic">Note:</span> {leave.adminComment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </motion.div>
  );
};

export default LeaveManagement;
