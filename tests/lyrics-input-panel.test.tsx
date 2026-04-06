import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LyricsInputPanel from '../features/editor/LyricsInputPanel';
import { EnergyOption, StyleOption } from '../features/editor/editorTypes';
import { AI_ANALYZE_LINE_LIMIT } from '../features/editor/lyricsAi';

describe('LyricsInputPanel', () => {
  it('keeps analysis disabled until AI backend is ready', () => {
    render(
      <LyricsInputPanel
        lyrics={'Makám celej den'}
        setLyrics={vi.fn()}
        style={StyleOption.BOOMBAP}
        setStyle={vi.fn()}
        energy={EnergyOption.MEDIUM}
        setEnergy={vi.fn()}
        modelReady={false}
        onAnalyze={vi.fn()}
        isAnalyzing={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Nejdřív připoj AI backend' })).toBeDisabled();
    expect(screen.getByText(/Nejdřív nahoře připoj některý AI backend/)).toBeInTheDocument();
  });

  it('shows a warning when the text is longer than the analysis limit', () => {
    const setLyrics = vi.fn();
    const longText = Array.from({ length: AI_ANALYZE_LINE_LIMIT + 2 }, (_, index) => `Řádek ${index + 1}`).join('\n');

    render(
      <LyricsInputPanel
        lyrics={longText}
        setLyrics={setLyrics}
        style={StyleOption.BOOMBAP}
        setStyle={vi.fn()}
        energy={EnergyOption.MEDIUM}
        setEnergy={vi.fn()}
        modelReady={true}
        onAnalyze={vi.fn()}
        isAnalyzing={false}
      />,
    );

    expect(screen.getByText(`Zpracuje se jen prvních ${AI_ANALYZE_LINE_LIMIT} řádků`)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Krátký text' },
    });

    expect(setLyrics).toHaveBeenCalledWith('Krátký text');
  });
});
