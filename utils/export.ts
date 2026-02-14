import { LyricSegment, FinalOutput } from '../types';

export const exportToTxt = (segments: LyricSegment[], output?: FinalOutput): string => {
  const lines: string[] = [];
  
  lines.push('='.repeat(50));
  lines.push('PRODUCER.AI - EXPORT TEXTU');
  lines.push('='.repeat(50));
  lines.push('');
  
  const finalLyrics = output?.lyrics || segments.map(s => s.originalText).join('\n');
  lines.push(finalLyrics);
  lines.push('');
  
  if (output?.musicDescription) {
    lines.push('='.repeat(50));
    lines.push('POPIS HUDBY');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(output.musicDescription);
  }
  
  if (output?.metaTags && output.metaTags.length > 0) {
    lines.push('');
    lines.push('='.repeat(50));
    lines.push('META TAGS');
    lines.push('='.repeat(50));
    lines.push(output.metaTags.join(', '));
  }
  
  lines.push('');
  lines.push(`Exportováno: ${new Date().toLocaleString('cs-CZ')}`);
  
  return lines.join('\n');
};

export const exportToJson = (
  segments: LyricSegment[], 
  output: FinalOutput | null, 
  context: string, 
  mode: string
): string => {
  const data = {
    metadata: {
      exportedAt: new Date().toISOString(),
      mode,
      context,
      segmentCount: segments.length,
    },
    lyrics: segments.map(s => ({
      id: s.id,
      text: s.originalText,
      isProblematic: s.isProblematic,
      issueDescription: s.issueDescription,
      variants: s.variants.map(v => ({
        id: v.id,
        text: v.text,
        type: v.type,
        confidence: v.confidence,
        isSelected: v.id === s.selectedVariantId
      })),
      selectedVariantId: s.selectedVariantId,
      smartSuggestions: s.smartSuggestions
    })),
    finalOutput: output ? {
      lyrics: output.lyrics,
      musicDescription: output.musicDescription,
      confidence: output.confidence,
      metaTags: output.metaTags
    } : null
  };
  
  return JSON.stringify(data, null, 2);
};

export const exportToSunoFormat = (segments: LyricSegment[], output: FinalOutput | null): string => {
  const lyrics = output?.lyrics || segments.map(s => s.originalText).join('\n');
  const description = output?.musicDescription || '';
  const tags = output?.metaTags?.join(', ') || '';
  
  return `---PROMPT---
Style: ${description}

---LYRICS---
${lyrics}

---TAGS---
${tags}

---END---`;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};
