import React, { useState } from 'react';
import InputStage from './components/InputStage';
import EditingStage from './components/EditingStage';
import FinalStage from './components/FinalStage';
import ModelPicker from './components/ModelPicker';
import ProjectManager from './components/ProjectManager';
import RhymeDictionary from './components/RhymeDictionary';
import BatchProcessing from './components/BatchProcessing';
import BPMAnalyzer from './components/BPMAnalyzer';
import VersionHistory from './components/VersionHistory';
import ToastContainer from './components/Toast';
import ThemeToggle from './components/ui/ThemeToggle';
import Tooltip from './components/ui/Tooltip';
import { AppState, LyricSegment, FinalOutput, AiMode } from './types';
import { analyzeLyrics, generateFinalOutput } from './services/geminiService';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { VersionProvider, useVersion } from './contexts/VersionContext';
import { SwipeHandler } from './hooks/useSwipeGesture';

type ProcessingPhase = 'idle' | 'preparing' | 'sending' | 'processing' | 'receiving' | 'parsing' | 'complete' | 'error';

const PHASE_MESSAGES: Record<ProcessingPhase, string> = {
  idle: '',
  preparing: '📝 Připravuji data...',
  sending: '📤 Odesílám...',
  processing: '🧠 Analizuji...',
  receiving: '📥 Přijímám...',
  parsing: '🔄 Zpracovávám...',
  complete: '✅ Hotovo!',
  error: '❌ Chyba'
};

type SidebarTab = 'projects' | 'rhymer' | 'batch' | 'bpm' | 'history' | 'none';

