import React from 'react';
import { ArrowLeft, ArrowRight, Shield, Activity, Database, Lock, Layers, Server, Brain, Eye } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  route: string;
}

/* ─────────── Shared UI Components ─────────── */
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-semibold tracking-tight text-black mb-3" style={{ letterSpacing: '-0.03em' }}>{title}</h2>
      <p className="text-lg text-black/50 leading-relaxed max-w-2xl">{subtitle}</p>
    </div>
  );
}

function Card({ children, dark = false, span = 1 }: { children: React.ReactNode; dark?: boolean; span?: number }) {
  const baseStyle = "rounded-2xl p-7 md:p-9 flex flex-col h-full";
  const themeStyle = dark 
    ? "bg-[#1A1A2E] text-white" 
    : "bg-gray-50 border border-black/5 text-gray-900";
  const spanStyle = span === 2 ? "md:col-span-2" : "";
  
  return (
    <div className={`${baseStyle} ${themeStyle} ${spanStyle}`}>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-white border border-black/8 rounded-xl p-5 font-mono text-[13px] text-black/70 overflow-x-auto whitespace-pre leading-relaxed shadow-sm mt-4">
      {children}
    </pre>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENTATION PAGE
   ═══════════════════════════════════════════════════════════════════ */
function DocsContent() {
  return (
    <div className="space-y-24">
      
      {/* WHY */}
      <section>
        <SectionTitle 
          title="Why this exists" 
          subtitle="Fraud is an asymmetric war. Building a model that predicts it is easy; building a system that proves it and defends its boundaries is hard." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card dark>
            <Shield className="w-8 h-8 mb-6 text-white/80" />
            <h3 className="text-2xl font-semibold mb-4 leading-snug" style={{ letterSpacing: '-0.02em' }}>The Cost of False Positives</h3>
            <p className="text-white/70 text-base leading-relaxed">
              Every flagged transaction requires manual review or blocks a legitimate customer. We built this system to enforce an explicit business cost curve. A binary "fraud" or "not fraud" label is insufficient. This system maps calibrated probabilities to operational thresholds.
            </p>
          </Card>
          <Card>
            <Eye className="w-8 h-8 mb-6 text-black/40" />
            <h3 className="text-2xl font-semibold mb-4 leading-snug" style={{ letterSpacing: '-0.02em' }}>The Audit Gap</h3>
            <p className="text-black/60 text-base leading-relaxed">
              Black-box ML scores leave analysts guessing during chargeback disputes. We designed a dual-pipeline where statistical scoring is strictly separated from LLM-driven evidence generation, ensuring every high-risk score is backed by a verifiable, human-readable narrative.
            </p>
          </Card>
        </div>
      </section>

      {/* WHAT */}
      <section>
        <SectionTitle 
          title="What the system is" 
          subtitle="A production-ready pipeline combining temporal feature engineering, an XGBoost classifier, isotonic calibration, and a deterministic LLM agent." 
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card span={2}>
            <Database className="w-8 h-8 mb-6 text-black/40" />
            <h3 className="text-2xl font-semibold mb-4" style={{ letterSpacing: '-0.02em' }}>The Dataset & Foundation</h3>
            <p className="text-black/60 text-base leading-relaxed mb-4">
              We trained on the IEEE-CIS Fraud Detection dataset. It contains 590,540 real e-commerce transactions with a realistic class imbalance of ~3.5% fraud.
            </p>
            <p className="text-black/60 text-base leading-relaxed">
              To prevent the most common failure mode in fraud models — target leakage — we enforced strict temporal splitting (earliest 70% train, next 15% validation, final 15% test). All historical features use strictly causal aggregations.
            </p>
          </Card>
          <Card dark>
            <Layers className="w-8 h-8 mb-6 text-white/80" />
            <h3 className="text-2xl font-semibold mb-4" style={{ letterSpacing: '-0.02em' }}>The Two Models</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              <strong>v1.0.0 (462 features):</strong> Our research/offline model. It achieved ROC-AUC 0.90 but relied on 339 undocumented proprietary V-columns. It is superseded by v2.0.1 in the deployed system.
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              <strong>v2.0.1 (22 features):</strong> The live-serving model. Engineered exclusively from 7 realistic form fields. We explicitly traded theoretical accuracy for operational viability.
            </p>
          </Card>
        </div>
      </section>

      {/* HOW */}
      <section>
        <SectionTitle 
          title="How it operates" 
          subtitle="The mechanics of strict leakage prevention and verifiable model outputs." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-xl font-semibold mb-4" style={{ letterSpacing: '-0.02em' }}>Preventing Target Leakage</h3>
            <p className="text-black/60 text-base leading-relaxed">
              During development, we discovered that our <code>uid_prior_fraud_rate</code> feature implicitly assumed chargeback labels were instantaneously known. This target leakage artificially inflated PR-AUC from 0.49 to 0.64. We surgically dropped the feature and completely retrained the pipeline to ensure production behavior exactly matches evaluation metrics.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-4" style={{ letterSpacing: '-0.02em' }}>Categorical Safety</h3>
            <p className="text-black/60 text-base leading-relaxed">
              Standard alphabetical encoding caused a severe train/serve skew where mapping integers were scrambled across splits. We deployed a custom fitted <code>CategoricalEncoder</code> that learns mappings strictly from the training split and loudly fails on invalid datatypes during live inference, guaranteeing data integrity.
            </p>
          </Card>
        </div>
      </section>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ARCHITECTURE PAGE
   ═══════════════════════════════════════════════════════════════════ */
function ArchitectureContent() {
  return (
    <div className="space-y-24">
      
      {/* WHY */}
      <section>
        <SectionTitle 
          title="Why dual pipelines" 
          subtitle="Language models are powerful narrative engines but dangerous statistical classifiers. We isolate them completely from the decision boundary." 
        />
        <div className="grid grid-cols-1 gap-6">
          <Card dark>
            <div className="flex items-center gap-4 mb-6">
              <Lock className="w-8 h-8 text-[#ff4d4d]" />
              <span className="text-[#ff4d4d] font-semibold text-xs uppercase tracking-wider bg-[#ff4d4d]/10 px-3 py-1 rounded-full border border-[#ff4d4d]/20">The LLM Invariant</span>
            </div>
            <h3 className="text-2xl font-semibold mb-4 leading-snug" style={{ letterSpacing: '-0.02em' }}>The LLM Cannot Decide</h3>
            <p className="text-white/70 text-base leading-relaxed">
              The LLM cannot make the fraud decision. The XGBoost model decides. The LLM only produces structured evidence for transactions that were <em>already flagged</em> by the statistical model. This architectural constraint prevents the inherent unpredictability of language models from influencing binary business decisions.
            </p>
          </Card>
        </div>
      </section>

      {/* WHAT */}
      <section>
        <SectionTitle 
          title="What the architecture is" 
          subtitle="A deterministic, reconstructable chain of events mapping raw data to final actions." 
        />
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <Activity className="w-8 h-8 mb-6 text-black/40" />
            <h3 className="text-2xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>The Decision Chain</h3>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {['Raw Input', 'Feature Pipeline', 'XGBoost', 'Isotonic Calibration', 'Threshold', 'PASS/FLAG', 'Evidence Agent', 'Audit Log'].map((step, i) => (
                <React.Fragment key={step}>
                  <span className="bg-white border border-black/10 text-black/80 text-[13px] font-medium px-4 py-2 rounded-xl shadow-sm whitespace-nowrap">{step}</span>
                  {i < 7 && <ArrowRight className="w-4 h-4 text-black/30 shrink-0" />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-black/60 text-base leading-relaxed">
              An auditor can take any transaction and follow this chain end-to-end. Every intermediate value, including a cryptographic SHA-256 hash of the feature vector, is stored in the SQLite database to prove that the exact same features produced the exact same decision.
            </p>
          </Card>
        </div>
      </section>

      {/* HOW */}
      <section>
        <SectionTitle 
          title="How it executes" 
          subtitle="The mechanics of scoring, bounding, and grounding." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-xl font-semibold mb-4" style={{ letterSpacing: '-0.02em' }}>The Scoring Pipeline</h3>
            <p className="text-black/60 text-base leading-relaxed mb-4">
              When a transaction hits the API, the system validates the 7 required fields via Pydantic. It transforms these inputs into 22 engineered features using pre-trained frequency maps loaded exclusively from the training set.
            </p>
            <p className="text-black/60 text-base leading-relaxed">
              XGBoost outputs a raw score, which passes through an isotonic regression model fitted on the validation set. This outputs a true, calibrated probability. We then compare this probability against a frozen 5.0% production threshold to emit the final PASS or FLAG decision.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-4" style={{ letterSpacing: '-0.02em' }}>The Evidence Pipeline</h3>
            <p className="text-black/60 text-base leading-relaxed mb-4">
              For flagged transactions, the Context Builder constructs a rigid JSON block containing only the raw inputs and computed features. It sends this to the Groq API (temperature=0) to generate risk claims.
            </p>
            <p className="text-black/60 text-base leading-relaxed">
              The Grounding Validator then executes. It programmatically checks that every field cited in the LLM's claim actually exists in the provided context, and that the cited values match exactly. If the LLM hallucinates a field or alters a value, the entire evidence packet is rejected and logged as a failure.
            </p>
          </Card>
        </div>
      </section>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   API PAGE
   ═══════════════════════════════════════════════════════════════════ */
function ApiContent() {
  return (
    <div className="space-y-24">
      
      {/* WHY */}
      <section>
        <SectionTitle 
          title="Why this design" 
          subtitle="APIs must be defensive. We decouple scoring from evidence generation to ensure latency-sensitive operations never wait for LLM inference." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <Server className="w-8 h-8 mb-6 text-black/40" />
            <h3 className="text-2xl font-semibold mb-4 leading-snug" style={{ letterSpacing: '-0.02em' }}>Synchronous Scoring</h3>
            <p className="text-black/60 text-base leading-relaxed">
              The <code>/score</code> endpoint only runs the deterministic XGBoost pipeline and database logging. It is designed to be fast enough for real-time use in the critical path of a payment checkout.
            </p>
          </Card>
          <Card>
            <Brain className="w-8 h-8 mb-6 text-black/40" />
            <h3 className="text-2xl font-semibold mb-4 leading-snug" style={{ letterSpacing: '-0.02em' }}>Asynchronous Evidence</h3>
            <p className="text-black/60 text-base leading-relaxed">
              The <code>/evidence</code> endpoint is a distinct call. Evidence generation takes seconds, which is unacceptable for a payment gateway. Decoupling allows fraud analysts to request evidence post-authorization without degrading the customer experience.
            </p>
          </Card>
        </div>
      </section>

      {/* WHAT */}
      <section>
        <SectionTitle 
          title="What endpoints are available" 
          subtitle="A complete RESTful interface for the risk pipeline." 
        />
        <div className="grid grid-cols-1 gap-6">
          
          <Card span={2}>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-3">
              <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">POST</span>
              /score
            </h3>
            <p className="text-black/60 text-base mb-6">Computes the calibrated fraud risk probability for a single transaction using the live v2.0.1 model.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] font-bold text-black/40 uppercase tracking-wider mb-2">Request Body</div>
                <CodeBlock>{`{
  "TransactionID": 1000001,
  "TransactionDT": 86400,
  "TransactionAmt": 150.00,
  "ProductCD": "W",
  "card1": 4000,
  "card4": "visa",
  "card6": "debit",
  "P_emaildomain": "gmail.com"
}`}</CodeBlock>
              </div>
              <div>
                <div className="text-[11px] font-bold text-black/40 uppercase tracking-wider mb-2">Response (200 OK)</div>
                <CodeBlock>{`{
  "transaction_id": 1000001,
  "risk_probability": 0.0469,
  "threshold": 0.05,
  "decision": "PASS",
  "model_version": "v2.0.1",
  "calibration_version": "v2.0.1",
  "feature_pipeline_version": "v2.0.1"
}`}</CodeBlock>
              </div>
            </div>
          </Card>

          <Card span={2}>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-3">
              <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">POST</span>
              /evidence/&#123;id&#125;
            </h3>
            <p className="text-black/60 text-base mb-6">Generates grounded LLM evidence for a flagged transaction. Fails with 400 Bad Request if called on a transaction with a PASS decision.</p>
            
            <div className="text-[11px] font-bold text-black/40 uppercase tracking-wider mb-2">Response (200 OK)</div>
            <CodeBlock>{`{
  "transaction_id": 1000001,
  "status": "generated",
  "summary": "Transaction flagged due to unusual amount...",
  "evidence": [
    {
      "claim": "Transaction amount ($500) deviates significantly...",
      "sources": ["TransactionAmt", "amt_deviation_from_card1"],
      "source_values": { "TransactionAmt": 500.0, "amt_deviation_from_card1": 2.34 }
    }
  ],
  "grounding_valid": true
}`}</CodeBlock>
          </Card>

        </div>
      </section>

      {/* HOW */}
      <section>
        <SectionTitle 
          title="How grounding validation works" 
          subtitle="The programmatic safety net for LLM outputs." 
        />
        <div className="grid grid-cols-1 gap-6">
          <Card dark>
            <p className="text-white/70 text-base leading-relaxed mb-4">
              When the endpoint returns the evidence payload, the <code>grounding_valid</code> boolean represents the output of a deterministic code check, not a secondary LLM verification prompt.
            </p>
            <p className="text-white/70 text-base leading-relaxed">
              The validator iterates over every claim in the <code>evidence</code> array. It cross-references the keys in <code>sources</code> and the values in <code>source_values</code> against the exact feature vector that was logged in the database during the <code>/score</code> call. Any mismatch immediately invalidates the entire packet, preventing hallucinated data from reaching the analyst.
            </p>
          </Card>
        </div>
      </section>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN INFO PAGE LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
export default function InfoPage({ route }: Props) {
  const pages: Record<string, { title: string; subtitle: string; content: () => React.ReactNode }> = {
    '#docs': {
      title: 'Documentation',
      subtitle: 'The dataset, models, and pipeline behind the Scorer.',
      content: DocsContent,
    },
    '#api': {
      title: 'Evidence API',
      subtitle: 'Endpoints for scoring, evidence, and audit trails.',
      content: ApiContent,
    },
    '#architecture': {
      title: 'System Architecture',
      subtitle: 'The decision chain and LLM isolation strategy.',
      content: ArchitectureContent,
    },
  };

  const page = pages[route] || pages['#docs'];
  const ContentComponent = page.content;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-gray-900 font-['Inter'] selection:bg-black/10 relative overflow-x-hidden pb-24">

      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-black/8 flex items-center justify-between px-6 md:px-10 h-16">
        <button
          onClick={() => window.location.hash = ''}
          className="flex items-center gap-2 text-black/50 hover:text-black transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <nav className="hidden md:flex items-center gap-6">
          {[
            { hash: '#docs', label: 'Docs' },
            { hash: '#api', label: 'API' },
            { hash: '#architecture', label: 'Architecture' },
          ].map(link => (
            <a
              key={link.hash}
              href={link.hash}
              className={`text-sm font-medium transition-colors px-3 py-1.5 rounded ${route === link.hash ? 'text-black bg-black/5' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <button
          onClick={() => window.location.hash = '#dashboard'}
          className="bg-black text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          Launch Dashboard
        </button>
      </header>

      {/* Hero Header */}
      <div className="pt-32 pb-12 px-6 md:px-10 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black mb-4" style={{ letterSpacing: '-0.03em' }}>{page.title}</h1>
          <p className="text-lg text-black/50 leading-relaxed max-w-xl mx-auto">{page.subtitle}</p>
        </motion.div>
      </div>

      {/* Content */}
      <motion.main
        key={route}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-5xl mx-auto px-6 md:px-10"
      >
        <ContentComponent />
      </motion.main>
    </div>
  );
}
