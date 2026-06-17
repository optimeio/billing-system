import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Send, CheckCircle, Clock, Eye, Trash2, Calendar, Clipboard } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal";

const SubmitComplaint = () => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Details
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchMyComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get("/complaints/my");
      setComplaints(res.data);
    } catch (err) {
      toast.error("Failed to load your complaints history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/complaints", { subject, description });
      toast.success(res.data.message || "Complaint submitted successfully!");
      setSubject("");
      setDescription("");
      fetchMyComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Submit a Complaint</h1>
        <p className="text-sm text-slate-500 mt-1">Have an issue, concern, or feedback? Submit a complaint safely and directly to the Admin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clipboard className="text-primary" size={20} />
              Complaint Form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject / Issue Title</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Broken hardware, salary discrepancy, etc."
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 font-semibold placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Detailed Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your issue in detail. Be clear and specify any relevant dates/information."
                  rows={6}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-slate-700 placeholder-slate-400"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Complaint
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Tracker Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              My Complaints History
            </h2>

            {loading ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium mt-2">Loading complaints...</span>
              </div>
            ) : complaints.length === 0 ? (
              <div className="py-24 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={36} className="text-slate-300" />
                <span className="text-sm font-medium">No complaints submitted yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse" aria-label="Complaints Log">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Date</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {complaints.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="p-4 font-bold text-slate-800 max-w-xs truncate">
                          {c.subject}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              c.status === "resolved"
                                ? "bg-green-50 text-green-600 border border-green-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="bg-slate-100 hover:bg-primary hover:text-white text-slate-600 p-2 rounded-xl transition-all"
                            title="View Complaint Details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Complaint: ${selectedComplaint.subject}`}
        >
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted On</span>
              <span className="block text-sm font-semibold text-slate-700">{formatDate(selectedComplaint.createdAt)}</span>
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complaint Details</span>
              <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-150 whitespace-pre-wrap leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedComplaint.status === "resolved"
                      ? "bg-green-50 text-green-600 border border-green-100"
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}
                >
                  {selectedComplaint.status}
                </span>
              </div>

              {selectedComplaint.status === "resolved" ? (
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-green-700 font-semibold">
                    <span>Resolved by: Admin ({selectedComplaint.resolvedBy?.name || "System"})</span>
                    <span>{formatDate(selectedComplaint.resolvedAt)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Admin Resolution Notes</span>
                    <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedComplaint.resolutionNotes || "Resolved successfully."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 font-medium">
                  <Clock size={16} className="shrink-0" />
                  <span>Your complaint is currently under review by the administrator. Please check back later for resolution.</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsDetailOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

export default SubmitComplaint;
