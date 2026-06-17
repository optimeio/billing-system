import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, Eye, Search, ClipboardList, Filter } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal";
import { socket } from "../../services/socket";

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Resolve Modal States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get("/complaints/admin");
      setComplaints(res.data);
    } catch (err) {
      toast.error("Failed to load complaints");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();

    // Live socket updates
    const handleComplaintCreated = (data) => {
      setComplaints((prev) => [data.complaint, ...prev]);
      toast.success(`New complaint submitted by ${data.complaint.userId?.name || "Staff"}!`);
    };

    const handleComplaintResolved = (resolvedComplaint) => {
      setComplaints((prev) =>
        prev.map((c) => (c._id === resolvedComplaint._id ? resolvedComplaint : c))
      );
    };

    socket.on("complaintCreated", handleComplaintCreated);
    socket.on("complaintResolved", handleComplaintResolved);

    return () => {
      socket.off("complaintCreated", handleComplaintCreated);
      socket.off("complaintResolved", handleComplaintResolved);
    };
  }, []);

  const handleOpenDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setResolutionNotes(complaint.resolutionNotes || "");
    setIsDetailOpen(true);
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      toast.error("Please add resolution notes.");
      return;
    }

    setResolving(true);
    try {
      const res = await api.patch(`/complaints/${selectedComplaint._id}/resolve`, {
        resolutionNotes
      });
      toast.success(res.data.message || "Complaint resolved successfully.");
      
      // Update local state
      setComplaints((prev) =>
        prev.map((c) => (c._id === selectedComplaint._id ? res.data.complaint : c))
      );
      
      setIsDetailOpen(false);
      setSelectedComplaint(null);
      setResolutionNotes("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve complaint.");
    } finally {
      setResolving(false);
    }
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

  // Filtering & Search
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userId?.staffId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Complaints Management</h1>
        <p className="text-sm text-slate-500 mt-1">Review staff issues, view details, communicate resolution notes, and resolve complaints.</p>
      </div>

      {/* Control Panel (Filter + Search) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 font-semibold"
          >
            <option value="all">All Complaints</option>
            <option value="pending">Pending Review</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search subject, name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2.5 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-slate-700"
          />
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading && complaints.length === 0 ? (
          <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium mt-2">Loading complaints...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <ClipboardList size={36} className="text-slate-350" />
            <span className="text-sm font-medium">No complaints found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]" aria-label="Complaints Log">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredComplaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{c.userId?.name || "Unknown"}</div>
                      <div className="text-xs text-slate-400">{c.userId?.staffId || "N/A"} • {c.userId?.role.toUpperCase()}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-800 max-w-xs truncate">
                      {c.subject}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {formatDate(c.createdAt)}
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
                        title={c.status === "pending" ? "Inspect & Resolve" : "View Resolution Details"}
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

      {/* Detail & Resolution Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Inspect Complaint: ${selectedComplaint.subject}`}
        >
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted By</span>
                <span className="block text-sm font-semibold text-slate-800">{selectedComplaint.userId?.name}</span>
                <span className="block text-[11px] text-slate-500">{selectedComplaint.userId?.staffId} • {selectedComplaint.userId?.role.toUpperCase()}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted On</span>
                <span className="block text-sm font-semibold text-slate-800">{formatDate(selectedComplaint.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Description</span>
              <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-150 whitespace-pre-wrap leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            {selectedComplaint.status === "resolved" ? (
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-green-50 text-green-600 border border-green-100">
                    RESOLVED
                  </span>
                </div>
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-green-700 font-semibold">
                    <span>Resolved by: {selectedComplaint.resolvedBy?.name || "System"}</span>
                    <span>{formatDate(selectedComplaint.resolvedAt)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Resolution Notes</span>
                    <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedComplaint.resolutionNotes}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResolve} className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100">
                    PENDING REVIEW
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Administrative Resolution Notes</label>
                  <textarea
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter details about how the issue was addressed, resolved, or feedback communicated..."
                    rows={4}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-slate-700 placeholder-slate-400"
                  ></textarea>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={resolving}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-green-600/10 flex justify-center items-center"
                  >
                    {resolving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Mark as Resolved"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

export default ComplaintManagement;
