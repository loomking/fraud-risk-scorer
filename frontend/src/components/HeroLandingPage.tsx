import { useState } from 'react';
import { Menu, X, ArrowRight, Shield, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function HeroLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F5F5F5] text-gray-900 antialiased overflow-x-hidden selection:bg-black/10">

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-[88rem] mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.hash = ''}>
            <Shield className="w-7 h-7 text-black" strokeWidth={2} />
            <span className="text-2xl font-semibold tracking-tight text-black" style={{ letterSpacing: '-0.03em' }}>
              Fraud Risk Scorer
            </span>
          </div>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#docs" className="text-base text-gray-600 hover:text-black font-medium transition-colors duration-200">Documentation</a>
            <a href="#api" className="text-base text-gray-600 hover:text-black font-medium transition-colors duration-200">Evidence API</a>
            <a href="#architecture" className="text-base text-gray-600 hover:text-black font-medium transition-colors duration-200">Architecture</a>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.hash = '#dashboard'}
              className="hidden md:inline-flex items-center gap-2 bg-black text-white text-base font-medium px-7 py-2.5 rounded-full hover:bg-gray-800 transition-colors duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              Open Dashboard
            </button>
            <button
              className="md:hidden text-black hover:bg-black/5 p-2 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#F5F5F5]/98 backdrop-blur-md z-40 p-6">
          <nav className="flex flex-col gap-5">
            <a href="#docs" onClick={() => setMobileMenuOpen(false)} className="text-black text-lg font-medium">Documentation</a>
            <a href="#api" onClick={() => setMobileMenuOpen(false)} className="text-black text-lg font-medium">Evidence API</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="text-black text-lg font-medium">Architecture</a>
            <div className="h-px bg-black/10 my-1" />
            <button
              onClick={() => { window.location.hash = '#dashboard'; setMobileMenuOpen(false); }}
              className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-full font-medium w-full"
            >
              <LayoutDashboard className="w-5 h-5" />
              Open Dashboard
            </button>
          </nav>
        </div>
      )}

      {/* ─── Hero Section ─── */}
      <main className="flex-1 px-6 pt-20 pb-6 flex items-end">
        <div className="relative w-full max-w-[88rem] mx-auto rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 96px)' }}>

          {/* Background Video */}
          <video
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4"
          />

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col items-start justify-start h-full p-8 md:p-12 pt-28 md:pt-36">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-black text-5xl md:text-6xl font-semibold leading-tight max-w-xl mb-4"
              style={{ letterSpacing: '-0.04em' }}
            >
              Detect Fraud.<br/>Prove It.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-black/60 text-base md:text-lg max-w-md mb-8 leading-relaxed"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
            >
              Real-time ML scoring with grounded LLM evidence generation. Every flagged transaction gets a verifiable, auditable explanation.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              onClick={() => window.location.hash = '#dashboard'}
              className="inline-flex items-center gap-3 bg-black text-white text-base md:text-lg font-medium pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
            >
              Start Scoring
              <span className="bg-white rounded-full p-2 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-black" />
              </span>
            </motion.button>

            {/* Brand Marquee */}
            <div className="mt-20 md:mt-24 w-full max-w-md overflow-hidden">
              <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .marquee-track { display: flex; width: max-content; animation: marquee 22s linear infinite; }
              `}</style>
              <div className="marquee-track">
                {[...Array(2)].map((_, rep) => (
                  <div key={rep} className="flex items-center">
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '-0.02em', fontSize: '15px' }}>Razorpay</span>
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 900, letterSpacing: '0.08em', fontSize: '13px', textTransform: 'uppercase' }}>IEEE-CIS</span>
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 600, letterSpacing: '0.01em', fontSize: '15px', fontStyle: 'italic' }}>XGBoost</span>
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: '0.12em', fontSize: '13px', textTransform: 'uppercase' }}>FastAPI</span>
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', serif", fontWeight: 400, letterSpacing: '-0.01em', fontSize: '16px' }}>Groq</span>
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: "Impact, 'Arial Narrow', sans-serif", fontWeight: 400, letterSpacing: '0.04em', fontSize: '14px' }}>SQLAlchemy</span>
                    <span className="mx-7 shrink-0 text-black/50 whitespace-nowrap" style={{ fontFamily: 'Verdana, sans-serif', fontWeight: 700, letterSpacing: '-0.03em', fontSize: '13px' }}>React</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Info Section ─── */}
      <section className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-start">
            <div>
              <h2 className="text-black text-4xl md:text-5xl font-semibold leading-tight mb-8" style={{ letterSpacing: '-0.03em' }}>
                Meet the Scorer.
              </h2>
              <button
                onClick={() => window.location.hash = '#docs'}
                className="inline-flex items-center gap-3 bg-black text-white text-base font-medium pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
              >
                Discover it
                <span className="bg-white rounded-full p-2 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-black" />
                </span>
              </button>
            </div>
            <p className="text-black/60 text-2xl md:text-3xl leading-relaxed">
              A production-grade fraud detection pipeline that scores transactions with XGBoost, enforces cost-optimized thresholds, and generates grounded LLM evidence for every flagged transaction.
            </p>
          </div>

          {/* Row 2 — Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 — spans 2 cols */}
            <div className="lg:col-span-2 rounded-2xl p-7 min-h-80 flex flex-col justify-between bg-gradient-to-br from-blue-50 to-indigo-50 border border-black/5">
              <h3 className="text-black text-2xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                Scores that<br/>you can trust
              </h3>
              <p className="text-black/60 text-base max-w-xs">
                Every risk probability is isotonically calibrated and computed on features with strict temporal isolation — no leakage, no cheating.
              </p>
            </div>
            {/* Card 2 */}
            <div className="rounded-2xl p-7 min-h-80 flex flex-col justify-between bg-[#1A1A2E] text-white">
              <h3 className="text-2xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                Evidence,<br/>not guesswork.
              </h3>
              <p className="text-white/60 text-base">
                Every claim in the evidence packet is mechanically grounded to the actual transaction data. Hallucinations are caught and rejected.
              </p>
            </div>
            {/* Card 3 */}
            <div className="rounded-2xl p-7 min-h-80 flex flex-col justify-between bg-[#1A1A2E] text-white">
              <h3 className="text-2xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                Fully<br/>auditable.
              </h3>
              <p className="text-white/60 text-base">
                Append-only audit trail with model version, feature hash, and cost assumptions. Reconstruct any past decision from scratch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Use Cases Section ─── */}
      <section className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="md:pr-12 md:pt-2">
            <p className="text-black/50 text-sm mb-2">Fraud Risk Scorer in Practice</p>
            <h2 className="text-5xl md:text-6xl font-semibold leading-none mb-6" style={{ letterSpacing: '-0.04em' }}>
              How it works
            </h2>
            <p className="text-black/60 text-base leading-relaxed max-w-sm">
              From raw transaction data through feature engineering, ML scoring, cost-based thresholding, and grounded LLM evidence — the full pipeline in under 200ms.
            </p>
          </div>
          <div className="relative rounded-3xl overflow-hidden min-h-[480px] md:min-h-[600px] bg-gradient-to-br from-gray-100 to-gray-200 border border-black/5">
            <div className="relative z-10 p-10 md:p-12 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-4xl md:text-5xl font-semibold leading-tight mb-5 text-black" style={{ letterSpacing: '-0.03em' }}>
                  Live Scoring
                </h3>
                <p className="text-black/60 text-base max-w-md mb-8">
                  Submit any transaction with 7 fields — amount, time, product code, card details, and email domain. The system instantly returns a calibrated risk probability and a PASS or FLAG decision with full audit trail.
                </p>
              </div>
              <button
                onClick={() => window.location.hash = '#dashboard'}
                className="inline-flex items-center gap-3 w-fit group"
              >
                <span className="w-9 h-9 rounded-full bg-black/10 backdrop-blur flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <ArrowRight className="w-4 h-4 text-black" />
                </span>
                <span className="text-black font-medium text-base">Try it now</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-[#F5F5F5] border-t border-black/10 px-6 py-8">
        <div className="max-w-[88rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-black/40" />
            <span className="text-sm text-black/40 font-medium">Fraud Risk Scorer · v2.0.1</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-black/40">
            <a href="#docs" className="hover:text-black transition-colors">Docs</a>
            <a href="#api" className="hover:text-black transition-colors">API</a>
            <a href="#architecture" className="hover:text-black transition-colors">Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
