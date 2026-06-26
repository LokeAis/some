import { useState, useEffect } from 'react';
import { Gauge, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  content: string;
  brandVoice: any;
}

/**
 * On-demand brand voice fidelity-score (Grep 2). Kallar /api/score-fidelity og
 * viser score 0–100 + verdict + største avvik. Delt mellom SinglePost og ArticleWizard.
 */
export function FidelityScore({ content, brandVoice }: Props) {
  const [fidelity, setFidelity] = useState<{ score: number; verdict: string; biggest_deviation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  // Gammal score er ikkje gyldig når teksten endrar seg.
  useEffect(() => { setFidelity(null); setError(null); }, [content]);

  // Tell opp til scoren for ein liten "noko ekte skjedde under panseret"-effekt.
  useEffect(() => {
    if (!fidelity) { setDisplayScore(0); return; }
    const target = fidelity.score;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 800);
      setDisplayScore(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fidelity]);

  const handleScore = async () => {
    setError(null);
    setFidelity(null);
    if (!brandVoice) {
      setError('Du må definere ein Brand Voice-profil for denne kunden først (sjå "Brand Voice DNA").');
      return;
    }
    if (!content || !content.trim()) {
      setError('Ingen tekst å vurdere enno.');
      return;
    }
    setLoading(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/score-fidelity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ content, brandVoice })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Klarte ikkje å måle stemme-treff');
      }
      setFidelity(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein ukjend feil oppstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!fidelity && (
        <button
          onClick={handleScore}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Måler stemme-treff...</>
            : <><Gauge className="w-4 h-4" /> Sjekk stemme-treff</>}
        </button>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mt-2">{error}</p>
      )}
      {fidelity && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 flex items-start gap-4">
          <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl shrink-0 ${
            fidelity.score >= 80 ? 'bg-emerald-50 text-emerald-600'
            : fidelity.score >= 60 ? 'bg-amber-50 text-amber-600'
            : 'bg-red-50 text-red-600'}`}>
            <span className="text-3xl font-bold leading-none">{displayScore}</span>
            <span className="text-[10px] font-medium opacity-70 mt-1">/ 100</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
              <Gauge className="w-4 h-4 text-purple-500" /> Stemme-treff
            </div>
            <p className="text-sm text-neutral-700 mt-1">{fidelity.verdict}</p>
            {fidelity.biggest_deviation && (
              <p className="text-xs text-neutral-500 mt-2">
                <span className="font-medium text-neutral-700">Største avvik:</span> {fidelity.biggest_deviation}
              </p>
            )}
            <button
              onClick={handleScore}
              disabled={loading}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-3 inline-flex items-center gap-1 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Mål på nytt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
