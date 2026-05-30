import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { io } from 'socket.io-client';

const StaffDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffStats = async () => {
    try {
      const res = await api.get('/invoices/my');
      const invoices = res.data;
      
      setStats({
        totalInvoices: invoices.length,
        totalSales: invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0),
        pendingInvoices: invoices.filter(inv => inv.paymentStatus === 'pending').length,
        recentInvoices: invoices.slice(0, 5)
      });
    } catch {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffStats();

    // Listen for realtime updates
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002');

    socket.on('invoiceCreated', () => {
      fetchStaffStats(); // Refresh stats when any invoice is created
    });

    socket.on('paymentApproved', () => {
      fetchStaffStats(); // Refresh stats when a payment is approved
    });

    return () => {
      socket.off('invoiceCreated');
      socket.off('paymentApproved');
      socket.disconnect();
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Welcome, {user?.name}!</h1>
          <p className="text-slate-500 mt-1">Here is what's happening today.</p>
        </div>
        <Link 
          to="/staff/create-invoice"
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center hover:bg-blue-600 transition-all"
        >
          <PlusCircle size={20} className="mr-2" /> Create New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">My Sales Volume</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">₹{stats?.totalSales.toLocaleString()}</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Invoices Generated</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalInvoices}</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.pendingInvoices}</p>
        </div>
      </div>

      <div className="glass p-6 rounded-2xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6">My Recent Activity</h2>
        <div className="space-y-4">
          {stats?.recentInvoices.map((inv) => (
            <div key={inv._id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{inv.customerName} • {new Date(inv.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">₹{inv.grandTotal.toLocaleString()}</p>
                <p className={`text-[10px] font-bold uppercase ${inv.paymentStatus === 'paid' ? 'text-green-500' : 'text-amber-500'}`}>
                  {inv.paymentStatus}
                </p>
              </div>
            </div>
          ))}
          {stats?.recentInvoices.length === 0 && (
            <div className="text-center py-12 text-slate-500">No invoices generated yet.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StaffDashboard;
