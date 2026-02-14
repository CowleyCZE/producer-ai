import React from 'react';

interface RhythmVisualizationProps {
  text: string;
  isProblematic?: boolean;
  isSelected?: boolean;
}

const RhythmVisualization: React.FC<RhythmVisualizationProps> = ({ 
  text, 
  isProblematic = false,
  isSelected = false 
}) => {
  const words = text.split(/\s+/).filter(w => w.trim());
  
  const getStressPattern = (word: string): number[] => {
    const vowels = word.match(/[aeiouáéíóúůýě]/gi) || [];
    if (vowels.length === 0) return [];
    if (vowels.length === 1) return [1];
    
    const pattern: number[] = [];
    const vowelCount = vowels.length;
    
    if (vowelCount === 2) {
      if (word.length > 4) {
        pattern.push(1, 0);
      } else {
        pattern.push(1, 1);
      }
    } else if (vowelCount === 3) {
      pattern.push(1, 0, 1);
    } else if (vowelCount >= 4) {
      pattern.push(1, 0, 1, 0);
    }
    
    return pattern;
  };

  const getWordHeight = (word: string): number => {
    const syllableCount = (word.match(/[aeiouáéíóúůýě]/gi) || []).length;
    return Math.min(100, 30 + syllableCount * 20);
  };

  const baseColor = isSelected 
    ? 'from-green-400 to-green-500' 
    : isProblematic 
      ? 'from-orange-400 to-orange-500' 
      : 'from-primary-400 to-accent-400';

  const bgColor = isSelected 
    ? 'bg-green-500/20' 
    : isProblematic 
      ? 'bg-orange-500/10' 
      : 'bg-primary-500/10';

  return (
    <div className={`flex items-end gap-[2px] h-8 px-2 py-1 rounded ${bgColor}`}>
      {words.map((word, idx) => {
        const height = getWordHeight(word);
        const stressPattern = getStressPattern(word);
        
        return (
          <div key={idx} className="flex flex-col items-center gap-0.5">
            <div className="flex items-end gap-[1px]">
              {stressPattern.map((stress, sIdx) => (
                <div
                  key={sIdx}
                  className={`w-1 rounded-full bg-gradient-to-t ${baseColor} transition-all duration-300`}
                  style={{ 
                    height: `${height * (stress === 1 ? 1 : 0.4)}%`,
                    opacity: stress === 1 ? 1 : 0.5
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const FlowIndicator: React.FC<{ segments: { text: string; isProblematic?: boolean }[] }> = ({ segments }) => {
  const hasProblems = segments.some(s => s.isProblematic);
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {segments.slice(0, 12).map((seg, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              seg.isProblematic 
                ? 'bg-orange-400 animate-pulse' 
                : 'bg-primary-400'
            }`}
          />
        ))}
      </div>
      {segments.length > 12 && (
        <span className="text-xs text-surface-500">+{segments.length - 12}</span>
      )}
      {hasProblems && (
        <span className="text-xs text-orange-400 ml-2">
          ⚠️ {segments.filter(s => s.isProblematic).length} issues
        </span>
      )}
    </div>
  );
};

export const SyllableCounter: React.FC<{ text: string }> = ({ text }) => {
  const count = (text.match(/[aeiouáéíóúůýě]/gi) || []).length;
  
  return (
    <span className="text-xs font-mono text-surface-500 bg-surface-800 px-2 py-0.5 rounded">
      {count} slabik
    </span>
  );
};

export const RhymeAnalyzer: React.FC<{ currentWord: string; previousWords: string[] }> = ({ 
  currentWord, 
  previousWords 
}) => {
  const getLastVowelCluster = (word: string): string => {
    const match = word.toLowerCase().match(/[aeiouáéíóúůýě]+[^aeiouáéíóúůýě]*$/);
    return match ? match[0] : '';
  };

  const currentEnding = getLastVowelCluster(currentWord);
  const rhymeType = previousWords.map(prev => {
    const prevEnding = getLastVowelCluster(prev);
    if (!currentEnding || !prevEnding) return 'none';
    if (currentEnding === prevEnding) return 'perfect';
    if (currentEnding.slice(-2) === prevEnding.slice(-2)) return 'slant';
    return 'none';
  });

  const hasRhyme = rhymeType.includes('perfect');
  const hasSlantRhyme = rhymeType.includes('slant');

  return (
    <div className="flex items-center gap-2">
      {hasRhyme ? (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          Rým
        </span>
      ) : hasSlantRhyme ? (
        <span className="text-xs text-yellow-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
          Přibližný rým
        </span>
      ) : (
        <span className="text-xs text-surface-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600"></span>
          Bez rýmu
        </span>
      )}
    </div>
  );
};
export default RhythmVisualization;
