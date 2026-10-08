import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, CheckCircle, XCircle, Award, Eye, Edit2, Search, ExternalLink, Copy } from "lucide-react";
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

  const ADMIN_EMAIL = "admin@company.com";
  const ADMIN_PASSWORD = "Password@123";
  const EMS_ADMIN_URL = `https://ems.thesmgroups.com/login?email=${encodeURIComponent(ADMIN_EMAIL)}&password=${encodeURIComponent(ADMIN_PASSWORD)}`;

  const handleOpenEmsAdmin = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ADMIN_EMAIL);
    }
    toast.success("Admin email & password prepared. Opening EMS Admin Portal...", { duration: 3000 });
    window.open(EMS_ADMIN_URL, "_blank");
  };

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    }
  };

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
  const [photoData, setPhotoData] = useState(null);
  const [photoStatus, setPhotoStatus] = useState("loading"); // 'loading' | 'success' | 'error'

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

  const handleViewPhoto = (photoPath, user, time, type = "Check-In") => {
    if (!photoPath) return;
    const backendUrl = import.meta.env.VITE_API_URL || "";
    const cleanUrl = photoPath.startsWith("http") ? photoPath : `${backendUrl.replace("/api", "")}${photoPath}`;
    setPhotoStatus("loading");
    setPhotoData({
      url: cleanUrl,
      userName: user?.name || "Staff Member",
      staffId: user?.staffId || "-",
      role: user?.role || "Staff",
      time: formatTime(time),
      type,
      date: selectedDate
    });
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
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Staff Attendance</h1>
        <p className="text-sm text-slate-500 mt-1">Review historical attendance logs or manage live attendance on the EMS Portal.</p>
      </div>

      {/* ── EMS ADMIN PORTAL REDIRECT & AUTOFILL CARD ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-2xl shadow-lg border border-indigo-800/40 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <span>Official EMS Attendance Portal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Live Staff Attendance is Managed on EMS Admin Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time biometric, QR, and daily check-ins are hosted on <a href="https://ems.thesmgroups.com/admin" target="_blank" rel="noopener noreferrer" className="underline font-mono text-white font-bold">https://ems.thesmgroups.com/admin</a>.
          </p>

          {/* Quick Credentials Info with Copy Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className="font-mono font-bold text-white">{ADMIN_EMAIL}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(ADMIN_EMAIL, "Email")}
                className="hover:text-blue-300 transition-colors ml-1 p-0.5 cursor-pointer"
                title="Copy Email"
              >
                <Copy size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Password:</span>
              <span className="font-mono font-bold text-white">{ADMIN_PASSWORD}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(ADMIN_PASSWORD, "Password")}
                className="hover:text-blue-300 transition-colors ml-1 p-0.5 cursor-pointer"
                title="Copy Password"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEmsAdmin}
          className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-blue-600/30 text-sm sm:text-base transition-all hover:scale-[1.02] shrink-0 text-center w-full xl:w-auto cursor-pointer"
        >
          <span>Open EMS Admin Portal</span>
          <ExternalLink size={18} />
        </button>
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
            <table className="w-full text-left border-collapse min-w-[950px]" aria-label="Staff Attendance List">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Staff Member</th>
                  <th className="p-4 text-center">Check In</th>
                  <th className="p-4 text-center">Check Out</th>
                  <th className="p-4 text-center">Work Hours</th>
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

                    {/* Check-In Details */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-semibold text-slate-700">{formatTime(log.checkIn)}</span>
                        {log.photo ? (
                          <button
                            onClick={() => handleViewPhoto(log.photo, log.user, log.checkIn, "Check-In")}
                            className="group relative inline-block focus:outline-none shrink-0"
                            title="View Check-In selfie"
                          >
                            <img
                              src={log.photo.startsWith("http") ? log.photo : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${log.photo}`}
                              alt="Check In"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="%23f1f5f9"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2364748b">${encodeURIComponent(log.user.name.charAt(0))}</text></svg>`;
                              }}
                            />
                            <span className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full shadow border border-white">
                              <Eye size={8} />
                            </span>
                          </button>
                        ) : (
                          log.checkIn && <span className="text-xs text-slate-300 italic">No Selfie</span>
                        )}
                      </div>
                    </td>

                    {/* Check-Out Details */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-semibold text-slate-700">{formatTime(log.checkOut)}</span>
                        {log.photoOut1 ? (
                          <button
                            onClick={() => handleViewPhoto(log.photoOut1, log.user, log.checkOut, "Check-Out")}
                            className="group relative inline-block focus:outline-none shrink-0"
                            title="View Check-Out selfie"
                          >
                            <img
                              src={log.photoOut1.startsWith("http") ? log.photoOut1 : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${log.photoOut1}`}
                              alt="Check Out"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="%23f1f5f9"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2364748b">${encodeURIComponent(log.user.name.charAt(0))}</text></svg>`;
                              }}
                            />
                            <span className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full shadow border border-white">
                              <Eye size={8} />
                            </span>
                          </button>
                        ) : (
                          log.checkOut && <span className="text-xs text-slate-300 italic">No Selfie</span>
                        )}
                      </div>
                    </td>

                    {/* Total Hours */}
                    <td className="p-4 text-center font-bold text-slate-800">
                      {log.workHours !== undefined ? `${log.workHours} hrs` : "0 hrs"}
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
                        className="bg-slate-100 hover:bg-primary hover:text-white text-slate-600 p-2 rounded-xl transition-all animate-none"
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
      {photoData && (
        <Modal 
          isOpen={isPhotoOpen} 
          onClose={() => setIsPhotoOpen(false)} 
          title={`${photoData.type} Verification: ${photoData.userName}`}
          maxWidth="max-w-md w-full"
        >
          <div className="p-5 space-y-4">
            {/* Staff Info Card Header */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 text-sm">{photoData.userName}</p>
                <p className="text-slate-500 font-medium">{photoData.staffId} • {photoData.role.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                  photoData.type === 'Check-In' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {photoData.type} at {photoData.time}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">{photoData.date}</p>
              </div>
            </div>

            {/* Photo Container */}
            <div className="flex justify-center items-center bg-slate-100 rounded-2xl p-2 border border-slate-200 overflow-hidden min-h-[260px] relative">
              {photoStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium mt-2">Loading image...</span>
                </div>
              )}

              <img
                src={photoData.url}
                alt={`${photoData.type} Selfie`}
                className={`max-h-[55vh] max-w-full object-contain rounded-xl shadow-sm ${photoStatus === 'success' ? 'block' : 'hidden'}`}
                onLoad={() => setPhotoStatus("success")}
                onError={() => setPhotoStatus("error")}
              />

              {photoStatus === 'error' && (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-2xl mb-1 shadow-inner">
                    {photoData.userName.charAt(0)}
                  </div>
                  <p className="text-sm font-bold text-slate-700">Selfie Not Stored Locally</p>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    This check-in was logged in the database, but the image file was stored on a previous server instance or is missing from local disk.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              {photoStatus === 'success' ? (
                <a
                  href={photoData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <ExternalLink size={14} /> Open Full Size
                </a>
              ) : null}
              <button
                onClick={() => setIsPhotoOpen(false)}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-primary/20"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

export default AttendanceManagement;
