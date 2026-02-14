import { describe, it, expect } from 'vitest';
import { exportToTxt, exportToJson, exportToSunoFormat, copyToClipboard } from '../../utils/export';
import { LyricSegment, FinalOutput } from '../../types';

describe('Export Utilities', () => {
  const mockSegments: LyricSegment[] = [
    {
      id: '1',
      originalText: 'First line',
      isProblematic: false,
      variants: [],
      selectedVariantId: null
    },
    {
      id: '2',
      originalText: 'Second line',
      isProblematic: true,
      issueDescription: 'Rushing flow',
      variants: [
        { id: 'v1', text: 'Fixed second line', type: 'Flow', confidence: 0.9 }
      ],
      selectedVariantId: 'v1'
    }
  ];

  const mockOutput: FinalOutput = {
    lyrics: 'First line\nFixed second line',
    musicDescription: 'Dark hip-hop beat',
    confidence: 0.85,
    metaTags: ['[Verse]', '[Chorus]']
  };

  describe('exportToTxt', () => {
    it('should export lyrics to TXT format', () => {
      const result = exportToTxt(mockSegments, mockOutput);
      expect(result).toContain('PRODUCER.AI - EXPORT TEXTU');
      expect(result).toContain('First line');
      expect(result).toContain('Fixed second line');
    });

    it('should include music description', () => {
      const result = exportToTxt(mockSegments, mockOutput);
      expect(result).toContain('POPIS HUDBY');
      expect(result).toContain('Dark hip-hop beat');
    });

    it('should include meta tags', () => {
      const result = exportToTxt(mockSegments, mockOutput);
      expect(result).toContain('META TAGS');
      expect(result).toContain('[Verse]');
    });

    it('should work without final output', () => {
      const result = exportToTxt(mockSegments);
      expect(result).toContain('First line');
    });
  });

  describe('exportToJson', () => {
    it('should export to valid JSON', () => {
      const result = exportToJson(mockSegments, mockOutput, 'Test context', 'AUTO');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include metadata', () => {
      const result = exportToJson(mockSegments, mockOutput, 'Test context', 'MODE_1');
      const parsed = JSON.parse(result);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.mode).toBe('MODE_1');
      expect(parsed.metadata.context).toBe('Test context');
    });

    it('should include segments with variants', () => {
      const result = exportToJson(mockSegments, mockOutput, '', 'AUTO');
      const parsed = JSON.parse(result);
      expect(parsed.lyrics).toBeDefined();
      expect(parsed.lyrics[1].variants).toBeDefined();
    });

    it('should include final output', () => {
      const result = exportToJson(mockSegments, mockOutput, '', 'AUTO');
      const parsed = JSON.parse(result);
      expect(parsed.finalOutput.lyrics).toBe(mockOutput.lyrics);
    });

    it('should handle null final output', () => {
      const result = exportToJson(mockSegments, null, '', 'AUTO');
      const parsed = JSON.parse(result);
      expect(parsed.finalOutput).toBeNull();
    });
  });

  describe('exportToSunoFormat', () => {
    it('should create Suno/Udio format', () => {
      const result = exportToSunoFormat(mockSegments, mockOutput);
      expect(result).toContain('---PROMPT---');
      expect(result).toContain('---LYRICS---');
      expect(result).toContain('---TAGS---');
      expect(result).toContain('Dark hip-hop beat');
    });

    it('should use segments if no output', () => {
      const result = exportToSunoFormat(mockSegments, null);
      expect(result).toContain('First line');
    });
  });
});
