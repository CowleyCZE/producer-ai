import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeBPM, suggestBpmForGenre, calculateSyllableDensity, getFlowIntensity } from '../../utils/bpmAnalysis';
import { LyricSegment } from '../../types';

describe('BPM Analysis', () => {
  describe('analyzeBPM', () => {
    it('should detect BPM from keywords - slow', () => {
      const result = analyzeBPM('This is a slow song', 'slow vibe');
      expect(result.bpm).toBe(70);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect BPM from keywords - hype', () => {
      const result = analyzeBPM('Make it hype', 'hype track');
      expect(result.bpm).toBe(160);
    });

    it('should detect BPM from keywords - chill', () => {
      const result = analyzeBPM('Relaxing vibe', 'chill music');
      expect(result.bpm).toBe(85);
    });

    it('should calculate BPM from syllable density', () => {
      const result = analyzeBPM('trap beat drop', '');
      expect(result.bpm).toBeDefined();
    });

    it('should detect BPM from genre - boombap', () => {
      const result = analyzeBPM('Boom bap lyrics', 'boombap');
      expect(result.bpm).toBeGreaterThanOrEqual(85);
      expect(result.bpm).toBeLessThanOrEqual(105);
    });

    it('should return 4/4 time signature by default', () => {
      const result = analyzeBPM('Test lyrics');
      expect(result.timeSignature).toBe('4/4');
    });

    it('should detect 3/4 time signature', () => {
      const result = analyzeBPM('Waltz song', '3/4');
      expect(result.timeSignature).toBe('3/4');
    });

    it('should calculate syllable density for fast flow', () => {
      const text = 'supercalifragilisticexpialidocious';
      const density = calculateSyllableDensity(text);
      expect(density).toBeGreaterThan(5);
    });

    it('should return valid BPM range', () => {
      const result = analyzeBPM('test');
      expect(result.suggestedBpmRange[0]).toBeLessThan(result.bpm);
      expect(result.suggestedBpmRange[1]).toBeGreaterThan(result.bpm);
    });
  });

  describe('suggestBpmForGenre', () => {
    it('should return BPM range for hip-hop', () => {
      const range = suggestBpmForGenre('hip-hop');
      expect(range).toEqual([70, 100]);
    });

    it('should return BPM range for trap', () => {
      const range = suggestBpmForGenre('trap');
      expect(range).toEqual([140, 180]);
    });

    it('should return default range for unknown genre', () => {
      const range = suggestBpmForGenre('unknown');
      expect(range).toEqual([80, 120]);
    });
  });

  describe('getFlowIntensity', () => {
    it('should return high for many syllables', () => {
      const segments: LyricSegment[] = [
        { id: '1', originalText: 'supercalifragilisticexpialidocious amazing', isProblematic: false, variants: [], selectedVariantId: null },
        { id: '2', originalText: 'extraordinary magnificent spectacular', isProblematic: false, variants: [], selectedVariantId: null },
      ];
      const intensity = getFlowIntensity(segments);
      expect(intensity).toBe('high');
    });

    it('should return low for few syllables', () => {
      const segments: LyricSegment[] = [
        { id: '1', originalText: 'a e i o u', isProblematic: false, variants: [], selectedVariantId: null },
      ];
      const intensity = getFlowIntensity(segments);
      expect(intensity).toBe('low');
    });
  });
});
