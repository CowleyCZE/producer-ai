import React, { useState } from 'react';
import { COMMON_CZECH_WORDS, findRhymes, checkRhyme, getWordSyllables } from '../utils/rhyme';
import { useToast } from '../contexts/ToastContext';

export const RhymeDictionary: React.FC = () => {
  const [searchWord, setSearchWord] = useState('');
  const [rhymeResults, setRhymeResults] = useState<any[]>([]);
  const [selectedWord, setSelectedWord] = useState('');
  const { success } = useToast();

  const handleSearch = () => {
    if (!searchWord.trim()) return;
    const results = findRhymes(searchWord, COMMON_CZECH_WORDS);
    setRhymeResults(results);
    setSelectedWord(searchWord);
  };

  const getRhymeTypeLabel = (type: string) => {
    switch (type) {
      case 'perfect': return { label: 'Dokonalý', color: 'text-green-400' };
      case 'slant': return { label: 'Přibližný', color: 'text-yellow-400' };
      case 'assonance': return { label: 'Asonance', color: 'text-orange-400' };
      default: return { label: 'Žádný', color: 'text-surface-500' };
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-surface-200 mb-4">📝 Rýmovač</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Zadejte slovo..."
          className="input flex-1"
        />
        <button onClick={handleSearch} className="btn-primary">
          Hledat
        </button>
      </div>

      {selectedWord && (
        <div className="mb-4 p-3 bg-surface-800 rounded-lg">
          <span className="text-surface-400 text-sm">Slovo: </span>
          <span className="text-surface-200 font-semibold">{selectedWord}</span>
          <span className="text-surface-500 ml-3">({getWordSyllables(selectedWord)} slabik)</span>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {rhymeResults.length > 0 ? (
          rhymeResults.map((rhyme, idx) => {
            const typeInfo = getRhymeTypeLabel(rhyme.rhymeType);
            return (
              <div key={idx} className="flex items-center justify-between p-2 bg-surface-800/50 rounded-lg">
                <span className="text-surface-200 font-mono">{rhyme.word}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                  <span className="text-xs text-surface-500">
                    {Math.round(rhyme.similarity * 100)}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-surface-500 text-center py-4">
            Zadejte slovo pro vyhledání rýmů
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-surface-700">
        <p className="text-xs text-surface-500">
          💡 Tip: Rýmovač obsahuje základní českou slovní zásobu. Pro lepší výsledky použijte delší slova.
        </p>
      </div>
    </div>
  );
};

export default RhymeDictionary;
