import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, Check } from 'lucide-react';
import api from '../../services/api';

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      console.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
      
      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n._id} className={`glass p-4 rounded-xl border ${n.isRead ? 'border-slate-200' : 'border-blue-200 bg-blue-50/20 shadow-sm'}`}>
            <div className="flex justify-between items-start">
              <div className="flex space-x-3">
                <div className={`p-2 rounded-lg ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{n.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center">
                    <Clock size={12} className="mr-1" /> {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {!n.isRead && <Check size={16} className="text-blue-600" />}
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
           <div className="text-center p-12 text-slate-500">No new notifications.</div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationList;
