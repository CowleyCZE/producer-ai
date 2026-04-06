import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import LineReviewPanel from '../features/editor/LineReviewPanel';
import { EditableLine, EnergyOption, StyleOption } from '../features/editor/editorTypes';
import { ToastProvider } from '../shared/toast/ToastContext';

const lineReviewMocks = vi.hoisted(() => ({
  regenerateLine: vi.fn(),
}));

vi.mock('../features/editor/lyricsAi', async () => {
  const actual = (await vi.importActual('../features/editor/lyricsAi')) as Record<string, unknown>;
  return {
    ...actual,
    regenerateLine: lineReviewMocks.regenerateLine,
  };
});

function renderPanel(initialLines: EditableLine[]) {
  const Wrapper: React.FC = () => {
    const [lines, setLines] = React.useState(initialLines);

    return (
      <ToastProvider>
        <LineReviewPanel
          lines={lines}
          setLines={setLines}
          style={StyleOption.BOOMBAP}
          energy={EnergyOption.MEDIUM}
          onBack={vi.fn()}
        />
      </ToastProvider>
    );
  };

  return render(<Wrapper />);
}

describe('LineReviewPanel', () => {
  it('keeps current decision when regenerate returns no valid alternatives', async () => {
    lineReviewMocks.regenerateLine.mockResolvedValue(null);

    renderPanel([
      {
        id: 'line-0',
        original: 'Skaka pes přes oves',
        needsFix: true,
        alternatives: {
          balanced: 'Skáče pes přes ten oves',
          flow: 'Skáče pes, přes oves',
          rhyme: 'Skáče pes přes oves, nese otisk do obce',
        },
        selectedOption: 'balanced',
      },
    ]);

    expect(screen.getByText('1 rozhodnutých řádků z 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zkus znovu' }));

    await waitFor(() => {
      expect(lineReviewMocks.regenerateLine).toHaveBeenCalled();
      expect(screen.getByText('1 rozhodnutých řádků z 1')).toBeInTheDocument();
    });
  });

  it('marks keeping the original line as a resolved decision', () => {
    renderPanel([
      {
        id: 'line-0',
        original: 'Skaka pes přes oves',
        needsFix: true,
        alternatives: {
          balanced: 'Skáče pes přes ten oves',
          flow: 'Skáče pes, přes oves',
          rhyme: 'Skáče pes přes oves, nese otisk do obce',
        },
        selectedOption: null,
      },
    ]);

    expect(screen.getByText('0 rozhodnutých řádků z 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ponechat původní řádek' }));

    expect(screen.getByText('1 rozhodnutých řádků z 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Původní řádek ponechán' })).toBeInTheDocument();
    expect(screen.getByText('Ponechaný originál')).toBeInTheDocument();
  });

  it('shows an explicit warning when no valid alternatives are available', () => {
    renderPanel([
      {
        id: 'line-0',
        original: 'Skaka pes přes oves',
        needsFix: true,
        alternatives: null,
        selectedOption: null,
      },
    ]);

    expect(screen.getByText(/nemám použitelnou variantu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ponechat původní řádek' })).toBeInTheDocument();
  });
});
