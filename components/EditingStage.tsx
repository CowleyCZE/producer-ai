import RhythmVisualization, { FlowIndicator, SyllableCounter, RhymeAnalyzer } from './ui/RhythmVisualization';
import { SkeletonSegment } from './ui/Skeleton';
import Tooltip from './ui/Tooltip';
import React, { useState, useEffect, useRef } from 'react';
import { LyricSegment, Variant, SmartSuggestion, META_TAG_SUGGESTIONS } from '../types';
import { regenerateSegment, getSmartSuggestions, suggestMetaTags } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { useVersion } from '../contexts/VersionContext';

interface EditingStageProps {
  segments: LyricSegment[];
  setSegments: React.Dispatch<React.SetStateAction<LyricSegment[]>>;
  onFinish: () => void;
  isLoading?: boolean;
}

const EditingStage: React.FC<EditingStageProps> = ({ segments, setSegments, onFinish, isLoading = false }) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [showMetaTagsEditor, setShowMetaTagsEditor] = useState(false);
  const [manualMetaTags, setManualMetaTags] = useState<Record<number, string>>({});
  const { success } = useToast();
  const { saveVersion } = useVersion();
  const prevSegmentsRef = useRef<string>('');

  useEffect(() => {
    const currentSegmentsStr = JSON.stringify(segments);
    if (prevSegmentsRef.current && prevSegmentsRef.current !== currentSegmentsStr) {
      saveVersion(segments);
    }
    prevSegmentsRef.current = currentSegmentsStr;
  }, [segments, saveVersion]);

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
          ? { ...s, variants: newVariants, isProblematic: true }
          : s
      ));
      success('Varianty regenerovány!');
    } catch (error) {
      console.error("Regeneration failed", error);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleGetSmartSuggestions = async (segmentId: string) => {
    setSuggestingId(segmentId);
    try {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) return;

      const suggestions = await getSmartSuggestions(segment, segments, '');

      setSegments(prev => prev.map(s =>
        s.id === segmentId ? { ...s, smartSuggestions: suggestions } : s
      ));
      success(`${suggestions.length} návrhů získáno!`);
    } catch (error) {
      console.error("Smart suggestions failed", error);
    } finally {
      setSuggestingId(null);
    }
  };

  const handleApplySuggestion = (segId: string, suggestion: SmartSuggestion) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== segId) return s;
      return {
        ...s,
        originalText: suggestion.text,
        smartSuggestions: s.smartSuggestions?.filter(ss => ss.id !== suggestion.id)
      };
    }));
    success('Návrh aplikován!');
  };

  const handleAddMetaTag = (lineIndex: number, tag: string) => {
    setManualMetaTags(prev => ({ ...prev, [lineIndex]: tag }));
  };

  const handleSuggestMetaTags = async () => {
    try {
      const tags = await suggestMetaTags(segments, '');
      const tagMap: Record<number, string> = {};
      let currentTagIndex = 0;
      
      segments.forEach((seg, idx) => {
        const tagMatch = seg.originalText.match(/^\[(.*?)\]/);
        if (tagMatch) {
          tagMap[idx] = tagMatch[0];
        } else if (currentTagIndex < tags.length) {
          const suggestedTag = tags[currentTagIndex];
          if (!Object.values(tagMap).includes(suggestedTag)) {
            tagMap[idx] = suggestedTag;
            currentTagIndex++;
          }
        }
      });
      
      setManualMetaTags(tagMap);
      success('Meta tagy navrženy!');
    } catch (error) {
      console.error("Meta tags suggestion failed", error);
    }
  };

  const applyMetaTagsToSegments = () => {
    setSegments(prev => prev.map((seg, idx) => ({
      ...seg,
      originalText: manualMetaTags[idx] 
        ? `${manualMetaTags[idx]}\n${seg.originalText.replace(/^\[.*?\]\n?/, '')}`
        : seg.originalText
    })));
    setShowMetaTagsEditor(false);
    success('Meta tagy aplikovány!');
  };

  const problematicCount = segments.filter(s => s.isProblematic && !s.selectedVariantId).length;
  const selectedCount = segments.filter(s => s.selectedVariantId).length;

  return (
    <div className="stage-container max-w-6xl mx-auto flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 card border-surface-700 gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold gradient-text">Interaktivní Editor</h2>
          <p className="text-sm text-surface-400 mt-1">
            <span className="text-primary-400 font-medium">{segments.length} řádků</span>
            <span className="mx-2">•</span>
            <span className="text-orange-400 font-medium">{problematicCount} problémů</span>
            <span className="mx-2">•</span>
            <span className="text-green-400 font-medium">{selectedCount} opraveno</span>
          </p>
          <div className="mt-3">
            <FlowIndicator 
              segments={segments.map(s => ({ text: s.originalText, isProblematic: s.isProblematic && !s.selectedVariantId }))} 
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <Tooltip content="Přidat tagy jako [Verse], [Chorus], [Drop]" position="bottom">
            <button onClick={() => setShowMetaTagsEditor(!showMetaTagsEditor)} className="btn-secondary flex items-center gap-2">
              🏷️ Meta Tags
            </button>
          </Tooltip>
          <Tooltip content="Dokončit úpravy a vygenerovat finální výstup" position="bottom">
            <button onClick={onFinish} disabled={isLoading} className="btn-primary whitespace-nowrap flex items-center gap-3">
              {isLoading ? (
                <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>GENERUJI...</>
              ) : (<>Generovat kompletní track<span className="text-lg">→</span></>)}
            </button>
          </Tooltip>
        </div>
      </header>

      {showMetaTagsEditor && (
        <div className="card mb-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-surface-200">Editor Meta Tags</h3>
            <div className="flex gap-2">
              <Tooltip content="AI navrhne vhodné tagy podle struktury textu" position="left">
                <button onClick={handleSuggestMetaTags} className="btn-ghost text-xs py-2 px-3">✨ AI návrhy</button>
              </Tooltip>
              <Tooltip content="Přidat vybrané tagy k textu" position="left">
                <button onClick={applyMetaTagsToSegments} className="btn-primary text-xs py-2 px-3">Aplikovat</button>
              </Tooltip>
            </div>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {segments.map((seg, idx) => (
              <div key={seg.id} className="flex items-center gap-3 p-2 bg-surface-800/50 rounded-lg">
                <span className="text-xs text-surface-500 w-8">{idx + 1}.</span>
                <span className="flex-1 text-sm text-surface-300 truncate font-mono">{seg.originalText.substring(0, 40)}...</span>
                <select
                  value={manualMetaTags[idx] || ''}
                  onChange={(e) => handleAddMetaTag(idx, e.target.value)}
                  className="input w-40 text-xs py-2"
                >
                  <option value="">-- Vybrat tag --</option>
                  {META_TAG_SUGGESTIONS.map(t => (
                    <option key={t.tag} value={t.tag}>{t.tag} - {t.description}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-24">
        {segments.map((segment, idx) => {
          const isProblematic = segment.isProblematic;
          const isExpanded = activeSegmentId === segment.id;
          const isTag = segment.originalText.startsWith('[') && segment.originalText.endsWith(']');
          
          const previousTexts = segments.slice(0, idx).map(s => {
            if (s.selectedVariantId) {
              const v = s.variants.find(v => v.id === s.selectedVariantId);
              return v?.text || s.originalText;
            }
            return s.originalText;
          });

          let displayedText = segment.originalText;
          let variantType: string | null = null;
          let statusColor = isTag ? "text-primary-400 font-bold" : "text-surface-300";

          if (segment.selectedVariantId) {
            const chosen = segment.variants.find(v => v.id === segment.selectedVariantId);
            if (chosen) {
              displayedText = chosen.text;
              variantType = chosen.type;
              statusColor = "text-green-300 font-semibold";
            }
          }

          if (!displayedText.trim() && !isExpanded) return <div key={segment.id} className="h-4"></div>;

          let containerClasses = isExpanded 
            ? "card border-primary-500/30 shadow-glow scale-[1.01] z-10 my-4" 
            : `border-transparent hover:border-surface-600 rounded-xl ${isProblematic && !segment.selectedVariantId ? 'bg-orange-500/5 border-orange-500/20' : ''}`;

          return (
            <div key={segment.id} className={`card-hover border transition-all duration-300 ease-out relative ${containerClasses}`}>
              <div onClick={() => setActiveSegmentId(isExpanded ? null : segment.id)} className={`p-4 cursor-pointer flex flex-col gap-2 ${isTag ? 'opacity-60 hover:opacity-100' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-lg leading-relaxed transition-all duration-300 truncate ${statusColor}`}>
                      {displayedText || <span className="opacity-20 italic text-sm">(prázdný řádek)</span>}
                    </p>
                    
                    {!isTag && displayedText && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <SyllableCounter text={displayedText} />
                        <RhymeAnalyzer currentWord={displayedText.split(/\s+/).pop() || ''} previousWords={previousTexts} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isProblematic && !segment.selectedVariantId && (
                      <span className="badge-warning flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                        {segment.issueDescription}
                      </span>
                    )}
                    {segment.selectedVariantId && !isExpanded && <span className="badge-success">{variantType || 'FIX'}</span>}
                    {!isProblematic && segment.smartSuggestions && segment.smartSuggestions.length > 0 && (
                      <span className="badge-primary">✨ {segment.smartSuggestions.length} návrhů</span>
                    )}
                  </div>
                </div>

                <RhythmVisualization text={displayedText} isProblematic={isProblematic && !segment.selectedVariantId} isSelected={!!segment.selectedVariantId} />
              </div>

              {isExpanded && (
                <div className="p-6 border-t border-surface-700 animate-fade-in bg-surface-900/60 rounded-b-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-2xs font-black text-surface-500 uppercase tracking-widest">Původní verze</h4>
                      <div className="p-4 bg-surface-950/50 border border-surface-700 rounded-lg text-surface-400 font-mono text-sm shadow-inner min-h-[60px] flex items-center">
                        {segment.originalText || <span className="italic opacity-30">Bez textu</span>}
                      </div>

                      {isProblematic && (
                        <div className="text-xs text-orange-300 bg-orange-500/5 p-3 rounded-lg border border-orange-500/20">
                          <strong>Diagnóza:</strong> {segment.issueDescription}
                        </div>
                      )}

                      {!isProblematic && (
                        <button onClick={() => handleGetSmartSuggestions(segment.id)} disabled={suggestingId === segment.id} className="w-full btn-ghost text-xs py-2 flex items-center justify-center gap-2">
                          {suggestingId === segment.id ? <><svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Generuji...</> : <>✨ Chytrý návrh</>}
                        </button>
                      )}

                      <button onClick={() => handleSelectVariant(segment.id, null)} className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all border flex items-center justify-between ${!segment.selectedVariantId ? 'border-primary-500/50 bg-primary-600/20 text-primary-200 font-bold' : 'border-surface-700 text-surface-500 hover:bg-surface-800 hover:border-surface-600'}`}>
                        <span>PONECHAT PŮVODNÍ</span>
                        {!segment.selectedVariantId && <span className="w-2 h-2 rounded-full bg-primary-400"></span>}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-2xs font-black text-surface-500 uppercase tracking-widest">{isProblematic ? 'Inženýrské návrhy' : 'Chytrá vylepšení'}</h4>
                        {isProblematic && <button onClick={() => handleRegenerate(segment.id)} disabled={regeneratingId === segment.id} className="btn-ghost text-xs py-1 px-3 rounded-full">{regeneratingId === segment.id ? '...' : '↻ Regenerovat'}</button>}
                      </div>

                      <div className="space-y-3">
                        {regeneratingId === segment.id || suggestingId === segment.id ? (
                          <SkeletonSegment />
                        ) : isProblematic ? (
                          segment.variants.length > 0 ? segment.variants.map((variant) => {
                            const isVariantSelected = segment.selectedVariantId === variant.id;
                            return (
                              <div key={variant.id} onClick={() => handleSelectVariant(segment.id, variant.id)} className={`rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer ${isVariantSelected ? 'border-green-500/50 bg-surface-800 shadow-glow' : 'border-surface-700 hover:border-surface-600 bg-surface-800/30'}`}>
                                <div className={`px-3 py-2 flex justify-between items-center border-b ${isVariantSelected ? 'bg-green-900/20 border-green-500/20' : 'bg-surface-950/50 border-surface-700'}`}>
                                  <span className={`text-2xs font-black uppercase ${isVariantSelected ? 'text-green-400' : 'text-surface-500'}`}>{variant.type}</span>
                                  {variant.confidence && <span className="text-2xs text-surface-500">{Math.round(variant.confidence * 100)}% jistota</span>}
                                </div>
                                <div className="p-3">
                                  {isVariantSelected ? (
                                    <textarea value={variant.text} onChange={(e) => handleVariantTextEdit(segment.id, variant.id, e.target.value)} className="w-full bg-surface-900/80 text-surface-100 font-mono text-sm p-3 rounded-lg border border-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none min-h-[60px]" onClick={(e) => e.stopPropagation()} />
                                  ) : (<p className="font-mono text-sm text-surface-300 leading-relaxed">{variant.text}</p>)}
                                </div>
                              </div>
                            );
                          }) : (
                            <p className="text-xs text-surface-500 italic text-center py-4 border border-dashed border-surface-700 rounded-lg">Klikněte na regenerovat pro získání návrhů</p>
                          )
                        ) : (
                          segment.smartSuggestions && segment.smartSuggestions.length > 0 ? (
                            segment.smartSuggestions.map((suggestion) => (
                              <div key={suggestion.id} onClick={() => handleApplySuggestion(segment.id, suggestion)} className="rounded-lg border border-primary-500/30 bg-primary-900/10 hover:bg-primary-900/20 transition-all duration-200 cursor-pointer p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-2xs font-black uppercase text-primary-400">{suggestion.type}</span>
                                  {suggestion.confidence && <span className="text-2xs text-surface-500">{Math.round(suggestion.confidence * 100)}%</span>}
                                </div>
                                <p className="font-mono text-sm text-surface-300 leading-relaxed">{suggestion.text}</p>
                                {suggestion.description && <p className="text-xs text-surface-500 mt-2">💡 {suggestion.description}</p>}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-surface-500 italic text-center py-4">Tento segment je v pořádku. Získejte kreativní návrhy!</p>
                          )
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
