import { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';

interface Transaction {
    transaction_id: number;
    risk_probability: number;
    decision: string;
    amount: number;
    threshold: number;
}

interface TransactionCarouselProps {
    transactions: Transaction[];
    detailsMap: Record<number, any>;
    activeThreshold: number;
}

export default function TransactionCarousel({ transactions, detailsMap, activeThreshold }: TransactionCarouselProps) {
    const cardCount = Math.min(5, Math.max(3, transactions.length));
    const displayTxns = transactions.slice(0, cardCount);

    const cardsRefs = useRef<(HTMLDivElement | null)[]>([]);
    const frameId = useRef<number>(0);
    const progress = useRef<number>(0);
    const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

    const [metrics] = useState({
        cardW: 280,
        cardH: 176,
    });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const rx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
            const ry = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
            mouse.current.targetX = Math.max(-1, Math.min(1, rx));
            mouse.current.targetY = Math.max(-1, Math.min(1, ry));
        };
        const handleMouseLeave = () => {
            mouse.current.targetX = 0;
            mouse.current.targetY = 0;
        };

        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const renderLoop = () => {
        progress.current += 0.0025; // Adjusted speed

        mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
        mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;

        const cards = cardsRefs.current;


        const continuousProgress = progress.current;
        const roundedIndex = Math.round(continuousProgress);
        const diffFromRound = continuousProgress - roundedIndex;
        
        const easedDiff = Math.sign(diffFromRound) * Math.pow(Math.abs(diffFromRound) * 2, 3) / 2;
        const virtualActiveIndex = roundedIndex + easedDiff;

        for (let i = 0; i < cardCount; i++) {
            const card = cards[i];
            if (!card) continue;

            let offset = i - virtualActiveIndex;
            const halfCount = cardCount / 2;
            while (offset > halfCount) offset -= cardCount;
            while (offset < -halfCount) offset += cardCount;

            const absOffset = Math.abs(offset);
            const sign = Math.sign(offset);

            if (absOffset > 3.0) {
                card.style.visibility = 'hidden';
                continue;
            } else {
                card.style.visibility = 'visible';
            }

            const gap = 20;

            let x = 0;
            let z = 0;
            let rot = 0;

            if (absOffset <= 1) {
                const t = absOffset;
                const easedT = t * t * (3 - 2 * t);
                const targetX = metrics.cardW + gap;
                x = sign * (easedT * targetX);
                z = 200 + easedT * (0 - 200);
                rot = easedT * 180; // Full flip instead of 132
            } else if (absOffset <= 2) {
                const t = absOffset - 1;
                const easedT = t * t * (3 - 2 * t);
                const xStart = metrics.cardW + gap;
                const zStart = 0;
                const rotStart = 180;

                const zEnd = -60;
                const rotEnd = 180; // Keep flipped

                const xEnd = xStart + 80;
                const currentX = xStart + easedT * (xEnd - xStart);
                x = sign * currentX;

                z = zStart + easedT * (zEnd - zStart);
                rot = rotStart + easedT * (rotEnd - rotStart);
            } else {
                const t = Math.min(absOffset - 2, 1);
                const easedT = t * t * (3 - 2 * t);
                const zStart = -60;
                const rotStart = 180;
                const zEnd3 = -150;
                const rotEnd3 = 180;
                const xEnd2 = metrics.cardW + gap + 80;
                const xEnd3 = xEnd2 + 50;

                const currentX = xEnd2 + easedT * (xEnd3 - xEnd2);
                x = sign * currentX;
                z = zStart + easedT * (zEnd3 - zStart);
                rot = rotStart + easedT * (rotEnd3 - rotStart);
            }

            const localCardRotation = sign * rot;
            const centerFactor = Math.max(0, 1 - absOffset);

            const maxTiltY = 15;
            const maxTiltX = 10;
            const activeTiltX = -mouse.current.y * maxTiltX * centerFactor;
            const activeTiltY = mouse.current.x * maxTiltY * centerFactor;

            const totalRotX = activeTiltX;
            const totalRotY = localCardRotation + activeTiltY;

            card.style.zIndex = Math.round(z + 1000).toString();
            card.style.opacity = '1';
            card.style.transform = `translateX(${x.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${totalRotX.toFixed(2)}deg) rotateY(${totalRotY.toFixed(2)}deg)`;
        }
    };

    useEffect(() => {
        const tick = () => {
            renderLoop();
            frameId.current = requestAnimationFrame(tick);
        };
        frameId.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId.current);
    }, [metrics, cardCount]);

    const thicknessLayers = [-1, 0, 1];

    if (displayTxns.length === 0) return null;

    return (
        <div className="relative w-full h-[240px] bg-white rounded-3xl border border-black/5 overflow-hidden select-none shadow-sm mb-6 flex flex-col shrink-0">
            <div className="absolute top-4 left-6 z-10 flex items-center justify-between w-[calc(100%-48px)]">
               <h3 className="text-xs font-bold text-black/40 uppercase tracking-wider">Live Transaction Stream</h3>
            </div>
            
            <div className="relative w-full h-full flex items-center justify-center pointer-events-none mt-2" style={{ perspective: '1200px' }}>
                <div className="absolute" style={{ width: `${metrics.cardW}px`, height: `${metrics.cardH}px`, transformStyle: 'preserve-3d' }}>
                    {displayTxns.map((txn, i) => {
                        const tid = txn.transaction_id;
                        const liveDecision = txn.risk_probability >= activeThreshold ? 'FLAG' : 'PASS';
                        const isFlag = liveDecision === 'FLAG';
                        const details = detailsMap[tid] || {};
                        const claims = details.evidence?.evidence || [];
                        const displayClaims = claims.slice(0, 2); // Show max 2 claims on back

                        return (
                            <div
                                key={tid}
                                ref={(el) => { cardsRefs.current[i] = el; }}
                                className="absolute inset-0 transition-opacity duration-300"
                                style={{ width: `${metrics.cardW}px`, height: `${metrics.cardH}px`, transformStyle: 'preserve-3d' }}
                            >
                                {thicknessLayers.map((zOffset, layerIdx) => {
                                    const isFrontFace = layerIdx === thicknessLayers.length - 1;
                                    const isBackFace = layerIdx === 0;

                                    if (!isFrontFace && !isBackFace) {
                                        return (
                                            <div
                                                key={layerIdx}
                                                className="absolute inset-0 rounded-[16px] pointer-events-none"
                                                style={{ backgroundColor: '#e5e7eb', transform: `translateZ(${zOffset}px)` }}
                                            />
                                        );
                                    }

                                    if (isFrontFace) {
                                        return (
                                            <div
                                                key={layerIdx}
                                                className="absolute inset-0 rounded-[16px] pointer-events-none overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-black/5"
                                                style={{
                                                    transform: `translateZ(${zOffset}px)`,
                                                    backfaceVisibility: 'hidden',
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-[#F2F4F7] opacity-80" />
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-blue-400/5 rounded-bl-full pointer-events-none" />
                                                
                                                <div className="absolute inset-0 p-5 flex flex-col justify-between">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1">Transaction ID</span>
                                                            <span className="font-mono text-sm font-medium text-black/80">{tid}</span>
                                                        </div>
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isFlag ? 'bg-[#ff4d4d]/10 text-[#ff4d4d] border border-[#ff4d4d]/20' : 'bg-green-500/10 text-green-700 border border-green-500/20'}`}>
                                                            {isFlag ? <ShieldAlert className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                            {liveDecision}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono text-xl font-semibold text-black/90">₹{(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (isBackFace) {
                                        return (
                                            <div
                                                key={layerIdx}
                                                className="absolute inset-0 rounded-[16px] pointer-events-none overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-black/5"
                                                style={{
                                                    transform: `translateZ(${zOffset}px) rotateY(180deg)`,
                                                    backfaceVisibility: 'hidden',
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-tl from-indigo-50/40 to-[#F8F9FA]" />
                                                
                                                <div className="absolute inset-0 p-4 flex flex-col gap-3 font-['JetBrains_Mono'] text-xs text-black/70">
                                                    <div className="flex justify-between items-center pb-2 border-b border-black/5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[9px] uppercase text-black/40 tracking-wider">Risk Prob</span>
                                                            <span className={`font-medium ${isFlag ? 'text-[#ff4d4d]' : 'text-green-600'}`}>{(txn.risk_probability * 100).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-bold text-[9px] uppercase text-black/40 tracking-wider">Threshold</span>
                                                            <span className="font-medium text-black/60">&gt; {txn.threshold.toFixed(3)}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-2 overflow-hidden h-full">
                                                        {displayClaims.length > 0 ? (
                                                            displayClaims.map((claim: any, idx: number) => (
                                                                <div key={idx} className="flex gap-1.5 text-[9px] leading-tight">
                                                                    <span className="text-black/30 mt-0.5">›</span>
                                                                    <span className="line-clamp-3">{claim.claim}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-[10px] text-black/40 italic flex h-full items-center justify-center">
                                                                {isFlag ? (details.loadingEvidence ? 'Generating evidence...' : 'No evidence found.') : 'Standard authorization.'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
