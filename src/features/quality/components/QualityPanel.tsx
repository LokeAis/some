import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Beaker, Activity } from 'lucide-react';

interface Evaluation {
  id: string;
  testCaseId: string;
  logId: string;
  scores: {
    tone: number;
    concreteness: number;
    factRisk: number;
    editEffort: number;
  };
  comments: string;
  status: 'pass' | 'fail';
  timestamp: any;
}

// Merk: server-side AI-logging vart fjerna (kosta latens og vart uansett alltid
// blokkert av firestore-reglane). "Evalueringar" viser difor berre historiske
// oppføringar – det finst ikkje lenger ein UI-flyt for å opprette nye, sidan
// den kravde ein logg å knyte evalueringa til.
export function QualityPanel() {
  const [testCases, setTestCases] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeView, setActiveView] = useState<'testcases' | 'evals'>('evals');

  useEffect(() => {
    const testCasesQuery = query(collection(db, 'testCases'), orderBy('createdAt', 'desc'));
    const unsubscribeTestCases = onSnapshot(testCasesQuery, (snapshot) => {
      setTestCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const evalsQuery = query(collection(db, 'evaluations'), orderBy('timestamp', 'desc'));
    const unsubscribeEvals = onSnapshot(evalsQuery, (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation)));
    });

    return () => {
      unsubscribeTestCases();
      unsubscribeEvals();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Kvalitet & Overvåking
          </h2>
          <p className="text-slate-500">Historiske evalueringar og test-sett.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('evals')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'evals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Evalueringar
          </button>
          <button
            onClick={() => setActiveView('testcases')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'testcases' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Test-sett
          </button>
        </div>
      </div>

      {activeView === 'testcases' && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Beaker className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Test-sett (20-30 case)</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Her kan du definere faste test-case for å måle korleis AI-en presterer over tid ved endringar i prompts eller modellar.
          </p>
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Legg til test-case
          </button>
        </div>
      )}

      {activeView === 'evals' && (
        evaluations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {evaluations.map((evalItem) => (
              <div key={evalItem.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    evalItem.status === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {evalItem.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {evalItem.timestamp?.toDate().toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded text-center">
                    <div className="text-xs text-slate-500">Tone</div>
                    <div className="font-bold text-indigo-600">{evalItem.scores.tone}/5</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-center">
                    <div className="text-xs text-slate-500">Konkret</div>
                    <div className="font-bold text-indigo-600">{evalItem.scores.concreteness}/5</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-center">
                    <div className="text-xs text-slate-500">Faktarisiko</div>
                    <div className="font-bold text-orange-600">{evalItem.scores.factRisk}/5</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-center">
                    <div className="text-xs text-slate-500">Redigering</div>
                    <div className="font-bold text-orange-600">{evalItem.scores.editEffort}/5</div>
                  </div>
                </div>
                {evalItem.comments && (
                  <p className="text-sm text-slate-600 italic">"{evalItem.comments}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Ingen evalueringar registrert enno.</p>
          </div>
        )
      )}
    </div>
  );
}
