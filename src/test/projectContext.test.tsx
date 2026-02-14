import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ProjectProvider, useProject } from '../../contexts/ProjectContext';
import { AiMode } from '../../types';

describe('ProjectContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save a new project', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ProjectProvider
    });

    let projectId: string;
    act(() => {
      projectId = result.current.saveProject({
        name: 'Test Project',
        lyrics: 'Test lyrics',
        context: 'hip-hop',
        mode: AiMode.AUTO,
        segments: [],
        finalOutput: null
      });
    });

    expect(projectId).toBeDefined();
    expect(result.current.projects.length).toBe(1);
    expect(result.current.currentProject?.name).toBe('Test Project');
  });

  it('should load a project', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ProjectProvider
    });

    let projectId: string;
    act(() => {
      projectId = result.current.saveProject({
        name: 'Test Project',
        lyrics: 'Test lyrics',
        context: 'hip-hop',
        mode: AiMode.AUTO,
        segments: [],
        finalOutput: null
      });
    });

    act(() => {
      result.current.loadProject(projectId);
    });

    expect(result.current.currentProject?.name).toBe('Test Project');
  });

  it('should delete a project', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ProjectProvider
    });

    let projectId: string;
    act(() => {
      projectId = result.current.saveProject({
        name: 'Test Project',
        lyrics: 'Test lyrics',
        context: '',
        mode: AiMode.AUTO,
        segments: [],
        finalOutput: null
      });
    });

    expect(result.current.projects.length).toBe(1);

    act(() => {
      result.current.deleteProject(projectId);
    });

    expect(result.current.projects.length).toBe(0);
  });

  it('should update current project', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ProjectProvider
    });

    act(() => {
      result.current.saveProject({
        name: 'Test Project',
        lyrics: 'Test lyrics',
        context: '',
        mode: AiMode.AUTO,
        segments: [],
        finalOutput: null
      });
    });

    act(() => {
      result.current.updateCurrentProject({ name: 'Updated Name' });
    });

    expect(result.current.currentProject?.name).toBe('Updated Name');
  });

  it('should clear current project', () => {
    const { result } = renderHook(() => useProject(), {
      wrapper: ProjectProvider
    });

    act(() => {
      result.current.saveProject({
        name: 'Test Project',
        lyrics: 'Test lyrics',
        context: '',
        mode: AiMode.AUTO,
        segments: [],
        finalOutput: null
      });
    });

    expect(result.current.currentProject).not.toBeNull();

    act(() => {
      result.current.clearCurrentProject();
    });

    expect(result.current.currentProject).toBeNull();
  });

  it('should load projects from localStorage on mount', () => {
    const mockStorage: Record<string, string> = {};
    const storedData = [{
      id: 'test-id',
      name: 'Loaded Project',
      lyrics: 'Loaded lyrics',
      context: '',
      mode: 'AUTO',
      segments: [],
      finalOutput: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }];
    
    mockStorage['producer-ai-projects'] = JSON.stringify(storedData);
    
    (localStorage.getItem as any).mockImplementation((key: string) => mockStorage[key]);

    const { result } = renderHook(() => useProject(), {
      wrapper: ProjectProvider
    });

    expect(result.current.projects.length).toBe(1);
    expect(result.current.projects[0].name).toBe('Loaded Project');
  });
});
