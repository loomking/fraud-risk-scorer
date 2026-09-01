import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  route: string;
}

export default function InfoPage({ route }: Props) {
  let title = '';
  let content = '';

  switch (route) {
    case '#docs':
      title = 'Documentation';
      content = 'Welcome to the Fraud Risk Scorer Documentation. Here you will find guides on integrating the ML scoring endpoints, configuring thresholds, and interpreting the grounded LLM evidence.';
      break;
    case '#api':
      title = 'Evidence API Reference';
      content = 'The Evidence API allows you to retrieve the grounded LLM reasoning for any flagged transaction. Use the GET /evidence/{txn_id} endpoint to securely fetch audit trails and explanations.';
      break;
    case '#architecture':
      title = 'System Architecture';
      content = 'The Fraud Risk Scorer utilizes a high-performance XGBoost model for initial binary classification, paired with a Gemini-powered Agentic system that validates and explains high-risk flags in real-time.';
      break;
    default:
      title = 'Information';
      content = 'Information not found.';
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#e5e2e3] font-['Inter'] selection:bg-[#3054ff]/30 relative overflow-hidden flex flex-col">
      {/* Sleek CSS Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111827] via-[#0A0A0B] to-[#0A0A0B] pointer-events-none" />

      {/* Decorative Gradients */}
      <div className="fixed top-[-20%] left-[20%] w-[600px] h-[600px] bg-[#3054ff]/10 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-[#131314]/60 backdrop-blur-xl border-b border-white/10 shadow-2xl flex items-center px-6 md:px-10 h-16">
        <button 
          onClick={() => window.location.hash = ''}
          className="flex items-center gap-2 text-[#c2c6d6] hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-6 md:px-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl w-full bg-[#0B101E]/60 backdrop-blur-xl border border-[#3054ff]/20 p-10 md:p-16 rounded-3xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#3054ff]/5 to-transparent pointer-events-none rounded-3xl"></div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6 relative z-10">{title}</h1>
          <p className="text-lg text-[#c2c6d6] leading-relaxed relative z-10">{content}</p>
          
          <div className="mt-12 pt-8 border-t border-white/10 relative z-10 flex gap-4">
             <button onClick={() => window.location.hash = '#dashboard'} className="px-6 py-3 rounded-xl bg-[#3054ff] text-white font-medium hover:bg-[#2040e0] transition-colors">
               Launch Dashboard
             </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
