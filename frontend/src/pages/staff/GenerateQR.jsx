import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const GenerateQR = () => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast.success('New System QR generated successfully!');
    }, 1500);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Generate System QR</h1>
      
      <div className="glass p-12 rounded-3xl border border-slate-200 text-center space-y-8 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto w-64 h-64 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
           <QrCode size={120} className="text-slate-300" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">Ready to Generate</h3>
          <p className="text-slate-500">Generate a unique QR code for your station to verify logins and track sessions.</p>
        </div>

        <div className="flex flex-col space-y-3">
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCcw size={18} className={`mr-2 ${generating ? 'animate-spin' : ''}`} /> 
            {generating ? 'Generating...' : 'Generate New QR'}
          </button>
          <button className="text-slate-600 py-3 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center">
            <Download size={18} className="mr-2" /> Download Template
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GenerateQR;
