import React, { useState, useEffect } from 'react';
import InputStage from './components/InputStage';
import EditingStage from './components/EditingStage';
import FinalStage from './components/FinalStage';
import ModelPicker from './components/ModelPicker';
import { AppState, LyricSegment, FinalOutput, AiMode } from './types';
import { analyzeLyrics, generateFinalOutput } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [context, setContext] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedMode, setSelectedMode] = useState<AiMode>(AiMode.AUTO);
  const [segments, setSegments] = useState<LyricSegment[]>([]);
  const [finalOutput, setFinalOutput] = useState<FinalOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await analyzeLyrics(lyrics, context, selectedMode);
      setSegments(result.segments);
      setAppState(AppState.EDITING);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analýza selhala. Zkontrolujte, zda je načten model.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishEditing = async () => {
    setIsLoading(true);
    try {
      const result = await generateFinalOutput(segments, context);
      setFinalOutput(result);
      setAppState(AppState.FINAL);
    } catch (error) {
      console.error('Final generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Producer AI - Lyric Architect</h1>
      
      {/* Model Picker je přístupný v každém stavu pro případ potřeby přenačtení */}
      <ModelPicker />

      {appState === AppState.INPUT && (
        <InputStage 
          context={context} 
          setContext={setContext}
          lyrics={lyrics}
          setLyrics={setLyrics}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          onStart={handleStartAnalysis}
          isLoading={isLoading}
        />
      )}

      {appState === AppState.EDITING && (
        <EditingStage 
          segments={segments}
          setSegments={setSegments}
          onFinish={handleFinishEditing}
          isLoading={isLoading}
        />
      )}

      {appState === AppState.FINAL && finalOutput && (
        <FinalStage 
          output={finalOutput}
          onRestart={() => setAppState(AppState.INPUT)}
        />
      )}
    </div>
  );
};

export default App;
