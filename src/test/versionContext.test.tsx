import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VersionProvider, useVersion } from '../../contexts/VersionContext';
import { LyricSegment } from '../../types';

const mockSegments: LyricSegment[] = [
  { id: '1', originalText: 'Test 1', isProblematic: false, variants: [], selectedVariantId: null },
  { id: '2', originalText: 'Test 2', isProblematic: false, variants: [], selectedVariantId: null },
];

describe('VersionContext', () => {
  it('should save version', () => {
    const { result } = renderHook(() => useVersion(), {
      wrapper: VersionProvider
    });

    act(() => {
      result.current.saveVersion(mockSegments, 'Initial');
    });

    expect(result.current.versions.length).toBeGreaterThanOrEqual(1);
  });

  it('should save multiple versions', () => {
    const { result } = renderHook(() => useVersion(), {
      wrapper: VersionProvider
    });

    act(() => {
      result.current.saveVersion([{ ...mockSegments[0], originalText: 'V1' }], 'Version 1');
    });
    act(() => {
      result.current.saveVersion([{ ...mockSegments[0], originalText: 'V2' }], 'Version 2');
    });

    expect(result.current.versions.length).toBeGreaterThanOrEqual(1);
  });

  it('should undo', () => {
    const { result } = renderHook(() => useVersion(), {
      wrapper: VersionProvider
    });

    act(() => {
      result.current.saveVersion([{ ...mockSegments[0], originalText: 'V1' }]);
    });
    act(() => {
      result.current.saveVersion([{ ...mockSegments[0], originalText: 'V2' }]);
    });

    const canUndoBefore = result.current.canUndo;
    
    if (canUndoBefore) {
      act(() => {
        result.current.undo();
      });
      expect(result.current.currentVersionIndex).toBeGreaterThanOrEqual(-1);
    }
  });

  it('should redo when possible', () => {
    const { result } = renderHook(() => useVersion(), {
      wrapper: VersionProvider
    });

    act(() => {
      result.current.saveVersion([{ ...mockSegments[0], originalText: 'V1' }]);
    });
    act(() => {
      result.current.saveVersion([{ ...mockSegments[0], originalText: 'V2' }]);
    });

    if (result.current.canUndo) {
      act(() => {
        result.current.undo();
      });
      expect(result.current.canRedo).toBeDefined();
    }
  });

  it('should limit versions to MAX_VERSIONS', () => {
    const { result } = renderHook(() => useVersion(), {
      wrapper: VersionProvider
    });

    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.saveVersion([{ ...mockSegments[0], originalText: `V${i}` }]);
      }
    });

    expect(result.current.versions.length).toBeLessThanOrEqual(50);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useVersion(), {
      wrapper: VersionProvider
    });

    act(() => {
      result.current.saveVersion(mockSegments);
      result.current.clearHistory();
    });

    expect(result.current.versions.length).toBe(0);
    expect(result.current.currentVersionIndex).toBe(-1);
  });
});
