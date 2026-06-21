import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, QrCode, CreditCard, 
  Wallet, Package, Tags, Bell, Settings, LogOut, Menu, X, Calendar, Megaphone, AlertCircle, Building 
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import { useCompany } from '../store/CompanyContext';

const DashboardLayout = () => {
  const { logout, user } = useAuthStore();
  const { selectedCompany, companies, changeCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Initialize Realtime Sockets
  useSocket();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNormalizedRole = (role) => {
    if (!role) return '';
    const r = role.toLowerCase().trim();
    if (r === 'admin') return 'admin';
    if (r === 'inventory' || r === 'inventory_manager' || r === 'inventory manager') return 'inventory';
    return 'staff';
  };

  const getLinks = () => {
    const role = getNormalizedRole(user?.role);
    if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Staff Management', path: '/admin/staff', icon: Users },
        { name: 'Invoices', path: '/admin/invoices', icon: FileText },
        { name: 'Quotations', path: '/admin/quotations', icon: FileText },
        { name: 'Scanner Verification', path: '/admin/scanners', icon: QrCode },
        { name: 'Payments', path: '/admin/payments', icon: CreditCard },
        { name: 'Expenses', path: '/admin/expenses', icon: Wallet },
        { name: 'Products', path: '/admin/products', icon: Package },
        { name: 'Categories', path: '/admin/categories', icon: Tags },
        { name: 'Leave Management', path: '/admin/leaves', icon: Calendar },
        { name: 'Announcements', path: '/admin/announcements', icon: Megaphone },
        { name: 'Company Master', path: '/admin/companies', icon: Building },
        { name: 'Payroll / Payslips', path: '/admin/payslips', icon: Wallet },
        { name: 'Attendance', path: '/admin/attendance', icon: Calendar },
        { name: 'Complaints', path: '/admin/complaints', icon: AlertCircle },
        { name: 'Notifications', path: '/admin/notifications', icon: Bell },
      ];
    } else if (role === 'inventory') {
      return [
        { name: 'Products', path: '/inventory/products', icon: Package },
        { name: 'Categories', path: '/inventory/categories', icon: Tags },
        { name: 'Quotations', path: '/inventory/quotations', icon: FileText },
        { name: 'Scanners', path: '/inventory/scanners', icon: QrCode },
        { name: 'Leave Request', path: '/inventory/leaves', icon: Calendar },
        { name: 'Announcements', path: '/inventory/announcements', icon: Megaphone },
        { name: 'My Payslips', path: '/inventory/payslips', icon: FileText },
        { name: 'My Attendance', path: '/inventory/attendance', icon: Calendar },
        { name: 'Submit Complaint', path: '/inventory/complaints', icon: AlertCircle },
        { name: 'Notifications', path: '/inventory/notifications', icon: Bell },
        { name: 'My Profile', path: '/inventory/profile', icon: Settings },
      ];
    } else {
      return [
        { name: 'Dashboard', path: '/staff', icon: LayoutDashboard },
        { name: 'Create Invoice', path: '/staff/create-invoice', icon: FileText },
        { name: 'My Invoices', path: '/staff/invoices', icon: FileText },
        { name: 'Create Quotation', path: '/staff/create-quotation', icon: FileText },
        { name: 'My Quotations', path: '/staff/quotations', icon: FileText },
        { name: 'Generate QR', path: '/staff/scanners', icon: QrCode },
        { name: 'My Expenses', path: '/staff/expenses', icon: Wallet },
        { name: 'Leave Request', path: '/staff/leaves', icon: Calendar },
        { name: 'Announcements', path: '/staff/announcements', icon: Megaphone },
        { name: 'My Payslips', path: '/staff/payslips', icon: FileText },
        { name: 'My Attendance', path: '/staff/attendance', icon: Calendar },
        { name: 'Submit Complaint', path: '/staff/complaints', icon: AlertCircle },
        { name: 'Notifications', path: '/staff/notifications', icon: Bell },
        { name: 'My Profile', path: '/staff/profile', icon: Settings },
      ];
    }
  };

  const links = getLinks();

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Topbar */}
      <header className="md:hidden bg-white text-slate-800 px-4 py-3 flex justify-between items-center z-20 shadow-sm border-b border-slate-100 sticky top-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.png" alt="SM Groups" className="h-8 w-auto object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500 capitalize truncate leading-tight">{user?.role}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {companies && companies.length > 0 && (
            <select
              value={selectedCompany?._id || ''}
              onChange={(e) => changeCompany(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 max-w-[120px] truncate"
            >
              {companies.map(comp => (
                <option key={comp._id} value={comp._id}>{comp.name}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            aria-label={mobileOpen ? "Close Menu" : "Open Menu"}
            className="p-2 bg-slate-50 rounded-lg text-slate-600 flex-shrink-0"
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside 
        aria-label="Sidebar Navigation"
        className={`
        fixed md:static inset-y-0 left-0 w-64 bg-white text-slate-600 flex flex-col z-40 border-r border-slate-100
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-center">
          <img src="/logo.png" alt="The SM Groups" className="max-h-12 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main Menu">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink 
                key={link.path}
                to={link.path}
                aria-label={link.name}
                end={link.path === '/admin' || link.path === '/staff' || link.path === '/inventory'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all
                  ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-slate-50 hover:text-primary'}
                `}
              >
                <Icon size={18} className="mr-3" aria-hidden="true" />
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout} 
            aria-label="Sign Out"
            className="flex items-center justify-center w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-3 px-4 rounded-xl transition-all"
          >
            <LogOut size={18} className="mr-2" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center p-6 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-slate-800 capitalize">
               {location.pathname.split('/').pop().replace(/-/g, ' ') || 'Dashboard'}
            </h2>
            {companies && companies.length > 0 && (
              <select
                value={selectedCompany?._id || ''}
                onChange={(e) => changeCompany(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm transition-all hover:bg-slate-100 ml-4"
              >
                {companies.map(comp => (
                  <option key={comp._id} value={comp._id}>{comp.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right mr-2 hidden lg:block">
                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
             </div>
             {user?.profilePic ? (
                <img 
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${user.profilePic}`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border border-primary/20 shadow-sm"
                />
             ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                   {user?.name?.charAt(0) || 'U'}
                </div>
             )}
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/30">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;

