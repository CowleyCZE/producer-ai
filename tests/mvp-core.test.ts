import { describe, expect, it } from 'vitest';
import { assembleLyrics } from '../features/editor/lyricsAi';
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
});
