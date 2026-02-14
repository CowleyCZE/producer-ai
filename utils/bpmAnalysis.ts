import { LyricSegment } from '../types';

interface BPMResult {
  bpm: number;
  confidence: number;
  timeSignature: string;
  suggestedBpmRange: [number, number];
}

const TEMPO_KEYWORDS: Record<string, number> = {
  'slow': 70,
  'pomalý': 70,
  'rychlý': 150,
  'fast': 150,
  'chill': 85,
  'relax': 80,
  'hype': 160,
  'agresivní': 170,
  'aggressive': 170,
  'melancholický': 75,
  'melancholic': 75,
  'nostalgický': 80,
  'dark': 90,
  'temný': 90,
  'bright': 120,
  'světlý': 120,
};

const GENRE_BPM_RANGES: Record<string, [number, number]> = {
  'hip-hop': [70, 100],
  'rap': [80, 110],
  'trap': [140, 180],
  'drill': [140, 170],
  'boombap': [85, 105],
  'lo-fi': [60, 90],
  'r&b': [70, 100],
  'pop': [100, 130],
  'rock': [110, 140],
  'edm': [120, 150],
  'house': [120, 130],
  'techno': [130, 150],
  'dubstep': [140, 160],
  'reggae': [60, 90],
  'dancehall': [130, 150],
};

const SYLLABLE_BPM_INDICATORS = [
  { pattern: /\b(\d+)\s*(bpm|tempo)\b/i, extract: (m: RegExpMatchArray) => parseInt(m[1]) },
  { pattern: /\b(break)\b/i, extract: () => 0.5 },
  { pattern: /\b(half)\s*(time)\b/i, extract: () => 0.5 },
  { pattern: /\b(double)\s*(time)\b/i, extract: () => 2 },
];

export const analyzeBPM = (lyrics: string, context: string = ''): BPMResult => {
  const combined = `${lyrics} ${context}`.toLowerCase();
  
  let detectedBpm: number | null = null;
  let confidence = 0.3;

  for (const [keyword, bpm] of Object.entries(TEMPO_KEYWORDS)) {
    if (combined.includes(keyword)) {
      detectedBpm = bpm;
      confidence = 0.7;
      break;
    }
  }

  if (!detectedBpm) {
    for (const [genre, [minBpm, maxBpm]] of Object.entries(GENRE_BPM_RANGES)) {
      if (combined.includes(genre)) {
        detectedBpm = Math.round((minBpm + maxBpm) / 2);
        confidence = 0.6;
        break;
      }
    }
  }

  if (!detectedBpm) {
    const wordCount = combined.split(/\s+/).length;
    const avgSyllablesPerWord = (lyrics.match(/[aeiouáéíóúůýě]/gi) || []).length / Math.max(1, wordCount);
    
    if (avgSyllablesPerWord > 1.5) {
      detectedBpm = 140;
    } else if (avgSyllablesPerWord > 1.2) {
      detectedBpm = 110;
    } else {
      detectedBpm = 90;
    }
    confidence = 0.4;
  }

  const suggestedRange: [number, number] = detectedBpm 
    ? [Math.max(60, detectedBpm - 15), Math.min(200, detectedBpm + 15)]
    : [80, 120];

  const timeSignature = combined.includes('3/4') || combined.includes('waltz') 
    ? '3/4' 
    : '4/4';

  return {
    bpm: detectedBpm || 100,
    confidence,
    timeSignature,
    suggestedBpmRange: suggestedRange
  };
};

export const suggestBpmForGenre = (genre: string): [number, number] => {
  return GENRE_BPM_RANGES[genre.toLowerCase()] || [80, 120];
};

export const calculateSyllableDensity = (text: string): number => {
  const syllables = (text.match(/[aeiouáéíóúůýě]/gi) || []).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return words > 0 ? syllables / words : 0;
};

export const getFlowIntensity = (segments: LyricSegment[]): 'low' | 'medium' | 'high' => {
  const avgSyllables = segments.reduce((acc, seg) => {
    return acc + calculateSyllableDensity(seg.originalText);
  }, 0) / Math.max(1, segments.length);

  if (avgSyllables > 1.4) return 'high';
  if (avgSyllables > 1.1) return 'medium';
  return 'low';
};
