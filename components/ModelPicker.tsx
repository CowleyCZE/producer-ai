import React from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { registerPlugin } from '@capacitor/core';

// Definice našeho nativního pluginu
const AiProducer = registerPlugin<any>('AiProducer');

const ModelPicker: React.FC = () => {
  const pickAndLoadModel = async () => {
    try {
      const result = await FilePicker.pickFiles({
        // Podporujeme .tflite i .bin modely
        multiple: false,
        readData: false // Nepotřebujeme číst obsah, jen cestu
      });

      if (result.files && result.files.length > 0) {
        const selectedFile = result.files[0];

        if (selectedFile.path) {
          await AiProducer.loadModel({ path: selectedFile.path });
          alert("Model byl úspěšně načten z tabletu!");
        } else {
          alert("Nepodařilo se získat cestu k souboru.");
        }
      }
    } catch (error) {
      console.error('Chyba při výběru modelu:', error);
      alert('Nepodařilo se načíst model.');
    }
  };

  return (
    <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>Nastavení AI Modelu</h3>
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Stáhněte si model Gemma (.tflite nebo .bin) do tabletu a vyberte ho zde.
      </p>
      <button
        onClick={pickAndLoadModel}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Vybrat model z tabletu
      </button>
    </div>
  );
};

export default ModelPicker;
