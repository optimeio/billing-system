import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import api from './services/api';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Landing from './pages/Landing';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffManagement from './pages/admin/StaffManagement';
import AdminInvoices from './pages/admin/AdminInvoices';
import ProductManagement from './pages/admin/ProductManagement';
import ExpenseManagement from './pages/admin/ExpenseManagement';
import PaymentManagement from './pages/admin/PaymentManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import ScannerVerification from './pages/admin/ScannerVerification';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import CreateInvoice from './pages/staff/CreateInvoice';
import MyInvoices from './pages/staff/MyInvoices';
import GenerateQR from './pages/staff/GenerateQR';
import LeaveRequest from './pages/staff/LeaveRequest';
import LeaveManagement from './pages/admin/LeaveManagement';
import AnnouncementManagement from './pages/admin/AnnouncementManagement';
import Announcements from './pages/staff/Announcements';

// Common Pages
import NotificationList from './pages/common/NotificationList';
import Profile from './pages/common/Profile';

// Normalize role: admin stays admin, inventory stays inventory, everything else is staff
const getNormalizedRole = (role) => {
  if (!role) return '';
  const r = role.toLowerCase().trim();
  if (r === 'admin') return 'admin';
  if (r === 'inventory' || r === 'inventory_manager' || r === 'inventory manager') return 'inventory';
  return 'staff'; // all other roles (staff, cashier, billing, etc.) are treated as staff
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = getNormalizedRole(user.role);

  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    // Redirect to the correct dashboard instead of / to avoid loops
    if (normalizedRole === 'admin') return <Navigate to="/admin" replace />;
    if (normalizedRole === 'inventory') return <Navigate to="/inventory" replace />;
    return <Navigate to="/staff" replace />;
  }

  return children;
};

// Auto Redirect Component
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated || !user || !user.role) return <Landing />;
  
  const normalizedRole = getNormalizedRole(user.role);

  if (normalizedRole === 'admin') return <Navigate to="/admin" replace />;
  if (normalizedRole === 'inventory') return <Navigate to="/inventory" replace />;
  return <Navigate to="/staff" replace />;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  // Clear old localStorage auth data (we moved to sessionStorage)
  useEffect(() => {
    localStorage.removeItem('sm-billing-auth');
  }, []);

  // Verify token with backend on app load
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/profile/me').catch(() => {
        // api.js interceptor will automatically handle 401 and logout
      });
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="edit-invoice/:id" element={<CreateInvoice />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="expenses" element={<ExpenseManagement />} />
          <Route path="payments" element={<PaymentManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="scanners" element={<ScannerVerification />} />
          <Route path="notifications" element={<NotificationList />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="announcements" element={<AnnouncementManagement />} />
        </Route>
 
        {/* Staff Routes */}
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<StaffDashboard />} />
          <Route path="create-invoice" element={<CreateInvoice />} />
          <Route path="edit-invoice/:id" element={<CreateInvoice />} />
          <Route path="invoices" element={<MyInvoices />} />
          <Route path="scanners" element={<GenerateQR />} />
          <Route path="expenses" element={<ExpenseManagement />} />
          <Route path="notifications" element={<NotificationList />} />
          <Route path="leaves" element={<LeaveRequest />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Inventory Routes */}
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['inventory']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ProductManagement />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="scanners" element={<GenerateQR />} />
          <Route path="notifications" element={<NotificationList />} />
          <Route path="leaves" element={<LeaveRequest />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <h1 className="text-4xl font-bold text-slate-800">404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;

