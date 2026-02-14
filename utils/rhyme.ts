const CZECH_VOWELS = 'aeiouáéíóúůýě';
const CZECH_CONSONANTS = 'bcčdďfghjklmnňprřsštťvwxzž';

interface RhymeResult {
  word: string;
  rhymeType: 'perfect' | 'slant' | 'assonance' | 'none';
  similarity: number;
}

const getRhymeEnding = (word: string): string => {
  const cleaned = word.toLowerCase().replace(/[^a-záéíóúůýěčďňřšťž]/g, '');
  const vowels = cleaned.match(/[aeiouáéíóúůýě]+/g) || [];
  
  if (vowels.length === 0) return '';
  if (vowels.length === 1) return vowels[0];
  
  return vowels.slice(-2).join('');
};

const getSlantEnding = (word: string): string => {
  const cleaned = word.toLowerCase().replace(/[^a-záéíóúůýěčďňřšťž]/g, '');
  return cleaned.slice(-3);
};

export const findRhymes = (word: string, dictionary: string[]): RhymeResult[] => {
  const targetEnding = getRhymeEnding(word);
  const targetSlant = getSlantEnding(word);
  
  if (!targetEnding) return [];
  
  const results: RhymeResult[] = [];
  
  for (const dictWord of dictionary) {
    if (dictWord.toLowerCase() === word.toLowerCase()) continue;
    
    const dictEnding = getRhymeEnding(dictWord);
    const dictSlant = getSlantEnding(dictWord);
    
    let rhymeType: RhymeResult['rhymeType'] = 'none';
    let similarity = 0;
    
    if (dictEnding === targetEnding) {
      rhymeType = 'perfect';
      similarity = 1;
    } else if (dictSlant === targetSlant) {
      rhymeType = 'slant';
      similarity = 0.6;
    } else if (dictEnding.slice(-2) === targetEnding.slice(-2)) {
      rhymeType = 'assonance';
      similarity = 0.3;
    }
    
    if (rhymeType !== 'none') {
      results.push({
        word: dictWord,
        rhymeType,
        similarity
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, 20);
};

export const COMMON_CZECH_WORDS = [
  'láska', 'srdce', 'noc', 'den', 'hvězda', 'měsíc', 'slunce', 'déšť',
  'vítr', 'cesta', 'dálka', 'touha', 'naděje', 'strach', 'bolest',
  'radost', 'smutek', 'zima', 'léto', 'jaro', 'podzim', 'noc', 'den',
  'nebe', 'země', 'moře', 'hora', 'strom', 'květ', 'list', 'kořen',
  'cesta', 'krok', 'stopa', 'čas', 'minulost', 'budoucnost', 'přítomnost',
  'sen', 'bdění', 'ticho', 'hlas', 'slovo', 'ticho', 'zvuk', 'hudba',
  'ritmus', 'beat', 'flow', 'slova', 'verše', 'refrén', 'track', 'beat',
  'mikrofon', 'stage', 'světla', 'publikum', 'aplaus', 'energie', 'vibe',
  'peníze', 'úspěch', 'sláva', 'moc', 'volnost', 'pravda', 'lež',
  'muž', 'žena', 'dítě', 'přítel', 'nepřítel', 'bratr', 'sestra',
  'otec', 'matka', 'rodina', 'domov', 'ulice', 'město', 'svět',
  'auto', 'vlak', 'letadlo', 'loď', 'kolo', 'noha', 'ruka', 'křídlo',
  'oheň', 'voda', 'vzduch', 'země', 'éter', 'duše', 'tělo', 'mysl',
  'vědomí', 'paměť', 'oublík', 'budoucnost', 'osud', 'náhoda', 'shoda',
  'práce', 'šichta', 'peníze', 'banka', 'dluh', 'výdělek', 'zisk',
  'jídlo', 'hlad', 'žízeň', 'spánek', 'odpočinek', 'cesta', 'cil'
];

export const checkRhyme = (word1: string, word2: string): RhymeResult => {
  const results = findRhymes(word1, [word2]);
  return results[0] || { word: word2, rhymeType: 'none', similarity: 0 };
};

export const getWordSyllables = (word: string): number => {
  const vowels = word.toLowerCase().match(/[aeiouáéíóúůýě]/g) || [];
  return vowels.length || 1;
};

export const analyzeLyricsRhymes = (lyrics: string): { lines: { text: string; rhymes: RhymeResult[] }[] } => {
  const lines = lyrics.split('\n').filter(l => l.trim());
  
  const analyzedLines = lines.map(line => {
    const words = line.split(/\s+/).filter(w => w.length > 2);
    const rhymes: RhymeResult[] = [];
    
    if (words.length >= 2) {
      const lastWord = words[words.length - 1];
      const secondLast = words[words.length - 2];
      
      const rhyme = checkRhyme(lastWord, secondLast);
      if (rhyme.rhymeType !== 'none') {
        rhymes.push(rhyme);
      }
    }
    
    return { text: line, rhymes };
  });
  
  return { lines: analyzedLines };
};
