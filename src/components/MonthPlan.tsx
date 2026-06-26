import React, { useState, useMemo } from 'react';
import { Loader2, Calendar, RefreshCw, PlusCircle, CircleCheck, Filter, Target, Lightbulb, MousePointerClick, PenTool, Save, Download, Copy, Trash2, FileText, List, LayoutGrid } from 'lucide-react';
import { SiteAnalysisData, MonthPlanItem, MonthPlanData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { savePlan, updatePlan, BrandData } from '../lib/db';
import { HelpTooltip } from './HelpTooltip';
import { ConfirmModal } from './ConfirmModal';
import { ErrorMessage } from './ErrorMessage';
import { CalendarView } from './CalendarView';

interface Props {
  analysisData: SiteAnalysisData | null;
  initialPlan?: MonthPlanData | null;
  onSelectPost: (item: MonthPlanItem) => void;
  onGoToAnalysis?: () => void;
  selectedBrand: BrandData | null;
  onPlanUpdate?: (plan: MonthPlanData | null) => void;
  brandVoice?: any;
  autoGenerate?: boolean;
  onAutoGenerateComplete?: () => void;
}

export function MonthPlan({ analysisData, initialPlan, onSelectPost, onGoToAnalysis, selectedBrand, onPlanUpdate, brandVoice, autoGenerate, onAutoGenerateComplete }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const prevLoading = React.useRef(loading);
  const loadedPlanIdRef = React.useRef<string | null>(initialPlan?.id || null);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<MonthPlanItem[] | null>(() => {
    const saved = localStorage.getItem('draft_generated_plan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [planSummary, setPlanSummary] = useState<string | null>(() => {
    return localStorage.getItem('draft_plan_summary') || null;
  });
  const [filterChannel, setFilterChannel] = useState<string>('Alle');
  const [filterStatus, setFilterStatus] = useState<string>('Alle');
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  React.useEffect(() => {
    if (prevLoading.current && !loading && plan && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    prevLoading.current = loading;
  }, [loading, plan]);
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('draft_monthPlan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved month plan draft", e);
      }
    }
    return {
      channels: ['Facebook', 'Instagram'],
      postsPerWeek: 3,
      goal: 'Auka engasjement og merkevarekjennskap',
      tone: '',
      manualAnalysis: '',
      visualStyle: 'Ingen spesifikk stil'
    };
  });

  React.useEffect(() => {
    localStorage.setItem('draft_monthPlan', JSON.stringify(formData));
  }, [formData]);

  React.useEffect(() => {
    if (plan) {
      localStorage.setItem('draft_generated_plan', JSON.stringify(plan));
    } else {
      localStorage.removeItem('draft_generated_plan');
    }
  }, [plan]);

  React.useEffect(() => {
    if (planSummary) {
      localStorage.setItem('draft_plan_summary', planSummary);
    } else {
      localStorage.removeItem('draft_plan_summary');
    }
  }, [planSummary]);

  const availableChannels = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'X/Twitter'];

  const loadingSteps = [
    "Planlegg innhaldsstrategi...",
    "Fordeler postar over 4 veker...",
    "Tilpassar format til kanalar...",
    "Lagar konkrete vinklar...",
    "Ferdigstiller innhaldsplanen..."
  ];

  React.useEffect(() => {
    if (initialPlan && initialPlan.id !== loadedPlanIdRef.current) {
      setPlan(initialPlan.posts);
      setPlanSummary(initialPlan.plan_summary);
      loadedPlanIdRef.current = initialPlan.id || null;
    }
  }, [initialPlan]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = React.useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (formData.channels.length === 0) {
      setError('Velg minst éin kanal');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    const payload = {
      analysis: analysisData || formData.manualAnalysis,
      channels: formData.channels,
      postsPerWeek: formData.postsPerWeek,
      goal: formData.goal,
      tone: formData.tone || analysisData?.tone_of_voice || '',
      visualStyle: formData.visualStyle,
      brandProfile: selectedBrand,
      brandVoice
    };

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/month-plan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Klarte ikkje å lage innhaldsplanen');
      }
      
      const result = await response.json();
      setPlan(result.plan);
      setPlanSummary(result.plan_summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein ukjend feil oppstod');
    } finally {
      setLoading(false);
    }
  }, [analysisData, formData, selectedBrand, brandVoice]);

  React.useEffect(() => {
    if (autoGenerate && analysisData && !loading) {
      handleGenerate();
      if (onAutoGenerateComplete) {
        onAutoGenerateComplete();
      }
    }
  }, [autoGenerate, analysisData, loading, handleGenerate, onAutoGenerateComplete]);

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const getChannelColor = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'instagram': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'facebook': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'linkedin': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'tiktok': return 'bg-neutral-800 text-white border-neutral-900';
      case 'x/twitter': return 'bg-neutral-100 text-neutral-800 border-neutral-300';
      default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  const handleSave = async () => {
    if (!user || !plan || !planSummary || !selectedBrand) return;
    setSaving(true);
    try {
      if (initialPlan?.id) {
        await updatePlan(user.uid, selectedBrand.id!, initialPlan.id, {
          plan_summary: planSummary,
          posts: plan
        });
        if (onPlanUpdate) {
          loadedPlanIdRef.current = initialPlan.id;
          onPlanUpdate({ ...initialPlan, plan_summary: planSummary, posts: plan });
        }
      } else {
        const newId = await savePlan(user.uid, selectedBrand.id!, {
          plan_summary: planSummary,
          posts: plan
        });
        if (onPlanUpdate) {
          loadedPlanIdRef.current = newId;
          onPlanUpdate({ id: newId, plan_summary: planSummary, posts: plan });
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving plan:", err);
      setError("Klarte ikkje å lagre planen.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPlan = useMemo(() => {
    if (!plan || !Array.isArray(plan)) return null;
    let filtered = plan;
    if (filterChannel !== 'Alle') {
      filtered = filtered.filter(item => item.channel === filterChannel);
    }
    if (filterStatus !== 'Alle') {
      filtered = filtered.filter(item => (item.status || 'draft') === filterStatus);
    }
    return filtered;
  }, [plan, filterChannel, filterStatus]);

  const exportToCSV = () => {
    if (!plan || !Array.isArray(plan)) return;
    
    // Meta Business Suite / requested format
    const headers = ['Dato', 'Overskrift', 'Brødtekst', 'Emojier', 'Hashtags'];
    
    const csvContent = [
      headers.join(','),
      ...plan.map(item => {
        const date = `Dag ${item.day}`;
        const headline = item.theme;
        const body = `Vinkel: ${item.angle}\nMål: ${item.post_goal}\nFormat: ${item.format}`;
        
        const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
        
        return [
          escapeCSV(date),
          escapeCSV(headline),
          escapeCSV(body),
          escapeCSV(''), // Emojier (tom for utfylling)
          escapeCSV('')  // Hashtags (tom for utfylling)
        ].join(',');
      })
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'innhaldsplan_meta_suite.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kalender-eksport (.ics): kvart planpunkt blir ei heildags-hending, dag 1 = i dag.
  // Importer i Google Calendar / Outlook for å planleggje publiseringa.
  const exportToICS = () => {
    if (!plan || !Array.isArray(plan) || plan.length === 0) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    const toICSDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const escapeICS = (s: string) =>
      (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dtstamp = `${toICSDate(new Date())}T000000Z`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SoMe-assistenten//Innhaldsplan//NO',
      'CALSCALE:GREGORIAN'
    ];

    plan.forEach((item, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + (item.day - 1));
      const dEnd = new Date(d);
      dEnd.setDate(d.getDate() + 1);
      const summary = `${item.channel}: ${item.theme}`;
      const desc = `Mål: ${item.post_goal}\nFormat: ${item.format}\nVinkel: ${item.angle}\nCTA: ${item.cta}${item.notes ? `\nNotat: ${item.notes}` : ''}`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:some-plan-${start.getTime()}-${i}@some-assistenten`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${toICSDate(d)}`,
        `DTEND;VALUE=DATE:${toICSDate(dEnd)}`,
        `SUMMARY:${escapeICS(summary)}`,
        `DESCRIPTION:${escapeICS(desc)}`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'innhaldsplan.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!plan || !Array.isArray(plan) || !resultRef.current) return;
    setSaving(true); // Reuse saving state for loading indicator
    try {
      // Lastast on-demand for å halde dei tunge biblioteka ute av hovud-bundelen.
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      const element = resultRef.current;

      const imgData = await toPng(element, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      // We need to get the element's actual dimensions to calculate the PDF layout
      const rect = element.getBoundingClientRect();
      const canvasWidth = rect.width * 2;
      const canvasHeight = rect.height * 2;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('innholdsplan.pdf');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Klarte ikkje å eksportere til PDF.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePostFromPlan = (indexToDelete: number) => {
    setPostToDelete(indexToDelete);
  };

  const handleUpdatePostStatus = (indexToUpdate: number, newStatus: 'draft' | 'ready' | 'published') => {
    if (!plan) return;
    const updatedPlan = [...plan];
    updatedPlan[indexToUpdate] = { ...updatedPlan[indexToUpdate], status: newStatus };
    setPlan(updatedPlan);
  };

  const confirmDeletePost = () => {
    if (!plan || postToDelete === null) return;
    setPlan(plan.filter((_, index) => index !== postToDelete));
    setPostToDelete(null);
  };

  const copyPlanToClipboard = () => {
    if (!plan || !Array.isArray(plan)) return;
    const text = plan.map(item => 
      `Dag: ${item.day}\nKanal: ${item.channel}\nFormat: ${item.format}\nTema: ${item.theme}\nVinkel: ${item.angle}\nMål: ${item.post_goal}\n---`
    ).join('\n\n');
    
    navigator.clipboard.writeText(`Innhaldsplan (Generert av SoMe-assistenten)\n\n${planSummary}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <ConfirmModal
        isOpen={postToDelete !== null}
        title="Fjern innlegg"
        message="Er du sikker på at du vil fjerne dette innlegget frå planen?"
        onConfirm={confirmDeletePost}
        onCancel={() => setPostToDelete(null)}
      />
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-900">Innstillinger for innhaldsplan</h3>
          {plan && (
            <button
              type="button"
              onClick={() => {
                setPlan(null);
                setPlanSummary(null);
                loadedPlanIdRef.current = null;
                setFormData({
                  channels: ['Facebook', 'Instagram'],
                  postsPerWeek: 3,
                  goal: 'Auka engasjement og merkevarekjennskap',
                  tone: '',
                  manualAnalysis: '',
                  visualStyle: 'Ingen spesifikk stil'
                });
                if (onPlanUpdate) {
                  onPlanUpdate(null);
                }
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ny plan</span>
            </button>
          )}
        </div>
        <form onSubmit={handleGenerate} className="space-y-6">
          {!analysisData && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-start space-x-4">
                <div className="bg-amber-100 p-2 rounded-full flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Du har ikkje analysert ei nettside enno</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    For å få ein skreddarsydd innhaldsplan anbefaler vi at du først køyrer ein analyse av nettsida di i steg 1. 
                    Dersom du vil fortsette utan, kan du lime inn informasjon manuelt under.
                  </p>
                </div>
              </div>
              {onGoToAnalysis && (
                <button
                  type="button"
                  onClick={onGoToAnalysis}
                  className="whitespace-nowrap px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Gå til Analyse
                </button>
              )}
            </div>
          )}

          {!analysisData && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Manuell analyse (lim inn tekst)
                <HelpTooltip content="Lim inn informasjon om bedrifta, kva de sel, kven de sel til og korleis de vil framstå. Jo meir detaljert, jo betre blir planen." />
              </label>
              <textarea
                rows={4}
                placeholder="Lim inn informasjon om bedrifta, målgruppe, tone og stil, etc."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                value={formData.manualAnalysis}
                onChange={e => setFormData({...formData, manualAnalysis: e.target.value})}
              />
            </div>
          )}

          {analysisData && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start space-x-3">
              <CircleCheck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-emerald-900">Brukar data frå nettsideanalysen</h4>
                <p className="text-xs text-emerald-700 mt-1">Planen blir tilpassa målgruppa og stilen frå nettsideanalysen.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Kanalar
                <HelpTooltip content="Vel kva for plattformer du vil publisere på. AI-en vil tilpasse formatet (t.d. Reels for Instagram, artiklar for LinkedIn)." />
              </label>
              <div className="flex flex-wrap gap-2">
                {availableChannels.map(channel => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      formData.channels.includes(channel)
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Innlegg per veke
                <HelpTooltip content="Kor mange innlegg de har kapasitet til å lage og publisere kvar veke. Ver realistisk – kvalitet er ofte viktigare enn kvantitet." />
              </label>
              <input
                type="number"
                min="1"
                max="14"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.postsPerWeek}
                onChange={e => setFormData({...formData, postsPerWeek: parseInt(e.target.value) || 1})}
              />
              <p className="text-xs text-neutral-500">Kor ofte de vil publisere (1-14 gongar i veka).</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Hovudmål for perioden
                <HelpTooltip content="Kva vil du oppnå? T.d. 'Auke sal av produkt X', 'Få fleire påmeldte til nyheitsbrev' eller 'Bygge merkevarekjennskap'. AI-en vil lage innlegg som støttar dette målet." />
              </label>
              <input
                type="text"
                placeholder="T.d. Auka sal av produkt X, bygge nyheitsbrev-liste"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.goal}
                onChange={e => setFormData({...formData, goal: e.target.value})}
              />
              <p className="text-xs text-neutral-500">Kva er det viktigaste de vil oppnå med sosiale medium denne månaden?</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Ønskt tone og stil (valfritt)
                <HelpTooltip content="Viss du vil ha ein annan stil enn den frå analysen. Bruk adjektiv som 'Uformell og morosam', 'Fagleg og autoritær' eller 'Inspirerande og varm'." />
              </label>
              <input
                type="text"
                placeholder={analysisData ? `Standard: ${analysisData.tone_of_voice}` : "T.d. Uformell, profesjonell, leiken"}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.tone}
                onChange={e => setFormData({...formData, tone: e.target.value})}
              />
              <p className="text-xs text-neutral-500">Overstyrer tone og stil frå analysen for akkurat denne innhaldsplanen.</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-700 flex items-center">
                Visuell stil for bildeidéar
                <HelpTooltip content="Kva slags visuelt uttrykk ønskjer du på bilda i planen? Dette hjelper AI-en med å generere meir presise bildeidéar." />
              </label>
              <select
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                value={formData.visualStyle}
                onChange={e => setFormData({...formData, visualStyle: e.target.value})}
              >
                <option value="Ingen spesifikk stil">Ingen spesifikk stil (AI-en velger)</option>
                <option value="Minimalistisk">Minimalistisk</option>
                <option value="Retro/Vintage">Retro/Vintage</option>
                <option value="Moderne grafisk">Moderne grafisk</option>
                <option value="Fotorealistisk">Fotorealistisk</option>
                <option value="Illustrasjon">Illustrasjon</option>
                <option value="Pop-art">Pop-art</option>
                <option value="Bedriftsk/Corporate">Bedriftsk/Corporate</option>
                <option value="Leken og fargerik">Leken og fargerik</option>
              </select>
              <p className="text-xs text-neutral-500">Styrer utsjånaden på bildeidéane som blir foreslått.</p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading || formData.channels.length === 0}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Genererer plan...</span>
                </>
              ) : (
                <>
                  {plan ? <RefreshCw className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                  <span>{plan ? 'Lag ny plan' : 'Lag innhaldsplan'}</span>
                </>
              )}
            </button>
            
            {plan && (
              <>
                {user && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || saveSuccess}
                    className={`px-4 py-2.5 border font-medium rounded-xl transition-all flex items-center space-x-2 text-sm shadow-sm ${
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
                    <span>{saveSuccess ? 'Lagra!' : 'Lagre plan'}</span>
                  </button>
                )}
                <div className="flex-1"></div>
                <button
                  type="button"
                  onClick={copyPlanToClipboard}
                  className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center space-x-2 shadow-sm"
                >
                  {copied ? <CircleCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Kopiert!' : 'Kopier'}</span>
                </button>
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center space-x-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={exportToPDF}
                  disabled={saving}
                  className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center space-x-2 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={exportToICS}
                  className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center space-x-2 shadow-sm"
                  title="Last ned som kalenderfil (.ics) – dag 1 = i dag"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Kalender</span>
                </button>
              </>
            )}
          </div>
          
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
          className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col mt-8"
        >
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 border-b border-neutral-200">
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
              <p className="text-sm text-neutral-500">Dette kan ta litt tid, spesielt for mange innlegg...</p>
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

          <div className="opacity-50 pointer-events-none">
            <div className="p-5 border-b border-neutral-200 bg-indigo-50/30">
              <div className="h-4 w-40 bg-indigo-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-full bg-indigo-100 rounded animate-pulse"></div>
              <div className="h-4 w-2/3 bg-indigo-100 rounded animate-pulse mt-1"></div>
            </div>
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center gap-4">
              <div className="h-8 w-24 bg-neutral-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-24 bg-neutral-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-24 bg-neutral-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="divide-y divide-neutral-100">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 flex-shrink-0">
                    <div className="h-6 w-24 bg-neutral-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse"></div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="h-5 w-3/4 bg-neutral-200 rounded animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-neutral-100 rounded animate-pulse"></div>
                      <div className="h-4 w-5/6 bg-neutral-100 rounded animate-pulse"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-20 bg-neutral-200 rounded-full animate-pulse"></div>
                      <div className="h-6 w-24 bg-neutral-200 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {!plan && !loading && (
        <motion.div 
          key="empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 border-dashed rounded-2xl text-center"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ingen innhaldsplan enno</h3>
          <p className="text-neutral-500 max-w-md mx-auto text-sm">
            Fyll inn kva kanalar du vil bruke og kor ofte du vil publisere, så lagar AI-en ein komplett plan for heile månaden.
          </p>
        </motion.div>
      )}

      {plan && filteredPlan && !loading && (
        <motion.div 
          key="plan"
          ref={resultRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col mt-8"
        >
          {planSummary && (
            <div className="p-5 border-b border-neutral-200 bg-indigo-50/30">
              <h3 className="text-sm font-semibold text-indigo-900 mb-1">Strategisk oppsummering</h3>
              <p className="text-sm text-indigo-800 leading-relaxed">{planSummary}</p>
            </div>
          )}
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex bg-white border border-neutral-200 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-600 hover:bg-neutral-50'}`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Kalender</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-600 hover:bg-neutral-50'}`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Liste</span>
                </button>
              </div>
              
              <div className="h-6 w-px bg-neutral-200 hidden sm:block"></div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700">Filtrer:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterChannel('Alle')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterChannel === 'Alle'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Alle
                </button>
                {Array.isArray(plan) && Array.from(new Set(plan.map(p => p.channel))).map(channel => (
                  <button
                    key={channel}
                    onClick={() => setFilterChannel(channel)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterChannel === channel
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
              
              <div className="h-6 w-px bg-neutral-200 hidden sm:block"></div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700">Status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus('Alle')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === 'Alle'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilterStatus('draft')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === 'draft'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Kladd
                </button>
                <button
                  onClick={() => setFilterStatus('ready')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === 'ready'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Klar
                </button>
                <button
                  onClick={() => setFilterStatus('published')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === 'published'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Publisert
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-neutral-50/30">
            {viewMode === 'calendar' ? (
              <CalendarView 
                plan={filteredPlan} 
                onUpdatePlan={(newPlan) => {
                  // If filtered, we need to merge the updated filtered plan back into the main plan
                  if (filterChannel !== 'Alle') {
                    const updatedFullPlan = plan.map(p => {
                      const updatedItem = newPlan.find(np => np.theme === p.theme && np.post_goal === p.post_goal);
                      return updatedItem || p;
                    });
                    setPlan(updatedFullPlan);
                    if (initialPlan && onPlanUpdate) {
                      onPlanUpdate({ ...initialPlan, posts: updatedFullPlan });
                    }
                  } else {
                    setPlan(newPlan);
                    if (initialPlan && onPlanUpdate) {
                      onPlanUpdate({ ...initialPlan, posts: newPlan });
                    }
                  }
                }} 
                onSelectPost={onSelectPost} 
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.isArray(filteredPlan) && filteredPlan.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                  >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md font-semibold tracking-wide uppercase">
                        Dag {item.day}
                      </span>
                      <span className={`px-2.5 py-1 text-xs rounded-md font-medium border ${getChannelColor(item.channel)}`}>
                        {item.channel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={item.status || 'draft'}
                        onChange={(e) => handleUpdatePostStatus(plan.indexOf(item), e.target.value as any)}
                        className={`text-xs font-medium rounded-md px-2 py-1 border-none focus:ring-0 cursor-pointer ${
                          (item.status || 'draft') === 'published' ? 'bg-green-100 text-green-700' :
                          (item.status || 'draft') === 'ready' ? 'bg-blue-100 text-blue-700' :
                          'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        <option value="draft">Kladd</option>
                        <option value="ready">Klar</option>
                        <option value="published">Publisert</option>
                      </select>
                      <span className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 text-neutral-600 text-xs rounded-md">
                        {item.format}
                      </span>
                      <button
                        onClick={() => handleDeletePostFromPlan(plan.indexOf(item))}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                        title="Fjern frå plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-5 flex-grow">
                    <h4 className="text-lg font-bold text-neutral-900 leading-tight mb-4">{item.theme}</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 text-sm">
                        <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 mt-0.5 flex-shrink-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Mål</span>
                          <span className="text-neutral-700">{item.post_goal}</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 text-sm">
                        <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600 mt-0.5 flex-shrink-0">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Vinkel</span>
                          <span className="text-neutral-700">{item.angle}</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 text-sm">
                        <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 mt-0.5 flex-shrink-0">
                          <MousePointerClick className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Call to action</span>
                          <span className="text-neutral-700">{item.cta}</span>
                        </div>
                      </div>
                    </div>
                    
                    {item.notes && (
                      <div className="mt-5 p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs text-amber-800 italic">
                        <span className="font-semibold not-italic block mb-1">Notat:</span>
                        {item.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-neutral-100 mt-auto">
                    <button
                      onClick={() => onSelectPost(item)}
                      className="w-full py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Skriv dette innlegget</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
