import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Receipt, Coins, Calculator, CreditCard, Landmark, TrendingUp } from 'lucide-react';

const Landing = () => {
  const floatingIcons = [
    { Icon: Receipt, className: "top-10 left-10 text-red-500/25 w-16 h-16", delay: 0, duration: 8, x: [0, 15, -15, 0], y: [0, -20, 20, 0], rotate: [0, 10, -10, 0] },
    { Icon: Coins, className: "bottom-12 left-20 text-amber-500/25 w-14 h-14", delay: 1, duration: 10, x: [0, -10, 10, 0], y: [0, 20, -20, 0], rotate: [0, -15, 15, 0] },
    { Icon: Calculator, className: "top-20 right-20 text-blue-500/25 w-12 h-12", delay: 2, duration: 9, x: [0, 15, -10, 0], y: [0, -15, 15, 0], rotate: [0, 12, -12, 0] },
    { Icon: CreditCard, className: "bottom-24 right-16 text-purple-500/25 w-14 h-14", delay: 3, duration: 11, x: [0, -15, 15, 0], y: [0, 20, -15, 0], rotate: [0, -10, 10, 0] },
    { Icon: Landmark, className: "top-1/2 left-12 text-emerald-500/25 w-14 h-14", delay: 4, duration: 12, x: [0, 10, -10, 0], y: [0, -20, 20, 0], rotate: [0, 15, -15, 0] },
    { Icon: TrendingUp, className: "top-1/2 right-12 text-indigo-500/25 w-12 h-12", delay: 1.5, duration: 8.5, x: [0, 20, -15, 0], y: [0, 15, -20, 0], rotate: [0, -8, 12, 0] },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center px-4 py-8">
      {/* Decorative Radial Backdrop Gradient Bubbles */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-red-300/40 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-red-400/30 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[25%] left-[15%] w-[400px] h-[400px] bg-blue-200/40 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-slate-50/50 to-red-50/10 opacity-90 z-0"></div>

      {/* Subtle Grid Background Pattern */}
      <div className="absolute inset-0 billing-grid-bg opacity-70 pointer-events-none z-0"></div>

      {/* Floating Interactive Billing Icons */}
      {floatingIcons.map(({ Icon, className, delay, duration, x, y, rotate }, index) => (
        <motion.div
          key={index}
          className={`absolute ${className} pointer-events-none z-0 hidden md:block`}
          animate={{
            x,
            y,
            rotate,
          }}
          transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
        >
          <Icon className="w-full h-full stroke-[1.5]" />
        </motion.div>
      ))}

      {/* Main Glassmorphic Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center w-full max-w-xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 sm:p-12 mx-auto flex flex-col items-center justify-center"
      >
        {/* Brand Logo */}
        <motion.img 
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          src="/logo.png" 
          alt="The SM Groups" 
          className="h-20 sm:h-28 md:h-36 w-auto mx-auto mb-6 object-contain drop-shadow-xl" 
        />
        
        {/* Main Heading */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight leading-tight"
        >
          Welcome to <span className="bg-gradient-to-r from-primary to-red-800 bg-clip-text text-transparent font-black block sm:inline whitespace-normal sm:whitespace-nowrap">The SM Groups</span>
        </motion.h1>
        
        {/* Supporting Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="text-sm sm:text-base md:text-lg text-slate-500 mb-8 max-w-md mx-auto leading-relaxed"
        >
          Advanced Billing, Inventory, and Staff Payroll System designed for modern enterprise efficiency and real-time management.
        </motion.p>
        
        {/* Access CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="w-full"
        >
          <Link 
            to="/login"
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-base sm:text-lg font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-red-700 transition-all hover:scale-[1.03] active:scale-95"
          >
            Sign In / Access Portal
          </Link>
        </motion.div>
        
        {/* Security / System Footer Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.6 }}
          className="mt-8 pt-6 border-t border-slate-100 w-full text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide uppercase flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
        >
          <span>Authorized Personnel Only</span>
          <span className="hidden sm:inline">•</span>
          <span>Secure SSL Portal</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Landing;
