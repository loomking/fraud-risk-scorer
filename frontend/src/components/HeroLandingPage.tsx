import { useState, useRef, useEffect } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function HeroLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;
    
    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Slow moving aurora-like waves
    float wave = sin(uv.x * 2.0 + u_time * 0.5) * 0.5 + 0.5;
    float wave2 = cos(uv.y * 1.5 - u_time * 0.3) * 0.5 + 0.5;
    
    // Base colors from the "Sentinels Dark Glass" palette
    vec3 color1 = vec3(0.05, 0.1, 0.2); // Deep Navy
    vec3 color2 = vec3(0.01, 0.02, 0.05); // Near Black
    vec3 accent = vec3(0.23, 0.51, 0.96); // #3b82f6 (Primary)
    
    // Aurora effect
    float aurora = smoothstep(0.4, 0.6, sin(p.x * 1.5 + u_time * 0.2) + p.y);
    vec3 finalColor = mix(color2, color1, uv.y);
    finalColor += accent * aurora * 0.15 * (0.5 + 0.5 * sin(u_time * 0.4));
    
    // Subtle grain/noise for texture
    finalColor += (noise(uv * u_time) - 0.5) * 0.01;

    gl_FragColor = vec4(finalColor, 1.0);
}`;
    
    function cs(type: number, src: string) {
      // @ts-ignore
      const s = gl.createShader(type);
      if (!s) return null;
      // @ts-ignore
      gl.shaderSource(s, src);
      // @ts-ignore
      gl.compileShader(s);
      return s;
    }
    // @ts-ignore
    const prog = gl.createProgram();
    if (!prog) return;
    
    const vertexShader = cs(gl.VERTEX_SHADER, vs);
    const fragShader = cs(gl.FRAGMENT_SHADER, fs);
    if (vertexShader) gl.attachShader(prog, vertexShader);
    if (fragShader) gl.attachShader(prog, fragShader);
    
    gl.linkProgram(prog);
    gl.useProgram(prog);
    
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    
    let animationFrameId: number;
    function render(t: number) {
      if (!gl || !canvas) return;
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    
    render(0);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver && canvas) {
        resizeObserver.unobserve(canvas);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col font-['Inter'] text-gray-200 antialiased bg-[#0A0A0B] overflow-x-hidden selection:bg-[#4d8eff] selection:text-white">
      {/* Background WebGL Shader */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.8)_0%,rgba(10,10,11,1)_100%)]">
        <div className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
      </div>
      
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
          <a className="font-['JetBrains_Mono'] text-sm text-[#c2c6d6] hover:text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all duration-200" href="#">Documentation</a>
          <a className="font-['JetBrains_Mono'] text-sm text-[#c2c6d6] hover:text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all duration-200" href="#">Evidence API</a>
          <a className="font-['JetBrains_Mono'] text-sm text-[#c2c6d6] hover:text-white hover:bg-white/10 px-3 py-1.5 rounded transition-all duration-200" href="#">Architecture</a>
        </nav>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.hash = '#dashboard'}
            className="hidden md:flex items-center gap-2 bg-transparent border border-white/10 hover:border-[#adc6ff]/30 hover:shadow-[0_0_15px_rgba(173,198,255,0.15)] transition-all duration-200 px-4 py-2 rounded-lg font-['JetBrains_Mono'] text-sm text-white"
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
            <a href="#" className="font-['JetBrains_Mono'] text-white text-lg">Documentation</a>
            <a href="#" className="font-['JetBrains_Mono'] text-white text-lg">Evidence API</a>
            <a href="#" className="font-['JetBrains_Mono'] text-white text-lg">Architecture</a>
            <div className="h-px bg-white/10 my-2" />
            <button 
              onClick={() => window.location.hash = '#dashboard'}
              className="flex items-center justify-center gap-2 bg-transparent border border-white/20 px-4 py-3 rounded-lg font-['JetBrains_Mono'] text-white w-full"
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
            <span className="font-['JetBrains_Mono'] text-xs font-medium text-[#4edea3] tracking-[0.05em] uppercase">
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
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#3B82F6] text-white font-['JetBrains_Mono'] font-medium text-sm shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 hover:-translate-y-0.5"
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
