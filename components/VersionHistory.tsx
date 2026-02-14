import React from 'react';
import { useVersion, SegmentVersion } from '../contexts/VersionContext';

export const VersionHistory: React.FC<{ onRestore: (segments: any[]) => void }> = ({ onRestore }) => {
  const { versions, currentVersionIndex, revertToVersion, deleteVersion, canUndo, canRedo, undo, redo } = useVersion();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (versions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-surface-500 text-sm">Zatím žádné změny</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            const segments = undo();
            if (segments) onRestore(segments);
          }}
          disabled={!canUndo}
          className="flex-1 btn-secondary text-xs py-2 disabled:opacity-50"
        >
          ↩️ Zpět
        </button>
        <button
          onClick={() => {
            const segments = redo();
            if (segments) onRestore(segments);
          }}
          disabled={!canRedo}
          className="flex-1 btn-secondary text-xs py-2 disabled:opacity-50"
        >
          ↪️ Dopředu
        </button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {versions.map((version, idx) => (
          <div
            key={version.id}
            className={`p-2 rounded-lg border cursor-pointer transition-all ${
              idx === currentVersionIndex
                ? 'border-primary-500 bg-primary-900/20'
                : 'border-surface-700 bg-surface-800/30 hover:bg-surface-800'
            }`}
            onClick={() => {
              const segments = revertToVersion(idx);
              if (segments) onRestore(segments);
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-surface-300">
                  {version.label || `Verze ${idx + 1}`}
                </span>
                <span className="text-xs text-surface-500 ml-2">
                  {formatDate(version.timestamp)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteVersion(idx);
                }}
                className="text-surface-500 hover:text-error text-xs"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-surface-500 mt-1">
              {version.segments.length} segmentů
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;
