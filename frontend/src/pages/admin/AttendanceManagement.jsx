import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, CheckCircle, XCircle, Award, Eye, Edit2, Search } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal";

const AttendanceManagement = () => {
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const offset = new Date().getTimezoneOffset();
    const local = new Date(new Date().getTime() - (offset * 60 * 1000));
    return local.toISOString().split("T")[0];
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Override Modal
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [targetLog, setTargetLog] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState("present");
  const [overrideCheckIn, setOverrideCheckIn] = useState("");
  const [overrideCheckOut, setOverrideCheckOut] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Photo Modal
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUser, setPhotoUser] = useState("");

  useEffect(() => {
    fetchDailyLogs();
  }, [selectedDate]);

  const fetchDailyLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/daily?date=${selectedDate}`);
      setDailyLogs(res.data);
    } catch (err) {
      toast.error("Failed to load attendance logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOverride = (log) => {
    setTargetLog(log);
    setOverrideStatus(log.status === "leave" ? "leave" : log.status === "present" ? "present" : "absent");
    
    // Format dates to datetime-local values
    const formatToDateTimeLocal = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const pad = (n) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setOverrideCheckIn(formatToDateTimeLocal(log.checkIn));
    setOverrideCheckOut(formatToDateTimeLocal(log.checkOut));
    setOverrideNotes(log.notes || "");
    setIsOverrideOpen(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    setSavingOverride(true);
    try {
      await api.post("/attendance/mark", {
        userId: targetLog.user._id,
        date: selectedDate,
        status: overrideStatus,
        checkIn: overrideStatus === "present" ? overrideCheckIn || undefined : null,
        checkOut: overrideStatus === "present" ? overrideCheckOut || undefined : null,
        notes: overrideNotes
      });
      toast.success("Attendance updated successfully");
      setIsOverrideOpen(false);
      fetchDailyLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save attendance override");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleViewPhoto = (photoPath, userName) => {
    // Check if path is full URL or relative path
    const backendUrl = import.meta.env.VITE_API_URL || "";
    const cleanUrl = photoPath.startsWith("http") ? photoPath : `${backendUrl.replace("/api", "")}${photoPath}`;
    setPhotoUrl(cleanUrl);
    setPhotoUser(userName);
    setIsPhotoOpen(true);
  };

  // Metrics
  const totalStaff = dailyLogs.length;
  const presentCount = dailyLogs.filter(log => log.status === "present").length;
  const absentCount = dailyLogs.filter(log => log.status === "absent").length;
  const leaveCount = dailyLogs.filter(log => log.status === "leave").length;
  const attendanceRate = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

  // Filter logs by search query
  const filteredLogs = dailyLogs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.user.name.toLowerCase().includes(query) ||
      log.user.staffId.toLowerCase().includes(query) ||
      log.user.role.toLowerCase().includes(query)
    );
  });

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    const d = new Date(timeStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Attendance Management</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor daily staff check-ins, verify visual uploads, and override statuses.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <span className="text-xl font-bold text-slate-800">{totalStaff}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Present</span>
            <span className="text-xl font-bold text-slate-800">{presentCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Absent</span>
            <span className="text-xl font-bold text-slate-800">{absentCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave</span>
            <span className="text-xl font-bold text-slate-800">{leaveCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Award size={22} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Present Rate</span>
            <span className="text-xl font-bold text-slate-800">{attendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Control Panel (Date Select + Search) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Select Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 font-semibold"
          />
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search name, ID, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2.5 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-slate-700"
          />
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
        </div>
      </div>

      {/* Logs Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium mt-2">Loading attendance records...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Users size={36} />
            <span className="text-sm font-medium">No records matching search query.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Staff Attendance List">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Staff Member</th>
                  <th className="p-4 text-center">Verification Photo</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredLogs.map((log) => (
                  <tr key={log.user._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{log.user.name}</div>
                      <div className="text-xs text-slate-400">{log.user.staffId} • {log.user.role.toUpperCase()}</div>
                    </td>
                    <td className="p-4 text-center">
                      {log.photo ? (
                        <button
                          onClick={() => handleViewPhoto(log.photo, log.user.name)}
                          className="group relative inline-block focus:outline-none"
                        >
                          <img
                            src={log.photo.startsWith("http") ? log.photo : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${log.photo}`}
                            alt="Selfie"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80";
                            }}
                          />
                          <span className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full shadow border border-white">
                            <Eye size={10} />
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">No Photo</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          log.status === "present"
                            ? "bg-green-50 text-green-600"
                            : log.status === "leave"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 max-w-xs truncate">
                      {log.notes || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenOverride(log)}
                        className="bg-slate-100 hover:bg-primary hover:text-white text-slate-600 p-2 rounded-xl transition-all"
                        title="Override Attendance"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {targetLog && (
        <Modal isOpen={isOverrideOpen} onClose={() => setIsOverrideOpen(false)} title={`Override Attendance: ${targetLog.user.name}`}>
          <form onSubmit={handleSaveOverride} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Attendance Status</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 font-semibold"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave / Day Off</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Administrative Notes</label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="E.g., Forgot to check in, sick day, verified offline presence..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-slate-700"
              ></textarea>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={savingOverride}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                {savingOverride ? "Saving Override..." : "Save Override"}
              </button>
              <button
                type="button"
                onClick={() => setIsOverrideOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Selfie Photo Zoom Modal */}
      <Modal isOpen={isPhotoOpen} onClose={() => setIsPhotoOpen(false)} title={`Check-In Image: ${photoUser}`}>
        <div className="p-4 flex flex-col items-center justify-center gap-4">
          <img
            src={photoUrl}
            alt="Check-In Selfie"
            className="max-w-full max-h-[70dvh] object-contain rounded-2xl shadow-lg border border-slate-150"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&h=400&q=80";
            }}
          />
          <button
            onClick={() => setIsPhotoOpen(false)}
            className="w-full max-w-xs bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-slate-800/10"
          >
            Close Viewer
          </button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AttendanceManagement;
