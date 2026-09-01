import { useState } from 'react';
import { Menu, X, ArrowRight, Shield, LayoutDashboard } from 'lucide-react';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);
import { motion } from 'motion/react';

export default function HeroLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F5F5F5] text-gray-900 antialiased overflow-x-hidden selection:bg-black/10">

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-black/8">
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
          <div className="flex items-center gap-4">
            <a href="https://github.com/loomking/fraud-risk-scorer" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors hidden md:block">
              <GithubIcon className="w-5 h-5" />
            </a>
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
          {/* Row 1 — Real Numbers Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 items-center bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
            <div className="flex flex-col">
              <span className="text-black text-3xl font-semibold tracking-tight">0.8037</span>
              <span className="text-black/50 text-sm font-medium mt-1">Live Test ROC-AUC</span>
            </div>
            <div className="flex flex-col">
              <span className="text-black text-3xl font-semibold tracking-tight">0.1601</span>
              <span className="text-black/50 text-sm font-medium mt-1">Live Test PR-AUC</span>
            </div>
            <div className="flex flex-col">
              <span className="text-black text-3xl font-semibold tracking-tight">590,540</span>
              <span className="text-black/50 text-sm font-medium mt-1">Real Transactions</span>
            </div>
            <div className="flex flex-col">
              <span className="text-black text-3xl font-semibold tracking-tight">3.5%</span>
              <span className="text-black/50 text-sm font-medium mt-1">Fraud Rate</span>
            </div>
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
            <div className="rounded-2xl p-7 min-h-80 flex flex-col justify-between bg-gray-50 border border-black/5 text-gray-900">
              <h3 className="text-2xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                Evidence,<br/>not guesswork.
              </h3>
              <p className="text-black/60 text-base">
                Every claim in the evidence packet is mechanically grounded to the actual transaction data. Hallucinations are caught and rejected.
              </p>
            </div>
            {/* Card 3 */}
            <div className="rounded-2xl p-7 min-h-80 flex flex-col justify-between bg-gray-50 border border-black/5 text-gray-900">
              <h3 className="text-2xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                Fully<br/>auditable.
              </h3>
              <p className="text-black/60 text-base">
                Append-only audit trail with model version, feature hash, and cost assumptions. Reconstruct any past decision from scratch.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* ─── Model Comparison Section ─── */}
      <section className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-semibold leading-none mb-4" style={{ letterSpacing: '-0.03em' }}>
              The Portability Tradeoff
            </h2>
            <p className="text-black/60 text-lg leading-relaxed max-w-2xl">
              We deliberately built two models to demonstrate the gap between theoretical data-science accuracy and real-world operational viability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-8 md:p-10 border border-black/5 shadow-sm">
              <div className="inline-block bg-black/5 text-black/60 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-6">Research / Offline Model</div>
              <h3 className="text-3xl font-semibold text-black mb-2" style={{ letterSpacing: '-0.02em' }}>v1.0.0</h3>
              <p className="text-black/50 text-base mb-8">462 features. Achieved exceptional performance using hundreds of proprietary V-columns. Superseded in production because those columns cannot be collected on a live form.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-black/5 rounded-xl p-4">
                  <div className="text-[10px] text-black/40 uppercase tracking-wider font-bold mb-1">ROC-AUC</div>
                  <div className="text-2xl font-mono font-bold text-black/80">0.9010</div>
                </div>
                <div className="bg-gray-50 border border-black/5 rounded-xl p-4">
                  <div className="text-[10px] text-black/40 uppercase tracking-wider font-bold mb-1">PR-AUC</div>
                  <div className="text-2xl font-mono font-bold text-black/80">0.5064</div>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A2E] text-white rounded-3xl p-8 md:p-10 border border-black/5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3054ff]/20 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-block bg-[#3054ff]/20 text-white font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-6 border border-[#3054ff]/30 flex items-center gap-2 w-fit">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live Production Model
                </div>
                <h3 className="text-3xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>v2.0.1</h3>
                <p className="text-white/70 text-base mb-8">22 features. Engineered entirely from 7 realistic raw fields. This is the model actually serving the live <code>/score</code> endpoint, trading theoretical accuracy for live operational viability.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">ROC-AUC</div>
                    <div className="text-2xl font-mono font-bold text-white">0.8037</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">PR-AUC</div>
                    <div className="text-2xl font-mono font-bold text-white">0.1601</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Failure Stories Section ─── */}
      <section className="bg-white px-6 py-24 border-t border-black/5">
        <div className="max-w-[88rem] mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-semibold leading-none mb-4" style={{ letterSpacing: '-0.03em' }}>
              What We Caught
            </h2>
            <p className="text-black/60 text-lg leading-relaxed max-w-2xl">
              Every real system has failure modes. Here's what we found and fixed before shipping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 border border-black/5 rounded-2xl p-6 group hover:bg-gray-100 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider px-2 py-1 rounded mt-0.5">Bug</div>
                <div>
                  <h4 className="text-black font-medium leading-snug mb-2">Target leakage silently inflated PR-AUC from 0.4968 to 0.6445.</h4>
                  <a href="https://github.com/loomking/fraud-risk-scorer/blob/master/what_broke.md" target="_blank" className="text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1">Read the fix <ArrowRight className="w-3 h-3" /></a>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-black/5 rounded-2xl p-6 group hover:bg-gray-100 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 text-orange-600 font-bold text-xs uppercase tracking-wider px-2 py-1 rounded mt-0.5">Issue</div>
                <div>
                  <h4 className="text-black font-medium leading-snug mb-2">Groq model deprecation broke the live evidence agent.</h4>
                  <a href="https://github.com/loomking/fraud-risk-scorer/blob/master/what_broke.md" target="_blank" className="text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1">Read the fix <ArrowRight className="w-3 h-3" /></a>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-black/5 rounded-2xl p-6 group hover:bg-gray-100 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider px-2 py-1 rounded mt-0.5">Bug</div>
                <div>
                  <h4 className="text-black font-medium leading-snug mb-2">`.gitignore` rules silently excluded core model code from version control.</h4>
                  <a href="https://github.com/loomking/fraud-risk-scorer/blob/master/reports/what_broke.md" target="_blank" className="text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1">Read the fix <ArrowRight className="w-3 h-3" /></a>
                </div>
              </div>
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
            <a href="https://github.com/loomking/fraud-risk-scorer" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">
              <GithubIcon className="w-4 h-4" />
            </a>
            <a href="#docs" className="hover:text-black transition-colors">Docs</a>
            <a href="#api" className="hover:text-black transition-colors">API</a>
            <a href="#architecture" className="hover:text-black transition-colors">Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
