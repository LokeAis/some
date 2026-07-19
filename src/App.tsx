import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { LayoutDashboard, CalendarDays, PenTool, Sparkles, ChevronRight, LogIn, LogOut, User, Trash2, Share2, CircleCheck, FolderOpen, Menu, X, Target, Building2, TrendingUp, FileText, Activity, Loader2, AlertCircle, Recycle, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandSelector } from './components/BrandSelector';
import { ConfirmModal } from './components/ConfirmModal';
import { AccountMenu } from './components/AccountMenu';
import { ApiKeyModal } from './components/ApiKeyModal';
import { useBrandVoice } from './features/brandVoice/hooks/useBrandVoice';

// Tunge fane-komponentar vert lasta on-demand (kvar fane = eigen chunk) for raskare førstelast.
const SiteAnalysis = lazy(() => import('./components/SiteAnalysis').then(m => ({ default: m.SiteAnalysis })));
const MonthPlan = lazy(() => import('./components/MonthPlan').then(m => ({ default: m.MonthPlan })));
const SinglePost = lazy(() => import('./components/SinglePost').then(m => ({ default: m.SinglePost })));
const MyProjects = lazy(() => import('./components/MyProjects').then(m => ({ default: m.MyProjects })));
const CompetitorAnalysis = lazy(() => import('./components/CompetitorAnalysis').then(m => ({ default: m.CompetitorAnalysis })));
const BrandVoiceForm = lazy(() => import('./features/brandVoice/components/BrandVoiceForm').then(m => ({ default: m.BrandVoiceForm })));
const ArticleWizard = lazy(() => import('./features/articles/components/ArticleWizard').then(m => ({ default: m.ArticleWizard })));
const QualityPanel = lazy(() => import('./features/quality/components/QualityPanel').then(m => ({ default: m.QualityPanel })));
const TrendAnalyzer = lazy(() => import('./components/TrendAnalyzer').then(m => ({ default: m.TrendAnalyzer })));
const Repurpose = lazy(() => import('./components/Repurpose').then(m => ({ default: m.Repurpose })));
const ImageToPost = lazy(() => import('./components/ImageToPost').then(m => ({ default: m.ImageToPost })));
import { SiteAnalysisData, MonthPlanItem, MonthPlanData, SinglePostData } from './types';
import { useAuth } from './contexts/AuthContext';
import { BrandData, AnalysisData, PlanData, PostData, updateBrand, getUserAnalyses } from './lib/db';
import { ArticleData } from './features/articles/types';

