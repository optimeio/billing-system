import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden border border-slate-100 max-h-[90dvh] flex flex-col"
        >
          {/* Drag handle for mobile */}
          <div className="flex justify-center pt-3 pb-0 sm:hidden">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full"></div>
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-slate-800 truncate pr-4">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-5 sm:p-6 overflow-y-auto flex-1">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default Modal;