const AppContent: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [context, setContext] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedMode, setSelectedMode] = useState<AiMode>(AiMode.AUTO);
  const [segments, setSegments] = useState<LyricSegment[]>([]);
  const [finalOutput, setFinalOutput] = useState<FinalOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>('idle');
  const [modelReady, setModelReady] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('none');
  const { saveProject, currentProject, loadProject } = useProject();
  const { saveVersion } = useVersion();
  const { success, error: showError } = useToast();

  const handleModelStatusChange = (status: string, message: string) => {
    setModelReady(status === 'ready');
  };

  const handleStartAnalysis = async () => {
    if (!modelReady) {
      showError('⚠️ Nejprve načtěte AI model!');
      return;
    }

    setIsLoading(true);
    try {
      setProcessingPhase('preparing');
      await new Promise(r => setTimeout(r, 300));
      setProcessingPhase('sending');
      await new Promise(r => setTimeout(r, 200));
      setProcessingPhase('processing');
      
      const result = await analyzeLyrics(lyrics, context, selectedMode);
      
      setProcessingPhase('receiving');
      await new Promise(r => setTimeout(r, 200));
      setProcessingPhase('parsing');
      await new Promise(r => setTimeout(r, 300));
      
      setSegments(result.segments);
      setProcessingPhase('complete');
      success('Analýza dokončena!');
      
      await new Promise(r => setTimeout(r, 500));
      setAppState(AppState.EDITING);
      setProcessingPhase('idle');
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setProcessingPhase('error');
      showError(`Chyba: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000));
      setProcessingPhase('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = () => {
    const name = prompt('Název projektu:', `Projekt ${new Date().toLocaleDateString('cs-CZ')}`);
    if (!name) return;
    
    saveProject({
      name,
      lyrics,
      context,
      mode: selectedMode,
      segments,
      finalOutput
    });
    success('Projekt uložen!');
  };

  const handleLoadProject = (project: any) => {
    setLyrics(project.lyrics);
    setContext(project.context);
    setSelectedMode(project.mode);
    setSegments(project.segments);
    setFinalOutput(project.finalOutput);
    setAppState(project.segments.length > 0 ? AppState.EDITING : AppState.INPUT);
    setSidebarTab('none');
    success('Projekt načten!');
  };

  const handleFinishEditing = async () => {
    setIsLoading(true);
    setProcessingPhase('processing');
    try {
      const result = await generateFinalOutput(segments, context);
      setFinalOutput(result);
      setProcessingPhase('complete');
      success('Track generován!');
      await new Promise(r => setTimeout(r, 300));
      setAppState(AppState.FINISHED);
    } catch (err) {
      showError('Generování selhalo');
    } finally {
      setIsLoading(false);
      setProcessingPhase('idle');
    }
  };

  const getProgress = () => {
    switch (processingPhase) {
      case 'preparing': return 15;
      case 'sending': return 30;
      case 'processing': return 60;
      case 'receiving': return 80;
      case 'parsing': return 95;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const renderSidebar = () => {
    if (sidebarTab === 'none') return null;
    
    return (
      <div className="fixed right-0 top-0 h-full w-80 bg-surface-900 border-l border-surface-700 z-40 overflow-y-auto animate-slide-up">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-surface-200">
              {sidebarTab === 'projects' && '📁 Projekty'}
              {sidebarTab === 'rhymer' && '📝 Rýmovač'}
              {sidebarTab === 'batch' && '📚 Batch'}
              {sidebarTab === 'bpm' && '🎵 BPM Analyzer'}
              {sidebarTab === 'history' && '📜 Historie'}
            </h3>
            <button onClick={() => setSidebarTab('none')} className="text-surface-500 hover:text-white">✕</button>
          </div>
          
          {sidebarTab === 'projects' && (
            <ProjectManager onLoadProject={handleLoadProject} currentProjectId={currentProject?.id} />
          )}
          {sidebarTab === 'rhymer' && <RhymeDictionary />}
          {sidebarTab === 'batch' && <BatchProcessing onProcessBatch={async () => {}} />}
          {sidebarTab === 'bpm' && <BPMAnalyzer lyrics={lyrics} context={context} segments={segments} />}
          {sidebarTab === 'history' && <VersionHistory onRestore={(segs) => { setSegments(segs); success('Verze obnovena!'); }} />}
        </div>
      </div>
    );
  };

  return (
    <SwipeHandler
      onSwipeLeft={() => sidebarTab !== 'none' && setSidebarTab('none')}
      onSwipeRight={() => sidebarTab === 'none' && setSidebarTab('projects')}
    >
      <div className={`min-h-screen bg-surface-900 text-surface-100 transition-all ${sidebarTab !== 'none' ? 'mr-80' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black gradient-text tracking-tight">
              Producer AI
            </h1>
            <div className="flex items-center gap-3">
              <Tooltip content="Uložené projekty a historie" position="bottom">
                <button onClick={() => setSidebarTab('projects')} className="btn-ghost text-sm">📁</button>
              </Tooltip>
              <Tooltip content="Rýmovač a slovník" position="bottom">
                <button onClick={() => setSidebarTab('rhymer')} className="btn-ghost text-sm">📝</button>
              </Tooltip>
              <Tooltip content="Batch zpracování více textů" position="bottom">
                <button onClick={() => setSidebarTab('batch')} className="btn-ghost text-sm">📚</button>
              </Tooltip>
              <Tooltip content="BPM Analyzer a Beat Grid" position="bottom">
                <button onClick={() => setSidebarTab('bpm')} className="btn-ghost text-sm">🎵</button>
              </Tooltip>
              <Tooltip content="Historie verzí" position="bottom">
                <button onClick={() => setSidebarTab('history')} className="btn-ghost text-sm">📜</button>
              </Tooltip>
              <ThemeToggle />
            </div>
          </header>

          <ModelPicker onStatusChange={handleModelStatusChange} />

          {appState === AppState.INPUT && (
            <>
              <div className="flex justify-between items-center mb-4">
                <button onClick={handleSaveProject} className="btn-secondary text-sm">
                  💾 Uložit projekt
                </button>
              </div>
              <InputStage
                context={context}
                setContext={setContext}
                lyrics={lyrics}
                setLyrics={setLyrics}
                selectedMode={selectedMode}
                onSelectMode={setSelectedMode}
                onAnalyze={handleStartAnalysis}
                isAnalyzing={isLoading}
                progress={getProgress()}
                status={PHASE_MESSAGES[processingPhase]}
              />
            </>
          )}

          {appState === AppState.EDITING && (
            <SwipeHandler onSwipeRight={() => setSidebarTab('projects')}>
              <EditingStage
                segments={segments}
                setSegments={setSegments}
                onFinish={handleFinishEditing}
                isLoading={isLoading}
              />
            </SwipeHandler>
          )}

          {appState === AppState.FINISHED && finalOutput && (
            <FinalStage
              output={finalOutput}
              onRestart={() => {
                setAppState(AppState.INPUT);
                setLyrics('');
                setContext('');
                setSegments([]);
                setFinalOutput(null);
              }}
            />
          )}
        </div>

        {renderSidebar()}
        <ToastContainer />
      </div>
    </SwipeHandler>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <FeedbackProvider>
          <ProjectProvider>
            <VersionProvider>
              <AppContent />
            </VersionProvider>
          </ProjectProvider>
        </FeedbackProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
