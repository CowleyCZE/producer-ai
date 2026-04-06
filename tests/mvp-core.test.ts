import { describe, expect, it } from 'vitest';
import {
  __testing,
  AI_ANALYZE_LINE_LIMIT,
  analyzeLyrics,
  assembleLyrics,
  isLineResolved,
  resolveLineText,
  semanticCache,
} from '../features/editor/lyricsAi';
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

  it('treats kept original lines as resolved decisions', () => {
    const line: EditableLine = {
      id: 'line-0',
      original: 'Makám celej den',
      needsFix: true,
      alternatives: {
        balanced: 'Makám celej den a držím směr',
        flow: 'Makám celej den, držím směr',
        rhyme: 'Makám celej den, tlak žene ven',
      },
      selectedOption: 'original',
    };

    expect(isLineResolved(line)).toBe(true);
    expect(resolveLineText(line)).toBe('Makám celej den');
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

    expect(result.lines[0]?.alternatives).toBeNull();
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

  it('maps analysis lines by line_index even when AI returns them out of order', () => {
    const result = __testing.normalizeAnalysisResponse(
      {
        lines: [
          {
            line_index: 1,
            original: 'Druhej řádek drží tempo',
            needs_fix: true,
            alternatives: {
              balanced: 'Druhej řádek drží směr',
              flow: 'Druhej řádek tlačí vpřed',
              rhyme: 'Druhej řádek pálí vpřed',
            },
          },
          {
            line_index: 0,
            original: 'První řádek drží obraz',
            needs_fix: false,
            alternatives: null,
          },
        ],
      },
      'První řádek drží obraz\nDruhej řádek drží tempo',
    );

    expect(result.lines[0]?.original).toBe('První řádek drží obraz');
    expect(result.lines[0]?.needsFix).toBe(false);
    expect(result.lines[1]?.alternatives?.balanced).toBe('Druhej řádek drží směr');
    expect(result.usedFallback).toBeUndefined();
  });

  it('builds prompts with explicit output contracts', () => {
    const analyzeSystemPrompt = __testing.getAnalyzeSystemPrompt();
    const analyzePrompt = __testing.buildAnalyzePrompt('První řádek\nDruhej řádek', {
      style: StyleOption.BOOMBAP,
      energy: EnergyOption.MEDIUM,
    });
    const regenerateSystemPrompt = __testing.getRegenerateSystemPrompt();

    expect(analyzeSystemPrompt).toContain('"line_index"');
    expect(analyzePrompt).toContain('stejné "line_index"');
    expect(regenerateSystemPrompt).toContain('bez vysvětlení');
    expect(regenerateSystemPrompt).not.toContain('vysvětlit, proč se má každý typ změnit');
  });

  it('parses JSON even when model wraps it with extra text', () => {
    const parsed = __testing.parseJSONResponse(
      'Jasně, tady je výstup:\n{"lines":[{"line_index":0,"original":"A","needs_fix":false,"alternatives":null}]}\nHotovo.',
    ) as { lines?: unknown[] };

    expect(Array.isArray(parsed.lines)).toBe(true);
    expect(parsed.lines).toHaveLength(1);
  });

  it('validates the provider probe against the same JSON contract as analyze flow', () => {
    const isValid = __testing.validateConnectionProbeResponse(
      {
        lines: [
          {
            line_index: 0,
            original: 'Makám celej den',
            needs_fix: false,
            alternatives: null,
          },
          {
            line_index: 1,
            original: 'Hlava plná stresu',
            needs_fix: true,
            alternatives: {
              balanced: 'Hlava plná tlaku',
              flow: 'Hlava drží tlak',
              rhyme: 'Hlava sbírá mrak',
            },
          },
        ],
      },
      'Makám celej den\nHlava plná stresu',
    );

    expect(isValid).toBe(true);
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
