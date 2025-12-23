import React, { useState } from 'react';
import { LyricSegment, Variant } from '../types';
import { regenerateSegment } from '../services/geminiService';

interface EditingStageProps {
  segments: LyricSegment[];
  setSegments: React.Dispatch<React.SetStateAction<LyricSegment[]>>;
  context: string;
  onConfirm: () => void;
}

const EditingStage: React.FC<EditingStageProps> = ({ segments, setSegments, context, onConfirm, isLoading = false }) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const handleSelectVariant = (segId: string, variantId: string | null) => {
    setSegments(prev => prev.map(s =>
      s.id === segId ? { ...s, selectedVariantId: variantId } : s
    ));
  };

  const handleVariantTextEdit = (segId: string, variantId: string, newText: string) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== segId) return s;
      return {
        ...s,
        variants: s.variants.map(v => v.id === variantId ? { ...v, text: newText } : v)
      };
    }));
  };

  const handleRegenerate = async (segmentId: string) => {
    setRegeneratingId(segmentId);
    try {
      const index = segments.findIndex(s => s.id === segmentId);
      if (index === -1) return;

      const newVariants = await regenerateSegment(segments, index);

      setSegments(prev => prev.map(s =>
        s.id === segmentId
          ? {
            ...s,
            variants: newVariants,
            isProblematic: true // Po regeneraci ho chceme vidět jako aktivní
          }
          : s
      ));
    } catch (error) {
      console.error("Regeneration failed", error);
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col h-[calc(100vh-100px)]">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Interaktivní Editor</h2>
          <p className="text-sm text-slate-400">Upravte rytmus a kadenci své skladby. Celkem {segments.length} řádků zpracováno.</p>
        </div>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap uppercase tracking-wider flex items-center gap-3
            ${isLoading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed transform-none'
              : 'bg-green-600 hover:bg-green-500 text-white hover:scale-105 shadow-lg shadow-green-900/40'}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              GENERUJI...
            </>
          ) : (
            'Generovat kompletní track'
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 pb-20 scrollbar-thin scrollbar-thumb-slate-700 px-2 pt-4">
        {segments.map((segment) => {
          const isProblematic = segment.isProblematic;
          const isExpanded = activeSegmentId === segment.id;
          const isTag = segment.originalText.startsWith('[') && segment.originalText.endsWith(']');

          let displayedText = segment.originalText;
          let variantType = null;
          let statusColor = isTag ? "text-purple-400 font-bold" : "text-slate-300";

          if (segment.selectedVariantId) {
            const chosen = segment.variants.find(v => v.id === segment.selectedVariantId);
            if (chosen) {
              displayedText = chosen.text;
              variantType = chosen.type;
              statusColor = "text-green-300 font-semibold";
            }
          }

          // Pokud je to prázdný řádek a není vybraný, ukážeme jen mezeru
          if (!displayedText.trim() && !isExpanded) {
            return <div key={segment.id} className="h-4"></div>;
          }

          let containerClasses = "rounded-lg border transition-all duration-300 ease-out relative ";

          if (isExpanded) {
            containerClasses += "bg-slate-800/90 shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_15px_rgba(139,92,246,0.15)] scale-[1.01] z-10 my-4 ";
            containerClasses += isProblematic ? "border-orange-500/50" : "border-purple-500/50";
          } else {
            containerClasses += "hover:bg-slate-800/30 border-transparent ";
            if (isProblematic && !segment.selectedVariantId) containerClasses += "bg-orange-950/10 border-orange-900/20";
          }

          return (
            <div key={segment.id} className={containerClasses}>
              <div
                onClick={() => setActiveSegmentId(isExpanded ? null : segment.id)}
                className={`p-3 cursor-pointer flex justify-between items-center group ${isTag && 'opacity-60 hover:opacity-100'}`}
              >
                <div className="flex-1 pr-4 min-w-0">
                  <p className={`font-mono text-lg leading-relaxed transition-all duration-300 truncate ${statusColor}`}>
                    {displayedText || <span className="opacity-20 italic text-sm">(prázdný řádek)</span>}
                  </p>
                  {isProblematic && !isExpanded && !segment.selectedVariantId && (
                    <span className="text-[9px] font-bold text-orange-400 mt-1 inline-block bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-500/10 uppercase">
                      ⚠️ {segment.issueDescription}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isProblematic && !segment.selectedVariantId && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>}
                  {segment.selectedVariantId && !isExpanded && (
                    <span className="text-[9px] font-bold text-green-400 uppercase">
                      {variantType || 'FIX'}
                    </span>
                  )}
                  <span className="text-slate-600 text-xs">edit</span>
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 bg-slate-900/60 rounded-b-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Původní verze</h4>
                      <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-400 font-mono text-sm shadow-inner min-h-[60px] flex items-center">
                        {segment.originalText || <span className="italic opacity-30">Bez textu</span>}
                      </div>

                      {isProblematic && (
                        <div className="text-xs text-orange-300 bg-orange-500/5 p-3 rounded-lg border border-orange-500/20">
                          <strong>Diagnóza:</strong> {segment.issueDescription}
                        </div>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectVariant(segment.id, null); }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-xs transition-all border flex items-center justify-between
                                ${!segment.selectedVariantId
                            ? 'border-purple-500/50 bg-purple-600/20 text-purple-200 font-bold'
                            : 'border-slate-800 text-slate-500 hover:bg-slate-800'}
                            `}
                      >
                        <span>PONECHAT PŮVODNÍ</span>
                        {!segment.selectedVariantId && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inženýrské návrhy</h4>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRegenerate(segment.id); }}
                          disabled={regeneratingId === segment.id}
                          className="text-[9px] font-bold text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-600 px-3 py-1 rounded-full transition-all border border-purple-500/30"
                        >
                          {regeneratingId === segment.id ? 'ANALÝZA...' : 'REGENEROVAT'}
                        </button>
                      </div>

                      <div className="space-y-3">
                        {segment.variants.length > 0 ? segment.variants.map((variant) => {
                          const isVariantSelected = segment.selectedVariantId === variant.id;
                          return (
                            <div
                              key={variant.id}
                              onClick={() => handleSelectVariant(segment.id, variant.id)}
                              className={`rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer
                                            ${isVariantSelected
                                  ? 'border-green-500/50 bg-slate-800 shadow-lg'
                                  : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'}
                                        `}
                            >
                              <div className={`px-3 py-1.5 flex justify-between items-center border-b ${isVariantSelected ? 'bg-green-900/20 border-green-500/20' : 'bg-black/10 border-white/5'}`}>
                                <span className={`text-[8px] font-black uppercase ${isVariantSelected ? 'text-green-400' : 'text-slate-500'}`}>
                                  {variant.type}
                                </span>
                              </div>

                              <div className="p-3">
                                {isVariantSelected ? (
                                  <textarea
                                    value={variant.text}
                                    onChange={(e) => handleVariantTextEdit(segment.id, variant.id, e.target.value)}
                                    className="w-full bg-slate-900/60 text-white font-mono text-sm p-3 rounded border border-green-500/30 focus:outline-none resize-none min-h-[60px]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <p className="font-mono text-sm text-slate-300 leading-relaxed">
                                    {variant.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        }) : (
                          <p className="text-[10px] text-slate-600 italic text-center py-4 border border-dashed border-slate-800 rounded-lg">
                            Klikněte na regenerovat pro získání návrhů
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EditingStage;