import React from 'react';
import { ArrowLeft, ArrowRight, Database, Shield, Brain, Search, FileText, Server, Layers, GitBranch, BarChart3, Lock, AlertTriangle, CheckCircle, Cpu, Zap, Eye } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  route: string;
}

/* ─────────── Section component for visual consistency ─────────── */
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-black/5 border border-black/8 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-black/60" />
        </div>
        <h2 className="text-xl font-semibold text-black">{title}</h2>
      </div>
      <div className="text-[15px] text-black/50 leading-relaxed space-y-4 pl-11">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-50 border border-black/8 rounded-xl p-4 font-mono text-[12px] text-black/60 overflow-x-auto whitespace-pre leading-relaxed">
      {children}
    </pre>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 border border-black/5 rounded-xl p-4 text-center">
      <div className="text-[10px] text-black/35 uppercase tracking-wider mb-1 font-semibold">{label}</div>
      <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENTATION PAGE — Pitch-ready, comprehensive project overview
   ═══════════════════════════════════════════════════════════════════ */
function DocsContent() {
  return (
    <>
      <Section icon={Eye} title="What is Fraud Risk Scorer?">
        <p>
          Fraud Risk Scorer is an <strong className="text-black">end-to-end AI-powered fraud detection system</strong> built to demonstrate a production-grade risk scoring pipeline. It takes a raw payment transaction, runs it through a trained XGBoost machine learning model, assigns a calibrated fraud probability, applies a cost-optimized business threshold to produce a PASS or FLAG decision, and — for flagged transactions — generates structured, grounded evidence using an LLM agent.
        </p>
        <p>
          Every decision is logged in an append-only audit trail, making the entire chain <strong className="text-black">reconstructable after the fact</strong> — from raw input to model score to business decision to evidence packet.
        </p>
      </Section>

      <Section icon={Database} title="The Dataset">
        <p>
          We train on the <strong className="text-black">IEEE-CIS Fraud Detection dataset</strong> (provided by Vesta Corporation via Kaggle) — 590,540 real e-commerce transactions with 394 features and a ~3.5% fraud rate. This is one of the largest publicly available fraud datasets with realistic class imbalance.
        </p>
        <p>
          <strong className="text-black">Why this dataset?</strong> It provides the scale, feature richness, and class imbalance needed to build a meaningful fraud detection system. The ~3.5% positive rate mirrors real-world fraud distributions, and the time-ordered nature of the transactions allows us to enforce strict temporal splitting.
        </p>
        <div className="bg-gray-50 border border-orange-200 rounded-xl p-4 text-[13px]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-orange-600 font-semibold text-xs uppercase tracking-wider">Honest Limitation</span>
          </div>
          <span className="text-black/50">This dataset contains primarily US-centric transactions. Our model has <em>not</em> been validated on Indian BFSI data. Because fraud vectors are region-specific, this system is a structural demonstration, not a production-ready model for the Indian market.</span>
        </div>
      </Section>

      <Section icon={Layers} title="Two Models, One Pipeline">
        <p>
          We deliberately developed <strong className="text-black">two separate models</strong> to highlight the tradeoff between theoretical accuracy and operational reality:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-100/80 border border-white/10 rounded-xl p-5">
            <div className="text-xs text-black/35 uppercase tracking-wider mb-2 font-medium">v1.0.0 — Research Model</div>
            <div className="text-black font-semibold mb-2">462 Features · ROC-AUC 0.90</div>
            <p className="text-[13px] text-black/50">Uses the full IEEE-CIS dataset including hundreds of proprietary, anonymized V-columns. Exceptional performance, but <strong className="text-black/70">cannot be run on live input</strong> because those V-features are impossible to compute from raw form data.</p>
          </div>
          <div className="bg-gray-100/80 border border-[#3054ff]/30 rounded-xl p-5">
            <div className="text-xs text-blue-700 uppercase tracking-wider mb-2 font-medium">v2.0.1 — Live Model ★</div>
            <div className="text-black font-semibold mb-2">20 Features · ROC-AUC 0.80</div>
            <p className="text-[13px] text-black/50">Engineered from just <strong className="text-black/70">7 raw fields</strong> a live form can collect (Amount, Time, Product, Card ID, Network, Funding, Email). Lower metrics are the <em>expected</em> consequence — we trade accuracy for live-demo honesty.</p>
          </div>
        </div>
      </Section>

      <Section icon={GitBranch} title="Feature Engineering Pipeline">
        <p>
          The v2.0.1 model transforms 7 raw input fields into 20 engineered features across 5 groups:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-blue-700 font-mono text-xs font-bold mt-0.5 shrink-0">01</span>
            <div><strong className="text-black">Time Features</strong> — Cyclical hour-of-day encoding (sin/cos) from TransactionDT to capture time-of-day fraud patterns without assuming calendar dates.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-700 font-mono text-xs font-bold mt-0.5 shrink-0">02</span>
            <div><strong className="text-black">Amount Features</strong> — Log-transformed amount, decimal component, and deviation from the card holder's historical spending mean (z-score).</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-700 font-mono text-xs font-bold mt-0.5 shrink-0">03</span>
            <div><strong className="text-black">Card Features</strong> — Card identifier frequency, network+funding combination frequency, card-product cross-frequency, and categorical encodings for card4, card6, and ProductCD.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-700 font-mono text-xs font-bold mt-0.5 shrink-0">04</span>
            <div><strong className="text-black">Email Features</strong> — Email domain frequency and free vs corporate email provider classification.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-700 font-mono text-xs font-bold mt-0.5 shrink-0">05</span>
            <div><strong className="text-black">Cross Features</strong> — Card-email co-occurrence frequency and amount deviation from the product category's typical range.</div>
          </div>
        </div>
      </Section>

      <Section icon={Shield} title="Leakage Prevention">
        <p>
          Data leakage is the single most common reason fraud models fail in production. We enforce <strong className="text-black">strict temporal isolation</strong> at every stage:
        </p>
        <ul className="list-disc list-inside space-y-2 text-black/60">
          <li><strong className="text-black">Temporal split</strong> — Train on the earliest 70%, validate on the next 15%, test on the final 15%. No random splitting anywhere.</li>
          <li><strong className="text-black">Causal aggregation</strong> — Historical features use expanding window + shift(1), so only strictly earlier transactions per UID are considered.</li>
          <li><strong className="text-black">Frequency encoding</strong> — Fit on training data only, never on the full dataset.</li>
          <li><strong className="text-black">Prediction-time check</strong> — Every feature is verified as available at transaction submission time.</li>
        </ul>
      </Section>

      <Section icon={BarChart3} title="Model Metrics">
        <p>All metrics are computed on the <strong className="text-black">untouched temporal test set</strong> (88,581 transactions, 3,083 fraud):</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="ROC-AUC" value="0.8037" color="text-blue-700" />
          <MetricCard label="PR-AUC" value="0.1601" color="text-red-600" />
          <MetricCard label="Brier Score" value="0.0305" color="text-green-700" />
          <MetricCard label="Calibration" value="Isotonic" color="text-orange-600" />
        </div>
      </Section>

      <Section icon={Cpu} title="Tech Stack">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'Python 3.11', desc: 'Core language' },
            { name: 'XGBoost', desc: 'ML classifier' },
            { name: 'FastAPI', desc: 'REST API framework' },
            { name: 'SQLAlchemy', desc: 'ORM + audit trail' },
            { name: 'React + TypeScript', desc: 'Dashboard frontend' },
            { name: 'Groq API', desc: 'LLM evidence agent' },
            { name: 'scikit-learn', desc: 'Calibration & metrics' },
            { name: 'pandas', desc: 'Data processing' },
            { name: 'Render', desc: 'Production hosting' },
          ].map(t => (
            <div key={t.name} className="bg-gray-50 border border-white/10 rounded-lg px-3 py-2">
              <div className="text-black text-sm font-medium">{t.name}</div>
              <div className="text-black/35 text-[11px]">{t.desc}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ARCHITECTURE PAGE — System design breakdown
   ═══════════════════════════════════════════════════════════════════ */
function ArchitectureContent() {
  return (
    <>
      <Section icon={Zap} title="Decision Chain">
        <p>Every transaction follows this deterministic, auditable pipeline:</p>
        <div className="flex flex-wrap items-center gap-2 py-4">
          {['Raw Transaction', 'Input Validation', 'Feature Pipeline', 'XGBoost Model', 'Isotonic Calibration', 'Risk Probability', 'Cost-Based Threshold', 'PASS / FLAG', 'Evidence Agent', 'Audit Trail'].map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="bg-gray-100 border border-black/8 text-black text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap">{step}</span>
              {i < 9 && <ArrowRight className="w-3 h-3 text-blue-700/50 shrink-0" />}
            </span>
          ))}
        </div>
        <p>
          An auditor can take any transaction and follow this chain end-to-end — every intermediate value is logged.
        </p>
      </Section>

      <Section icon={Shield} title="Architectural Invariant: LLM Cannot Decide">
        <div className="bg-gray-50 border border-red-200 rounded-xl p-4 text-[13px]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-red-600" />
            <span className="text-red-600 font-semibold text-xs uppercase tracking-wider">Critical Design Rule</span>
          </div>
          <span className="text-black/60">The LLM <strong className="text-black">cannot</strong> make the fraud decision. The ML model decides. The LLM only produces structured evidence for transactions that were <em>already flagged</em> by the statistical model. This prevents the inherent unpredictability of language models from influencing binary fraud decisions.</span>
        </div>
      </Section>

      <Section icon={Layers} title="Scoring Pipeline (v2.0.1)">
        <p>
          When a transaction hits <code className="bg-black/5 px-1.5 py-0.5 rounded text-blue-700 text-[13px]">POST /score</code>, the system:
        </p>
        <ol className="list-decimal list-inside space-y-3 text-black/60">
          <li><strong className="text-black">Validates input</strong> — Checks all 7 required fields (TransactionID, TransactionDT, TransactionAmt, ProductCD, card1, card4, card6, P_emaildomain) via Pydantic schema.</li>
          <li><strong className="text-black">Builds feature vector</strong> — Transforms 7 raw fields into 20 engineered features using pre-trained frequency maps and categorical encodings loaded from the training set.</li>
          <li><strong className="text-black">Scores with XGBoost</strong> — Runs the feature vector through the trained XGBoost classifier to get a raw probability.</li>
          <li><strong className="text-black">Calibrates with isotonic regression</strong> — Passes the raw probability through an isotonic calibration model (fitted on the validation set) to produce a well-calibrated risk probability.</li>
          <li><strong className="text-black">Applies threshold</strong> — Compares the calibrated probability against the frozen production threshold (0.05) to produce a PASS or FLAG decision.</li>
          <li><strong className="text-black">Persists everything</strong> — Stores the transaction, score, model version, feature pipeline version, calibration version, threshold config version, feature hash, and cost assumptions in the SQLite database.</li>
          <li><strong className="text-black">Writes audit log</strong> — Appends <code className="bg-black/5 px-1 py-0.5 rounded text-xs">score_computed</code> and <code className="bg-black/5 px-1 py-0.5 rounded text-xs">decision_made</code> events to the append-only audit trail.</li>
        </ol>
      </Section>

      <Section icon={Brain} title="Evidence Agent Pipeline">
        <p>For flagged transactions, a separate <strong className="text-black">grounded evidence generation pipeline</strong> activates:</p>
        <ol className="list-decimal list-inside space-y-3 text-black/60">
          <li><strong className="text-black">Context Builder</strong> — Selects explicit fields from the scored transaction (raw inputs + all 20 computed features). No hidden database access, no external information.</li>
          <li><strong className="text-black">LLM Call</strong> — Calls Groq API with temperature=0 for reproducibility, requesting structured JSON output of risk factor claims with source field citations.</li>
          <li><strong className="text-black">Grounding Validator</strong> — Deterministic code that verifies every cited field <em>actually exists</em> in the supplied context and the cited values <em>actually match</em>. This is the safety mechanism — not the prompt.</li>
          <li><strong className="text-black">Verdict</strong> — If grounding passes, the evidence packet is persisted. If it fails, the evidence is rejected and a <code className="bg-black/5 px-1 py-0.5 rounded text-xs">grounding_failure</code> audit event is logged.</li>
        </ol>
      </Section>

      <Section icon={Database} title="Audit Trail Design">
        <p>
          The audit system uses <strong className="text-black">SQLAlchemy with append-only event listeners</strong> that prevent updates and deletes on audit records. Every event stores:
        </p>
        <ul className="list-disc list-inside space-y-1 text-black/60">
          <li>Transaction ID and timestamp</li>
          <li>Event type: <code className="bg-black/5 px-1 py-0.5 rounded text-xs">score_computed</code>, <code className="bg-black/5 px-1 py-0.5 rounded text-xs">decision_made</code>, <code className="bg-black/5 px-1 py-0.5 rounded text-xs">evidence_generated</code>, <code className="bg-black/5 px-1 py-0.5 rounded text-xs">grounding_failure</code></li>
          <li>Full event data (model version, feature hash, risk probability, threshold, cost assumptions)</li>
        </ul>
        <p>
          A cryptographic <strong className="text-black">feature hash</strong> (SHA-256 of the feature vector bytes) is stored with every score, enabling post-hoc verification that the exact same features produced the exact same decision.
        </p>
      </Section>

      <Section icon={Lock} title="Defense-Only Design (UI Evasion Audit)">
        <p>
          The dashboard is structurally designed so an attacker <strong className="text-black">cannot reverse-engineer the model</strong> from the UI:
        </p>
        <ul className="list-disc list-inside space-y-1 text-black/60">
          <li>Input fields accept only raw form data — they don't expose how features are transformed internally.</li>
          <li>The risk score displayed is the final calibrated probability, not the internal 20-dimensional feature vector.</li>
          <li>Evidence packets show high-level semantic claims, not SHAP values or decision tree paths.</li>
          <li>The threshold slider and PR metrics show macro-level dataset statistics, not per-transaction telemetry.</li>
        </ul>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EVIDENCE API PAGE — Complete API reference
   ═══════════════════════════════════════════════════════════════════ */
function ApiContent() {
  return (
    <>
      <Section icon={Zap} title="API Overview">
        <p>
          The Fraud Risk Scorer exposes a <strong className="text-black">RESTful API</strong> built with FastAPI. All endpoints accept and return JSON. The API is designed around a single scoring flow: submit a transaction → get a risk score → optionally generate evidence for flagged transactions → query the audit trail.
        </p>
      </Section>

      <Section icon={Search} title="POST /score — Score a Transaction">
        <p>Compute the fraud risk probability for a single transaction using the live v2.0.1 model.</p>
        <div className="text-xs text-black/35 uppercase tracking-wider mb-2 font-medium mt-4">Request Body</div>
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
        <div className="text-xs text-black/35 uppercase tracking-wider mb-2 mt-6 font-medium">Response (200 OK)</div>
        <CodeBlock>{`{
  "transaction_id": 1000001,
  "risk_probability": 0.0469,
  "threshold": 0.05,
  "decision": "PASS",
  "model_version": "v2.0.1",
  "calibration_version": "v2.0.1",
  "feature_pipeline_version": "v2.0.1",
  "threshold_config_version": "v2.0.1"
}`}</CodeBlock>
        <div className="mt-4 space-y-2">
          <p><strong className="text-black">Field Reference:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-black/60">
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">TransactionDT</code> — Relative time offset in seconds (from dataset epoch). Used for cyclical hour-of-day encoding.</li>
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">TransactionAmt</code> — Transaction amount in dollars. Transformed to log-scale and z-scored against card history.</li>
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">ProductCD</code> — Product code category (W, H, C, S, R). Frequency-encoded against training distribution.</li>
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">card1</code> — Card identifier token. Used for frequency lookup and historical aggregation.</li>
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">card4</code> — Network brand (visa, mastercard, discover, amex). Categorically encoded.</li>
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">card6</code> — Funding type (debit, credit). Categorically encoded.</li>
            <li><code className="bg-black/5 px-1 py-0.5 rounded text-xs">P_emaildomain</code> — Email provider domain. Used for frequency and free/corporate classification.</li>
          </ul>
        </div>
      </Section>

      <Section icon={FileText} title="POST /evidence/{id} — Generate Evidence">
        <p>
          Generate grounded LLM evidence for a flagged transaction. <strong className="text-black">Only works for transactions with a FLAG decision</strong> — calling this on a PASS transaction returns a 400 error. This enforces the architectural invariant that the LLM cannot influence the fraud decision.
        </p>
        <div className="text-xs text-black/35 uppercase tracking-wider mb-2 mt-4 font-medium">Response (200 OK)</div>
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
  "grounding_valid": true,
  "agent_model_version": "openai/gpt-oss-120b",
  "prompt_version": "v1.0"
}`}</CodeBlock>
        <div className="mt-4 space-y-2">
          <p><strong className="text-black">Grounding Validation:</strong></p>
          <p className="text-black/60">Every claim in the evidence packet must cite <code className="bg-black/5 px-1 py-0.5 rounded text-xs">sources</code> — field names that exist in the scoring context — and <code className="bg-black/5 px-1 py-0.5 rounded text-xs">source_values</code> that match the actual computed values. If any claim cites a field that doesn't exist or a value that doesn't match, the entire evidence packet is rejected and a <code className="bg-black/5 px-1 py-0.5 rounded text-xs">grounding_failure</code> audit event is logged.</p>
        </div>
      </Section>

      <Section icon={Server} title="GET /audit/{id} — Query Audit Trail">
        <p>Retrieve the complete audit trail for a transaction — every system event from scoring to evidence generation.</p>
        <div className="text-xs text-black/35 uppercase tracking-wider mb-2 mt-4 font-medium">Response (200 OK)</div>
        <CodeBlock>{`{
  "transaction_id": 1000001,
  "events": [
    {
      "event_type": "score_computed",
      "created_at": "2026-09-01T15:59:29Z",
      "event_data": {
        "risk_probability": 0.0469,
        "threshold": 0.05,
        "model_version": "v2.0.1",
        "feature_hash": "1fd479c46cd4"
      }
    },
    {
      "event_type": "decision_made",
      "created_at": "2026-09-01T15:59:29Z",
      "event_data": {
        "decision": "PASS",
        "risk_probability": 0.0469,
        "threshold": 0.05
      }
    }
  ]
}`}</CodeBlock>
      </Section>

      <Section icon={BarChart3} title="GET /report — Dashboard Data">
        <p>Returns aggregate model metadata, recent transactions, and the full PR curve for the threshold analysis panel.</p>
        <div className="text-xs text-black/35 uppercase tracking-wider mb-2 mt-4 font-medium">Response (200 OK)</div>
        <CodeBlock>{`{
  "model_version": "v2.0.1",
  "threshold": 0.05,
  "feature_count": 20,
  "total_scored": 42,
  "recent_transactions": [...],
  "pr_curve": [
    { "threshold": 0.035, "review_rate": 0.282, "fraud_capture": 0.736, "precision": 0.091 },
    { "threshold": 0.050, "review_rate": 0.190, "fraud_capture": 0.631, "precision": 0.115 },
    ...
  ]
}`}</CodeBlock>
      </Section>

      <Section icon={CheckCircle} title="GET /health — Health Check">
        <p>Simple health check endpoint. Returns <code className="bg-black/5 px-1.5 py-0.5 rounded text-[13px] text-green-700">{"{ \"status\": \"ok\" }"}</code>.</p>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN INFO PAGE — Shared layout with content switching
   ═══════════════════════════════════════════════════════════════════ */
export default function InfoPage({ route }: Props) {
  const pages: Record<string, { title: string; subtitle: string; content: () => React.ReactNode }> = {
    '#docs': {
      title: 'Documentation',
      subtitle: 'Everything you need to understand the Fraud Risk Scorer — the dataset, the models, the pipeline, and the design decisions behind each.',
      content: DocsContent,
    },
    '#api': {
      title: 'Evidence API Reference',
      subtitle: 'Complete endpoint reference for the scoring, evidence generation, and audit trail APIs.',
      content: ApiContent,
    },
    '#architecture': {
      title: 'System Architecture',
      subtitle: 'How the decision chain works — from raw transaction input through ML scoring, evidence generation, and audit logging.',
      content: ArchitectureContent,
    },
  };

  const page = pages[route] || pages['#docs'];
  const ContentComponent = page.content;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-gray-900 font-['Inter'] selection:bg-black/10 relative overflow-x-hidden">

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
          className="bg-black text-black text-sm font-medium px-5 py-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          Launch Dashboard
        </button>
      </header>

      {/* Hero Header */}
      <div className="relative z-10 pt-28 pb-12 px-6 md:px-10 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-black mb-4" style={{ letterSpacing: '-0.03em' }}>{page.title}</h1>
          <p className="text-lg text-black/50 leading-relaxed max-w-2xl">{page.subtitle}</p>
        </motion.div>
      </div>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-24"
      >
        <div className="bg-white border border-black/8 rounded-3xl p-8 md:p-12 shadow-sm">
          <ContentComponent />
        </div>
      </motion.main>
    </div>
  );
}

