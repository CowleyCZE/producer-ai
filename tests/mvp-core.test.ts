import { describe, expect, it } from 'vitest';
import { __testing, assembleLyrics } from '../features/editor/lyricsAi';
import { diffText } from '../features/editor/textDiff';
import { EditableLine } from '../features/editor/editorTypes';

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
});
