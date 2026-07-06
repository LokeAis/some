import React, { useState } from 'react';
import { Loader2, ArrowRight, Globe, Target, MessageSquare, Zap, AlertTriangle, CircleCheck, Save, X } from 'lucide-react';
import { SiteAnalysisData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { saveAnalysis, updateAnalysis, BrandData } from '../lib/db';
import { HelpTooltip } from './HelpTooltip';
import { ErrorMessage } from './ErrorMessage';

interface Props {
  data: SiteAnalysisData | null;
  onDataUpdate: (data: SiteAnalysisData) => void;
  onGoToPlan: () => void;
  onAutoGeneratePlan?: () => void;
  selectedBrand: BrandData | null;
  /** Sann når `data` kjem frå ei automatisk henting av siste lagra analyse. */
  autoLoadedNotice?: boolean;
  onDismissAutoLoadedNotice?: () => void;
}

export function SiteAnalysis({ data, onDataUpdate, onGoToPlan, onAutoGeneratePlan, selectedBrand, autoLoadedNotice, onDismissAutoLoadedNotice }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('draft_siteAnalysis');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved site analysis draft", e);
      }
    }
    return {
      url: '',
      manualText: '',
      language: 'Norsk',
      audience: '',
      tone: ''
    };
  });
  const [useManualText, setUseManualText] = useState(() => {
    const saved = localStorage.getItem('draft_siteAnalysis_useManual');
    return saved === 'true';
  });

  const isValidUrl = (urlString: string) => {
    if (!urlString) return true;
    try {
      const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return url.hostname.includes('.');
    } catch (e) {
      return false;
    }
  };

  const urlError = !useManualText && formData.url && !isValidUrl(formData.url) 
    ? "Ugyldig nettadresse. Sjekk at formatet er rett (t.d. https://eksempel.no)" 
    : null;

  const resultRef = React.useRef<HTMLDivElement>(null);
  const prevLoading = React.useRef(loading);

  React.useEffect(() => {
    localStorage.setItem('draft_siteAnalysis', JSON.stringify(formData));
  }, [formData]);

  React.useEffect(() => {
    localStorage.setItem('draft_siteAnalysis_useManual', String(useManualText));
  }, [useManualText]);

  React.useEffect(() => {
    if (prevLoading.current && !loading && data && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    prevLoading.current = loading;
  }, [loading, data]);

  const loadingSteps = [
    "Hentar informasjon frå nettsida...",
    "Analyserer produkt og tenester...",
    "Forstår målgruppe og tone...",
    "Identifiserer unike fordelar...",
    "Ferdigstiller analysen..."
  ];

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useManualText && !formData.url) return;
    if (useManualText && !formData.manualText) return;

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/analyze-site', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          ...formData,
          useManualText,
          brandProfile: selectedBrand
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Klarte ikkje å analysere nettsida');
      }
      
      const result = await response.json();
      onDataUpdate(result);
      onDismissAutoLoadedNotice?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein ukjend feil oppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !data || !selectedBrand) return;
    setSaving(true);
    try {
      if (data.id) {
        await updateAnalysis(user.uid, selectedBrand.id!, data.id, {
          url: useManualText ? undefined : formData.url,
          company_summary: data.company_summary,
          products_services: data.products_services,
          target_audience: data.target_audience,
          tone_of_voice: data.tone_of_voice,
          usp: data.usp,
          content_pillars: data.content_pillars,
          cta_suggestions: data.cta_suggestions,
          brand_risks_or_gaps: data.brand_risks_or_gaps,
          golden_nuggets: data.golden_nuggets,
          confidence_notes: data.confidence_notes,
          competitor_analysis: data.competitor_analysis
        });
      } else {
        const newId = await saveAnalysis(user.uid, selectedBrand.id!, {
          url: useManualText ? undefined : formData.url,
          company_summary: data.company_summary,
          products_services: data.products_services,
          target_audience: data.target_audience,
          tone_of_voice: data.tone_of_voice,
          usp: data.usp,
          content_pillars: data.content_pillars,
          cta_suggestions: data.cta_suggestions,
          brand_risks_or_gaps: data.brand_risks_or_gaps,
          golden_nuggets: data.golden_nuggets,
          confidence_notes: data.confidence_notes,
          competitor_analysis: data.competitor_analysis
        });
        if (newId) {
          onDataUpdate({ ...data, id: newId });
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving analysis:", err);
      setError("Klarte ikkje å lagre analysen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {autoLoadedNotice && data && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between gap-3">
          <p className="text-sm text-indigo-800">
            📌 Viser siste lagra analyse for denne merkevara. Køyr ein ny analyse for å oppdatere,
            eller sjå andre lagra analysar under «Mine prosjekt».
          </p>
          <button
            onClick={onDismissAutoLoadedNotice}
            className="text-indigo-400 hover:text-indigo-700 transition-colors shrink-0"
            aria-label="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  {useManualText ? 'Lim inn tekst manuelt' : 'Nettadresse (URL)'}
                  <HelpTooltip content={useManualText ? "Lim inn tekst om bedrifta, produkt, tenester og verdiar. Jo meir detaljert, jo betre forstår AI-en kva de gjer." : "Lim inn heile nettadressa (t.d. https://www.dinside.no). AI-en vil lese innhaldet på sida for å forstå bedrifta di."} />
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
                  rows={4}
                  placeholder="Lim inn informasjon om bedrifta her..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.manualText}
                  onChange={e => setFormData({...formData, manualText: e.target.value})}
                />
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${urlError ? 'text-red-400' : 'text-neutral-400'}`} />
                    <input
                      type="url"
                      required
                      placeholder="https://eksempel.no"
                      className={`w-full pl-10 pr-4 py-2.5 bg-neutral-50 border rounded-xl focus:ring-2 transition-all ${urlError ? 'border-red-300 focus:ring-red-500 focus:border-red-500 text-red-900' : 'border-neutral-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                      value={formData.url}
                      onChange={e => setFormData({...formData, url: e.target.value})}
                      onBlur={() => {
                        if (formData.url && !formData.url.startsWith('http') && isValidUrl(formData.url)) {
                          setFormData({...formData, url: `https://${formData.url}`});
                        }
                      }}
                    />
                  </div>
                  {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Språk
                <HelpTooltip content="Spesifiser språket du vil at alt innhald skal vere på. T.d. 'Nynorsk', 'Bokmål' eller 'Engelsk'." />
              </label>
              <input
                type="text"
                placeholder="T.d. Norsk, Engelsk"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.language}
                onChange={e => setFormData({...formData, language: e.target.value})}
              />
              <p className="text-xs text-neutral-500">Kva språk analysen og forslaga skal vere på.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Målgruppe (valfritt)
                <HelpTooltip content="Kven prøver du å nå? Skildre dei gjerne med alder, interesser eller yrke. T.d. 'Småbarnsforeldre i tidsklemma' eller 'B2B-leiarar i tech-bransjen'." />
              </label>
              <input
                type="text"
                placeholder="T.d. Småbarnsforeldre, bedriftsleiarar"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.audience}
                onChange={e => setFormData({...formData, audience: e.target.value})}
              />
              <p className="text-xs text-neutral-500">Hjelper assistenten å spisse bodskapen mot rett publikum.</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Ønskt tone og stil (valfritt)
                <HelpTooltip content="Bruk 2-3 adjektiv for å skildre korleis de vil framstå. T.d. 'Profesjonell og tillitsvekkande', 'Leiken og uformell med emojis', eller 'Kort, presis og fagleg'." />
              </label>
              <input
                type="text"
                placeholder="T.d. Uformell og leiken, eller profesjonell og trygg"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.tone}
                onChange={e => setFormData({...formData, tone: e.target.value})}
              />
              <p className="text-xs text-neutral-500">Korleis de ønskjer å framstå. Viss feltet er tomt, prøver vi å gjette ut frå nettsida.</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (useManualText ? !formData.manualText : (!formData.url || !!urlError)) || !selectedBrand}
              className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{loadingSteps[loadingStep]}</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Analyser {selectedBrand ? selectedBrand.name : 'nettsida'}</span>
                </>
              )}
            </button>
          </div>
          {!selectedBrand && (
            <p className="text-sm text-amber-600 mt-2">Du må velge en kunde øverst på siden før du kan analysere.</p>
          )}
          
          <ErrorMessage error={error} />
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
          className="space-y-6 mt-8"
        >
          <div className="flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 rounded-2xl text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-indigo-50 text-indigo-600 p-4 rounded-full">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-neutral-900">
                {loadingSteps[loadingStep]}
              </h3>
              <p className="text-sm text-neutral-500">Dette kan ta opptil eit minutt...</p>
            </div>
            
            {/* Progress indicators */}
            <div className="flex space-x-2 mt-4">
              {loadingSteps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === loadingStep ? 'w-8 bg-indigo-600' : 
                    i < loadingStep ? 'w-4 bg-indigo-300' : 'w-4 bg-neutral-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 pointer-events-none">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4 md:col-span-2">
              <div className="h-6 w-40 bg-neutral-200 rounded-md animate-pulse mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-neutral-100 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-neutral-100 rounded animate-pulse"></div>
                <div className="h-4 w-4/6 bg-neutral-100 rounded animate-pulse"></div>
              </div>
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
                <div className="h-6 w-32 bg-neutral-200 rounded-md animate-pulse mb-4"></div>
                <div className="space-y-3">
                  <div className="h-16 w-full bg-neutral-50 rounded-xl animate-pulse"></div>
                  <div className="h-16 w-full bg-neutral-50 rounded-xl animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {!data && !loading && (
        <motion.div 
          key="empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 border-dashed rounded-2xl text-center"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <Globe className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ingen analyse enno</h3>
          <p className="text-neutral-500 max-w-md mx-auto text-sm">
            Fyll inn URL-en til bedrifta di eller lim inn tekst over, så vil AI-en analysere målgruppe, tone og unike fordelar.
          </p>
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
          className="space-y-6 mt-8"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-neutral-900">Resultat av analysen</h3>
            <div className="flex items-center space-x-3">
              {user && (
                <button
                  onClick={handleSave}
                  disabled={saving || saveSuccess}
                  className={`px-4 py-2 border font-medium rounded-lg transition-all flex items-center space-x-2 text-sm shadow-sm ${
                    saveSuccess 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saveSuccess ? (
                    <CircleCheck className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saveSuccess ? 'Lagra!' : 'Lagre'}</span>
                </button>
              )}
              <button
                onClick={onGoToPlan}
                className="px-4 py-2 bg-indigo-600 border border-transparent text-white font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center space-x-2 text-sm shadow-sm"
              >
                <span>Gå vidare til innhaldsplan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4 md:col-span-2"
            >
              <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                <Globe className="w-5 h-5" />
                <h4 className="font-semibold">Kort om bedrifta</h4>
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed">{data.company_summary}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4"
            >
              <div className="flex items-center space-x-2 text-emerald-600 mb-2">
                <Target className="w-5 h-5" />
                <h4 className="font-semibold">Målgruppe og stil</h4>
              </div>
              <div className="space-y-3">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Målgruppe</span>
                  <p className="text-neutral-700 text-sm mt-1">{data.target_audience.join(', ')}</p>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tone og stil</span>
                  <p className="text-neutral-700 text-sm mt-1">{data.tone_of_voice}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4"
            >
              <div className="flex items-center space-x-2 text-amber-600 mb-2">
                <Zap className="w-5 h-5" />
                <h4 className="font-semibold">USP-ar & Tjenester</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Unike fordelar (USP)</span>
                  <ul className="mt-2 space-y-2">
                    {(data.usp || []).map((item, i) => (
                      <li key={i} className="text-sm text-neutral-700 flex items-start bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <CircleCheck className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tjenester/Produkt</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(data.products_services || []).map((service, i) => (
                      <span key={i} className="px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs rounded-md font-medium">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4"
            >
              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                <MessageSquare className="w-5 h-5" />
                <h4 className="font-semibold">Innhaldspilarar & CTA</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Pilarar</span>
                  <ul className="mt-2 space-y-2">
                    {(data.content_pillars || []).map((pillar, i) => (
                      <li key={i} className="text-sm text-neutral-700 flex items-start bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <CircleCheck className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{pillar}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Call to Actions</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(data.cta_suggestions || []).map((cta, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs rounded-md font-medium">
                        {cta}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {data.golden_nuggets && data.golden_nuggets.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-amber-200 space-y-4 md:col-span-2"
              >
                <div className="flex items-center space-x-2 text-amber-700 mb-2">
                  <Zap className="w-5 h-5" />
                  <h4 className="font-semibold">Golden Nuggets</h4>
                </div>
                <p className="text-sm text-amber-800 mb-4">Sterke sitat, unike verdiforslag eller slåande fakta frå teksten som kan brukast som 'hooks' i sosiale medium.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.golden_nuggets.map((nugget, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative">
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold border border-amber-200">
                        {i + 1}
                      </div>
                      <p className="text-neutral-700 text-sm italic">"{nugget}"</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 space-y-4"
            >
              <div className="flex items-center space-x-2 text-red-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-semibold">Risikoar & Manglar</h4>
              </div>
              <ul className="mt-2 space-y-2">
                {(data.brand_risks_or_gaps || []).map((risk, i) => (
                  <li key={i} className="text-sm text-red-800 flex items-start bg-red-100/50 p-2 rounded-lg border border-red-100">
                    <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
              {data.confidence_notes && (
                <div className="mt-4 pt-4 border-t border-red-200/50">
                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">AI-notat om tryggleik</span>
                  <p className="text-red-800 text-sm mt-1 italic">{data.confidence_notes}</p>
                </div>
              )}
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="md:col-span-2 flex flex-col items-center gap-2 pt-8 pb-4"
            >
              {onAutoGeneratePlan ? (
                <>
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Anbefalt neste steg</span>
                  <button
                    onClick={onAutoGeneratePlan}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Generer innhaldsplan</span>
                  </button>
                  <button
                    onClick={onGoToPlan}
                    className="mt-1 text-sm text-neutral-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    eller gå til innhaldsplan manuelt <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onGoToPlan}
                  className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <span>Gå til innhaldsplan</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
