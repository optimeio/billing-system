import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, Package, FileText, 
  ArrowUpRight, CheckCircle, AlertTriangle 
} from 'lucide-react';
import api from '../../services/api';
import { socket } from '../../services/socket';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Listen for realtime updates using the socket singleton
    const events = [
      'invoiceCreated',
      'invoiceUpdated',
      'invoiceDeleted',
      'paymentCreated',
      'paymentApproved',
      'paymentRejected',
      'productCreated',
      'productUpdated',
      'productDeleted',
      'stockUpdated',
      'lowStock',
      'staffCreated',
      'staffUpdated',
      'staffDeleted',
      'staffBlocked',
      'staffUnblocked',
      'categoryCreated',
      'categoryUpdated',
      'categoryDeleted',
      'leaveApplied',
      'leaveStatusUpdated',
      'expenseCreated',
      'expenseApproved',
      'expensePaid',
      'expenseRejected',
      'expenseDeleted'
    ];

    const handleUpdate = () => {
      fetchStats();
    };

    events.forEach(evt => {
      socket.on(evt, handleUpdate);
    });

    return () => {
      events.forEach(evt => {
        socket.off(evt, handleUpdate);
      });
    };
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  const statsCards = [
    { title: 'Total Revenue', value: `₹${data?.stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Total Invoices', value: data?.stats.totalInvoices, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Total Products', value: data?.stats.totalProducts, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Active Staff', value: data?.stats.totalStaff, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Real-time business performance metrics.</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statsCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 md:p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-3 md:mt-4">
              <h3 className="text-slate-500 text-xs md:text-sm font-medium">{stat.title}</h3>
              <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1 truncate">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 glass p-4 md:p-6 rounded-2xl border border-slate-200">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-slate-800">Recent Invoices</h2>
            <button className="text-primary text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[500px]" aria-label="Recent Invoices">
              <thead className="text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="pb-4 font-semibold">Invoice</th>
                  <th className="pb-4 font-semibold">Customer</th>
                  <th className="pb-4 font-semibold">Amount</th>
                  <th className="pb-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-bold text-slate-700 text-sm pr-4">{inv.invoiceNumber}</td>
                    <td className="py-3 text-sm text-slate-600 max-w-[120px] truncate pr-4">{inv.customerName}</td>
                    <td className="py-3 font-bold text-slate-800 text-sm pr-4">₹{inv.grandTotal?.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Status */}
        <div className="glass p-4 md:p-6 rounded-2xl border border-slate-200">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-6">Stock Alerts</h2>
          <div className="space-y-3">
            {data?.lowStockProducts.map((p) => (
              <div key={p._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg flex-shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">{p.category?.name}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-600">{p.stock}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Left</p>
                </div>
              </div>
            ))}
            {data?.lowStockProducts.length === 0 && (
               <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle size={40} className="text-green-500 mb-3 opacity-20" />
                  <p className="text-slate-500 font-medium text-sm">All items well stocked</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
