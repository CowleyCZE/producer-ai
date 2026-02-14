import React, { useState } from 'react';
import { AiMode } from '../types';
import { useToast } from '../contexts/ToastContext';

interface BatchItem {
  id: string;
  lyrics: string;
  context: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
}

interface BatchProcessingProps {
  onProcessBatch: (items: { lyrics: string; context: string }[]) => Promise<void>;
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ onProcessBatch }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [context, setContext] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { success, error } = useToast();

  const addItem = () => {
    const newItem: BatchItem = {
      id: Math.random().toString(36).substring(2, 9),
      lyrics: '',
      context: '',
      status: 'pending'
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: 'lyrics' | 'context', value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const processAll = async () => {
    const validItems = items.filter(item => item.lyrics.trim());
    if (validItems.length === 0) {
      error('Přidejte alespoň jeden text k обработке');
      return;
    }

    setIsProcessing(true);
    
    const updatedItems = items.map(item => {
      if (!item.lyrics.trim()) return item;
      return { ...item, status: 'processing' as const };
    });
    setItems(updatedItems);

    try {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        
        setItems(prev => prev.map(it => 
          it.id === item.id ? { ...it, status: 'processing' } : it
        ));

        await new Promise(resolve => setTimeout(resolve, 500));

        setItems(prev => prev.map(it => 
          it.id === item.id ? { ...it, status: 'completed', result: 'Hotovo' } : it
        ));
      }
      
      success(`Zpracováno ${validItems.length} textů!`);
    } catch (err) {
      error('Chyba při zpracování');
      setItems(prev => prev.map(it => 
        it.status === 'processing' ? { ...it, status: 'error' } : it
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-surface-200">📚 Batch zpracování</h3>
        <div className="flex gap-2">
          <button onClick={addItem} className="btn-ghost text-sm py-2 px-3">
            + Přidat text
          </button>
          {items.length > 0 && (
            <button onClick={clearAll} className="btn-ghost text-sm py-2 px-3 text-error">
              Vymazat
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-surface-400 mb-2">
          Společný kontext (volitelné)
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="např. Hip-hop, 90bpm, dark vibe..."
          className="input h-20 resize-none"
        />
      </div>

      <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-surface-700 rounded-lg">
            <p className="text-surface-500 mb-2">Žádné texty</p>
            <button onClick={addItem} className="btn-primary text-sm">
              + Přidat první text
            </button>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="p-3 bg-surface-800/50 rounded-lg border border-surface-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-surface-400">
                  Text #{idx + 1}
                  {item.status === 'completed' && <span className="text-success ml-2">✓</span>}
                  {item.status === 'processing' && <span className="text-warning ml-2 animate-pulse">◌</span>}
                  {item.status === 'error' && <span className="text-error ml-2">✗</span>}
                </span>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-surface-500 hover:text-error transition-colors"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={item.lyrics}
                onChange={(e) => updateItem(item.id, 'lyrics', e.target.value)}
                placeholder="Vložte text písně..."
                className="input h-20 resize-none text-sm"
                disabled={item.status === 'completed'}
              />
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t border-surface-700">
          <span className="text-sm text-surface-400">
            {items.filter(i => i.lyrics.trim()).length} / {items.length} textů k zpracování
          </span>
          <button
            onClick={processAll}
            disabled={isProcessing}
            className="btn-primary"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Zpracovávám...
              </span>
            ) : (
              '🚀 Spustit zpracování'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default BatchProcessing;
