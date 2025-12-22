import React, { useState } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { registerPlugin } from '@capacitor/core';

// Definice našeho nativního pluginu
const AiProducer = registerPlugin<any>('AiProducer');

// Stavy modelu
type ModelStatus = 'not_loaded' | 'loading' | 'loaded' | 'error' | 'testing' | 'ready';

interface ModelPickerProps {
  onStatusChange?: (status: ModelStatus, message: string) => void;
}

const ModelPicker: React.FC<ModelPickerProps> = ({ onStatusChange }) => {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('not_loaded');
  const [statusMessage, setStatusMessage] = useState<string>('Model není načten');
  const [modelName, setModelName] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const updateStatus = (status: ModelStatus, message: string) => {
    setModelStatus(status);
    setStatusMessage(message);
    onStatusChange?.(status, message);
  };

  const pickAndLoadModel = async () => {
    try {
      updateStatus('loading', 'Vybírám soubor...');

      const result = await FilePicker.pickFiles({
        multiple: false,
        readData: false
      });

      if (result.files && result.files.length > 0) {
        const selectedFile = result.files[0];
        const fileName = selectedFile.name || selectedFile.path?.split('/').pop() || 'Neznámý model';
        setModelName(fileName);

        if (selectedFile.path) {
          updateStatus('loading', `Načítám model: ${fileName}...`);

          try {
            await AiProducer.loadModel({ path: selectedFile.path });
            updateStatus('loaded', `Model "${fileName}" byl úspěšně načten!`);

            // Krátká pauza a pak test modelu
            setTimeout(() => testModel(), 1000);
          } catch (loadError: any) {
            updateStatus('error', `Chyba při načítání: ${loadError.message || 'Neznámá chyba'}`);
          }
        } else {
          updateStatus('error', 'Nepodařilo se získat cestu k souboru.');
        }
      } else {
        updateStatus('not_loaded', 'Výběr zrušen');
      }
    } catch (error: any) {
      console.error('Chyba při výběru modelu:', error);
      updateStatus('error', `Chyba: ${error.message || 'Nepodařilo se vybrat soubor'}`);
    }
  };

  const testModel = async () => {
    try {
      updateStatus('testing', 'Testuji model s jednoduchým dotazem...');

      // Jednoduchý test - pošleme krátký text pro ověření funkčnosti
      const testResult = await AiProducer.analyzeLyrics({
        text: 'Test',
        context: 'test',
        selectedMode: 'AUTO'
      });

      if (testResult) {
        updateStatus('ready', `✓ Model "${modelName}" je připraven k použití!`);
      } else {
        updateStatus('error', 'Model nevrátil očekávanou odpověď.');
      }
    } catch (testError: any) {
      console.error('Test modelu selhal:', testError);
      updateStatus('error', `Test selhal: ${testError.message || 'Model nefunguje správně'}`);
    }
  };

  const getStatusColor = () => {
    switch (modelStatus) {
      case 'ready': return '#22c55e'; // green
      case 'loaded': return '#3b82f6'; // blue
      case 'loading':
      case 'testing': return '#f59e0b'; // amber
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getStatusIcon = () => {
    switch (modelStatus) {
      case 'ready': return '✓';
      case 'loaded': return '◉';
      case 'loading':
      case 'testing': return '◌';
      case 'error': return '✗';
      default: return '○';
    }
  };

  return (
    <div style={{
      marginBottom: '20px',
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#1e293b',
      transition: 'all 0.3s ease'
    }}>
      {/* Header - vždy viditelný */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '1.5rem',
            color: getStatusColor(),
            fontWeight: 'bold'
          }}>
            {getStatusIcon()}
          </span>
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Stav AI Modelu
            </div>
            <div style={{
              color: getStatusColor(),
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              {statusMessage}
            </div>
          </div>
        </div>
        <span style={{ color: '#64748b', fontSize: '1.2rem' }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Rozbalovací sekce */}
      {isExpanded && (
        <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
          {/* Info o modelu */}
          {modelName && (
            <div style={{
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: '#334155',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: '#94a3b8' }}>Načtený model: </span>
              <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{modelName}</span>
            </div>
          )}

          {/* Animace načítání */}
          {(modelStatus === 'loading' || modelStatus === 'testing') && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#1e3a5f',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #3b82f6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ color: '#93c5fd' }}>{statusMessage}</span>
            </div>
          )}

          {/* Tlačítko pro výběr modelu */}
          <button
            onClick={pickAndLoadModel}
            disabled={modelStatus === 'loading' || modelStatus === 'testing'}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: modelStatus === 'loading' || modelStatus === 'testing' ? '#334155' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: modelStatus === 'loading' || modelStatus === 'testing' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: modelStatus === 'loading' || modelStatus === 'testing' ? 0.6 : 1
            }}
          >
            {modelStatus === 'loading' || modelStatus === 'testing'
              ? 'Načítám...'
              : modelStatus === 'ready'
                ? 'Změnit model'
                : 'Vybrat model z tabletu'}
          </button>

          {/* Nápověda */}
          <p style={{
            marginTop: '12px',
            fontSize: '0.75rem',
            color: '#64748b',
            textAlign: 'center'
          }}>
            Podporované formáty: .tflite, .bin (Gemma modely)
          </p>
        </div>
      )}

      {/* CSS animace */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ModelPicker;
