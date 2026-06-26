import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Activity, Beaker, CheckCircle, XCircle, Clock, Database, Search, Filter, ChevronDown, ChevronUp, Save, Copy } from 'lucide-react';

interface AILog {
  id: string;
  flow: string;
  version: string;
  model: string;
  input: any;
  output: any;
  latency: number;
  groundingUsed: boolean;
  status: string;
  timestamp: any;
}

interface TestCase {
  id: string;
  flow: string;
  input: any;
  description: string;
  createdAt: any;
}

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

export function QualityPanel() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeView, setActiveView] = useState<'logs' | 'testcases' | 'evals'>('logs');
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationScores, setEvaluationScores] = useState({
    tone: 5,
    concreteness: 5,
    factRisk: 1,
    editEffort: 1
  });
  const [evaluationComments, setEvaluationComments] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const logsQuery = query(collection(db, 'aiLogs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AILog)));
    });

    const testCasesQuery = query(collection(db, 'testCases'), orderBy('createdAt', 'desc'));
    const unsubscribeTestCases = onSnapshot(testCasesQuery, (snapshot) => {
      setTestCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestCase)));
    });

    const evalsQuery = query(collection(db, 'evaluations'), orderBy('timestamp', 'desc'));
    const unsubscribeEvals = onSnapshot(evalsQuery, (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation)));
    });

    return () => {
      unsubscribeLogs();
      unsubscribeTestCases();
      unsubscribeEvals();
    };
  }, []);

  const handleSaveEvaluation = async () => {
    if (!selectedLog) return;

    try {
      await addDoc(collection(db, 'evaluations'), {
        logId: selectedLog.id,
        testCaseId: 'manual', // Or link to a test case if applicable
        scores: evaluationScores,
        comments: evaluationComments,
        status: (evaluationScores.tone >= 4 && evaluationScores.concreteness >= 4 && evaluationScores.factRisk <= 2) ? 'pass' : 'fail',
        timestamp: serverTimestamp()
      });
      setIsEvaluating(false);
      setSelectedLog(null);
      setEvaluationComments('');
    } catch (error) {
      console.error("Error saving evaluation:", error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Kvalitet & Overvåking
          </h2>
          <p className="text-slate-500">Mål AI-prestasjon, spor feil og evaluer utkast.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('logs')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            AI Logger
          </button>
          <button
            onClick={() => setActiveView('testcases')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'testcases' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Test-sett
          </button>
          <button
            onClick={() => setActiveView('evals')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'evals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Evalueringar
          </button>
        </div>
      </div>

      {activeView === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tid</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Flow</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Latency</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grounding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedLog?.id === log.id ? 'bg-indigo-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          {selectedLog?.id === log.id && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(JSON.stringify(log, null, 2), log.id);
                              }}
                              className="p-1 bg-white hover:bg-slate-50 rounded border border-slate-200 shadow-sm transition-colors"
                              title="Kopier logg"
                            >
                              {copiedId === log.id ? (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-indigo-600" />
                              )}
                            </button>
                          )}
                          {log.timestamp?.toDate().toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{log.flow}</span>
                        <span className="ml-2 text-xs text-slate-400">v{log.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{log.latency}ms</td>
                      <td className="px-4 py-3">
                        {log.groundingUsed ? (
                          <Search className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            {selectedLog ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 sticky top-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2), 'full-log')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                      title="Kopier heile loggen"
                    >
                      {copiedId === 'full-log' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <h3 className="font-bold text-slate-900">Loggdetaljar</h3>
                  </div>
                  <button 
                    onClick={() => setIsEvaluating(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Beaker className="w-4 h-4" />
                    Evaluer
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <button 
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.input, null, 2), 'input')}
                        className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-indigo-600"
                        title="Kopier input"
                      >
                        {copiedId === 'input' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Input</label>
                    </div>
                    <pre className="p-3 bg-slate-50 rounded-lg text-xs overflow-auto max-h-40 border border-slate-100">
                      {JSON.stringify(selectedLog.input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <button 
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.output, null, 2), 'output')}
                        className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-indigo-600"
                        title="Kopier output"
                      >
                        {copiedId === 'output' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Output</label>
                    </div>
                    <pre className="p-3 bg-slate-50 rounded-lg text-xs overflow-auto max-h-60 border border-slate-100">
                      {JSON.stringify(selectedLog.output, null, 2)}
                    </pre>
                  </div>
                </div>

                {isEvaluating && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="font-semibold text-slate-900 text-sm">Ny evaluering</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Tone-treff', key: 'tone' },
                        { label: 'Konkret nivå', key: 'concreteness' },
                        { label: 'Faktarisiko (1=låg)', key: 'factRisk' },
                        { label: 'Redigeringsbehov (1=låg)', key: 'editEffort' }
                      ].map((score) => (
                        <div key={score.key} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">{score.label}</span>
                          <input 
                            type="range" 
                            min="1" 
                            max="5" 
                            value={(evaluationScores as any)[score.key]}
                            onChange={(e) => setEvaluationScores({...evaluationScores, [score.key]: parseInt(e.target.value)})}
                            className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      ))}
                    </div>
                    <textarea
                      placeholder="Kommentarar..."
                      value={evaluationComments}
                      onChange={(e) => setEvaluationComments(e.target.value)}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveEvaluation}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Lagre
                      </button>
                      <button 
                        onClick={() => setIsEvaluating(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Vel ein logg for å sjå detaljar og evaluere.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
      )}
    </div>
  );
}
