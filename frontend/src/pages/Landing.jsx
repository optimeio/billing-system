import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Landing = () => {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center">
      {/* Decorative Red & White Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-50 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-100/50 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-red-50/30 opacity-90 z-0"></div>

      <div className="z-10 text-center px-4 max-w-3xl">
        <motion.img 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          src="/logo.png" 
          alt="The SM Groups" 
          className="h-32 md:h-40 mx-auto mb-8 object-contain drop-shadow-xl" 
        />
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight"
        >
          Welcome to <span className="text-primary whitespace-nowrap">The SM Groups</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Advanced Billing, Inventory, and Staff Management System for modern enterprise efficiency.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          <Link 
            to="/login"
            className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-red-700 transition-all hover:scale-[1.05] active:scale-95"
          >
            Sign In / Access Portal
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing;
