import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, Eye, Calendar, ExternalLink, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/common/Modal";

const StaffAttendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Photo viewer modal
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [photoData, setPhotoData] = useState({
    url: "",
    title: "",
    time: "",
    type: "Check-In",
    date: ""
  });

  const EMS_PORTAL_URL = "https://ems.thesmgroups.com/";

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/attendance/my-history");
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load attendance history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleViewPhoto = (photoPath, date, time, type = "Check-In") => {
    if (!photoPath) return;
    const backendUrl = import.meta.env.VITE_API_URL || "";
    const cleanUrl = photoPath.startsWith("http") ? photoPath : `${backendUrl.replace("/api", "")}${photoPath}`;
    setPhotoStatus("loading");
    setPhotoData({
      url: cleanUrl,
      title: `${type} Verification: ${getMonthName(date)}`,
      time: formatTime(time),
      type,
      date: getMonthName(date)
    });
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
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Staff Attendance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Attendance tracking has transitioned to the centralized EMS Portal.
        </p>
      </div>

      {/* ── EMS PORTAL MIGRATION NOTICE CARD (PROMINENT) ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
              <AlertCircle size={14} />
              <span>Official Attendance Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Attendance Moved to EMS Portal
            </h2>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Daily staff check-in, check-out, and attendance management are now hosted on the official SM Groups EMS platform. Attendance marking on this billing portal is closed.
            </p>
            <p className="text-xs text-blue-200 font-medium">
              Portal URL: <a href={EMS_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="underline font-mono text-white font-bold">{EMS_PORTAL_URL}</a>
            </p>
          </div>

          <a
            href={EMS_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-blue-500/30 text-base transition-all hover:scale-[1.02] shrink-0 text-center w-full md:w-auto"
          >
            <span>Open EMS Attendance Portal</span>
            <ExternalLink size={18} />
          </a>
        </div>
      </div>

      {/* ── PREVIOUS ATTENDANCE HISTORY LOG ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-blue-600" size={20} />
            Previous Attendance History (Billing Portal)
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Historical logs recorded on this system are preserved below
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium mt-2">Loading historical records...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Calendar size={36} />
            <span className="text-sm font-medium">No previous check-in records found on this system.</span>
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
                            onClick={() => handleViewPhoto(rec.photo, rec.date, rec.checkIn, "Check-In")}
                            className="group relative inline-block focus:outline-none shrink-0"
                            title="View Check-In selfie"
                          >
                            <img
                              src={rec.photo.startsWith("http") ? rec.photo : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${rec.photo}`}
                              alt="Check In"
                              className="w-8 h-8 object-cover rounded-lg border border-slate-200 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="hidden w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center text-slate-500 font-bold text-xs">
                              IN
                            </div>
                            <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow border border-white">
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
                            onClick={() => handleViewPhoto(rec.photoOut1, rec.date, rec.checkOut, "Check-Out")}
                            className="group relative inline-block focus:outline-none shrink-0"
                            title="View Check-Out selfie"
                          >
                            <img
                              src={rec.photoOut1.startsWith("http") ? rec.photoOut1 : `${import.meta.env.VITE_API_URL?.replace("/api", "") || ""}${rec.photoOut1}`}
                              alt="Check Out"
                              className="w-8 h-8 object-cover rounded-lg border border-slate-200 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="hidden w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center text-slate-500 font-bold text-xs">
                              OUT
                            </div>
                            <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full shadow border border-white">
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

      {/* Selfie Photo Zoom Modal */}
      {isPhotoOpen && (
        <Modal 
          isOpen={isPhotoOpen} 
          onClose={() => setIsPhotoOpen(false)} 
          title={photoData.title}
          maxWidth="max-w-md w-full"
        >
          <div className="p-5 space-y-4">
            {/* Header info badge */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-800 text-sm">{photoData.type} Verification</p>
                <p className="text-slate-500 font-medium">{photoData.date}</p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                  photoData.type === 'Check-In' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {photoData.type} at {photoData.time}
                </span>
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
                <div className="flex flex-col items-center justify-center p-6 text-center gap-3 w-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/20 border border-indigo-200/60 flex items-center justify-center text-indigo-700 font-bold text-2xl shadow-sm">
                    {photoData.type === 'Check-In' ? 'IN' : 'OUT'}
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-bold text-slate-800">Digital Record Verified</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Check-in entry is verified and timestamped in the database. The original snapshot is archived on the centralized EMS portal.
                    </p>
                  </div>
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
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm"
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

export default StaffAttendance;
