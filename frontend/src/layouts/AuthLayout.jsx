import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
      {/* Decorative Red & White Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-50 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-100/50 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-red-50/30 opacity-90 z-0"></div>
      
      <div className="z-10 w-full px-4 relative">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
