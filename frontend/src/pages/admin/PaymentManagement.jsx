import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { socket } from '../../services/socket';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    const handleUpdate = () => {
      fetchPayments();
    };

    socket.on('paymentCreated', handleUpdate);
    socket.on('paymentApproved', handleUpdate);
    socket.on('paymentRejected', handleUpdate);

    return () => {
      socket.off('paymentCreated', handleUpdate);
      socket.off('paymentApproved', handleUpdate);
      socket.off('paymentRejected', handleUpdate);
    };
  }, []);

  const handleStatusUpdate = async (id, status) => {
    setProcessing(true);
    try {
      await api.patch(`/payments/${id}/${status}`);
      toast.success(`Payment ${status} successfully`);
      fetchPayments();
    } catch {
      toast.error('Failed to update payment status');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Payment Transactions</h1>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Total: {payments.length} Records
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-semibold text-sm">Txn ID</th>
                <th className="p-4 font-semibold text-sm">Invoice</th>
                <th className="p-4 font-semibold text-sm text-center">Method</th>
                <th className="p-4 font-semibold text-sm text-center">Amount</th>
                <th className="p-4 font-semibold text-sm text-center">Status</th>
                <th className="p-4 font-semibold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center"><Loader2 size={32} className="animate-spin text-primary inline" /></td></tr>
              ) : payments.map((pay) => (
                <tr key={pay._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="text-xs font-mono text-slate-400">#{pay.transactionId || pay._id.slice(-8)}</p>
                    <p className="text-[10px] text-slate-400">{new Date(pay.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-800">{pay.invoiceId?.invoiceId || 'N/A'}</p>
                    <p className="text-[10px] text-slate-500">{pay.invoiceId?.customerName}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                      {pay.method}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <p className="text-sm font-bold text-slate-800">₹{pay.amount.toLocaleString()}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full inline-flex items-center ${
                      pay.status === 'completed' || pay.status === 'approved' ? 'bg-green-100 text-green-700' : 
                      pay.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {pay.status === 'pending' ? <Clock size={10} className="mr-1" /> : null}
                      {pay.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {pay.status === 'pending' && (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleStatusUpdate(pay._id, 'approve')}
                          disabled={processing}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(pay._id, 'reject')}
                          disabled={processing}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && payments.length === 0 && (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400">No payment records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentManagement;
