# Implementační tasky

Tento dokument navazuje na `IMPLEMENTACNI_PLAN_MVP.md`, ale už nepopisuje původní refaktor k provedení. Ten je hotový. Níže je aktualizovaný backlog po velké změně aplikace.

## Stav

Dokončeno:
- ořez scope na ostré MVP
- nová architektura `app/`, `features/`, `shared/`
- nový line-based editor
- AI kontrakt a strict JSON vrstva
- diff highlight
- regenerate jednoho řádku
- lokální save
- základní validace a fallbacky

Aktuální práce už není "přestavět aplikaci", ale "dolaďovat kvalitu MVP".

## Priorita 1: AI kvalita a validace

### Task 1.1: Doladit prompt pro přirozenější češtinu

Cíl:
- snížit generické nebo kostrbaté formulace

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/features/editor/lyricsAi.ts`

ToDo:
- ladit wording system promptu
- zpřesnit instrukce pro flow vs rhyme variantu
- omezit klišé a moc základní rýmy

Definition of done:
- výstupy působí přirozeněji a méně "AI"

### Task 1.2: Zpřesnit heuristiku problémových řádků

Cíl:
- líp rozlišit, kdy má fallback řádek skutečně označit

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/features/editor/lyricsAi.ts`

ToDo:
- přehodnotit hranice pro délku řádku
- přehodnotit pravidla pro opakování slov
- případně rozšířit jednoduchou syllable heuristiku

Definition of done:
- méně falešných pozitiv i falešných negativ

### Task 1.3: Rozšířit AI regresní testy

Cíl:
- chránit line mapping a fallbacky před regresí

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/tests/mvp-core.test.ts`

ToDo:
- přidat testy pro dlouhý input nad 30 řádků
- přidat testy pro chybějící `lines`
- přidat testy pro duplicitní nebo podezřelé alternativy

Definition of done:
- hlavní edge case body jsou pokryté testy

## Priorita 2: UX a mobilní flow

### Task 2.1: Zrychlit mobilní výběr variant

Cíl:
- zmenšit počet tapů mezi prvním výsledkem a finálním copy

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/features/editor/LineReviewPanel.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/app/styles/app.css`

ToDo:
- zkontrolovat hustotu informací na malých displejích
- případně zjednodušit kartu řádku
- případně zvýraznit další doporučený krok

Definition of done:
- mobilní editor je rychlejší a čitelnější

### Task 2.2: Doladit input obrazovku pro první použití

Cíl:
- uživatel musí okamžitě pochopit, co se stane po kliknutí

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/features/editor/LyricsInputPanel.tsx`

ToDo:
- zkontrolovat helper texty
- případně zpřesnit placeholder
- případně přidat minimální hint pro první použití

Definition of done:
- input screen je samovysvětlující bez zbytečného textu

## Priorita 3: Android ověření

### Task 3.1: Ověřit Android shell po refaktoru

Cíl:
- potvrdit, že webové MVP funguje i v tenké nativní obálce

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/android/app/src/main/java/com/producer/ai/app/LyricsEditorPlugin.kt`
- `/home/cowley/Dokumenty/projekty/producer-ai/android/app/src/main/java/com/producer/ai/app/LyricsEditorService.kt`
- `/home/cowley/Dokumenty/projekty/producer-ai/android/app/src/main/AndroidManifest.xml`

ToDo:
- spustit Android build
- zkontrolovat namespace, theme a plugin wiring
- ověřit shell na zařízení nebo emulátoru

Definition of done:
- Android build je potvrzený a shell neběží na mrtvých starých názvech

## Mimo backlog tohoto MVP

Tyto věci sem vědomě nevracet:
- BPM analyzer
- batch processing
- rhyme dictionary jako samostatný tool
- project manager
- scoring 0-100
- explain why
- undo / redo
- PRO monetizace
