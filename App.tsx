import React, { useState } from 'react';
import InputStage from './components/InputStage';
import EditingStage from './components/EditingStage';
import FinalStage from './components/FinalStage';
import ModelPicker from './components/ModelPicker';
import { AppState, LyricSegment, FinalOutput, AiMode } from './types';
import { analyzeLyrics, generateFinalOutput } from './services/geminiService';

// Fáze zpracování pro vizuální feedback
type ProcessingPhase =
  | 'idle'
  | 'preparing'
  | 'sending'
  | 'processing'
  | 'receiving'
  | 'parsing'
  | 'complete'
  | 'error';

const PHASE_MESSAGES: Record<ProcessingPhase, string> = {
  idle: '',
  preparing: '📝 Připravuji data pro model...',
  sending: '📤 Odesílám text do AI modelu...',
  processing: '🧠 Model analyzuje text...',
  receiving: '📥 Přijímám odpověď od modelu...',
  parsing: '🔄 Zpracovávám výsledky...',
  complete: '✅ Analýza dokončena!',
  error: '❌ Došlo k chybě'
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [context, setContext] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedMode, setSelectedMode] = useState<AiMode>(AiMode.AUTO);
  const [segments, setSegments] = useState<LyricSegment[]>([]);
  const [finalOutput, setFinalOutput] = useState<FinalOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Nové stavy pro fáze zpracování
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>('idle');
  const [modelReady, setModelReady] = useState(false);
  const [modelStatusMessage, setModelStatusMessage] = useState('');

  const handleModelStatusChange = (status: string, message: string) => {
    setModelReady(status === 'ready');
    setModelStatusMessage(message);
  };

  const handleStartAnalysis = async () => {
    if (!modelReady) {
      alert('⚠️ Nejprve načtěte AI model!');
      return;
    }

    setIsLoading(true);

    try {
      // Fáze 1: Příprava
      setProcessingPhase('preparing');
      await new Promise(r => setTimeout(r, 300));

      // Fáze 2: Odesílání
      setProcessingPhase('sending');
      await new Promise(r => setTimeout(r, 200));

      // Fáze 3: Zpracování (hlavní volání)
      setProcessingPhase('processing');
      const result = await analyzeLyrics(lyrics, context, selectedMode);

      // Fáze 4: Příjem
      setProcessingPhase('receiving');
      await new Promise(r => setTimeout(r, 200));

      // Fáze 5: Parsování
      setProcessingPhase('parsing');
      await new Promise(r => setTimeout(r, 300));

      // Fáze 6: Dokončeno
      setProcessingPhase('complete');
      setSegments(result.segments);

      await new Promise(r => setTimeout(r, 500));
      setAppState(AppState.EDITING);
      setProcessingPhase('idle');

    } catch (error: any) {
      console.error('Analysis failed:', error);
      setProcessingPhase('error');
      alert(`Analýza selhala: ${error.message || 'Neznámá chyba'}`);
      await new Promise(r => setTimeout(r, 1000));
      setProcessingPhase('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishEditing = async () => {
    setIsLoading(true);
    setProcessingPhase('processing');

    try {
      const result = await generateFinalOutput(segments, context);
      setFinalOutput(result);
      setProcessingPhase('complete');
      await new Promise(r => setTimeout(r, 300));
      setAppState(AppState.FINISHED);
    } catch (error) {
      console.error('Final generation failed:', error);
      setProcessingPhase('error');
    } finally {
      setIsLoading(false);
      setProcessingPhase('idle');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{
        textAlign: 'center',
        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '20px'
      }}>
        Producer AI - Lyric Architect
      </h1>

      {/* Model Picker s callback pro stav */}
      <ModelPicker onStatusChange={handleModelStatusChange} />

      {/* Indikátor stavu modelu */}
      {!modelReady && appState === AppState.INPUT && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span style={{ color: '#92400e', fontWeight: '500' }}>
            Pro spuštění analýzy je nutné nejprve načíst AI model.
          </span>
        </div>
      )}

      {/* Výpočet progressu pro InputStage */}
      {(() => {
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

        return (
          appState === AppState.INPUT && (
            <InputStage
              context={context}
              setContext={setContext}
              lyrics={lyrics}
              setLyrics={setLyrics}
              selectedMode={selectedMode}
              setSelectedMode={setSelectedMode}
              onStart={handleStartAnalysis}
              isLoading={isLoading}
              progress={getProgress()}
              status={PHASE_MESSAGES[processingPhase]}
            />
          )
        );
      })()}

      {appState === AppState.EDITING && (
        <EditingStage
          segments={segments}
          setSegments={setSegments}
          onFinish={handleFinishEditing}
          isLoading={isLoading}
        />
      )}

      {appState === AppState.FINISHED && finalOutput && (
        <FinalStage
          output={finalOutput}
          onRestart={() => setAppState(AppState.INPUT)}
        />
      )}

      {/* CSS animace */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
