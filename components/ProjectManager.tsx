import React, { useState } from 'react';
import { useProject, Project } from '../contexts/ProjectContext';
import { exportToTxt, exportToJson, exportToSunoFormat, downloadFile } from '../utils/export';
import { useToast } from '../contexts/ToastContext';

interface ProjectManagerProps {
  onLoadProject: (project: Project) => void;
  currentProjectId?: string;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onLoadProject, currentProjectId }) => {
  const { projects, deleteProject } = useProject();
  const { success, info } = useToast();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format: 'txt' | 'json' | 'suno') => {
    if (!currentProjectId) {
      info('Nejprve uložte projekt');
      return;
    }

    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${project.name.replace(/\s+/g, '-')}-${timestamp}`;

    switch (format) {
      case 'txt':
        const txtContent = exportToTxt(project.segments, project.finalOutput);
        downloadFile(txtContent, `${filename}.txt`, 'text/plain');
        success('Exportováno jako TXT');
        break;
      case 'json':
        const jsonContent = exportToJson(project.segments, project.finalOutput, project.context, project.mode);
        downloadFile(jsonContent, `${filename}.json`, 'application/json');
        success('Exportováno jako JSON');
        break;
      case 'suno':
        const sunoContent = exportToSunoFormat(project.segments, project.finalOutput);
        downloadFile(sunoContent, `${filename}-suno.txt`, 'text/plain');
        success('Exportováno pro Suno/Udio');
        break;
    }
    setShowExportMenu(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-surface-500">Žádné uložené projekty</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-surface-200">Historie projektů</h3>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn-primary text-sm py-2 px-4"
            disabled={!currentProjectId}
          >
            📥 Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-50">
              <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm">📄 Export TXT</button>
              <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm">💾 Export JSON</button>
              <button onClick={() => handleExport('suno')} className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm">🎵 Export Suno</button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              project.id === currentProjectId
                ? 'border-primary-500 bg-primary-900/20'
                : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
            }`}
            onClick={() => onLoadProject(project)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-surface-200">{project.name}</h4>
                <p className="text-xs text-surface-500 mt-1">
                  {formatDate(project.updatedAt)} • {project.segments.length} řádků
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject(project.id);
                  success('Projekt smazán');
                }}
                className="text-surface-500 hover:text-error transition-colors"
              >
                🗑️
              </button>
            </div>
            {project.context && (
              <p className="text-xs text-surface-400 mt-2 truncate">
                {project.context.substring(0, 50)}...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectManager;
