import React from 'react';
import { ENERGY_LABELS, ENERGY_OPTIONS, EnergyOption, STYLE_LABELS, STYLE_OPTIONS, StyleOption } from './editorTypes';
import { AI_ANALYZE_LINE_LIMIT } from './lyricsAi';

interface LyricsInputPanelProps {
  lyrics: string;
  setLyrics: (value: string) => void;
  style: StyleOption;
  setStyle: (value: StyleOption) => void;
  energy: EnergyOption;
  setEnergy: (value: EnergyOption) => void;
  modelReady: boolean;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  status?: string;
}

const LyricsInputPanel: React.FC<LyricsInputPanelProps> = ({
  lyrics,
  setLyrics,
  style,
  setStyle,
  energy,
  setEnergy,
  modelReady,
  onAnalyze,
  isAnalyzing,
  status = '',
}) => {
  const lyricsTextareaId = 'lyrics-input-textarea';
  const styleSelectId = 'lyrics-style-select';
  const energySelectId = 'lyrics-energy-select';
  const lineLimitHintId = 'lyrics-line-limit-hint';
  const lineCount = lyrics ? lyrics.split('\n').length : 0;
  const isOverLineLimit = lineCount > AI_ANALYZE_LINE_LIMIT;
  const canAnalyze = Boolean(lyrics.trim()) && modelReady && !isAnalyzing;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="card flex flex-col gap-4 border-surface-700/60">
        <div>
          <h2 className="text-xl font-black text-surface-100 sm:text-2xl">Vlož svůj text</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-400">
            Aplikace vytáhne slabší řádky a pro každý vrátí tři varianty: balanced, flow a rhyme.
          </p>
        </div>

        <label htmlFor={lyricsTextareaId} className="text-sm font-semibold text-surface-300">
          Text skladby
        </label>
        <textarea
          id={lyricsTextareaId}
          value={lyrics}
          onChange={(event) => setLyrics(event.target.value)}
          placeholder={'Makám celej den, hlava plná stresu...\nKaždej další krok mě stojí další dech...'}
          className="input min-h-[360px] resize-y font-mono text-base leading-7 sm:min-h-[480px]"
          disabled={isAnalyzing}
          aria-describedby={lineLimitHintId}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p id={lineLimitHintId} className="text-xs uppercase tracking-[0.2em] text-surface-500">
            {lineCount} řádků z doporučeného maxima {AI_ANALYZE_LINE_LIMIT}
          </p>

          {isOverLineLimit ? (
            <p className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              Zpracuje se jen prvních {AI_ANALYZE_LINE_LIMIT} řádků
            </p>
          ) : (
            <p className="text-xs text-surface-500">Celý text odejde do jednoho requestu kvůli kontextu.</p>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-6">
        <div className="card border-surface-700/60">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-surface-500">Nastavení</p>

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor={styleSelectId} className="mb-2 block text-sm font-semibold text-surface-300">Styl</label>
              <select
                id={styleSelectId}
                value={style}
                onChange={(event) => setStyle(event.target.value as StyleOption)}
                className="input cursor-pointer"
                disabled={isAnalyzing}
              >
                {STYLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {STYLE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={energySelectId} className="mb-2 block text-sm font-semibold text-surface-300">Energie</label>
              <select
                id={energySelectId}
                value={energy}
                onChange={(event) => setEnergy(event.target.value as EnergyOption)}
                className="input cursor-pointer"
                disabled={isAnalyzing}
              >
                {ENERGY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {ENERGY_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card border-surface-700/60">
          <div className="rounded-2xl border border-surface-700 bg-surface-950/40 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Postup</p>
            <p className="mt-2 text-sm leading-6 text-surface-300">
              1. Připoj AI backend. 2. Vlož text. 3. Vyber lepší řádky a zkopíruj výsledek.
            </p>
          </div>

          {!modelReady ? (
            <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Nejdřív nahoře připoj některý AI backend. Pak se odemkne analýza textu.
            </div>
          ) : null}

          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className="btn-primary w-full rounded-2xl px-6 py-4 text-base font-black tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? 'Vylepšuji text...' : modelReady ? 'Vylepšit text' : 'Nejdřív připoj AI backend'}
          </button>

          <p className="mt-4 text-sm leading-6 text-surface-400">
            Výstup dostaneš po řádcích. Vybereš si lepší varianty a zbytek necháš beze změny.
          </p>

          {status ? (
            <div className="mt-4 rounded-2xl border border-primary-500/20 bg-primary-500/10 px-4 py-3 text-sm text-primary-200">
              {status}
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
};

export default LyricsInputPanel;
