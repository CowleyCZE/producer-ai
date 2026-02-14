import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LyricSegment } from '../types';

export interface SegmentVersion {
  id: string;
  timestamp: number;
  segments: LyricSegment[];
  label?: string;
}

interface VersionContextType {
  versions: SegmentVersion[];
  currentVersionIndex: number;
  saveVersion: (segments: LyricSegment[], label?: string) => void;
  revertToVersion: (index: number) => LyricSegment[] | null;
  deleteVersion: (index: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => LyricSegment[] | null;
  redo: () => LyricSegment[] | null;
  clearHistory: () => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

const MAX_VERSIONS = 50;

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};

interface VersionProviderProps {
  children: ReactNode;
}

export const VersionProvider: React.FC<VersionProviderProps> = ({ children }) => {
  const [versions, setVersions] = useState<SegmentVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  const saveVersion = useCallback((segments: LyricSegment[], label?: string) => {
    const newVersion: SegmentVersion = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      segments: JSON.parse(JSON.stringify(segments)),
      label
    };

    setVersions(prev => {
      const newVersions = prev.slice(0, currentVersionIndex + 1);
      newVersions.push(newVersion);
      
      if (newVersions.length > MAX_VERSIONS) {
        newVersions.shift();
        return newVersions;
      }
      
      return newVersions;
    });

    setCurrentVersionIndex(prev => Math.min(prev + 1, MAX_VERSIONS - 1));
  }, [currentVersionIndex]);

  const revertToVersion = useCallback((index: number): LyricSegment[] | null => {
    if (index < 0 || index >= versions.length) return null;
    
    setCurrentVersionIndex(index);
    return JSON.parse(JSON.stringify(versions[index].segments));
  }, [versions]);

  const deleteVersion = useCallback((index: number) => {
    setVersions(prev => prev.filter((_, i) => i !== index));
    if (currentVersionIndex >= index && currentVersionIndex > 0) {
      setCurrentVersionIndex(prev => prev - 1);
    }
  }, [currentVersionIndex]);

  const undo = useCallback((): LyricSegment[] | null => {
    if (currentVersionIndex <= 0) return null;
    const newIndex = currentVersionIndex - 1;
    setCurrentVersionIndex(newIndex);
    return JSON.parse(JSON.stringify(versions[newIndex].segments));
  }, [currentVersionIndex, versions]);

  const redo = useCallback((): LyricSegment[] | null => {
    if (currentVersionIndex >= versions.length - 1) return null;
    const newIndex = currentVersionIndex + 1;
    setCurrentVersionIndex(newIndex);
    return JSON.parse(JSON.stringify(versions[newIndex].segments));
  }, [currentVersionIndex, versions]);

  const clearHistory = useCallback(() => {
    setVersions([]);
    setCurrentVersionIndex(-1);
  }, []);

  return (
    <VersionContext.Provider value={{
      versions,
      currentVersionIndex,
      saveVersion,
      revertToVersion,
      deleteVersion,
      canUndo: currentVersionIndex > 0,
      canRedo: currentVersionIndex < versions.length - 1,
      undo,
      redo,
      clearHistory
    }}>
      {children}
    </VersionContext.Provider>
  );
};
