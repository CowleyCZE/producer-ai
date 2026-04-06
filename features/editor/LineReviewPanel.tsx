import React, { useMemo, useRef, useState } from 'react';
import { assembleLyrics, computeRhymeDensity, isAlternativeSelection, isLineResolved, regenerateLine, resolveLineText } from './lyricsAi';
import { EditableLine, EnergyOption, StyleOption, VariantType } from './editorTypes';
import { diffText } from './textDiff';
import { useToast } from '../../shared/toast/ToastContext';

interface LineReviewPanelProps {
  lines: EditableLine[];
  setLines: React.Dispatch<React.SetStateAction<EditableLine[]>>;
  style: StyleOption;
  energy: EnergyOption;
  onBack: () => void;
}

const variantOrder: VariantType[] = ['balanced', 'flow', 'rhyme'];

const variantLabels: Record<VariantType, string> = {
  balanced: 'Balanced',
  flow: 'Flow',
  rhyme: 'Rhyme',
};

function DiffPreview({ original, next }: { original: string; next: string }) {
  const tokens = useMemo(() => diffText(original, next), [original, next]);

  return (
    <p className="diff-text font-mono text-sm leading-7 text-surface-200">
      {tokens.map((token, index) => (
        <span
          key={`${token.value}-${index}`}
          className={token.changed ? 'diff-token diff-token--changed' : 'diff-token'}
        >
          {token.value}
        </span>
      ))}
    </p>
  );
}

