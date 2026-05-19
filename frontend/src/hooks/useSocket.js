import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io(SOCKET_URL);

    // Common
    socket.on('connect', () => {
      console.log('Connected to realtime server');
    });

    // Admin Events
    if (user?.role === 'admin') {
      socket.on('invoiceCreated', (data) => {
        toast.success(data.notification.message, { icon: '📝' });
      });

      socket.on('lowStock', (data) => {
        toast.error(data.notification.message, { icon: '⚠️' });
      });
    }

    // Staff Events
    if (user?.role !== 'admin') {
      socket.on('paymentApproved', (data) => {
        // Only notify if this staff member created the invoice
        if (data.notification.userId === user._id) {
          toast.success(data.notification.message, { icon: '💰' });
        }
      });

      socket.on('expensePaid', (data) => {
        if (data.notification.userId === user._id) {
          toast.success(data.notification.message, { icon: '💸' });
        }
      });

      socket.on('staffBlocked', (data) => {
        if (data.notification.userId === user._id) {
          toast.error(data.notification.message);
          // Optional: trigger logout
          // useAuthStore.getState().logout();
        }
      });
      
      socket.on('staffUnblocked', (data) => {
        if (data.notification.userId === user._id) {
          toast.success(data.notification.message);
        }
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user]);
};

export default useSocket;
