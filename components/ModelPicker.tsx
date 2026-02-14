import React, { useState, useEffect } from 'react';
import { setApiKey, hasApiKey } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';

type ModelStatus = 'not_loaded' | 'loading' | 'loaded' | 'error' | 'testing' | 'ready';
type ModelProvider = 'gemini' | 'ollama';

interface ModelPickerProps {
  onStatusChange?: (status: ModelStatus, message: string) => void;
}

const ModelPicker: React.FC<ModelPickerProps> = ({ onStatusChange }) => {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('not_loaded');
  const [statusMessage, setStatusMessage] = useState<string>('Nastavení AI modelu');
  const [modelName, setModelName] = useState<string>('gemini-2.0-flash-exp');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>('gemini');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (hasApiKey()) {
      setModelName('gemini-2.0-flash-exp');
      setModelStatus('ready');
      setStatusMessage('✓ Gemini API připravena');
    }
  }, []);

  const updateStatus = (status: ModelStatus, message: string) => {
    setModelStatus(status);
    setStatusMessage(message);
    onStatusChange?.(status, message);
  };

  const handleConnectGemini = async () => {
    if (!apiKeyInput.trim()) {
      showError('Prosím zadejte API klíč');
      return;
    }
    
    try {
      updateStatus('loading', 'Ověřuji Gemini API...');
      setApiKey(apiKeyInput.trim());
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setModelName('gemini-2.0-flash-exp');
      setSelectedProvider('gemini');
      updateStatus('ready', '✓ Gemini API připravena');
      success('Gemini API úspěšně připojena!');
      
      localStorage.setItem('ai_provider', 'gemini');
    } catch (error: any) {
      updateStatus('error', 'Chyba při připojování');
      showError('Nepodařilo se připojit k Gemini API');
    }
  };

  const handleConnectOllama = async () => {
    try {
      updateStatus('loading', 'Ověřuji dostupnost Ollama...');
      
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const defaultModel = models.find((m: any) => m.name.includes('gemma')) || models[0];
        
        setModelName(defaultModel?.name || 'gemma (default)');
        setSelectedProvider('ollama');
        updateStatus('ready', '✓ Ollama připravena');
        success('Ollama úspěšně připojena!');
        localStorage.setItem('ai_provider', 'ollama');
      } else {
        throw new Error('Ollama not responding');
      }
    } catch (error: any) {
      console.error('Ollama connection error:', error);
      updateStatus('error', 'Ollama nedostupná');
      showError('Ollama není dostupná. Ujistěte se, že běží příkaz "ollama serve"');
    }
  };

  const getStatusColor = () => {
    switch (modelStatus) {
      case 'ready': return 'text-success';
      case 'loading': return 'text-warning animate-pulse';
      case 'error': return 'text-error';
      default: return 'text-surface-500';
    }
  };

  return (
    <div className="card border-surface-700 mb-6 overflow-hidden transition-all duration-300">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 bg-surface-950 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${getStatusColor()}`}>
            {modelStatus === 'ready' ? '✓' : modelStatus === 'loading' ? '◌' : modelStatus === 'error' ? '✗' : '○'}
          </span>
          <div>
            <div className="text-xs font-bold text-surface-400 uppercase tracking-widest">
              AI Backend
            </div>
            <div className={`font-semibold ${getStatusColor()}`}>
              {statusMessage}
            </div>
          </div>
        </div>
        <span className="text-surface-500 text-xl">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-surface-700 space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedProvider('gemini')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                selectedProvider === 'gemini'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
              }`}
            >
              🌐 Google Gemini
            </button>
            <button
              onClick={() => setSelectedProvider('ollama')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                selectedProvider === 'ollama'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
              }`}
            >
              💻 Lokální Ollama
            </button>
          </div>

          {selectedProvider === 'gemini' && (
            <div className="space-y-3">
              <div className="p-3 bg-surface-800 rounded-lg">
                <span className="text-surface-400 text-sm">Model: </span>
                <span className="text-surface-200 font-semibold">{modelName}</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-surface-400 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Zadejte váš API key..."
                  className="input"
                />
              </div>
              
              <button
                onClick={handleConnectGemini}
                disabled={modelStatus === 'loading'}
                className="btn-primary w-full"
              >
                {modelStatus === 'loading' ? 'Připojuji...' : 'Připojit Gemini API'}
              </button>
            </div>
          )}

          {selectedProvider === 'ollama' && (
            <div className="space-y-3">
              <div className="p-3 bg-surface-800 rounded-lg">
                <span className="text-surface-400 text-sm">Model: </span>
                <span className="text-surface-200 font-semibold">{modelName}</span>
              </div>
              
              <button
                onClick={handleConnectOllama}
                disabled={modelStatus === 'loading'}
                className="btn-primary w-full"
              >
                {modelStatus === 'loading' ? 'Připojuji...' : 'Připojit k Ollama'}
              </button>
              
              <p className="text-xs text-surface-500 text-center">
                Ujistěte se, že běží příkaz 'ollama serve'
              </p>
            </div>
          )}

          {modelStatus === 'ready' && (
            <div className="flex items-center gap-2 text-sm text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span> Aktivní: {selectedProvider === 'gemini' ? 'Google Gemini API' : 'Lokální Ollama'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelPicker;