const LineReviewPanel: React.FC<LineReviewPanelProps> = ({ lines, setLines, style, energy, onBack }) => {
  const [showOnlyProblems, setShowOnlyProblems] = useState(true);
  const [regeneratingLineId, setRegeneratingLineId] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const { success, warning, error: showError } = useToast();
  const lineRefs = useRef<Record<string, HTMLElement | null>>({});

  const assembledLyrics = useMemo(() => assembleLyrics(lines), [lines]);
  const resolvedCount = useMemo(() => lines.filter((line) => line.needsFix && isLineResolved(line)).length, [lines]);
  const problemLineCount = useMemo(() => lines.filter((line) => line.needsFix).length, [lines]);
  const nextUnresolvedLineId = useMemo(
    () => lines.find((line) => line.needsFix && !isLineResolved(line))?.id ?? null,
    [lines],
  );
  const unresolvedProblemCount = useMemo(
    () => lines.filter((line) => line.needsFix && !isLineResolved(line)).length,
    [lines],
  );
  const rhymeDensity = useMemo(
    () => computeRhymeDensity(lines.map((line) => resolveLineText(line))),
    [lines],
  );
  const rhymeDensityLabel = rhymeDensity >= 0.6 ? 'silná' : rhymeDensity >= 0.3 ? 'střední' : 'slabá';
  const visibleLines = useMemo(
    () => lines.filter((line) => !showOnlyProblems || line.needsFix),
    [lines, showOnlyProblems],
  );

  const handleSelectOption = (lineId: string, option: VariantType) => {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              selectedOption: option,
            }
          : line,
      ),
    );
  };

  const handleResetLine = (lineId: string) => {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              selectedOption: 'original',
            }
          : line,
      ),
    );
  };

  const handleRegenerate = async (lineId: string) => {
    setRegeneratingLineId(lineId);

    try {
      const alternatives = await regenerateLine(lines, lineId, { style, energy });
      setLines((currentLines) =>
        currentLines.map((line) =>
          line.id !== lineId
            ? line
            : alternatives
              ? {
                  ...line,
                  needsFix: true,
                  alternatives,
                  selectedOption: null,
                }
              : line,
        ),
      );
      if (alternatives) {
        success('Řádek má nové varianty.');
      } else {
        warning('AI nevrátila použitelné varianty. Můžeš nechat originál nebo zkusit regeneraci znovu.');
      }
    } catch (error) {
      console.error('Regenerate failed:', error);
      showError('Nepodařilo se vygenerovat nové varianty.');
    } finally {
      setRegeneratingLineId(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assembledLyrics);
      success('Výsledek je ve schránce.');
    } catch (error) {
      console.error('Copy failed:', error);
      showError('Nepodařilo se zkopírovat text.');
    }
  };

  const handleJumpToNextUnresolved = () => {
    if (!nextUnresolvedLineId) {
      return;
    }

    setShowOnlyProblems(true);
    lineRefs.current[nextUnresolvedLineId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <section className="grid gap-6 pb-28 xl:grid-cols-[1.15fr_0.85fr] xl:pb-0">
      <div className="space-y-6">
        <div className="card border-surface-700/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-surface-500">Výběr řádků</p>
              <h2 className="mt-2 text-2xl font-black text-surface-100">Vyber si lepší varianty</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-400">
                {problemLineCount > 0
                  ? `AI označila ${problemLineCount} řádků k úpravě. Ještě zbývá vyřešit ${unresolvedProblemCount}.`
                  : 'Text prošel bez problémových řádků. Můžeš ho rovnou zkopírovat nebo se vrátit zpět.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {nextUnresolvedLineId ? (
                <button onClick={handleJumpToNextUnresolved} className="btn-secondary rounded-xl px-4 py-2 text-sm">
                  Další nevyřešený
                </button>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-surface-300">
                <input
                  type="checkbox"
                  checked={showOnlyProblems}
                  onChange={(event) => setShowOnlyProblems(event.target.checked)}
                  className="h-4 w-4 rounded border-surface-600 bg-surface-800"
                />
                Zobraz jen řádky k úpravě
              </label>

              <button onClick={onBack} className="btn-ghost rounded-xl px-4 py-2 text-sm">
                Zpět
              </button>
            </div>
          </div>
        </div>

        <div className="card border-surface-700/60">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-surface-700 bg-surface-950/40 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Řádky k úpravě</p>
              <p className="mt-2 text-2xl font-black text-surface-100">{problemLineCount}</p>
            </div>
            <div className="rounded-2xl border border-surface-700 bg-surface-950/40 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Rozhodnuté řádky</p>
              <p className="mt-2 text-2xl font-black text-surface-100">{resolvedCount}</p>
            </div>
            <div className="rounded-2xl border border-surface-700 bg-surface-950/40 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Zbývá rozhodnout</p>
              <p className="mt-2 text-2xl font-black text-surface-100">{unresolvedProblemCount}</p>
            </div>
          </div>
        </div>

        <div className="card border-surface-700/60">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Rhyme density</p>
          <p className="mt-2 text-2xl font-black text-surface-100 capitalize">{rhymeDensityLabel} ({Math.round(rhymeDensity * 100)}%)</p>
          <p className="mt-2 text-sm text-surface-400">
            Porovnání zakončení řádků ukazuje, jak silné jsou rýmy v aktuálně zvolených variantách.
          </p>
        </div>

        {problemLineCount > 0 && unresolvedProblemCount === 0 ? (
          <div className="card border-success/30 bg-success/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-success">Hotovo</p>
                <p className="mt-2 text-sm leading-6 text-surface-200">
                  Všechny označené řádky už mají vybranou variantu. Teď můžeš zkontrolovat výsledek a zkopírovat ho.
                </p>
              </div>

              <button onClick={handleCopy} className="btn-primary rounded-2xl px-4 py-3 text-sm font-black">
                Kopírovat výsledek
              </button>
            </div>
          </div>
        ) : null}

        <div className="card border-surface-700/60 xl:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Průběžný výsledek</p>
              <p className="mt-2 text-sm text-surface-300">{resolvedCount} rozhodnutých řádků z {problemLineCount}</p>
            </div>
            <button
              onClick={() => setShowMobilePreview((current) => !current)}
              className="btn-secondary rounded-xl px-4 py-2 text-sm"
            >
              {showMobilePreview ? 'Skrýt text' : 'Zobrazit text'}
            </button>
          </div>

          {showMobilePreview ? (
            <div className="mt-4 rounded-2xl border border-surface-700 bg-surface-950/70 p-4">
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-sm leading-7 text-surface-200">
                {assembledLyrics}
              </pre>
              <button onClick={handleCopy} className="btn-primary mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black">
                Kopírovat tento náhled
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {visibleLines.map((line) => {
            const isRegenerating = regeneratingLineId === line.id;
            const selectedText = resolveLineText(line);
            const originalIndex = lines.findIndex((entry) => entry.id === line.id);
            const originalSelected = line.selectedOption === 'original';

            return (
              <article
                key={line.id}
                ref={(node) => {
                  lineRefs.current[line.id] = node;
                }}
                className={`card border-surface-700/60 p-4 sm:p-6 ${
                  line.id === nextUnresolvedLineId ? 'ring-1 ring-warning/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-surface-500">
                      Řádek {originalIndex + 1}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap font-mono text-base leading-7 text-surface-300">
                      {line.original || <span className="italic text-surface-500">(prázdný řádek)</span>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {line.needsFix ? (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                        Potřebuje úpravu
                      </span>
                    ) : (
                      <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                        OK
                      </span>
                    )}
                  </div>
                </div>

                {line.needsFix && line.alternatives ? (
                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-surface-300">Varianty</p>
                      <button
                        onClick={() => handleRegenerate(line.id)}
                        disabled={isRegenerating}
                        className="btn-ghost self-start rounded-xl px-3 py-2 text-sm sm:self-auto"
                      >
                        {isRegenerating ? 'Generuji...' : 'Zkus znovu'}
                      </button>
                    </div>

                    {variantOrder.map((option) => {
                      const isSelected = line.selectedOption === option;
                      return (
                        <button
                          key={option}
                          onClick={() => handleSelectOption(line.id, option)}
                          className={`block w-full rounded-2xl border p-4 text-left transition sm:p-5 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-surface-700 bg-surface-900/50 hover:border-surface-500'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-[0.22em] text-primary-300">
                              {variantLabels[option]}
                            </span>
                            {isSelected ? (
                              <span className="text-xs font-semibold text-primary-200">Použito</span>
                            ) : null}
                          </div>
                          <DiffPreview original={line.original} next={line.alternatives[option]} />
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handleResetLine(line.id)}
                      className={`rounded-xl px-4 py-2 text-sm ${
                        originalSelected ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {originalSelected ? 'Původní řádek ponechán' : 'Ponechat původní řádek'}
                    </button>
                  </div>
                ) : line.needsFix ? (
                  <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/10 p-4">
                    <p className="text-sm font-semibold text-warning">Pro tenhle řádek teď nemám použitelnou variantu.</p>
                    <p className="mt-2 text-sm leading-6 text-surface-300">
                      AI vrátila nevalidní nebo duplicitní návrhy. Můžeš nechat originál, nebo zkusit generování znovu.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleRegenerate(line.id)}
                        disabled={isRegenerating}
                        className="btn-ghost rounded-xl px-3 py-2 text-sm"
                      >
                        {isRegenerating ? 'Generuji...' : 'Zkus znovu'}
                      </button>
                      <button
                        onClick={() => handleResetLine(line.id)}
                        className={`rounded-xl px-4 py-2 text-sm ${
                          originalSelected ? 'btn-primary' : 'btn-secondary'
                        }`}
                      >
                        {originalSelected ? 'Původní řádek ponechán' : 'Ponechat původní řádek'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-surface-700 bg-surface-900/40 px-4 py-3 text-sm text-surface-400">
                    Tento řádek zůstal beze změny.
                  </div>
                )}

                <div className="mt-6 rounded-2xl border border-surface-700 bg-surface-950/50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-500">Aktuální volba</p>
                  {line.needsFix ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">
                      {isAlternativeSelection(line.selectedOption)
                        ? `Vybraná varianta: ${variantLabels[line.selectedOption]}`
                        : originalSelected
                          ? 'Ponechaný originál'
                          : 'Bez rozhodnutí'}
                    </p>
                  ) : null}
                  {selectedText ? (
                    <div className="mt-3">
                      <DiffPreview original={line.original} next={selectedText} />
                    </div>
                  ) : (
                    <p className="mt-3 italic text-surface-500">(prázdný řádek)</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="hidden space-y-6 xl:sticky xl:top-6 xl:block xl:self-start">
        <div className="card border-surface-700/60">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-surface-500">Průběžný výsledek</p>
          <h3 className="mt-2 text-xl font-black text-surface-100">Složený text</h3>

          <pre className="mt-5 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-surface-700 bg-surface-950/70 p-4 font-mono text-sm leading-7 text-surface-200">
            {assembledLyrics}
          </pre>

          <button onClick={handleCopy} className="btn-primary mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black">
            Kopírovat text
          </button>

          {nextUnresolvedLineId ? (
            <button onClick={handleJumpToNextUnresolved} className="btn-secondary mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold">
              Přejít na další nevyřešený řádek
            </button>
          ) : null}
        </div>
      </aside>

      <div className="mobile-action-bar xl:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-surface-500">Průběžný výsledek</p>
              <p className="truncate text-sm font-semibold text-surface-200">
              {resolvedCount} rozhodnuto, {unresolvedProblemCount} zbývá
              </p>
            </div>
          <button
            onClick={() => setShowMobilePreview((current) => !current)}
            className="btn-secondary min-w-24 rounded-xl px-4 py-3 text-sm"
          >
            {showMobilePreview ? 'Skrýt' : 'Náhled'}
          </button>
          <button onClick={onBack} className="btn-ghost min-w-24 rounded-xl px-4 py-3 text-sm">
            Zpět
          </button>
          <button onClick={handleCopy} className="btn-primary rounded-2xl px-4 py-3 text-sm font-black">
            Kopírovat výsledek
          </button>
        </div>
      </div>
    </section>
  );
};

export default LineReviewPanel;
