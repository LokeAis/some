import React, { useState } from 'react';
import { Recycle, Loader2, AlertCircle, Link as LinkIcon, FileText } from 'lucide-react';
import { BrandData } from '../lib/db';
import { useRepurpose, Draft } from '../lib/useRepurpose';
import { RepurposeResults } from './RepurposeResults';

interface Props {
  apiKey: string;
  selectedBrand: BrandData | null;
  brandVoice?: any;
  /** Send eit utkast vidare til innleggseditoren (arvar fidelity-score, auto-fiks og lagring). */
  onEditFurther?: (draft: Draft, channel: string) => void;
}

const CHANNELS = ['LinkedIn', 'Facebook', 'X/Twitter', 'Instagram'];

/**
 * Gjenbruk: lim inn ei lenke eller tekst → lynanalyse + 2–3 publiseringsklare
 * utkast for vald kanal. Byggjer på /api/repurpose (kanalreglar + brand voice).
 */
export function Repurpose({ apiKey, selectedBrand, brandVoice, onEditFurther }: Props) {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('LinkedIn');
  const [inputError, setInputError] = useState<string | null>(null);

  const { result, loading, error, activeChannel, run } = useRepurpose(apiKey, brandVoice, selectedBrand);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    if (inputMode === 'url' && !url.trim()) {
      setInputError('Lim inn ei lenke først.');
      return;
    }
    if (inputMode === 'text' && !text.trim()) {
      setInputError('Lim inn teksten du vil gjenbruke.');
      return;
    }
    run({ ...(inputMode === 'url' ? { url: url.trim() } : { text }), channel });
  };

  const shownError = inputError || error;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Recycle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Gjenbruk innhald</h2>
          </div>
          <p className="text-neutral-600 text-sm">
            Lim inn ein artikkel, eit innlegg eller eigen tekst — få lynanalyse og 2–3 ferdige utkast
            skreddarsydde for kanalen du vel.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          {shownError && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{shownError}</p>
            </div>
          )}

          <div className="inline-flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'url' ? 'bg-white text-emerald-700 shadow-sm' : 'text-neutral-500'}`}
            >
              <LinkIcon className="w-4 h-4" /> Lim inn lenke
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-neutral-500'}`}
            >
              <FileText className="w-4 h-4" /> Lim inn tekst
            </button>
          </div>

          {inputMode === 'url' ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ei-nettside.no/artikkel"
              className="w-full p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Lim inn innhaldet du vil gjenbruke..."
              className="w-full h-36 p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
            >
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyserer og skriv utkast...</>
                : <><Recycle className="w-4 h-4" /> Lag utkast for {channel}</>}
            </button>
          </div>
        </form>
      </div>

      {result && <RepurposeResults result={result} channel={activeChannel} onEditFurther={onEditFurther} />}
    </div>
  );
}
