import { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function HeroLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0B0F] font-['Instrument_Sans'] text-white selection:bg-[#FF7A5C]/30 relative overflow-hidden flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 h-[72px] bg-[#0B0B0F] border-b border-white/[0.08] flex items-center justify-between px-6 md:px-12">
        {/* Left Side: Logo & Links */}
        <div className="flex items-center gap-12">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center font-bold text-[14px] leading-none tracking-tighter">
              M
            </div>
            <span className="text-[18px] font-medium tracking-tight">motionsites</span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="flex items-center gap-2 text-[#B0B0B8] font-medium text-[15px] hover:text-white transition-colors">
              MCP
              <span className="text-[#FF7A5C] text-[10px] font-bold border border-[#FF7A5C]/40 px-1.5 py-0.5 rounded-full leading-none tracking-wide">
                NEW
              </span>
            </a>
            <a href="#" className="text-[#B0B0B8] font-medium text-[15px] hover:text-white transition-colors">
              Animated Backgrounds
            </a>
            <a href="#" className="text-[#B0B0B8] font-medium text-[15px] hover:text-white transition-colors">
              Academy
            </a>
            <a href="#" className="text-[#B0B0B8] font-medium text-[15px] hover:text-white transition-colors">
              Contact
            </a>
          </nav>
        </div>

        {/* Right Side: Search & CTA */}
        <div className="flex items-center gap-6">
          <button className="text-white hover:text-gray-300 transition-colors hidden md:block">
            <Search className="w-5 h-5" />
          </button>
          <button className="hidden md:block bg-white text-black font-medium text-[14px] px-5 py-2.5 rounded-full hover:bg-gray-100 transition-colors leading-none">
            Sign up
          </button>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] bg-[#0B0B0F] z-40 p-6 border-t border-white/[0.08]">
          <nav className="flex flex-col gap-6">
            <a href="#" className="flex items-center justify-between text-white font-medium text-lg">
              MCP
              <span className="text-[#FF7A5C] text-[10px] font-bold border border-[#FF7A5C]/40 px-2 py-1 rounded-full leading-none tracking-wide">
                NEW
              </span>
            </a>
            <a href="#" className="text-white font-medium text-lg">Animated Backgrounds</a>
            <a href="#" className="text-white font-medium text-lg">Academy</a>
            <a href="#" className="text-white font-medium text-lg">Contact</a>
            <div className="h-px bg-white/[0.08] my-2" />
            <button className="bg-white text-black font-medium text-[16px] px-5 py-3 rounded-full hover:bg-gray-100 transition-colors w-full">
              Sign up
            </button>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center pt-[100px] px-6 relative z-10 text-center">
        
        {/* Pill Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-flex"
        >
          <span 
            className="text-[#FF7A5C] text-[11px] font-semibold uppercase tracking-[0.05em] px-3 py-1 rounded-full border border-[#FF7A5C]/40"
            style={{ boxShadow: '0 0 20px rgba(255,122,92,0.3)' }}
          >
            FRESH DROPS EVERYDAY
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-[800px] text-[36px] md:text-[64px] lg:text-[72px] font-[800] leading-[1.05] mb-6"
          style={{ textShadow: '0 0 40px rgba(255,255,255,0.3)' }}
        >
          <div className="tracking-tight text-white">
            <span>UNLOCK </span>
            <span className="italic">YOUR</span>
            <span> AI</span>
          </div>
          <div className="tracking-tight">
            <span className="text-white">DESIGN </span>
            <span 
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #FFFFFF, #FFD9C7)' }}
            >
              SUPERPOWERS
            </span>
          </div>
        </motion.h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-[480px] text-[#9A9AA2] text-[16px] md:text-[17px] leading-relaxed mb-10"
        >
          Build beautiful landing pages in minutes with our ready-to-use prompts. 
          Just copy, paste, and launch.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.03 }}
          className="group relative px-8 py-3.5 rounded-full text-black font-bold text-[14px] transition-transform duration-300"
          style={{ 
            background: 'linear-gradient(135deg, #E8E4FF, #FFFFFF)',
            boxShadow: '0 0 20px rgba(232, 228, 255, 0.4)'
          }}
        >
          <div className="absolute inset-0 rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-100" 
               style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.6)' }} 
          />
          <span className="relative z-10 flex items-center gap-2">
            Go Unlimited <span className="text-lg leading-none">→</span>
          </span>
        </motion.button>
        
        {/* Small subtle footer-like link to go back to dashboard */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1 }}
           className="mt-32 text-xs text-white/30"
        >
          Looking for the <button onClick={() => window.location.hash = '#dashboard'} className="hover:text-white underline underline-offset-2">Fraud Risk Scorer</button>?
        </motion.div>
      </main>

    </div>
  );
}
