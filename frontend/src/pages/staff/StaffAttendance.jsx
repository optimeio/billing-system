import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Camera, CheckCircle2, LogOut, History, Eye, Calendar, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal";

const StaffAttendance = () => {
  const [time, setTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Photo uploads state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Photo viewer modal
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoTitle, setPhotoTitle] = useState("Photo Viewer");

  const fetchTodayRecord = async () => {
    try {
      const res = await api.get("/attendance/today");
      setTodayRecord(res.data);
    } catch (err) {
      console.error("Failed to load today's attendance:", err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/attendance/my-history");
      setHistory(res.data);
    } catch (err) {
      toast.error("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Live clock ticker
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchTodayRecord();
    fetchHistory();
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Helper to determine check-in state, labels, and deadlines
  const getAttendanceState = () => {
    const nowHour = time.getHours();
    const nowMinutes = time.getMinutes();
    const isPast10AM = nowHour > 10 || (nowHour === 10 && nowMinutes > 0);

    if (!todayRecord) {
      return {
        type: "check-in",
        label: "Check In",
        description: "Record your daily presence. Selfie photo is required.",
        alert: isPast10AM ? "Late Check In (Deadline 10:00 AM)" : null
      };
    }

    // Checked in, but not checked out
    if (todayRecord.checkIn && !todayRecord.checkOut) {
      return {
        type: "check-out",
        label: "Check Out",
        description: "Record check-out and complete your workday. Selfie photo is required.",
        alert: null
      };
    }

    // Checked in and checked out
    return {
      type: "completed",
      label: "Attendance Completed",
      description: "You have completed your check-in and check-out for today.",
      alert: null
    };
  };

  const activeState = getAttendanceState();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (activeState.type === "completed") return;

    if (!selectedFile) {
      toast.error(`Selfie photo is required for ${activeState.label}!`);
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("photo", selectedFile);

    try {
      const endpoint = activeState.type === "check-in" ? "/attendance/check-in" : "/attendance/check-out";
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(res.data.message || "Attendance recorded successfully!");
      setSelectedFile(null);
      setPreviewUrl("");
      fetchTodayRecord();
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPhoto = (photoPath, title = "Visual Verification") => {
    const backendUrl = import.meta.env.VITE_API_URL || "";
    const cleanUrl = photoPath.startsWith("http") ? photoPath : `${backendUrl.replace("/api", "")}${photoPath}`;
    setPhotoUrl(cleanUrl);
    setPhotoTitle(title);
    setIsPhotoOpen(true);
  };

  const getMonthName = (monthStr) => {
    if (!monthStr) return "";
    const [year, month, day] = monthStr.split("-");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    const d = new Date(timeStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Attendance Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Record your check-in and check-out for today. All steps require selfie verification.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Check-in Widget Card */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-6">
            {/* Live Clock Ticker */}
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Time</div>
              <div className="text-3xl font-black text-slate-850 tracking-tight flex items-center justify-center gap-2">
                <Clock className="text-primary animate-pulse" size={24} />
                {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            <div className="w-full border-t border-slate-100 pt-6">
              {activeState.type === "completed" ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow border border-green-100">
                      <CheckCircle2 size={30} />
                    </div>
                    <span className="text-sm font-bold text-green-600 uppercase tracking-wider mt-1">Done for Today</span>
                  </div>
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-2">
                    <p className="font-semibold text-slate-700">Today's Summary:</p>
                    {todayRecord?.checkIn && (
                      <p>• Check In: {formatTime(todayRecord.checkIn)}</p>
                    )}
                    {todayRecord?.checkOut && (
                      <p>• Check Out: {formatTime(todayRecord.checkOut)}</p>
                    )}
                    <p className="font-bold border-t pt-1.5 mt-1">Total Hours: {todayRecord?.workHours || 0} hrs</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-bold text-slate-700 block">{activeState.label}</span>
                    <span className="text-[11px] text-slate-500 block leading-snug">{activeState.description}</span>
                    {activeState.alert && (
                      <div className="flex items-center gap-1.5 mt-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 text-[10px] font-bold">
                        <AlertTriangle size={12} className="shrink-0" />
                        {activeState.alert}
                      </div>
                    )}
                  </div>

                  <div className="text-left space-y-1.5">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Selfie Upload</span>
                    
                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-slate-50 transition-colors group cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="user" // Force front camera on mobile
                        required
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        id="selfie-file"
                      />
                      
                      {previewUrl ? (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
                          <img
                            src={previewUrl}
                            alt="Captured Selfie Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
                            <Camera className="text-white" size={24} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white text-primary rounded-full flex items-center justify-center shadow border border-slate-100 group-hover:scale-105 transition-transform">
                            <Camera size={20} />
                          </div>
                          <div className="text-center space-y-1">
                            <span className="block text-xs font-bold text-slate-700">Take Session Selfie</span>
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wide">Supports camera or file upload</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedFile}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      activeState.label
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* History Table Column */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="text-primary" size={20} />
              Recent Attendance Log
            </h2>

            {loading ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium mt-2">Loading your log...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-24 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Calendar size={36} />
                <span className="text-sm font-medium">No check-in records found. Check in above to start!</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse min-w-[700px]" aria-label="Personal Attendance Log">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Date</th>
                      <th className="p-4 text-center">Check In</th>
                      <th className="p-4 text-center">Check Out</th>
                      <th className="p-4 text-center">Work Hours</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {history.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          {getMonthName(rec.date)}
                        </td>
                        
                        {/* Check-In Details */}
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold text-slate-700">{formatTime(rec.checkIn)}</span>
                            {rec.photo ? (
                              <button
                                onClick={() => handleViewPhoto(rec.photo, `Check-In Selfie: ${getMonthName(rec.date)}`)}
                                className="group relative inline-block focus:outline-none shrink-0"
                                title="View Check-In selfie"
                              >
                                <img
                                  src={rec.photo.startsWith("http") ? rec.photo : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${rec.photo}`}
                                  alt="Check In"
                                  className="w-8 h-8 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  onError={(e) => {
                                    e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80";
                                  }}
                                />
                                <span className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full shadow border border-white">
                                  <Eye size={6} />
                                </span>
                              </button>
                            ) : (
                              rec.checkIn && <span className="text-xs text-slate-300 italic">No Selfie</span>
                            )}
                          </div>
                        </td>

                        {/* Check-Out Details */}
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold text-slate-700">{formatTime(rec.checkOut)}</span>
                            {rec.photoOut1 ? (
                              <button
                                onClick={() => handleViewPhoto(rec.photoOut1, `Check-Out Selfie: ${getMonthName(rec.date)}`)}
                                className="group relative inline-block focus:outline-none shrink-0"
                                title="View Check-Out selfie"
                              >
                                <img
                                  src={rec.photoOut1.startsWith("http") ? rec.photoOut1 : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${rec.photoOut1}`}
                                  alt="Check Out"
                                  className="w-8 h-8 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  onError={(e) => {
                                    e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80";
                                  }}
                                />
                                <span className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full shadow border border-white">
                                  <Eye size={6} />
                                </span>
                              </button>
                            ) : (
                              rec.checkOut && <span className="text-xs text-slate-300 italic">No Selfie</span>
                            )}
                          </div>
                        </td>

                        {/* Total Hours */}
                        <td className="p-4 text-center font-bold text-slate-800">
                          {rec.workHours !== undefined ? `${rec.workHours} hrs` : "-"}
                        </td>

                        {/* Status badge */}
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              rec.status === "present"
                                ? "bg-green-50 text-green-600"
                                : rec.status === "leave"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {rec.status.toUpperCase()}
                          </span>
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

      {/* Selfie Photo Zoom Modal */}
      <Modal isOpen={isPhotoOpen} onClose={() => setIsPhotoOpen(false)} title={photoTitle}>
        <div className="p-4 flex flex-col items-center justify-center gap-4">
          <img
            src={photoUrl}
            alt={photoTitle}
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

export default StaffAttendance;
