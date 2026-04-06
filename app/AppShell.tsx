import React, { useEffect, useState } from 'react';
import LineReviewPanel from '../features/editor/LineReviewPanel';
import LyricsInputPanel from '../features/editor/LyricsInputPanel';
import { AppState, EditableLine, EnergyOption, StyleOption } from '../features/editor/editorTypes';
import { analyzeLyrics } from '../features/editor/lyricsAi';
import AiProviderPanel from '../features/settings/AiProviderPanel';
import { ThemeProvider } from '../shared/theme/ThemeContext';
import { ToastProvider, useToast } from '../shared/toast/ToastContext';
import ThemeSwitch from '../shared/ui/ThemeSwitch';
import ToastViewport from '../shared/ui/ToastViewport';

const EditorWorkspace: React.FC = () => {
  const [initialDraft] = useState<AppDraft>(() => getInitialDraft());
  const [appState, setAppState] = useState<AppState>(() => {
    return initialDraft.appState;
  });
  const [lyrics, setLyrics] = useState(() => initialDraft.lyrics);
  const [style, setStyle] = useState<StyleOption>(() => initialDraft.style);
  const [energy, setEnergy] = useState<EnergyOption>(() => initialDraft.energy);
  const [lines, setLines] = useState<EditableLine[]>(() => initialDraft.lines);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [modelReady, setModelReady] = useState(false);
  const { success, error: showError, warning } = useToast();

  const handleModelStatusChange = (nextStatus: string) => {
    setModelReady(nextStatus === 'ready');
  };

  const handleAnalyze = async () => {
    if (!lyrics.trim()) {
      return;
    }

    if (!modelReady) {
      showError('Nejdřív připojte AI model.');
      return;
    }

    setIsLoading(true);
    setStatus('AI upravuje text po řádcích...');

    try {
      const result = await analyzeLyrics(lyrics, { style, energy });
      setLines(result.lines);
      setAppState(AppState.RESULTS);
      if (result.usedFallback) {
        warning(result.fallbackMessage || 'Výsledek byl připraven přes bezpečný fallback.');
      } else {
        success('Varianty jsou připravené.');
      }
    } catch (error) {
      console.error('Analyze failed:', error);
      showError('Nepodařilo se připravit varianty.');
    } finally {
      setIsLoading(false);
      setStatus('');
    }
  };

  const handleStartOver = () => {
    setAppState(AppState.INPUT);
    setLines([]);
  };

  useEffect(() => {
    writeDraft({
      appState,
      lyrics,
      style,
      energy,
      lines,
    });
  }, [appState, lyrics, style, energy, lines]);

  return (
    <div className="min-h-screen bg-surface-900 text-surface-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-400">Producer.ai</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-surface-100 sm:text-4xl">
              Vlož text a vyber lepší řádky.
            </h1>
          </div>
          <ThemeSwitch />
        </header>

        <AiProviderPanel onStatusChange={handleModelStatusChange} />

        {appState === AppState.INPUT ? (
          <LyricsInputPanel
            lyrics={lyrics}
            setLyrics={setLyrics}
            style={style}
            setStyle={setStyle}
            energy={energy}
            setEnergy={setEnergy}
            modelReady={modelReady}
            onAnalyze={handleAnalyze}
            isAnalyzing={isLoading}
            status={status}
          />
        ) : (
          <LineReviewPanel
            lines={lines}
            setLines={setLines}
            style={style}
            energy={energy}
            onBack={handleStartOver}
          />
        )}
      </div>
      <ToastViewport />
    </div>
  );
};

const AppShell: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <EditorWorkspace />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default AppShell;

const DRAFT_STORAGE_KEY = 'producer-ai-mvp-draft';

interface AppDraft {
  appState: AppState;
  lyrics: string;
  style: StyleOption;
  energy: EnergyOption;
  lines: EditableLine[];
}

function readDraft(): AppDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AppDraft;
  } catch (error) {
    console.error('Failed to read draft:', error);
    return null;
  }
}

function writeDraft(draft: AppDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

function getInitialDraft(): AppDraft {
  return readDraft() || {
    appState: AppState.INPUT,
    lyrics: '',
    style: StyleOption.BOOMBAP,
    energy: EnergyOption.MEDIUM,
    lines: [],
  };
}
