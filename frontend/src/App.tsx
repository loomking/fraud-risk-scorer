import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { motion } from "motion/react";
import { ChevronDown, ArrowRight, Sun } from "lucide-react";

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = "https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
    }
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden font-['Instrument_Sans']">
      
      {/* Background Video Layer */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        poster="https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
      />
      
      {/* Video Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-900/20 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/20 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-transparent px-6 py-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          <Sun className="w-6 h-6 text-white" />
          <span className="font-semibold text-lg tracking-tight">AcmeAI</span>
        </div>

        {/* Center Section */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
          <a href="#" className="hover:text-white flex items-center gap-1">
            Products <ChevronDown className="w-4 h-4" />
          </a>
          <a href="#" className="hover:text-white">Customer Stories</a>
          <a href="#" className="hover:text-white">Resources</a>
          <a href="#" className="hover:text-white">Pricing</a>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          <a href="#" className="hidden sm:block text-sm font-medium text-white/80 hover:text-white">
            Book A Demo
          </a>
          <button className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center mt-20 pt-20 px-4 space-y-12 h-full justify-center min-h-[80vh]">
        
        {/* Pre-headline */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="font-['Instrument_Serif'] text-3xl sm:text-5xl lg:text-[48px] leading-[1.1] text-white"
        >
          Design at the speed of thought
        </motion.h2>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ delay: 0.2, duration: 0.6 }}
          className="font-['Instrument_Sans'] font-semibold text-6xl sm:text-8xl lg:text-[136px] leading-[0.9] tracking-tighter bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-transparent pb-4"
        >
          Build Faster
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0 }} 
          animate={{ opacity: 0.7 }} 
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-['Instrument_Sans'] text-lg sm:text-[20px] leading-[1.65] text-white opacity-70 max-w-xl mx-auto"
        >
          Create fully functional, SEO-optimized websites in seconds with our advanced AI engine.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-6 pt-4"
        >
          {/* Primary Button */}
          <button className="group flex items-center justify-between gap-4 bg-white rounded-full pl-6 pr-2 py-2 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300">
            <span className="font-medium text-lg font-['Instrument_Sans'] text-[#0a0400]">
              Start Building Free
            </span>
            <div className="w-10 h-10 rounded-full bg-[#3054ff] group-hover:bg-[#2040e0] flex items-center justify-center transition-colors">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* Secondary Button */}
          <button className="group flex items-center gap-2 text-white/70 hover:text-white backdrop-blur-sm hover:bg-white/5 px-4 py-2 rounded-lg transition-all duration-300">
            <span className="font-medium text-base">See Examples</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>

    </div>
  );
}
