import { describe, expect, it } from 'vitest';
import { __testing, AI_ANALYZE_LINE_LIMIT, analyzeLyrics, assembleLyrics, semanticCache } from '../features/editor/lyricsAi';
import { diffText } from '../features/editor/textDiff';
import { EditableLine, EnergyOption, StyleOption } from '../features/editor/editorTypes';

describe('MVP core flow', () => {
  it('assembles the final text from selected line variants', () => {
    const lines: EditableLine[] = [
      {
        id: 'line-0',
        original: 'Makám celej den',
        needsFix: true,
        alternatives: {
          balanced: 'Makám celej den a držím směr',
          flow: 'Makám celej den, držím směr',
          rhyme: 'Makám celej den, tlak žene ven',
        },
        selectedOption: 'flow',
      },
      {
        id: 'line-1',
        original: 'Hlava plná stresu',
        needsFix: false,
        alternatives: null,
        selectedOption: null,
      },
    ];

    expect(assembleLyrics(lines)).toBe('Makám celej den, držím směr\nHlava plná stresu');
  });

  it('marks changed tokens in diff output', () => {
    const tokens = diffText('Makám celej den', 'Makám celej den, držím směr');

    expect(tokens.some((token) => token.changed)).toBe(true);
    expect(tokens.map((token) => token.value).join('')).toBe('Makám celej den, držím směr');
  });

  it('rejects AI alternatives that only repeat the original line', () => {
    const alternatives = __testing.normalizeAlternatives(
      {
        balanced: 'Makám celej den',
        flow: 'Makám celej den',
        rhyme: 'Makám celej den',
      },
      'Makám celej den',
    );

    expect(alternatives).toBeNull();
  });

  it('rejects AI alternatives that collapse into duplicate variants', () => {
    const alternatives = __testing.normalizeAlternatives(
      {
        balanced: 'Makám celej zas',
        flow: 'Makám celej zas',
        rhyme: 'Makám celej ven',
      },
      'Makám celej den',
    );

    expect(alternatives).toBeNull();
  });

  it('falls back when alternatives are missing inside a line', () => {
    const result = __testing.normalizeAnalysisResponse(
      {
        lines: [
          {
            original: 'Krátký text',
            needs_fix: true,
            // no alternatives field at all
          },
        ],
      },
      'Krátký text',
    );

    expect(result.lines[0]?.alternatives).not.toBeNull();
    expect(result.lines[0]?.needsFix).toBe(true);
  });

  it('measures rhyme density (simple repeat)', () => {
    const density = __testing.computeRhymeDensity(['flow den', 'nový den', 'zase den']);
    expect(density).toBeGreaterThan(0);
  });

  it('scores lines based on length similarity and rhyme', () => {
    const scored = __testing.scoreLineStructure({
      id: 'line-0',
      original: 'Makám celej den',
      needsFix: true,
      alternatives: {
        balanced: 'Makám celej den, držím směr',
        flow: 'Makám celej den, držím směr',
        rhyme: 'Makám celej den, tlak žene ven',
      },
      selectedOption: 'balanced',
    });

    expect(scored).toBeGreaterThan(50);
  });

  it('rejects alternatives that drop preserved keywords', () => {
    const alternatives = __testing.normalizeAlternatives(
      {
        balanced: 'Jiný panelák',
        flow: 'Jiný panelák',
        rhyme: 'Jiný panelák',
      },
      'Makám panelák',
    );

    expect(alternatives).toBeNull();
  });

  it('keeps original line mapping even when AI returns a different original value', () => {
    const result = __testing.normalizeAnalysisResponse(
      {
        lines: [
          {
            original: 'Úplně jiný text',
            needs_fix: true,
            alternatives: {
              balanced: 'Makám celej večer',
              flow: 'Makám celej zas',
              rhyme: 'Makám celej ven',
            },
          },
        ],
      },
      'Makám celej den',
    );

    expect(result.lines[0]?.original).toBe('Makám celej den');
    expect(result.lines[0]?.alternatives?.flow).toBe('Makám celej zas');
  });

  it('falls back safely when AI payload does not contain lines', () => {
    const result = __testing.normalizeAnalysisResponse({}, 'Krátký text');

    expect(result.usedFallback).toBe(true);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.original).toBe('Krátký text');
  });

  it('returns a clear warning when input is longer than the analysis limit', async () => {
    semanticCache.set(
      Array.from({ length: AI_ANALYZE_LINE_LIMIT }, (_, index) => `Řádek ${index + 1}`).join('\n'),
      StyleOption.BOOMBAP,
      EnergyOption.MEDIUM,
      {
        lines: Array.from({ length: AI_ANALYZE_LINE_LIMIT }, (_, index) => ({
          id: `line-${index}`,
          original: `Řádek ${index + 1}`,
          needsFix: false,
          alternatives: null,
          selectedOption: null,
        })),
      },
    );

    const longText = Array.from({ length: AI_ANALYZE_LINE_LIMIT + 5 }, (_, index) => `Řádek ${index + 1}`).join('\n');
    const result = await analyzeLyrics(longText, {
      style: StyleOption.BOOMBAP,
      energy: EnergyOption.MEDIUM,
    });

    expect(result.lines).toHaveLength(AI_ANALYZE_LINE_LIMIT);
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackMessage).toContain(`${AI_ANALYZE_LINE_LIMIT}`);
  });
});
