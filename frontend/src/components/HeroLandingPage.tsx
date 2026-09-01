import { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function HeroLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col font-['Inter'] text-gray-200 antialiased bg-[#0A0A0B] overflow-x-hidden selection:bg-[#4d8eff] selection:text-white">
      {/* Sleek CSS Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111827] via-[#0A0A0B] to-[#0A0A0B] pointer-events-none" />

      {/* Decorative Gradients */}
      <div className="fixed top-[-20%] left-[20%] w-[600px] h-[600px] bg-[#3054ff]/10 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/10 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />
      
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-[#131314]/60 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/20 flex items-center justify-between px-6 md:px-10 h-16 max-w-[1600px] left-1/2 -translate-x-1/2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.hash = ''}>
          <ShieldCheck className="text-[#3b82f6] w-7 h-7" />
          <span className="font-['Inter'] font-bold text-lg tracking-tighter text-[#adc6ff]">
            RISK_CORE_v2.1
          </span>
        </div>
        
        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a className="font-['Inter'] font-medium text-sm text-[#c2c6d6] hover:text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all duration-200" href="#docs">Documentation</a>
          <a className="font-['Inter'] font-medium text-sm text-[#c2c6d6] hover:text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all duration-200" href="#api">Evidence API</a>
          <a className="font-['Inter'] font-medium text-sm text-[#c2c6d6] hover:text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all duration-200" href="#architecture">Architecture</a>
        </nav>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.hash = '#dashboard'}
            className="hidden md:flex items-center gap-2 bg-transparent border border-white/10 hover:border-[#adc6ff]/30 hover:shadow-[0_0_15px_rgba(173,198,255,0.15)] transition-all duration-200 px-4 py-2 rounded-lg font-['Inter'] font-medium text-sm text-white"
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
            View Dashboard
          </button>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white hover:bg-white/10 p-2 rounded transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#0A0A0B]/95 backdrop-blur-md z-40 p-6 border-t border-white/10">
          <nav className="flex flex-col gap-6">
            <a href="#docs" onClick={() => setMobileMenuOpen(false)} className="font-['Inter'] font-medium text-white text-lg">Documentation</a>
            <a href="#api" onClick={() => setMobileMenuOpen(false)} className="font-['Inter'] font-medium text-white text-lg">Evidence API</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="font-['Inter'] font-medium text-white text-lg">Architecture</a>
            <div className="h-px bg-white/10 my-2" />
            <button 
              onClick={() => window.location.hash = '#dashboard'}
              className="flex items-center justify-center gap-2 bg-transparent border border-white/20 px-4 py-3 rounded-lg font-['Inter'] font-medium text-white w-full"
            >
              <LayoutDashboard className="w-5 h-5" />
              View Dashboard
            </button>
          </nav>
        </div>
      )}

      {/* Main Hero Section */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-4 md:px-10 w-full max-w-[1600px] mx-auto z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center text-center max-w-4xl bg-[rgba(17,24,39,0.6)] backdrop-blur-[12px] border border-white/10 p-8 md:p-16 rounded-2xl relative overflow-hidden"
        >
          {/* Decorative inner glow effect for the card */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#4d8eff]/10 to-transparent pointer-events-none rounded-2xl"></div>
          
          {/* Pill Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2a2b]/50 border border-white/10 mb-8 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
            <span className="font-['Inter'] text-xs font-semibold text-[#4edea3] tracking-[0.05em] uppercase">
              ENTERPRISE GRADE FRAUD DETECTION
            </span>
          </motion.div>
          
          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-['Inter'] font-bold text-[36px] md:text-[48px] leading-[1.1] md:leading-[56px] tracking-[-0.02em] text-transparent bg-clip-text bg-gradient-to-r from-white via-[#adc6ff] to-[#4d8eff] mb-6 drop-shadow-[0_0_20px_rgba(77,142,255,0.5)]"
          >
            REVEAL THE TRUTH BEHIND EVERY TRANSACTION
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="font-['Inter'] text-[16px] md:text-[18px] text-[#c2c6d6] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            High-precision real-time ML scoring coupled with grounded LLM evidence to expose fraudulent patterns instantly.
          </motion.p>
          
          {/* Primary CTA */}
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={() => window.location.hash = '#dashboard'}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#3054ff] text-white font-['Inter'] font-semibold text-sm shadow-[0_0_20px_rgba(48,84,255,0.4)] hover:shadow-[0_0_30px_rgba(48,84,255,0.6)] hover:bg-[#2040e0] transition-all duration-300 hover:-translate-y-0.5"
          >
            <span className="absolute inset-0 w-full h-full rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative z-10">Start Scoring</span>
            <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
          </motion.button>
          
          {/* Decorative UI Elements (Simulated data streams) */}
          <div className="mt-16 w-full flex justify-between items-end opacity-40 select-none overflow-hidden h-24">
            <div className="h-12 w-px bg-gradient-to-t from-[#adc6ff]/0 to-[#adc6ff]"></div>
            <div className="h-24 w-px bg-gradient-to-t from-[#4edea3]/0 to-[#4edea3]"></div>
            <div className="h-8 w-px bg-gradient-to-t from-[#ffb95f]/0 to-[#ffb95f]"></div>
            <div className="h-16 w-px bg-gradient-to-t from-[#4d8eff]/0 to-[#4d8eff]"></div>
            <div className="h-32 w-px bg-gradient-to-t from-white/0 to-white/50"></div>
            <div className="h-10 w-px bg-gradient-to-t from-[#ffb4ab]/0 to-[#ffb4ab]"></div>
            <div className="h-20 w-px bg-gradient-to-t from-[#adc6ff]/0 to-[#adc6ff]"></div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
