import React, { useState } from 'react';
import { FinalOutput } from '../types';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './ui/Tooltip';

interface FinalStageProps {
  output: FinalOutput;
  onRestart: () => void;
}

const FinalStage: React.FC<FinalStageProps> = ({ output, onRestart }) => {
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const { success } = useToast();

  const copyToClipboard = (text: string, setStatus: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setStatus(true);
    success('Zkopírováno do schránky!');
    setTimeout(() => setStatus(false), 2000);
  };

  return (
    <div className="stage-container max-w-5xl mx-auto animate-fade-in pb-20">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black gradient-text">Připraveno k Produkci</h2>
        <p className="text-surface-400 mt-2 text-lg">Váš track je připraven pro studio nebo generátor.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card border-surface-700 overflow-hidden flex flex-col">
          <div className="bg-surface-950 p-4 border-b border-surface-700 flex justify-between items-center">
            <h3 className="font-bold text-surface-200">Finální Text</h3>
            <Tooltip content="Zkopírovat text do schránky" position="bottom">
              <button 
                onClick={() => copyToClipboard(output.lyrics, setCopiedLyrics)}
                className={`text-xs px-4 py-2 rounded-lg transition-all font-semibold ${
                  copiedLyrics 
                    ? 'bg-success text-white' 
                    : 'btn-primary py-1.5'
                }`}
              >
                {copiedLyrics ? '✓ ZKOPÍROVÁNO' : 'KOPÍROVAT TEXT'}
              </button>
            </Tooltip>
          </div>
          <div className="p-6 bg-surface-900/50 flex-1 overflow-auto max-h-[500px]">
            <pre className="font-mono text-sm text-surface-300 whitespace-pre-wrap leading-relaxed">
              {output.lyrics}
            </pre>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card border-surface-700 overflow-hidden flex flex-col">
            <div className="bg-surface-950 p-4 border-b border-surface-700 flex justify-between items-center">
              <h3 className="font-bold text-surface-200">Popis Hudby (Prompt)</h3>
              <Tooltip content="Zkopírovat popis hudby pro Suno/Udio" position="bottom">
                <button 
                  onClick={() => copyToClipboard(output.musicDescription, setCopiedDesc)}
                  className={`text-xs px-4 py-2 rounded-lg transition-all font-semibold ${
                    copiedDesc 
                      ? 'bg-success text-white' 
                      : 'btn-primary py-1.5'
                  }`}
                >
                  {copiedDesc ? '✓ ZKOPÍROVÁNO' : 'KOPÍROVAT PROMPT'}
                </button>
              </Tooltip>
            </div>
            <div className="p-6 bg-surface-900/50">
              <p className="font-mono text-sm text-primary-300 leading-relaxed break-words">
                {output.musicDescription}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-900/30 to-accent-900/30 rounded-xl border border-primary-500/30 p-6">
            <h4 className="text-primary-300 font-bold mb-3 uppercase text-xs tracking-wider">Další Kroky</h4>
            <ul className="text-sm text-surface-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary-400">•</span>
                Vložte Popis hudby do pole "Style" v Suno/Udio
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400">•</span>
                Vložte Text do pole "Custom Lyrics"
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400">•</span>
                Zkontrolujte, zda jsou meta tagy na samostatných řádcích
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-10">
        <button 
          onClick={onRestart}
          className="btn-ghost flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Začít Nový Projekt
        </button>
      </div>
    </div>
  );
};

export default FinalStage;
