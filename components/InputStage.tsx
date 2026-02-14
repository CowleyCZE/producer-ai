import React from 'react';
import { AiMode, MODE_DESCRIPTIONS } from '../types';
import Tooltip from './ui/Tooltip';

interface InputStageProps {
  lyrics: string;
  setLyrics: (val: string) => void;
  context: string;
  setContext: (val: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  selectedMode: AiMode;
  onSelectMode: (mode: AiMode) => void;
  progress?: number;
  status?: string;
}

const InputStage: React.FC<InputStageProps> = ({ 
  lyrics, setLyrics, context, setContext, onAnalyze, isAnalyzing, selectedMode, onSelectMode, progress = 0, status = ''
}) => {
  return (
    <div className="stage-container max-w-5xl mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <h2 className="text-5xl font-black gradient-text tracking-tight">
          PROSODIC ARCHITECT
        </h2>
        <p className="text-surface-400 font-medium mt-3 text-lg">
          Technická analýza a rytmické inženýrství pro moderní MCs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card border-surface-700/50">
            <label className="block text-2xs font-black text-surface-500 uppercase tracking-[0.2em] mb-4">
              Parametry Agenta
            </label>
            
            <div className="space-y-5">
              <Tooltip content="Automaticky detekuje problémy nebo zvolte specifický mód" position="right">
                <div>
                  <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase">Režim analýzy</label>
                  <select
                    disabled={isAnalyzing}
                    value={selectedMode}
                    onChange={(e) => onSelectMode(e.target.value as AiMode)}
                    className="input cursor-pointer"
                  >
                    {Object.values(AiMode).map((mode) => (
                      <option key={mode} value={mode}>
                        {MODE_DESCRIPTIONS[mode]}
                      </option>
                    ))}
                  </select>
                </div>
              </Tooltip>

              <Tooltip content="Popište žánr, náladu nebo tempo pro lepší analýzu" position="right">
                <div>
                  <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase">Vibe / Žánr / Tempo</label>
                  <textarea
                    disabled={isAnalyzing}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="např. Boombap, 90bpm, temná atmosféra, důraz na multisylabic rýmy..."
                    className="input h-48 resize-none"
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Tooltip content="Vložte text písně, podporuje tagy jako [Verse], [Chorus]" position="right">
            <label className="block text-2xs font-black text-surface-500 uppercase tracking-[0.2em]">
              Lyrický materiál k analýze
            </label>
          </Tooltip>
          <div className="relative group">
            <textarea
                disabled={isAnalyzing}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Vložte text řádek po řádku..."
                className="input h-[450px] font-mono text-base resize-none shadow-2xl focus:shadow-glow"
            />
            {!lyrics && !isAnalyzing && (
                <div className="absolute top-6 left-6 pointer-events-none opacity-15 font-mono text-sm leading-relaxed">
                    [Verse 1]<br/>
                    Tady začni psát svůj text...<br/>
                    Můžeš použít i tagy pro lepší kontext...
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 pt-4">
        {isAnalyzing && (
            <div className="w-full max-w-md space-y-3 animate-fade-in">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-widest text-primary-400 px-1">
                    <span>{status}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-surface-700 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-primary-600 to-accent-500 transition-all duration-300 ease-out shadow-glow"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        )}

        <button
          onClick={onAnalyze}
          disabled={!lyrics.trim() || isAnalyzing}
          className={`
            relative overflow-hidden px-12 py-5 rounded-2xl font-black text-lg tracking-[0.1em] shadow-2xl transition-all transform active:scale-95
            ${!lyrics.trim() || isAnalyzing 
              ? 'bg-surface-700 text-surface-500 cursor-not-allowed border border-surface-600' 
              : 'btn-primary hover:scale-105 hover:shadow-glow-lg'
            }
          `}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              PROCESING...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              SPUSTIT ANALÝZU
              <span className="text-xl opacity-50">→</span>
            </span>
          )}
        </button>
        
        {!isAnalyzing && (
            <p className="text-xs text-surface-500 uppercase tracking-widest font-semibold">
                Poháněno Gemini 2.5 Flash // Latence &lt; 5s
            </p>
        )}
      </div>
    </div>
  );
};

export default InputStage;