export default function App() {
  const { user, signIn, logOut, isAdmin, deleteAccount } = useAuth();
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      // Auth-lyttaren set user=null; rydd app-state så neste innlogging startar blankt.
      setShowDeleteAccountConfirm(false);
      handleBrandSelect(null);
    } catch (e) {
      console.error('Konto-sletting feila:', e);
      alert(e instanceof Error ? `Klarte ikkje å slette kontoen: ${e.message}` : 'Klarte ikkje å slette kontoen. Prøv igjen.');
    } finally {
      setDeletingAccount(false);
    }
  };
  const [copiedShare, setCopiedShare] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Valider nøkkelen (debounced) så brukaren får svar i det han limer inn –
  // ikkje først når første generering feilar.
  useEffect(() => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setKeyStatus('idle');
      setKeyError(null);
      return;
    }
    setKeyStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-key', {
          method: 'POST',
          headers: { 'x-api-key': trimmed }
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.valid) {
          setKeyStatus('valid');
          setKeyError(null);
        } else {
          setKeyStatus('invalid');
          setKeyError(data?.error || 'Nøkkelen ser ikkje ut til å vere gyldig.');
        }
      } catch {
        setKeyStatus('invalid');
        setKeyError('Fekk ikkje kontakt med serveren for å sjekke nøkkelen.');
      }
    }, 800);
    return () => clearTimeout(t);
  }, [apiKey]);

  // Initialize state from localStorage if available
  const [activeTab, setActiveTab] = useState<'analysis' | 'competitor' | 'plan' | 'post' | 'article' | 'projects' | 'voice' | 'trends' | 'repurpose' | 'image' | 'quality'>(() => {
    const saved = localStorage.getItem('some_activeTab');
    return (saved as any) || 'analysis';
  });
  
  const [analysisData, setAnalysisData] = useState<SiteAnalysisData | null>(() => {
    const saved = localStorage.getItem('some_analysisData');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse analysisData from localStorage", e);
      return null;
    }
  });
  // Sann rett etter at analysisData vart henta automatisk frå Firestore (ikkje ved fersk
  // generering) – styrer ei dismissible informasjonslinje i SiteAnalysis.
  const [justAutoLoadedAnalysis, setJustAutoLoadedAnalysis] = useState(false);
  // Hugsar kva brandId det alt er forsøkt auto-lasting for, så vi ikkje lastar på nytt
  // kvar gong analysisData vert null (t.d. viss brukaren sjølv tømmer han).
  const autoLoadedBrandIdRef = useRef<string | null>(null);

  const [selectedPlanItem, setSelectedPlanItem] = useState<MonthPlanItem | null>(() => {
    const saved = localStorage.getItem('some_selectedPlanItem');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedPlanItem from localStorage", e);
      return null;
    }
  });

  const [selectedPlan, setSelectedPlan] = useState<MonthPlanData | null>(() => {
    const saved = localStorage.getItem('some_selectedPlan');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedPlan from localStorage", e);
      return null;
    }
  });

  const [autoGeneratePlan, setAutoGeneratePlan] = useState(false);

  const [selectedPost, setSelectedPost] = useState<SinglePostData | null>(() => {
    const saved = localStorage.getItem('some_selectedPost');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedPost from localStorage", e);
      return null;
    }
  });

  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(() => {
    const saved = localStorage.getItem('some_selectedArticle');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedArticle from localStorage", e);
      return null;
    }
  });

  const [selectedBrand, setSelectedBrand] = useState<BrandData | null>(() => {
    const saved = localStorage.getItem('some_selectedBrand');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedBrand from localStorage", e);
      return null;
    }
  });

  const { profile: voiceProfile, saveProfile: saveVoiceProfile, loading: voiceProfileLoading } = useBrandVoice(selectedBrand?.id);

  const handleBrandSelect = (brand: BrandData | null) => {
    if (selectedBrand?.id !== brand?.id) {
      setSelectedBrand(brand);
      setAnalysisData(null);
      setJustAutoLoadedAnalysis(false);
      setSelectedPlanItem(null);
      setSelectedPlan(null);
      setSelectedPost(null);
      setSelectedArticle(null);

      setActiveTab('analysis');
      localStorage.removeItem('some_analysisData');
      localStorage.removeItem('some_selectedPlanItem');
      localStorage.removeItem('some_selectedPlan');
      localStorage.removeItem('some_selectedPost');
      localStorage.removeItem('some_selectedArticle');

      
      // Clear all draft data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('draft_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  };

  // Auto-last siste lagra analyse (med konkurrentanalysen nesta i) når ei merkevare er
  // vald og det ikkje alt finst noko å vise (t.d. eit ulagra utkast). Sparer brukaren for
  // å måtte gå via «Mine prosjekt» kvar gong dei kjem tilbake til ei merkevare.
  useEffect(() => {
    if (!user || !selectedBrand || analysisData) return;
    if (autoLoadedBrandIdRef.current === selectedBrand.id) return;
    autoLoadedBrandIdRef.current = selectedBrand.id ?? null;

    (async () => {
      try {
        const analyses = await getUserAnalyses(user.uid, selectedBrand.id!);
        if (analyses && analyses.length > 0) {
          setAnalysisData(analyses[0] as SiteAnalysisData);
          setJustAutoLoadedAnalysis(true);
        }
      } catch (e) {
        console.error('Klarte ikkje å auto-laste siste analyse:', e);
      }
    })();
  }, [user, selectedBrand, analysisData]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('some_activeTab', activeTab);
  }, [activeTab]);

  // Kvalitet-fana er berre for admin – flytt andre bort (t.d. om fana låg lagra frå før).
  useEffect(() => {
    if (!isAdmin && activeTab === 'quality') {
      setActiveTab('analysis');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (analysisData) {
      localStorage.setItem('some_analysisData', JSON.stringify(analysisData));
    } else {
      localStorage.removeItem('some_analysisData');
    }
  }, [analysisData]);

  useEffect(() => {
    if (selectedPlanItem) {
      localStorage.setItem('some_selectedPlanItem', JSON.stringify(selectedPlanItem));
    } else {
      localStorage.removeItem('some_selectedPlanItem');
    }
  }, [selectedPlanItem]);

  useEffect(() => {
    if (selectedPlan) {
      localStorage.setItem('some_selectedPlan', JSON.stringify(selectedPlan));
    } else {
      localStorage.removeItem('some_selectedPlan');
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (selectedPost) {
      localStorage.setItem('some_selectedPost', JSON.stringify(selectedPost));
    } else {
      localStorage.removeItem('some_selectedPost');
    }
  }, [selectedPost]);

  useEffect(() => {
    if (selectedArticle) {
      localStorage.setItem('some_selectedArticle', JSON.stringify(selectedArticle));
    } else {
      localStorage.removeItem('some_selectedArticle');
    }
  }, [selectedArticle]);

  useEffect(() => {
    if (selectedBrand) {
      localStorage.setItem('some_selectedBrand', JSON.stringify(selectedBrand));
    } else {
      localStorage.removeItem('some_selectedBrand');
    }
  }, [selectedBrand]);

  const handleUseAnalysisForPlan = () => {
    setActiveTab('plan');
  };

  const handleUsePlanItemForPost = (item: MonthPlanItem) => {
    setSelectedPlanItem(item);
    setSelectedPost(null); // Clear any previously loaded post
    setActiveTab('post');
  };

  const clearSessionData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearSessionData = () => {
    setAnalysisData(null);
    setSelectedPlanItem(null);
    setSelectedPlan(null);
    setSelectedPost(null);
    setSelectedArticle(null);
    setActiveTab('analysis');
    setIsMobileMenuOpen(false);
    localStorage.removeItem('some_analysisData');
    localStorage.removeItem('some_selectedPlanItem');
    localStorage.removeItem('some_selectedPlan');
    localStorage.removeItem('some_selectedPost');
    localStorage.removeItem('some_selectedArticle');
    localStorage.removeItem('some_activeTab');
    
    // Clear all draft data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setShowClearConfirm(false);
  };

  const loadDemoData = () => {
    setAnalysisData({
      company_summary: "FjordKaffe er eit lokalt kaffebrenneri på Vestlandet som brenn spesialkaffe med fokus på berekraft og sporbarheit. Dei tilbyr kaffeabonnement, utstyr og kurs.",
      target_audience: ["Kaffeentusiastar", "Kvalitetsbevisste forbrukarar", "Bedrifter som vil ha god kaffe på kontoret", "Alder 25-55 år"],
      products_services: ["Kaffeabonnement", "Spesialkaffe i lausvekt", "Kaffeutstyr", "Baristakurs for nybyrjarar"],
      tone_of_voice: "Lidenskapeleg, uformell, vestlandsk, jordnær og kunnskapsrik.",
      usp: ["Brent lokalt ved fjorden", "100% sporbare kaffebønner", "Direkte handel med bønder", "Klimanøytral frakt"],
      content_pillars: ["Kaffekunnskap og bryggetips", "Bak kulissane i brenneriet", "Bøndene vi handlar med", "Kundeopplevingar og oppskrifter"],
      cta_suggestions: ["Prøv eit kaffeabonnement", "Sjå utvalet i nettbutikken", "Meld deg på baristakurs", "Les meir om bonden"],
      brand_risks_or_gaps: ["Prisar på abonnement er ikkje tydeleg kommunisert på framsida."],
      golden_nuggets: ["Vi brenner kaffien med utsikt over fjorden", "Kvar bønne kan sporast tilbake til bonden"],
      confidence_notes: "Veldig tydeleg profil, lett å lage innhald for.",
      competitor_analysis: {
        own_summary: "FjordKaffe brenner spesialkaffe med fokus på berekraft og sporbarheit. Dei tilbyr kaffeabonnement og utstyr.",
        competitors: [
          {
            name_or_url: "Kaffebrenneriet.no",
            summary: "Stor kjede som tilbyr eit breitt utval av kaffe, te og bakevarer, med fokus på tilgjengelegheit og kvardagsluksus.",
            positioning: "Den tilgjengelege kvardagskaffien for folk flest.",
            main_topics: ["Nye kaffebønner", "Sesongens drikkar", "Bakevarer", "Gåvetips"]
          }
        ],
        similarities: [
          "Alle snakkar om kvalitet og berekraft."
        ],
        differences: [
          "FjordKaffe har mykje sterkare fokus på sporbarheit heilt ned til bonden."
        ],
        content_gaps: [
          {
            theme: "Bonden si historie og direkte handel",
            description: "Gå i djupna på kven som dyrkar kaffien, korleis dei jobbar, og kva direkte handel betyr for lokalsamfunnet deira.",
            why_it_matters: "Konkurrentane snakkar overordna om berekraft. Ved å vise ansikta til bøndene bygger de mykje sterkare tillit og emosjonell tilknyting.",
            suggested_formats: ["Karusell på Instagram med bilete frå farmen", "Djuptgåande artikkel på nettsida", "Kort video (Reel) som forklarar direkte handel"],
            content_ideas: []
          }
        ]
      }
    });
    setActiveTab('analysis');
    setIsMobileMenuOpen(false);
  };

  const handleLoadAnalysis = (analysis: AnalysisData) => {
    setAnalysisData(analysis as SiteAnalysisData);
    setActiveTab('plan');
  };

  const handleLoadPlan = (plan: PlanData) => {
    setSelectedPlan(plan as MonthPlanData);
    setActiveTab('plan');
  };

  const handleLoadPost = (post: PostData) => {
    setSelectedPost(post as SinglePostData);
    setSelectedPlanItem(null); // Clear plan item to avoid conflicts
    setActiveTab('post');
  };

  const handleLoadArticle = (article: ArticleData) => {
    setSelectedArticle(article);
    setActiveTab('article');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans text-neutral-900">
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Start på nytt"
        message="Er du sikker på at du vil slette all midlertidig data og starte på nytt?"
        onConfirm={confirmClearSessionData}
        onCancel={() => setShowClearConfirm(false)}
      />
      <ConfirmModal
        isOpen={showDeleteAccountConfirm}
        title="Slett kontoen din permanent"
        message={deletingAccount
          ? 'Slettar kontoen og alt innhald... Ikkje lukk vindauget.'
          : 'Dette slettar kontoen din og ALT innhald permanent: merkevarer, analysar, planar, innlegg, artiklar og stemmeprofiler. Handlinga kan ikkje angrast. Er du heilt sikker?'}
        confirmText={deletingAccount ? 'Slettar...' : 'Ja, slett alt'}
        onConfirm={deletingAccount ? () => {} : confirmDeleteAccount}
        onCancel={() => { if (!deletingAccount) setShowDeleteAccountConfirm(false); }}
      />
      {showApiKeyModal && (
        <ApiKeyModal
          apiKey={apiKey}
          setApiKey={setApiKey}
          keyStatus={keyStatus}
          keyError={keyError}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2 text-indigo-600">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold tracking-tight">SoMe-assistenten</span>
        </div>
        <div className="flex items-center gap-2">
          <BrandSelector selectedBrand={selectedBrand} onSelectBrand={handleBrandSelect} />
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Opne meny"
            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-neutral-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 mb-1">
              <Sparkles className="w-6 h-6" />
              <h1 className="text-xl font-bold tracking-tight">SoMe-assistenten</h1>
            </div>
            <p className="text-xs text-neutral-500 mb-4">Din smarte hjelpar for sosiale medium</p>
            <BrandSelector selectedBrand={selectedBrand} onSelectBrand={handleBrandSelect} />
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Lukk meny"
            className="md:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="px-4 space-y-1 flex-1 mt-2 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Hovudflyt</p>
          {([
            { id: 'analysis', label: '1. Analyse av nettside', Icon: LayoutDashboard },
            { id: 'plan', label: '2. Innhaldsplan', Icon: CalendarDays },
            { id: 'post', label: '3. Skriv eit innlegg', Icon: PenTool },
            { id: 'article', label: '4. Skriv ein artikkel', Icon: FileText },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeTab === id ? 'text-indigo-100' : 'text-neutral-400'}`} />
              <span>{label}</span>
            </button>
          ))}

          <p className="px-3 pt-5 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Verktøy</p>
          {([
            { id: 'competitor', label: 'Konkurrentanalyse', Icon: Target },
            { id: 'trends', label: 'Kva skjer i bransjen?', Icon: TrendingUp },
            { id: 'repurpose', label: 'Gjenbruk innhald', Icon: Recycle },
            { id: 'image', label: 'Bilde til innlegg', Icon: ImagePlus },
            { id: 'voice', label: 'Brand Voice DNA', Icon: Sparkles },
            { id: 'projects', label: 'Mine prosjekt', Icon: FolderOpen },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === id ? 'text-indigo-100' : 'text-neutral-400'}`} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto border-t border-neutral-100">
          <AccountMenu
            user={user}
            isAdmin={isAdmin}
            keyStatus={keyStatus}
            hasApiKey={!!apiKey}
            showReset={!!(analysisData || selectedPlanItem)}
            copiedShare={copiedShare}
            onSignIn={signIn}
            onLogout={logOut}
            onOpenApiKey={() => setShowApiKeyModal(true)}
            onDemo={loadDemoData}
            onShare={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedShare(true);
              setTimeout(() => setCopiedShare(false), 2000);
            }}
            onReset={clearSessionData}
            onQuality={() => { setActiveTab('quality'); setIsMobileMenuOpen(false); }}
            onDeleteAccount={() => setShowDeleteAccountConfirm(true)}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-neutral-200 px-6 md:px-10 py-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {activeTab === 'analysis' && 'Analyse av nettside'}
                {activeTab === 'competitor' && 'Konkurrentanalyse'}
                {activeTab === 'plan' && 'Innhaldsplan'}
                {activeTab === 'post' && 'Skriv eit innlegg'}
                {activeTab === 'article' && 'Skriv ein artikkel'}
                {activeTab === 'trends' && 'Kva skjer i bransjen?'}
                {activeTab === 'repurpose' && 'Gjenbruk innhald'}
                {activeTab === 'image' && 'Bilde til innlegg'}
                {activeTab === 'voice' && 'Brand Voice DNA'}
                {activeTab === 'quality' && 'Kvalitet & Overvåking'}
              </h1>
              <p className="text-neutral-500 text-sm mt-1">
                {activeTab === 'analysis' && 'Finn ut kven målgruppa er, korleis de bør snakke til dei, og kva som er det viktigaste de tilbyr.'}
                {activeTab === 'competitor' && 'Samanlikn di bedrift med konkurrentar for å finne "content gaps" og unike posisjonar.'}
                {activeTab === 'plan' && 'Lag ein smart og strategisk plan for kva de skal publisere dei neste 30 dagane.'}
                {activeTab === 'post' && 'Skriv engasjerande innlegg som er klare til å publiserast.'}
                {activeTab === 'article' && 'Lag strukturerte artiklar med disposisjon først.'}
                {activeTab === 'trends' && 'Søk etter dagsaktuelle trendar og lag innlegg basert på dei.'}
                {activeTab === 'repurpose' && 'Gjer om ein artikkel eller eit innlegg til ferdige utkast for ein annan kanal.'}
                {activeTab === 'image' && 'Last opp eit bilde og få ferdige innlegg med emojis og hashtags.'}
                {activeTab === 'voice' && 'Analyser skrivestilen din for å la AI-en skrive nøyaktig som deg.'}
                {activeTab === 'quality' && 'Mål AI-prestasjon, spor feil og evaluer utkast.'}
              </p>
            </div>

            {/* Stepper */}
            {(() => {
              const steps = [
                { id: 'analysis', label: 'Analyse', done: !!analysisData },
                { id: 'plan', label: 'Plan', done: !!selectedPlan },
                { id: 'post', label: 'Innlegg', done: !!selectedPost },
                { id: 'article', label: 'Artikkel', done: !!selectedArticle },
              ] as const;
              const activeIdx = steps.findIndex(s => s.id === activeTab);
              return (
                <div className="hidden md:flex flex-col items-start lg:items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {steps.map((s, i) => {
                      const isActive = activeTab === s.id;
                      return (
                        <div key={s.id} className="flex items-center gap-1.5">
                          {i > 0 && <div className="w-5 h-px bg-neutral-200" />}
                          <button
                            onClick={() => setActiveTab(s.id)}
                            className={`flex items-center gap-1.5 rounded-full text-sm font-medium transition-all ${
                              isActive ? 'bg-indigo-600 text-white px-3 py-1.5 shadow-sm'
                              : s.done ? 'text-emerald-600 px-1.5 py-1 hover:bg-emerald-50'
                              : 'text-neutral-400 px-1.5 py-1 hover:bg-neutral-100'
                            }`}
                          >
                            {s.done && !isActive
                              ? <CircleCheck className="w-4 h-4" />
                              : <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-white/20' : 'bg-neutral-100'}`}>{i + 1}</span>}
                            <span>{s.label}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {activeIdx >= 0 && (
                    <p className="text-xs text-neutral-400">Steg {activeIdx + 1} av {steps.length}</p>
                  )}
                </div>
              );
            })()}
          </div>
        </header>

        <div className="p-6 md:p-10 flex-1">
          <div className="max-w-7xl mx-auto">
          <Suspense fallback={<div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
          {/* Velkomst-banneret kan visast samstundes med analyse-fana, så det har eigen AnimatePresence (ikkje mode="wait"). */}
          <AnimatePresence>
          {(!selectedBrand || (activeTab === 'analysis' && !analysisData)) && (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-medium mb-6 backdrop-blur-sm border border-white/10">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Din smarte AI-assistent for sosiale medium</span>
                </div>
                
                <h2 className="text-3xl font-bold mb-3">Velkomen til SoMe-assistenten 👋</h2>
                <p className="text-indigo-100 text-lg mb-8">
                  Få ein skreddarsydd innhaldsplan og ferdige innlegg for sosiale medium på under to minutt. 
                  Vår AI-drivne SoMe-assistent analyserer nettsida di, finn målgruppa di, og fungerer som din personlege tekstforfattar.
                </p>
                
                {!user ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Slik kjem du i gang:</span>
                    </h3>
                    <ol className="space-y-4 text-indigo-50">
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">1</div>
                        <div>
                          <strong className="text-white block">Logg inn</strong>
                          <span>Bruk knappen i menyen til venstre for å logge inn med Google-kontoen din.</span>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">2</div>
                        <div>
                          <strong className="text-white block">Hent API-nøkkel</strong>
                          <span>Du treng ein gratis API-nøkkel frå Google for å bruke AI-en. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline underline-offset-2">Hent nøkkelen din her</a>.</span>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">3</div>
                        <div>
                          <strong className="text-white block">Legg inn nøkkelen</strong>
                          <span>Etter innlogging dukkar det opp eit felt for API-nøkkel i menyen til venstre. Lim inn nøkkelen der, og du er klar!</span>
                        </div>
                      </li>
                    </ol>
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <button 
                        onClick={signIn}
                        className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
                      >
                        <LogIn className="w-5 h-5" />
                        <span>Logg inn for å starte</span>
                      </button>
                    </div>
                  </div>
                ) : !apiKey ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-2 flex items-center space-x-2">
                      <span className="text-amber-300">🔑</span>
                      <span>Nesten klar! Manglar API-nøkkel</span>
                    </h3>
                    <p className="text-indigo-100 mb-4">
                      For å generere innhald treng du ein gratis API-nøkkel frå Google. 
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1">Hent nøkkelen din her</a>, 
                      og lim den inn i feltet i menyen til venstre.
                    </p>
                  </div>
                ) : !selectedBrand ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-2 flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-amber-300" />
                      <span>Opprett ein kunde for å starte</span>
                    </h3>
                    <p className="text-indigo-100 mb-4">
                      For å halde orden på analysar og innhald, må du først opprette ein kundeprofil (Brand Profile).
                      Bruk menyen øvst til venstre for å velje eller leggje til ein ny kunde.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <button 
                      onClick={() => {
                        const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                        if (input) input.focus();
                      }}
                      className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
                    >
                      <span>Start din eigen analyse</span>
                    </button>
                    <button 
                      onClick={loadDemoData}
                      className="px-6 py-3 bg-indigo-500/30 border border-indigo-400/30 text-white font-medium rounded-xl hover:bg-indigo-500/50 transition-colors flex items-center justify-center space-x-2 backdrop-blur-sm"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Prøv med eit eksempel</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm font-medium opacity-80">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</div>
                    <span>Analyser nettside</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</div>
                    <span>Få innhaldsplan</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</div>
                    <span>Generer innlegg</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          {/* Fane-innhaldet: berre éi fane er aktiv om gangen, så mode="wait" gir rein overgang. */}
          <AnimatePresence mode="wait">
            {activeTab === 'analysis' && selectedBrand && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SiteAnalysis
                  data={analysisData}
                  onDataUpdate={setAnalysisData}
                  onGoToPlan={handleUseAnalysisForPlan}
                  onAutoGeneratePlan={() => {
                    setAutoGeneratePlan(true);
                    setActiveTab('plan');
                  }}
                  selectedBrand={selectedBrand}
                  autoLoadedNotice={justAutoLoadedAnalysis}
                  onDismissAutoLoadedNotice={() => setJustAutoLoadedAnalysis(false)}
                  onUseNuggetForPost={(nugget) => {
                    // Syntetisk planpunkt → gjenbrukar SinglePost sin prefill + autogenerering.
                    setSelectedPost(null);
                    setSelectedPlanItem({
                      day: 1,
                      channel: 'Facebook',
                      theme: nugget.length > 80 ? `${nugget.slice(0, 77)}...` : nugget,
                      post_goal: 'Skape engasjement',
                      format: 'Tekst',
                      angle: `Bygg innlegget rundt denne hooken: «${nugget}»`,
                      cta: '',
                      notes: ''
                    });
                    setActiveTab('post');
                  }}
                  onUseNuggetForArticle={(nugget) => {
                    setSelectedArticle({
                      uid: user?.uid || '',
                      brandId: selectedBrand?.id || '',
                      topic: nugget,
                      outline: '',
                      content: '',
                      status: 'draft',
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    });
                    setActiveTab('article');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'competitor' && selectedBrand && (
              <motion.div
                key="competitor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CompetitorAnalysis 
                  analysisData={analysisData}
                  onDataUpdate={setAnalysisData}
                  onGoToPlan={() => setActiveTab('plan')}
                  selectedBrand={selectedBrand}
                />
              </motion.div>
            )}
            {activeTab === 'plan' && selectedBrand && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MonthPlan 
                  analysisData={analysisData} 
                  initialPlan={selectedPlan}
                  onSelectPost={handleUsePlanItemForPost} 
                  onGoToAnalysis={() => setActiveTab('analysis')}
                  selectedBrand={selectedBrand}
                  onPlanUpdate={setSelectedPlan}
                  brandVoice={voiceProfile}
                  autoGenerate={autoGeneratePlan}
                  onAutoGenerateComplete={() => setAutoGeneratePlan(false)}
                />
              </motion.div>
            )}
            {activeTab === 'post' && selectedBrand && (
              <motion.div
                key="post"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SinglePost 
                  analysisData={analysisData} 
                  initialPlanItem={selectedPlanItem} 
                  initialPost={selectedPost}
                  onGoToAnalysis={() => setActiveTab('analysis')}
                  onGoToPlan={() => setActiveTab('plan')}
                  selectedBrand={selectedBrand}
                  onPostUpdate={setSelectedPost}
                  brandVoice={voiceProfile}
                />
              </motion.div>
            )}
            {activeTab === 'article' && selectedBrand && user && (
              <motion.div
                key="article"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ArticleWizard
                  apiKey={apiKey}
                  selectedBrand={selectedBrand}
                  voiceProfile={voiceProfile ?? undefined}
                  user={user}
                  initialArticle={selectedArticle}
                  onEditFurther={(draft, channel) => {
                    const newPost: SinglePostData = {
                      hook: draft.angle,
                      main_caption: draft.text,
                      hashtag_suggestions: draft.hashtags || [],
                      image_prompt: '',
                      channel,
                      content_type: 'post'
                    };
                    setSelectedPost(newPost);
                    setActiveTab('post');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'voice' && selectedBrand && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                {voiceProfileLoading ? (
                  <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                ) : (
                  <BrandVoiceForm
                    brandId={selectedBrand.id!}
                    initialProfile={voiceProfile}
                    apiKey={apiKey}
                    onSave={async (profile) => {
                      const success = await saveVoiceProfile(profile);
                      if (success) {
                        // Optionally update local state if needed
                      }
                      return success;
                    }}
                  />
                )}
              </motion.div>
            )}
            {activeTab === 'trends' && selectedBrand && (
              <motion.div
                key="trends"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                <TrendAnalyzer 
                  apiKey={apiKey} 
                  selectedBrand={selectedBrand}
                  brandVoiceDNA={voiceProfile}
                  onPostGenerated={(post, imagePrompt, trendTitle) => {
                    const newPost: SinglePostData = {
                      hook: trendTitle,
                      main_caption: post,
                      hashtag_suggestions: [],
                      image_prompt: imagePrompt,
                      channel: 'LinkedIn',
                      content_type: 'post'
                    };
                    setSelectedPost(newPost);
                    setActiveTab('post');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'repurpose' && selectedBrand && (
              <motion.div
                key="repurpose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                <Repurpose
                  apiKey={apiKey}
                  selectedBrand={selectedBrand}
                  brandVoice={voiceProfile}
                  onEditFurther={(draft, channel) => {
                    const newPost: SinglePostData = {
                      hook: draft.angle,
                      main_caption: draft.text,
                      hashtag_suggestions: draft.hashtags || [],
                      image_prompt: '',
                      channel,
                      content_type: 'post'
                    };
                    setSelectedPost(newPost);
                    setActiveTab('post');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'image' && selectedBrand && (
              <motion.div
                key="image"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                <ImageToPost
                  apiKey={apiKey}
                  selectedBrand={selectedBrand}
                  brandVoice={voiceProfile}
                  onEditFurther={(draft, channel) => {
                    const newPost: SinglePostData = {
                      hook: draft.angle,
                      main_caption: draft.text,
                      hashtag_suggestions: draft.hashtags || [],
                      image_prompt: '',
                      channel,
                      content_type: 'post'
                    };
                    setSelectedPost(newPost);
                    setActiveTab('post');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'projects' && selectedBrand && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MyProjects 
                  onLoadAnalysis={handleLoadAnalysis}
                  onLoadPlan={handleLoadPlan}
                  onLoadPost={handleLoadPost}
                  onLoadArticle={handleLoadArticle}
                  selectedBrand={selectedBrand}
                />
              </motion.div>
            )}
            {activeTab === 'quality' && isAdmin && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <QualityPanel />
              </motion.div>
            )}
          </AnimatePresence>
          </Suspense>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white py-8 px-6 md:px-10 mt-auto pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <div className="text-sm text-neutral-500">
              © {new Date().getFullYear()} SoMe-assistenten. Alle rettar reservert.
            </div>
            <a href="/personvern.html" className="text-sm text-neutral-500 hover:text-indigo-600 transition-colors">
              Personvern
            </a>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40 pb-safe">
          <div className="flex justify-around items-center px-2 py-2">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'analysis' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <LayoutDashboard className={`w-6 h-6 mb-1 ${activeTab === 'analysis' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Analyse</span>
            </button>
            <button
              onClick={() => setActiveTab('competitor')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'competitor' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Target className={`w-6 h-6 mb-1 ${activeTab === 'competitor' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Konkurrent</span>
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'plan' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <CalendarDays className={`w-6 h-6 mb-1 ${activeTab === 'plan' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Plan</span>
            </button>
            <button
              onClick={() => setActiveTab('post')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'post' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <PenTool className={`w-6 h-6 mb-1 ${activeTab === 'post' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Innlegg</span>
            </button>
            <button
              onClick={() => setActiveTab('article')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'article' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FileText className={`w-6 h-6 mb-1 ${activeTab === 'article' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Artikkel</span>
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'trends' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <TrendingUp className={`w-6 h-6 mb-1 ${activeTab === 'trends' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Trendar</span>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'projects' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FolderOpen className={`w-6 h-6 mb-1 ${activeTab === 'projects' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Prosjekt</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('quality')}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                  activeTab === 'quality' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Activity className={`w-6 h-6 mb-1 ${activeTab === 'quality' ? 'fill-indigo-50' : ''}`} />
                <span className="text-[10px] font-medium">Kvalitet</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
