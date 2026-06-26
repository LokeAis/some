import React, { useState, useEffect } from 'react';
import { Save, Sparkles, AlertCircle, Loader2, Check, FileText } from 'lucide-react';

interface BrandVoiceAnalyzerProps {
  apiKey: string;
  onSave: (dna: string) => void;
  initialDna?: string;
}

export function BrandVoiceAnalyzer({ apiKey, onSave, initialDna = '' }: BrandVoiceAnalyzerProps) {
  const [samples, setSamples] = useState(() => {
    return localStorage.getItem('draft_brand_voice_samples') || '';
  });
  const [dna, setDna] = useState(initialDna);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem('draft_brand_voice_samples', samples);
  }, [samples]);

  useEffect(() => {
    setDna(initialDna);
  }, [initialDna]);

  const handleAnalyze = async () => {
    if (!samples.trim()) {
      setError('Du må lime inn nokre teksteksempel først.');
      return;
    }

    if (!apiKey) {
      setError('API-nøkkel manglar. Legg inn nøkkelen i menyen til venstre.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsSaved(false);

    try {
      const response = await fetch('/api/analyze-brand-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ samples })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Feilkode: ${response.status}`);
      }

      const data = await response.json();
      setDna(data.dna);
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod under analysen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    onSave(dna);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Brand Voice DNA</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Lim inn 3-5 av dine beste innlegg eller tekstar. AI-en vil analysere tonen, rytmen og vokabularet ditt, og lage eit "DNA" som blir brukt for å skrive framtidige innlegg akkurat slik du ville gjort det.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Lim inn teksteksempel her
          </label>
          <textarea
            value={samples}
            onChange={(e) => setSamples(e.target.value)}
            placeholder="Eksempel 1:&#10;Hei alle saman! I dag har vi lansert...&#10;&#10;Eksempel 2:&#10;Visste du at..."
            className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !samples.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyserer DNA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Knekk koden (Analyser)
                </>
              )}
            </button>
          </div>
        </div>

        {dna && (
          <div className="space-y-3 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700">
              Ditt Brand Voice DNA
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Dette er oppsummeringa AI-en vil bruke for å etterlikne stilen din. Du kan redigere teksten manuelt viss du vil gjere justeringar.
            </p>
            <textarea
              value={dna}
              onChange={(e) => setDna(e.target.value)}
              className="w-full h-48 p-4 border border-purple-200 bg-purple-50/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors font-medium ${
                  isSaved 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    DNA Lagra!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lagre Brand Voice
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
