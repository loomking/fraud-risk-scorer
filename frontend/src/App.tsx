import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import TopMetricBar from "./components/TopMetricBar";
import ScoringForm from "./components/ScoringForm";
import ThresholdControl from "./components/ThresholdControl";
import TransactionsTable from "./components/TransactionsTable";
import HeroLandingPage from "./components/HeroLandingPage";

const API = (window.location.origin === "null" || window.location.protocol === "file:" || window.location.hostname === "localhost") 
    ? "http://localhost:10000" 
    : window.location.origin;

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === '#') {
    return <HeroLandingPage />;
  }

  return <DashboardApp />;
}

function DashboardApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = "https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8";

  const [report, setReport] = useState({ model_version: 'Loading...', threshold: 0.05, feature_count: 0, total_scored: 0 });
  const [txns, setTxns] = useState<any[]>([]);
  const [expandedTxn, setExpandedTxn] = useState<number | null>(null);
  const [prCurve, setPrCurve] = useState<any[]>([]);
  const [activeThreshold, setActiveThreshold] = useState(0.050);
  
  const [detailsMap, setDetailsMap] = useState<Record<number, any>>({});
  const [scoring, setScoring] = useState(false);
  
  const [form, setForm] = useState({
      txnId: 1000001,
      txnDt: 86400,
      amt: 150.00,
      product: 'W',
      card1: 4000,
      card4: 'visa',
      card6: 'debit',
      email: 'gmail.com'
  });

  useEffect(() => {
    // Setup Background Video
    const video = videoRef.current;
    if (video) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("Auto-play prevented:", e));
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoSrc;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch(e => console.log("Auto-play prevented:", e));
        });
      }
    }

    // Fetch initial report
    fetch(`${API}/report`)
      .then(res => res.json())
      .then(data => {
        setReport({
            model_version: data.model_version || 'v2.0.1',
            threshold: data.threshold || 0.05,
            feature_count: data.feature_count || 0,
            total_scored: data.total_scored || 0
        });
        if (data.recent_transactions) setTxns(data.recent_transactions);
        if (data.pr_curve) setPrCurve(data.pr_curve);
      })
      .catch(e => console.error("Report error:", e));
  }, []);

  const handleScore = async () => {
      setScoring(true);
      const payload = {
          TransactionID: form.txnId,
          TransactionDT: form.txnDt,
          TransactionAmt: form.amt,
          ProductCD: form.product,
          card1: form.card1,
          card4: form.card4,
          card6: form.card6,
          P_emaildomain: form.email
      };

      try {
          const res = await fetch(`${API}/score`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          
          if (!res.ok) {
              alert(`Error: ${JSON.stringify(data)}`);
              setScoring(false);
              return;
          }

          const newTxn = {
              transaction_id: data.transaction_id,
              risk_probability: data.risk_probability,
              threshold: data.threshold,
              decision: data.decision,
              model_version: data.model_version,
              amount: payload.TransactionAmt,
              created_at: new Date().toISOString()
          };

          setTxns(prev => [newTxn, ...prev]);
          setReport(prev => ({ ...prev, total_scored: prev.total_scored + 1 }));
          setForm(prev => ({ ...prev, txnId: prev.txnId + 1 }));

      } catch (e: any) {
          alert(`Network error: ${e.message}`);
      }
      setScoring(false);
  };

  const handleToggleRow = (txn: any) => {
    const tid = txn.transaction_id;
    if (expandedTxn === tid) {
      setExpandedTxn(null);
      return;
    }
    setExpandedTxn(tid);

    if (!detailsMap[tid]) {
      setDetailsMap(prev => ({ ...prev, [tid]: { loadingEvidence: true, loadingAudit: true } }));
      
      // Fetch Audit
      fetch(`${API}/audit/${tid}`).then(r => r.json()).then(data => {
          setDetailsMap(prev => ({ 
              ...prev, 
              [tid]: { ...prev[tid], audit: data.events || [], loadingAudit: false }
          }));
      }).catch(e => {
          setDetailsMap(prev => ({ 
              ...prev, 
              [tid]: { ...prev[tid], auditError: e.message, loadingAudit: false }
          }));
      });

      // Fetch Evidence if FLAG
      const liveDecision = txn.risk_probability >= activeThreshold ? 'FLAG' : 'PASS';
      if (liveDecision === 'FLAG' || txn.decision === 'FLAG') {
          fetch(`${API}/evidence/${tid}`, { method: 'POST' }).then(r => r.json()).then(data => {
              setDetailsMap(prev => ({ 
                  ...prev, 
                  [tid]: { ...prev[tid], evidence: data, loadingEvidence: false }
              }));
          }).catch(e => {
              setDetailsMap(prev => ({ 
                  ...prev, 
                  [tid]: { ...prev[tid], evidenceError: e.message, loadingEvidence: false }
              }));
          });
      } else {
            setDetailsMap(prev => ({ 
              ...prev, 
              [tid]: { ...prev[tid], loadingEvidence: false }
          }));
      }
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden font-['Instrument_Sans'] selection:bg-[#3054ff]/30">
      
      {/* Background Video Layer */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        poster="https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
      />
      
      {/* Video Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-[4px] pointer-events-none" />

      {/* Decorative Gradients */}
      <div className="fixed top-[-20%] left-[20%] w-[600px] h-[600px] bg-[#3054ff]/20 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/30 blur-[120px] mix-blend-screen pointer-events-none rounded-full" />

      <TopMetricBar 
        modelVersion={report.model_version}
        activeThreshold={activeThreshold}
        featureCount={report.feature_count}
        totalScored={report.total_scored}
      />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1440px] mx-auto mt-24 px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ScoringForm 
              form={form} 
              setForm={setForm} 
              scoring={scoring} 
              onScore={handleScore} 
            />
            
            <ThresholdControl 
              activeThreshold={activeThreshold} 
              setActiveThreshold={setActiveThreshold}
              prCurve={prCurve}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 flex flex-col h-[calc(100vh-120px)] sticky top-24">
            <TransactionsTable 
              transactions={txns}
              activeThreshold={activeThreshold}
              detailsMap={detailsMap}
              onToggleRow={handleToggleRow}
              expandedTxn={expandedTxn}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
