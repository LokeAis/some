import { useEffect, useState } from 'react';
import { BookOpen, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { analyzeReadability, analyzeSeo, ScoreResult } from '../lib/textScore';

interface Props {
  text: string;
}

const scoreColor = (score: number) =>
  score >= 75 ? 'bg-emerald-50 text-emerald-600'
  : score >= 50 ? 'bg-amber-50 text-amber-600'
  : 'bg-red-50 text-red-600';

function Gauge({ label, icon: Icon, result }: { label: string; icon: typeof BookOpen; result: ScoreResult }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl shrink-0 ${scoreColor(result.score)}`}>
        <span className="text-xl font-bold leading-none">{result.score}</span>
        <span className="text-[9px] font-medium opacity-70">/ 100</span>
      </div>
      <div className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-purple-500" /> {label}
      </div>
    </div>
  );
}

/**
 * Sanntids skrive-score: lesbarheit (LIX) + SEO mot eit fokus-nøkkelord.
 * 100 % lokal utrekning (ingen AI-kall) – oppdaterer seg debounced medan du skriv.
 */
export function WritingScore({ text }: Props) {
  const [keyword, setKeyword] = useState('');
  const [readability, setReadability] = useState<ScoreResult | null>(null);
  const [seo, setSeo] = useState<ScoreResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setReadability(analyzeReadability(text));
      setSeo(analyzeSeo(text, keyword));
    }, 300);
    return () => clearTimeout(t);
  }, [text, keyword]);

  if (!readability || !seo) return null;

  const allTips = [
    ...readability.tips.map(tip => ({ tip, ok: tip.startsWith('God') })),
    ...seo.tips.map(tip => ({ tip, ok: tip.startsWith('Godt') }))
  ].slice(0, 6);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <Gauge label="Lesbarheit" icon={BookOpen} result={readability} />
        <Gauge label="SEO" icon={Search} result={seo} />
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Fokus-nøkkelord (t.d. «leggbeskyttarar»)"
            className="w-full p-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <ul className="space-y-1.5">
        {allTips.map(({ tip, ok }, i) => (
          <li key={i} className="text-xs flex items-start gap-1.5">
            {ok
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-px" />
              : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-px" />}
            <span className={ok ? 'text-neutral-500' : 'text-neutral-700'}>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
