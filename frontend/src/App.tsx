import { useEffect, useState } from "react";
import TopMetricBar from "./components/TopMetricBar";
import ScoringForm from "./components/ScoringForm";
import ThresholdControl from "./components/ThresholdControl";
import TransactionsTable from "./components/TransactionsTable";
import HeroLandingPage from "./components/HeroLandingPage";
import InfoPage from "./components/InfoPage";
import TransactionCarousel from "./components/TransactionCarousel";
import StorefrontDemo from "./components/StorefrontDemo";

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

  if (['#docs', '#api', '#architecture'].includes(route)) {
    return <InfoPage route={route} />;
  }

  if (route === '#demo') {
    return <StorefrontDemo />;
  }

  return <DashboardApp />;
}

function DashboardApp() {
  const [report, setReport] = useState({ model_version: 'v2.0.1', threshold: 0.05, feature_count: 20, total_scored: 0 });
  const [txns, setTxns] = useState<any[]>([]);
  const [expandedTxn, setExpandedTxn] = useState<number | null>(null);
  const [prCurve, setPrCurve] = useState<any[]>([]);
  const [activeThreshold, setActiveThreshold] = useState(0.050);
  
  const [detailsMap, setDetailsMap] = useState<Record<number, any>>({});
  const [scoring, setScoring] = useState(false);
  const [lastScoredTxn, setLastScoredTxn] = useState<{transaction_id: number; risk_probability: number; threshold: number; decision: string} | null>(null);
  
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
        if (data.recent_transactions && data.recent_transactions.length > 0) {
          setTxns(data.recent_transactions);
          const latest = data.recent_transactions[0];
          
          // Pre-fill form to exactly match the latest transaction so it doesn't look disconnected
          setForm(prev => ({
              ...prev,
              txnId: latest.transaction_id,
              amt: latest.amount || prev.amt,
          }));
          
          setLastScoredTxn({
              transaction_id: latest.transaction_id,
              risk_probability: latest.risk_probability,
              threshold: latest.threshold,
              decision: latest.decision,
          });
        }
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
          setLastScoredTxn({
            transaction_id: data.transaction_id,
            risk_probability: data.risk_probability,
            threshold: data.threshold,
            decision: data.decision,
          });

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
    <div className="relative w-full min-h-screen bg-[#F5F5F5] text-gray-900 overflow-hidden font-['Inter'] selection:bg-black/10">

      <TopMetricBar 
        modelVersion={report.model_version}
        activeThreshold={activeThreshold}
        featureCount={report.feature_count}
        totalScored={report.total_scored}
      />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1440px] mx-auto mt-24 px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column — Form only */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ScoringForm 
              form={form} 
              setForm={setForm} 
              scoring={scoring} 
              onScore={handleScore} 
            />
          </div>

          {/* Right Column — Transactions */}
          <div className="lg:col-span-8 flex flex-col h-[calc(100vh-120px)] sticky top-24 overflow-hidden">
            <TransactionCarousel 
              transactions={txns}
              detailsMap={detailsMap}
              activeThreshold={activeThreshold}
            />
            <TransactionsTable 
              transactions={txns}
              activeThreshold={activeThreshold}
              detailsMap={detailsMap}
              onToggleRow={handleToggleRow}
              expandedTxn={expandedTxn}
            />
          </div>

        </div>
        
        {/* Threshold Analysis — Full width below the grid */}
        <div className="mt-6">
          <ThresholdControl 
            activeThreshold={activeThreshold} 
            setActiveThreshold={setActiveThreshold}
            prCurve={prCurve}
            lastScoredTxn={lastScoredTxn}
          />
        </div>
      </div>
    </div>
  );
}
