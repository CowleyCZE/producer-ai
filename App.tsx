import React, { useState, useEffect } from 'react';
import InputStage from './components/InputStage';
import EditingStage from './components/EditingStage';
import FinalStage from './components/FinalStage';
import { AppState, LyricSegment, FinalOutput, AiMode } from './types';
import { analyzeLyrics, generateFinalOutput } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [context, setContext] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedMode, setSelectedMode] = useState<AiMode>(AiMode.AUTO);
  
  const [segments, setSegments] = useState<LyricSegment[]>([]);
  const [finalOutput, setFinalOutput] = useState<FinalOutput | null>(null);
  
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');

  useEffect(() => {
    let interval: any;
    if (appState === AppState.ANALYZING) {
      setAnalysisProgress(5);
      setAnalysisStatus('Inicializace agenta...');
      
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev < 40) {
            setAnalysisStatus('Skenuji rytmiku a metriku...');
            return prev + 1.5;
          }
          if (prev < 75) {
            setAnalysisStatus('Analyzuji rýmové shody...');
            return prev + 0.8;
          }
          if (prev < 95) {
            setAnalysisStatus('Zpracovávám technické varianty...');
            return prev + 0.4;
          }
          return prev;
        });
      }, 150);
    } else {
      setAnalysisProgress(0);
      setAnalysisStatus('');
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const performAnalysis = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    
    setAppState(AppState.ANALYZING);
    try {
      // Skutečné volání API
      const result = await analyzeLyrics(textToAnalyze, context, selectedMode);
      
      setAnalysisProgress(100);
      setAnalysisStatus('Hotovo!');
      
      setTimeout(() => {
        setSegments(result.segments);
        setAppState(AppState.EDITING);
      }, 600);
    } catch (error) {
      console.error("Application catch:", error);
      setAppState(AppState.INPUT);
      alert("Došlo k chybě při analýze. Zkuste prosím text zkrátit nebo zkontrolovat připojení.");
    }
  };

  const handleAnalyze = () => performAnalysis(lyrics);
  const handleRecheck = (finalLyrics: string) => {
    setLyrics(finalLyrics);
    performAnalysis(finalLyrics);
  };

  const handleFinalize = async () => {
    setAppState(AppState.GENERATING_FINAL);
    try {
      const output = await generateFinalOutput(segments, context);
      setFinalOutput(output);
      setAppState(AppState.FINISHED);
    } catch (error) {
        console.error(error);
        alert("Chyba při finalizaci.");
        setAppState(AppState.EDITING);
    }
  };

  const handleReset = () => {
    setLyrics('');
    setContext('');
    setSegments([]);
    setFinalOutput(null);
    setAppState(AppState.INPUT);
    setSelectedMode(AiMode.AUTO);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500 selection:text-white">
      <nav className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
                P
            </div>
            <span className="font-bold text-xl tracking-tight">Producer.ai</span>
        </div>
        <div className="ml-auto text-xs font-mono text-slate-500">
            v2.5 // PROSODIC ENGINE READY
        </div>
      </nav>

      <main className="container mx-auto pt-8 px-4">
        {(appState === AppState.INPUT || appState === AppState.ANALYZING) && (
            <InputStage 
                lyrics={lyrics}
                setLyrics={setLyrics}
                context={context}
                setContext={setContext}
                onAnalyze={handleAnalyze}
                isAnalyzing={appState === AppState.ANALYZING}
                selectedMode={selectedMode}
                onSelectMode={setSelectedMode}
                progress={analysisProgress}
                status={analysisStatus}
            />
        )}

        {appState === AppState.EDITING && (
            <EditingStage 
                segments={segments} 
                setSegments={setSegments}
                context={context}
                onConfirm={handleFinalize}
            />
        )}

        {appState === AppState.GENERATING_FINAL && (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-500">
                 <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                 </div>
                 <h2 className="text-xl font-bold animate-pulse text-purple-400">Mastering výstupu...</h2>
                 <p className="text-slate-500">Finalizuji strukturu a meta data.</p>
            </div>
        )}

        {appState === AppState.FINISHED && finalOutput && (
            <FinalStage 
                finalData={finalOutput}
                onReset={handleReset}
                onReanalyze={handleRecheck}
            />
        )}
      </main>
    </div>
  );
};

export default App;