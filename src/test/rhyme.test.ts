import { describe, it, expect } from 'vitest';
import { findRhymes, checkRhyme, getWordSyllables, analyzeLyricsRhymes, COMMON_CZECH_WORDS } from '../../utils/rhyme';

describe('Rhyme Utility', () => {
  describe('getWordSyllables', () => {
    it('should count vowels in Czech words', () => {
      const laska = getWordSyllables('láska');
      expect(laska).toBeGreaterThanOrEqual(1);
    });

    it('should handle words without vowels', () => {
      expect(getWordSyllables('rhythm')).toBe(1);
    });

    it('should handle empty string', () => {
      expect(getWordSyllables('')).toBe(1);
    });
  });

  describe('findRhymes', () => {
    it('should find perfect rhymes', () => {
      const results = findRhymes('láska', ['páska', 'máška', 'báska']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].rhymeType).toBe('perfect');
    });

    it('should return empty array for no matches', () => {
      const results = findRhymes('xyz123', ['abc', 'def']);
      expect(results).toEqual([]);
    });

    it('should sort by similarity', () => {
      const results = findRhymes('noc', ['loď', 'pomoc', 'ono']);
      if (results.length > 1) {
        expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
      }
    });
  });

  describe('checkRhyme', () => {
    it('should detect perfect rhyme', () => {
      const result = checkRhyme('láska', 'páska');
      expect(result.rhymeType).toBe('perfect');
      expect(result.similarity).toBe(1);
    });

    it('should return none for non-rhyming words', () => {
      const result = checkRhyme('auto', 'kniha');
      expect(result.similarity).toBe(0);
    });
  });

  describe('analyzeLyricsRhymes', () => {
    it('should analyze lyrics and find rhymes', () => {
      const lyrics = 'Jedu nocí auto jede\nV této tmě nic se nevede';
      const result = analyzeLyricsRhymes(lyrics);
      expect(result.lines).toBeDefined();
      expect(result.lines.length).toBeGreaterThan(0);
    });

    it('should handle empty lyrics', () => {
      const result = analyzeLyricsRhymes('');
      expect(result.lines).toEqual([]);
    });
  });

  describe('COMMON_CZECH_WORDS', () => {
    it('should contain common Czech words', () => {
      expect(COMMON_CZECH_WORDS).toContain('láska');
      expect(COMMON_CZECH_WORDS).toContain('srdce');
      expect(COMMON_CZECH_WORDS).toContain('noc');
    });

    it('should have reasonable word count', () => {
      expect(COMMON_CZECH_WORDS.length).toBeGreaterThan(50);
    });
  });
});
