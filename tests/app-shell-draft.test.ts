import { describe, expect, it } from 'vitest';
import { __testing as appShellTesting } from '../app/AppShell';
import { AppState, EnergyOption, StyleOption } from '../features/editor/editorTypes';

const DRAFT_STORAGE_KEY = 'producer-ai-mvp-draft';

describe('AppShell draft restore', () => {
  it('falls back to safe defaults when stored draft has invalid shape', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      appState: AppState.RESULTS,
      lyrics: 'Test',
      style: StyleOption.BOOMBAP,
      energy: EnergyOption.MEDIUM,
      lines: 'not-an-array',
    }));

    const draft = appShellTesting.getInitialDraft();
    expect(draft.appState).toBe(AppState.INPUT);
    expect(draft.lyrics).toBe('');
    expect(draft.lines).toEqual([]);
    expect(localStorage.removeItem).toHaveBeenCalledWith(DRAFT_STORAGE_KEY);
  });

  it('restores valid draft payload', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      appState: AppState.RESULTS,
      lyrics: 'Makám celej den',
      style: StyleOption.TRAP,
      energy: EnergyOption.HIGH,
      lines: [
        {
          id: 'line-0',
          original: 'Makám celej den',
          needsFix: true,
          alternatives: {
            balanced: 'Makám celej den a držím směr',
            flow: 'Makám celej den, držím směr',
            rhyme: 'Makám celej den, tlak žene ven',
          },
          selectedOption: 'balanced',
        },
      ],
    }));

    const draft = appShellTesting.readDraft();
    expect(draft?.appState).toBe(AppState.RESULTS);
    expect(draft?.style).toBe(StyleOption.TRAP);
    expect(draft?.energy).toBe(EnergyOption.HIGH);
    expect(draft?.lines).toHaveLength(1);
  });

  it('removes broken JSON draft payloads', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, '{not-valid-json');

    const draft = appShellTesting.readDraft();
    expect(draft).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith(DRAFT_STORAGE_KEY);
  });
});
