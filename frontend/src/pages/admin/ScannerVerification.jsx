import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const ScannerVerification = () => {
  const [scanners, setScanners] = useState([]);

  const fetchScanners = async () => {
    try {
      const res = await api.get('/admin/scanners');
      setScanners(res.data);
    } catch {
      console.error('Failed to load scanner logs');
    }
  };

  useEffect(() => {
    fetchScanners();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Scanner Verification Logs</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 font-medium">Time</th>
              <th className="p-4 font-medium">Scanner ID</th>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scanners.map((s) => (
              <tr key={s._id} className="hover:bg-slate-50">
                <td className="p-4 text-sm">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-4 text-xs font-mono">{s.scannerId}</td>
                <td className="p-4 text-sm font-medium">{s.userId?.name || 'Unknown'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${s.status === 'verified' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                   <button className="text-primary hover:underline text-sm font-medium">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ScannerVerification;
