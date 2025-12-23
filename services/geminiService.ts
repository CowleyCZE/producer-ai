import { registerPlugin } from '@capacitor/core';
import { AnalysisResult, FinalOutput, LyricSegment, Variant, AiMode } from "../types";

// Rozhraní definující, jaké metody náš nativní plugin poskytuje
export interface AiProducerPlugin {
  analyzeLyrics(options: { text: string; context: string; selectedMode: AiMode }): Promise<AnalysisResult>;
  regenerateSegment(options: { allSegments: LyricSegment[], currentIndex: number }): Promise<{ variants: Variant[] }>;
  generateFinalOutput(options: { segments: LyricSegment[], context: string }): Promise<FinalOutput>;
}

// Registrace pluginu - 'AiProducer' je jméno, které jsme definovali v @CapacitorPlugin anotaci v Kotlinu
const AiProducer = registerPlugin<AiProducerPlugin>("AiProducer");


// Nyní jsou všechny funkce pouze tenké "obaly" volající nativní kód
export const analyzeLyrics = async (text: string, context: string, selectedMode: AiMode): Promise<AnalysisResult> => {
  try {
    const result = await AiProducer.analyzeLyrics({ text, context, selectedMode });

    // Nativní kód již vrací plně zpracovaný objekt, ale můžeme zde provést dodatečné úpravy pro frontend
    if (!result.segments) {
      console.warn("Native plugin returned no segments, using empty array.");
      result.segments = [];
    }

    result.segments = result.segments.map(seg => ({
      ...seg,
      selectedVariantId: null // Inicializace výběru na straně frontendu
    }));
    return result;

  } catch (error: any) {
    console.error("Critical Analysis Error from native plugin:", error);
    // Zobrazí uživateli alert s chybou
    alert(`Chyba z nativního modulu: ${error.message}`);

    // Vytvoření fallback objektu v případě chyby
    return {
      mode: selectedMode,
      segments: text.split('\n').map((line, idx) => ({
        id: `err-${idx}`,
        originalText: line,
        isProblematic: true,
        issueDescription: "Chyba při komunikaci s nativním modulem.",
        variants: [],
        selectedVariantId: null
      }))
    };
  }
};

export const regenerateSegment = async (allSegments: LyricSegment[], currentIndex: number): Promise<Variant[]> => {
  try {
    const result = await AiProducer.regenerateSegment({ allSegments, currentIndex });
    return result.variants;
  } catch (e) {
    console.error("Error regenerating segment from native plugin:", e);
    return [];
  }
}

export const generateFinalOutput = async (segments: LyricSegment[], context: string): Promise<FinalOutput> => {
  const assembledText = segments.map(seg => {
    if (seg.selectedVariantId) {
      const v = seg.variants.find(v => v.id === seg.selectedVariantId);
      return v ? v.text : seg.originalText;
    }
    return seg.originalText;
  }).join("\n");

  try {
    const result = await AiProducer.generateFinalOutput({ segments, context });
    return result;
  } catch (error) {
    console.error("Error generating final output from native plugin:", error);
    // Fallback v případě chyby
    return {
      lyrics: assembledText,
      musicDescription: "Generování popisu selhalo, ale text byl zachován."
    };
  }
};