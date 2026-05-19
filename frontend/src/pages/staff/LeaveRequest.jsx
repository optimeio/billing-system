import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Send, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const LeaveRequest = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaves/my');
      setLeaves(res.data);
    } catch {
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leaves', formData);
      toast.success('Leave application submitted!');
      setFormData({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '' });
      fetchMyLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <Calendar size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Leave Applications</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="glass p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <FileText size={18} className="mr-2 text-primary" /> Apply for Leave
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select 
                  value={formData.leaveType}
                  onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                  className="w-full border border-slate-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Paternity Leave</option>
                  <option>Maternity Leave</option>
                  <option>Unpaid Leave</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input 
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-slate-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input 
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-slate-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Describe your reason for leave..."
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full border border-slate-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all flex items-center justify-center disabled:opacity-70"
              >
                {submitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">My Leave History</h2>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{leaves.length} Applications</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-600">
                  <tr>
                    <th className="p-4 font-semibold text-sm">Dates</th>
                    <th className="p-4 font-semibold text-sm">Type</th>
                    <th className="p-4 font-semibold text-sm">Status</th>
                    <th className="p-4 font-semibold text-sm">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="4" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
                  ) : leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">{Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{leave.leaveType}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center w-fit ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-700' : 
                          leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {leave.status === 'approved' ? <CheckCircle size={12} className="mr-1"/> : 
                           leave.status === 'rejected' ? <XCircle size={12} className="mr-1"/> : <Clock size={12} className="mr-1"/>}
                          {leave.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-slate-500 italic max-w-xs truncate">{leave.adminComment || 'Waiting for review...'}</p>
                      </td>
                    </tr>
                  ))}
                  {!loading && leaves.length === 0 && (
                    <tr><td colSpan="4" className="p-12 text-center text-slate-500">No leave history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LeaveRequest;
