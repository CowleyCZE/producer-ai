import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { LyricSegment, FinalOutput, AiMode } from '../types';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lyrics: string;
  context: string;
  mode: AiMode;
  segments: LyricSegment[];
  finalOutput: FinalOutput | null;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  saveProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  updateCurrentProject: (updates: Partial<Project>) => void;
  clearCurrentProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'producer-ai-projects';

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
    }
  }, []);

  const saveProjectsToStorage = (newProjects: Project[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
    setProjects(newProjects);
  };

  const saveProject = useCallback((projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = Math.random().toString(36).substring(2, 11);
    const now = Date.now();
    const newProject: Project = {
      ...projectData,
      id,
      createdAt: now,
      updatedAt: now
    };

    const newProjects = [newProject, ...projects];
    saveProjectsToStorage(newProjects);
    setCurrentProject(newProject);
    
    return id;
  }, [projects]);

  const loadProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProject(project);
    }
  }, [projects]);

  const deleteProject = useCallback((id: string) => {
    const newProjects = projects.filter(p => p.id !== id);
    saveProjectsToStorage(newProjects);
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  }, [projects, currentProject]);

  const updateCurrentProject = useCallback((updates: Partial<Project>) => {
    if (!currentProject) return;
    
    const updated = { ...currentProject, ...updates, updatedAt: Date.now() };
    setCurrentProject(updated);
    
    const newProjects = projects.map(p => p.id === updated.id ? updated : p);
    saveProjectsToStorage(newProjects);
  }, [currentProject, projects]);

  const clearCurrentProject = useCallback(() => {
    setCurrentProject(null);
  }, []);

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      currentProject, 
      saveProject, 
      loadProject, 
      deleteProject, 
      updateCurrentProject,
      clearCurrentProject 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
