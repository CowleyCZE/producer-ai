import React, { useState } from 'react';
import { FinalOutput } from '../types';

interface FinalStageProps {
  finalData: FinalOutput;
  onReset: () => void;
  onReanalyze: (text: string) => void;
}

const FinalStage: React.FC<FinalStageProps> = ({ finalData, onReset, onReanalyze }) => {
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  const copyToClipboard = (text: string, setStatus: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setStatus(true);
    setTimeout(() => setStatus(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Připraveno k Produkci</h2>
        <p className="text-slate-400">Váš track je připraven pro studio / generátor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Lyrics Panel */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg">
          <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-200">Finální Text</h3>
            <button 
                onClick={() => copyToClipboard(finalData.lyrics, setCopiedLyrics)}
                className={`text-xs px-3 py-1 rounded transition-colors font-bold ${copiedLyrics ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
                {copiedLyrics ? 'ZKOPÍROVÁNO!' : 'KOPÍROVAT TEXT'}
            </button>
          </div>
          <div className="p-6 bg-slate-900/50 flex-1 overflow-auto max-h-[500px]">
            <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {finalData.lyrics}
            </pre>
          </div>
          {/* Re-Check Button Area */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-700">
             <button
                onClick={() => onReanalyze(finalData.lyrics)}
                className="w-full py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/50 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hloubková kontrola finální verze
             </button>
             <p className="text-xs text-center text-slate-500 mt-2">
                Našli jsme chybu? Spusťte znovu Deep Lyric Scan na tento výsledek.
             </p>
          </div>
        </div>

        {/* Music Description Panel */}
        <div className="flex flex-col gap-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg h-fit">
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-200">Popis Hudby (Prompt)</h3>
                <button 
                    onClick={() => copyToClipboard(finalData.musicDescription, setCopiedDesc)}
                    className={`text-xs px-3 py-1 rounded transition-colors font-bold ${copiedDesc ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                    {copiedDesc ? 'ZKOPÍROVÁNO!' : 'KOPÍROVAT PROMPT'}
                </button>
            </div>
            <div className="p-6 bg-slate-900/50">
                <p className="font-mono text-sm text-purple-300 leading-relaxed break-words">
                    {finalData.musicDescription}
                </p>
            </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl border border-indigo-500/30 p-6">
                <h4 className="text-indigo-300 font-bold mb-2 uppercase text-xs tracking-wider">Další Kroky</h4>
                <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                    <li>Vložte Popis hudby do pole "Style" v Suno/Udio.</li>
                    <li>Vložte Text do pole "Custom Lyrics".</li>
                    <li>Zkontrolujte, zda jsou meta tagy (např. [Intro]) na samostatných řádcích.</li>
                </ul>
            </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
            onClick={onReset}
            className="text-slate-500 hover:text-white transition-colors flex items-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            Začít Nový Projekt
        </button>
      </div>
    </div>
  );
};

export default FinalStage;