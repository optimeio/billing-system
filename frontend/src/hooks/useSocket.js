import { useEffect } from 'react';
import { socket } from '../services/socket';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log('Connected to realtime server');
    };

    // Admin Events
    const handleInvoiceCreated = (data) => {
      if (user?.role === 'admin') {
        toast.success(data.notification?.message || 'New Invoice Created', { icon: '📝' });
      }
    };

    const handleLowStock = (data) => {
      if (user?.role === 'admin') {
        toast.error(data.notification?.message || 'Low Stock Alert!', { icon: '⚠️' });
      }
    };

    // Staff Events
    const handlePaymentApproved = (data) => {
      if (user?.role !== 'admin' && data.notification?.userId === user?._id) {
        toast.success(data.notification?.message || 'Payment Approved', { icon: '💰' });
      }
    };

    const handleExpensePaid = (data) => {
      if (user?.role !== 'admin' && data.notification?.userId === user?._id) {
        toast.success(data.notification?.message || 'Expense Approved & Paid', { icon: '💸' });
      }
    };

    const handleStaffBlocked = (data) => {
      if (user?.role !== 'admin' && data.notification?.userId === user?._id) {
        toast.error(data.notification?.message || 'Your account has been blocked');
      }
    };
    
    const handleStaffUnblocked = (data) => {
      if (user?.role !== 'admin' && data.notification?.userId === user?._id) {
        toast.success(data.notification?.message || 'Your account has been unblocked');
      }
    };

    socket.on('connect', handleConnect);
    socket.on('invoiceCreated', handleInvoiceCreated);
    socket.on('lowStock', handleLowStock);
    socket.on('paymentApproved', handlePaymentApproved);
    socket.on('expensePaid', handleExpensePaid);
    socket.on('staffBlocked', handleStaffBlocked);
    socket.on('staffUnblocked', handleStaffUnblocked);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('invoiceCreated', handleInvoiceCreated);
      socket.off('lowStock', handleLowStock);
      socket.off('paymentApproved', handlePaymentApproved);
      socket.off('expensePaid', handleExpensePaid);
      socket.off('staffBlocked', handleStaffBlocked);
      socket.off('staffUnblocked', handleStaffUnblocked);
    };
  }, [isAuthenticated, user]);
};

export default useSocket;
