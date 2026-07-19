import React, { useState, useEffect } from 'react';
import { Loader2, Globe, Target, Zap, Plus, Trash2, ArrowRight } from 'lucide-react';
import { CompetitorAnalysisData, SiteAnalysisData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { HelpTooltip } from './HelpTooltip';
import { BrandData, saveAnalysis, updateAnalysis } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from './ErrorMessage';

interface CompetitorAnalysisProps {
  analysisData: SiteAnalysisData | null;
  onDataUpdate: (data: SiteAnalysisData) => void;
  onGoToPlan: () => void;
  selectedBrand: BrandData | null;
}

export function CompetitorAnalysis({ analysisData, onDataUpdate, onGoToPlan, selectedBrand }: CompetitorAnalysisProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompetitorAnalysisData | null>(analysisData?.competitor_analysis || null);
  
  useEffect(() => {
    if (analysisData?.competitor_analysis) {
      setData(analysisData.competitor_analysis);
    }
  }, [analysisData?.competitor_analysis]);
  
  const [formData, setFormData] = useState<{ ownUrl: string; ownManualText: string; competitorUrls: string[] }>(() => {
    const saved = localStorage.getItem('draft_competitorAnalysis');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          ownUrl: analysisData?.url || '',
          ownManualText: '',
          competitorUrls: ['']
        };
      }
    }
    return {
      ownUrl: analysisData?.url || '',
      ownManualText: '',
      competitorUrls: ['']
    };
  });
  const [useManualText, setUseManualText] = useState(() => {
    return localStorage.getItem('draft_competitorAnalysis_useManual') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('draft_competitorAnalysis', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem('draft_competitorAnalysis_useManual', String(useManualText));
  }, [useManualText]);

  const isValidUrl = (urlString: string) => {
    if (!urlString) return true;
    try {
      const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return url.hostname.includes('.');
    } catch (e) {
      return false;
    }
  };

  const ownUrlError = !useManualText && formData.ownUrl && !isValidUrl(formData.ownUrl) 
    ? "Ugyldig nettadresse for eiga bedrift." 
    : null;

  const competitorUrlErrors = formData.competitorUrls.map(url => 
    url && !isValidUrl(url) ? "Ugyldig nettadresse." : null
  );

  const hasAnyUrlError = !!ownUrlError || competitorUrlErrors.some(err => err !== null);

  const resultRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (analysisData?.url && !formData.ownUrl) {
      setFormData(prev => ({ ...prev, ownUrl: analysisData.url! }));
    }
  }, [analysisData?.url]);

  React.useEffect(() => {
    if (!loading && data && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading, data]);

  const handleAddCompetitor = () => {
    if (formData.competitorUrls.length < 3) {
      setFormData({
        ...formData,
        competitorUrls: [...formData.competitorUrls, '']
      });
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    const newUrls = [...formData.competitorUrls];
    newUrls.splice(index, 1);
    setFormData({
      ...formData,
      competitorUrls: newUrls
    });
  };

  const handleCompetitorChange = (index: number, value: string) => {
    const newUrls = [...formData.competitorUrls];
    newUrls[index] = value;
    setFormData({
      ...formData,
      competitorUrls: newUrls
    });
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useManualText && !formData.ownUrl) return;
    if (useManualText && !formData.ownManualText) return;
    
    const validCompetitors = formData.competitorUrls.filter(url => url.trim() !== '');
    if (validCompetitors.length === 0) {
      setError("Du må legge til minst éin konkurrent.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          ...formData,
          competitorUrls: validCompetitors,
          useManualText,
          brandProfile: selectedBrand
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Klarte ikkje å analysere konkurrentar');
      }
      
      const result = await response.json();
      setData(result);
      if (analysisData) {
        onDataUpdate({
          ...analysisData,
          competitor_analysis: result
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein ukjend feil oppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !analysisData || !data || !selectedBrand) return;
    setSaving(true);
    try {
      if (analysisData.id) {
        await updateAnalysis(user.uid, selectedBrand.id!, analysisData.id, {
          competitor_analysis: data
        });
        if (onDataUpdate) {
          onDataUpdate({ ...analysisData, competitor_analysis: data });
        }
      } else {
        const newId = await saveAnalysis(user.uid, selectedBrand.id!, {
          ...analysisData,
          competitor_analysis: data
        });
        if (onDataUpdate) {
          onDataUpdate({ ...analysisData, id: newId, competitor_analysis: data });
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving competitor analysis:", err);
      setError("Klarte ikkje å lagre analysen.");
    } finally {
      setSaving(false);
    }
  };

  const loadDemoData = () => {
    const demoData = {
      own_summary: "FjordKaffe brenner spesialkaffe med fokus på berekraft og sporbarheit. Dei tilbyr kaffeabonnement og utstyr.",
      competitors: [
        {
          name_or_url: "Kaffebrenneriet.no",
          summary: "Stor kjede som tilbyr eit breitt utval av kaffe, te og bakevarer, med fokus på tilgjengelegheit og kvardagsluksus.",
          positioning: "Den tilgjengelege kvardagskaffien for folk flest.",
          main_topics: ["Nye kaffebønner", "Sesongens drikkar", "Bakevarer", "Gåvetips"]
        },
        {
          name_or_url: "Kaffeknappen.no",
          summary: "B2B-leverandør av kaffemaskiner og kaffe til kontor, med fokus på service og driftssikkerheit.",
          positioning: "Problemfri kaffe på arbeidsplassen.",
          main_topics: ["Kaffemaskiner", "Serviceavtalar", "Kontortrivsel", "Berekraft på kontoret"]
        }
      ],
      similarities: [
        "Alle snakkar om kvalitet og berekraft.",
        "Alle tilbyr kaffe til både privat og bedrift (sjølv om vektinga varierer)."
      ],
      differences: [
        "FjordKaffe har mykje sterkare fokus på sporbarheit heilt ned til bonden.",
        "Konkurrentane fokuserer meir på utstyr og volum, medan FjordKaffe fokuserer på handverket (brenninga)."
      ],
      content_gaps: [
        {
          theme: "Bonden si historie og direkte handel",
          description: "Gå i djupna på kven som dyrkar kaffien, korleis dei jobbar, og kva direkte handel betyr for lokalsamfunnet deira.",
          why_it_matters: "Konkurrentane snakkar overordna om berekraft. Ved å vise ansikta til bøndene bygger de mykje sterkare tillit og emosjonell tilknyting.",
          suggested_formats: ["Karusell på Instagram med bilete frå farmen", "Djuptgåande artikkel på nettsida", "Kort video (Reel) som forklarar direkte handel"],
          content_ideas: [
            "Intervju med ein kaffebonde frå Colombia",
            "Bak kulissane: Korleis vi vel ut kaffebønnene",
            "Kva betyr direkte handel for lokalsamfunnet?"
          ]
        },
        {
          theme: "Kaffenerding: Bryggeteknikkar for spesialkaffe",
          description: "Detaljerte guidar for korleis ein får mest mogleg ut av spesialkaffe heime (V60, Aeropress, etc.).",
          why_it_matters: "Konkurrentane fokuserer på kaffemaskiner og enkelheit. De kan eige posisjonen som eksperten som lærer kunden å brygge perfekt kaffe heime.",
          suggested_formats: ["Steg-for-steg videoar", "Nedlastbar bryggeguide (PDF)", "Korte tips på TikTok/Reels"],
          content_ideas: [
            "Slik bryggar du perfekt V60 heime",
            "5 feil du gjer når du bryggar kaffe",
            "Kva er forskjellen på lys og mørk brenning?"
          ]
        }
      ]
    };
    setData(demoData);
    if (analysisData) {
      onDataUpdate({
        ...analysisData,
        competitor_analysis: demoData
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Konkurrentanalyse
          </h2>
          <p className="text-neutral-500 text-sm mt-1">
            Samanlikn di bedrift med opptil 3 konkurrentar for å finne "content gaps" – tema de kan eige.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-6">
          {!analysisData && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-amber-100 p-1.5 rounded-full flex-shrink-0">
                  <Target className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Du har ikkje analysert eiga nettside enno</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Det er best å starte med ein analyse av eiga nettside i steg 1, slik at AI-en kjenner bedrifta di godt før den samanliknar med konkurrentar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Own Website */}
          <div className="space-y-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-indigo-900 flex items-center">
                Vår bedrift
                <HelpTooltip content="Nettsida eller teksten som representerer di bedrift." />
              </label>
              <button
                type="button"
                onClick={() => setUseManualText(!useManualText)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {useManualText ? 'Bruk nettadresse i staden' : 'Lim inn tekst manuelt'}
              </button>
            </div>
            
            {useManualText ? (
              <textarea
                required
                rows={3}
                placeholder="Lim inn informasjon om bedrifta di her..."
                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                value={formData.ownManualText}
                onChange={e => setFormData({...formData, ownManualText: e.target.value})}
              />
            ) : (
              <div>
                <div className="relative">
                  <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${ownUrlError ? 'text-red-400' : 'text-indigo-400'}`} />
                  <input
                    type="url"
                    required
                    placeholder="https://vår-bedrift.no"
                    className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:ring-2 transition-all ${ownUrlError ? 'border-red-300 focus:ring-red-500 focus:border-red-500 text-red-900' : 'border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                    value={formData.ownUrl}
                    onChange={e => setFormData({...formData, ownUrl: e.target.value})}
                    onBlur={() => {
                      if (formData.ownUrl && !formData.ownUrl.startsWith('http') && isValidUrl(formData.ownUrl)) {
                        setFormData({...formData, ownUrl: `https://${formData.ownUrl}`});
                      }
                    }}
                  />
                </div>
                {ownUrlError && <p className="text-xs text-red-500 mt-1">{ownUrlError}</p>}
              </div>
            )}
          </div>

          {/* Competitors */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-neutral-700 flex items-center">
              Konkurrentar (1-3)
              <HelpTooltip content="Legg til nettadresser til konkurrentane dine for å samanlikne." />
            </label>
            
            {formData.competitorUrls.map((url, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${competitorUrlErrors[index] ? 'text-red-400' : 'text-neutral-400'}`} />
                    <input
                      type="url"
                      required={index === 0}
                      placeholder={`https://konkurrent-${index + 1}.no`}
                      className={`w-full pl-10 pr-4 py-2.5 bg-neutral-50 border rounded-xl focus:ring-2 transition-all ${competitorUrlErrors[index] ? 'border-red-300 focus:ring-red-500 focus:border-red-500 text-red-900' : 'border-neutral-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                      value={url}
                      onChange={e => handleCompetitorChange(index, e.target.value)}
                      onBlur={() => {
                        if (url && !url.startsWith('http') && isValidUrl(url)) {
                          handleCompetitorChange(index, `https://${url}`);
                        }
                      }}
                    />
                  </div>
                  {formData.competitorUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetitor(index)}
                      aria-label="Fjern konkurrent"
                      className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {competitorUrlErrors[index] && <p className="text-xs text-red-500">{competitorUrlErrors[index]}</p>}
              </div>
            ))}

            {formData.competitorUrls.length < 3 && (
              <button
                type="button"
                onClick={handleAddCompetitor}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 py-2"
              >
                <Plus className="w-4 h-4" />
                Legg til ein konkurrent til
              </button>
            )}
          </div>

          <ErrorMessage error={error} />

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading || !selectedBrand || hasAnyUrlError}
              className="flex-1 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyserer...</span>
                </>
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  <span>Start analyse for {selectedBrand ? selectedBrand.name : 'kunde'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={loadDemoData}
              className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center"
            >
              Sjå eksempel
            </button>
          </div>
          {!selectedBrand && (
            <p className="text-sm text-amber-600 mt-2">Du må velge en kunde øverst på siden før du kan analysere.</p>
          )}
        </form>
      </div>

      <AnimatePresence mode="wait">
      {loading && (
        <motion.div 
          key="loading"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 flex flex-col items-center justify-center text-center space-y-4"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <Target className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Analyserer marknaden...</h3>
            <p className="text-neutral-500 text-sm mt-1">Dette kan ta opptil eit minutt. Vi les nettsidene og samanliknar bodskap.</p>
          </div>
        </motion.div>
      )}

      {data && !loading && (
        <motion.div 
          key="data"
          ref={resultRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Own Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100 md:col-span-2"
            >
              <h3 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Vår posisjonering
              </h3>
              <p className="text-indigo-800 text-sm leading-relaxed">{data.own_summary}</p>
            </motion.div>

            {/* Competitors */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 md:col-span-2 space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-neutral-500" />
                Konkurrentar
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.competitors.map((comp, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                    className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex flex-col h-full"
                  >
                    <h4 className="font-bold text-neutral-900 mb-2 truncate" title={comp.name_or_url}>{comp.name_or_url}</h4>
                    <p className="text-xs text-neutral-600 mb-3 flex-1">{comp.summary}</p>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Posisjonering</span>
                        <p className="text-xs font-medium text-neutral-800 mt-0.5">{comp.positioning}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Hovudtema</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {comp.main_topics.map((topic, j) => (
                            <span key={j} className="px-1.5 py-0.5 bg-white border border-neutral-200 text-neutral-600 text-[10px] rounded">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Similarities & Differences */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900">Likskapar</h3>
              <ul className="space-y-2">
                {(data.similarities || []).map((sim, i) => (
                  <li key={i} className="text-sm text-neutral-600 flex items-start bg-neutral-50 p-2 rounded-lg">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>{sim}</span>
                  </li>
                ))}
                {(!data.similarities || data.similarities.length === 0) && (
                  <li className="text-sm text-neutral-500 italic">Ingen tydelege likskapar funne.</li>
                )}
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900">Forskjellar</h3>
              <ul className="space-y-2">
                {(data.differences || []).map((diff, i) => (
                  <li key={i} className="text-sm text-neutral-600 flex items-start bg-neutral-50 p-2 rounded-lg">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>{diff}</span>
                  </li>
                ))}
                {(!data.differences || data.differences.length === 0) && (
                  <li className="text-sm text-neutral-500 italic">Ingen tydelege forskjellar funne.</li>
                )}
              </ul>
            </motion.div>

            {/* Content Gaps */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100 md:col-span-2 space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900">Content Gaps (Moglegheiter)</h3>
                  <p className="text-xs text-emerald-700">Tema der de kan skilje dykk ut og eige posisjonen.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.content_gaps.map((gap, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col h-full"
                  >
                    <h4 className="font-bold text-emerald-900 mb-2">{gap.theme}</h4>
                    <p className="text-sm text-neutral-600 mb-4 flex-1">{gap.description}</p>
                    
                    <div className="space-y-3 mt-auto">
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-50">
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block mb-1">Kvifor det er viktig</span>
                        <p className="text-xs text-emerald-800">{gap.why_it_matters}</p>
                      </div>
                      
                      {gap.suggested_formats && gap.suggested_formats.length > 0 && (
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Foreslåtte format</span>
                          <div className="flex flex-wrap gap-1.5">
                            {gap.suggested_formats.map((format, j) => (
                              <span key={j} className="px-2 py-1 bg-neutral-100 text-neutral-600 text-[10px] rounded-md font-medium">
                                {format}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {gap.content_ideas && gap.content_ideas.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Forslag til innhald</span>
                          <ul className="space-y-1.5">
                            {gap.content_ideas.map((idea, j) => (
                              <li key={j} className="text-xs text-neutral-700 flex items-start">
                                <span className="text-emerald-500 mr-1.5 mt-0.5">•</span>
                                <span>{idea}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {analysisData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row justify-end pt-6 gap-3"
            >
              <button
                onClick={handleSave}
                disabled={saving || saveSuccess || !data}
                className={`px-8 py-3 font-medium rounded-xl transition-all flex items-center justify-center space-x-2 ${
                  saveSuccess 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Lagrar...</span>
                  </>
                ) : saveSuccess ? (
                  <span>Lagra!</span>
                ) : (
                  <span>Lagre analyse</span>
                )}
              </button>
              <button
                onClick={onGoToPlan}
                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center justify-center space-x-2"
              >
                <span>Gå vidare til innhaldsplan</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
