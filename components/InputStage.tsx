import React from 'react';
import { AiMode, MODE_DESCRIPTIONS } from '../types';

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
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-500 tracking-tighter">
          PROSODIC ARCHITECT
        </h2>
        <p className="text-slate-400 font-medium">
          Technická analýza a rytmické inženýrství pro moderní MCs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Context / Genre Input */}
        <div className="md:col-span-1 space-y-4">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Parametry Agenta
          </label>
          
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            {/* Mode Selection Dropdown */}
            <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">Režim analýzy</label>
                <select
                    disabled={isAnalyzing}
                    value={selectedMode}
                    onChange={(e) => onSelectMode(e.target.value as AiMode)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all cursor-pointer disabled:opacity-50"
                >
                    {Object.values(AiMode).map((mode) => (
                        <option key={mode} value={mode}>
                            {MODE_DESCRIPTIONS[mode]}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">Vibe / Žánr / Tempo</label>
                <textarea
                    disabled={isAnalyzing}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="např. Boombap, 90bpm, temná atmosféra, důraz na multisylabic rýmy..."
                    className="w-full h-44 bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-all disabled:opacity-50 shadow-inner"
                />
            </div>
          </div>
        </div>

        {/* Lyrics Input */}
        <div className="md:col-span-2 space-y-4">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Lyrický materiál k analýze
          </label>
          <div className="relative group">
            <textarea
                disabled={isAnalyzing}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Vložte text řádek po řádku..."
                className="w-full h-[400px] bg-slate-900 border border-slate-800 rounded-xl p-6 font-mono text-base text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none transition-all shadow-2xl disabled:opacity-70 scrollbar-thin scrollbar-thumb-slate-700"
            />
            {!lyrics && !isAnalyzing && (
                <div className="absolute top-6 left-6 pointer-events-none opacity-20 font-mono text-sm leading-relaxed">
                    [Verse 1]<br/>
                    Tady začni psát svůj text...<br/>
                    Můžeš použít i tagy pro lepší kontext...
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 pt-4">
        {/* Progress Display when Analyzing */}
        {isAnalyzing && (
            <div className="w-full max-w-md space-y-3 animate-fade-in">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-purple-400 px-1">
                    <span>{status}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]"
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
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
              : 'bg-white text-slate-950 hover:bg-purple-50 hover:scale-105 ring-4 ring-purple-600/20 group'}
          `}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              PROCESING...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="group-hover:translate-x-1 transition-transform">SPUSTIT ANALÝZU</span>
              <span className="text-xl opacity-50 group-hover:opacity-100 transition-opacity">→</span>
            </span>
          )}
        </button>
        
        {!isAnalyzing && (
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Poháněno Gemini 2.5 Flash // Latence &lt; 5s
            </p>
        )}
      </div>
    </div>
  );
};

export default InputStage;