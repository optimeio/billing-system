import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

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

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, rejectedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role?.toLowerCase()?.trim();
  const allowed = allowedRoles?.map(r => r.toLowerCase().trim());
  const rejected = rejectedRoles?.map(r => r.toLowerCase().trim());

  if (allowed && !allowed.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  if (rejected && rejected.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Auto Redirect Component
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Landing />;
  
  const userRole = user?.role?.toLowerCase()?.trim();

  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/staff" replace />;
};

function App() {
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
          <ProtectedRoute rejectedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<StaffDashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="create-invoice" element={<CreateInvoice />} />
          <Route path="invoices" element={<MyInvoices />} />
          <Route path="scanners" element={<GenerateQR />} />
          <Route path="expenses" element={<ExpenseManagement />} />
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

