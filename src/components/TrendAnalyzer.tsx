import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, TrendingUp, ExternalLink, PenTool, ArrowRight } from 'lucide-react';
import { BrandData } from '../lib/db';
import { motion } from 'motion/react';

interface Trend {
  title: string;
  summary: string;
}

interface Source {
  title: string;
  url: string;
}

interface TrendAnalyzerProps {
  apiKey: string;
  selectedBrand: BrandData | null;
  brandVoiceDNA?: any;
  onPostGenerated: (post: string, imagePrompt: string, trendTitle: string) => void;
}

export function TrendAnalyzer({ apiKey, selectedBrand, brandVoiceDNA, onPostGenerated }: TrendAnalyzerProps) {
  const [industry, setIndustry] = useState(() => {
    return localStorage.getItem('draft_trend_industry') || selectedBrand?.industry || '';
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trends, setTrends] = useState<Trend[]>(() => {
    const saved = localStorage.getItem('draft_trends');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [sources, setSources] = useState<Source[]>(() => {
    const saved = localStorage.getItem('draft_trend_sources');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('draft_trend_industry', industry);
  }, [industry]);

  React.useEffect(() => {
    if (trends && trends.length > 0) {
      localStorage.setItem('draft_trends', JSON.stringify(trends));
    } else {
      localStorage.removeItem('draft_trends');
    }
  }, [trends]);

  React.useEffect(() => {
    if (sources && sources.length > 0) {
      localStorage.setItem('draft_trend_sources', JSON.stringify(sources));
    } else {
      localStorage.removeItem('draft_trend_sources');
    }
  }, [sources]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry.trim()) {
      setError('Du må skrive inn ein bransje.');
      return;
    }

    if (!apiKey) {
      setError('API-nøkkel manglar. Legg inn nøkkelen i menyen til venstre.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setTrends([]);
    setSources([]);

    try {
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ industry })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Feilkode: ${response.status}`);
      }

      const data = await response.json();
      setTrends(data.trends || []);
      setSources(data.sources || []);
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod under søket.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGeneratePost = async (trend: Trend) => {
    if (!apiKey) {
      setError('API-nøkkel manglar.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/trend-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ 
          trend,
          brandVoice: brandVoiceDNA,
          brandProfile: selectedBrand
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Feilkode: ${response.status}`);
      }

      const data = await response.json();
      
      let finalPost = data.post;
      if (sources.length > 0) {
        finalPost += `\n\nKjelder:\n${sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}`;
      }
      
      onPostGenerated(finalPost, data.image_prompt, trend.title);
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod under generering av innlegg.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Kva skjer i bransjen i dag?</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Søk etter dei nyaste trendane og nyheitene i din bransje. AI-en brukar Google Søk for å finne dagsaktuelt innhald du kan dele med følgjarane dine.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="T.d. Marknadsføring, Kunstig Intelligens, Eigedom..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !industry.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Søk etter trendar
          </button>
        </form>

        {trends.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-900">Topp 3 trendar akkurat no</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {trends.map((trend, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={index} 
                  className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col h-full"
                >
                  <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{trend.title}</h4>
                  <p className="text-sm text-gray-600 mb-4 flex-grow">{trend.summary}</p>
                  <button
                    onClick={() => handleGeneratePost(trend)}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors text-sm font-medium"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <PenTool className="w-4 h-4" />
                        Skriv innlegg om dette
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
            
            {sources.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Kjelder (Citations):</h4>
                <ul className="space-y-2">
                  {sources.map((source, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {source.title || source.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
