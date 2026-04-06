import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../shared/toast/ToastContext';
import ToastViewport from '../shared/ui/ToastViewport';

const TriggerToast: React.FC<{ duration: number }> = ({ duration }) => {
  const { addToast } = useToast();

  useEffect(() => {
    addToast('info', 'Test toast', duration);
  }, [addToast, duration]);

  return null;
};

describe('Toast behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps duration=0 toasts visible until user closes them', () => {
    render(
      <ToastProvider>
        <TriggerToast duration={0} />
        <ToastViewport />
      </ToastProvider>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('auto-closes timed toasts after duration', () => {
    render(
      <ToastProvider>
        <TriggerToast duration={1200} />
        <ToastViewport />
      </ToastProvider>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
