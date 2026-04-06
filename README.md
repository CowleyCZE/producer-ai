# Producer.ai

`Producer.ai` je úzké MVP pro úpravu českých rapových textů po řádcích.

Aktuální produktový cíl:
- vložit text
- zvolit styl a energii
- nechat AI označit slabší řádky
- pro problémové řádky dostat 3 varianty: `balanced`, `flow`, `rhyme`
- vybrat lepší verze a zkopírovat výsledný text

## Stav aplikace

Aktuální webová aplikace už není původní široký lyric workstation.

Současný stav:
- jedna hlavní obrazovka s inputem a výsledkovým editorem
- AI analýza po řádcích v jednom requestu
- strict JSON kontrakt pro `lines`
- lokální draft save přes `localStorage`
- diff highlight změn proti originálu
- regenerate pouze jednoho řádku
- sticky preview a copy akce pro desktop i mobil
- přepínatelný AI backend: Google Gemini nebo lokální Ollama

## Co je hotové

- zúžený MVP flow `INPUT -> RESULTS`
- nové typy a editor model v `features/editor/editorTypes.ts`
- AI vrstva v `features/editor/lyricsAi.ts`
- validace a fallbacky pro nevalidní AI odpovědi
- ochrana proti prázdným, duplicitním a prakticky nezměněným alternativám
- limit vstupu na prvních 30 řádků se srozumitelnou hláškou
- line-by-line editor s okamžitým skládáním výsledku
- základní testy pro core flow a AI provider panel
- Android shell přejmenovaný na aktuální MVP strukturu

## Co ještě zbývá

- dál ladit prompt pro přirozenější češtinu, flow a rýmy
- ještě víc zrychlit mobilní výběr variant
- ověřit Android build a chování na zařízení
- rozšířit testy jen o další skutečné regresní body

## Co je mimo MVP

Tyto věci nejsou součástí aktuálního releasu:
- BPM analyzer
- beat grid
- batch processing
- samostatný project manager
- rhyme dictionary jako samostatný nástroj
- scoring 0-100
- explain-why mód
- undo / redo
- PRO monetizace a rate limiting

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Google Gemini / Ollama
- Capacitor Android

## Struktura repo

```text
app/
  AppShell.tsx
  styles/app.css
features/
  editor/
    editorTypes.ts
    LineReviewPanel.tsx
    LyricsInputPanel.tsx
    lyricsAi.ts
    textDiff.ts
  settings/
    AiProviderPanel.tsx
shared/
  theme/ThemeContext.tsx
  toast/ToastContext.tsx
  ui/ThemeSwitch.tsx
  ui/ToastViewport.tsx
tests/
  ai-provider-panel.test.tsx
  mvp-core.test.ts
  setup.ts
android/
  native shell for Producer.ai
main.tsx
```

## Lokální spuštění

```bash
npm install
npm run dev
```

Typická adresa dev serveru:
- `http://localhost:5173`

## Příkazy

```bash
npm run dev
npm run build
npm run preview
npm test
```

## AI backend

### Google Gemini

1. Získej API key na `https://aistudio.google.com/app/apikey`
2. Otevři panel `AI Backend`
3. Zadej API key
4. Potvrď `Připojit Gemini API`

### Ollama

1. Nainstaluj Ollama
2. Spusť `ollama serve`
3. V aplikaci přepni na `Lokální Ollama`
4. Potvrď připojení

Appka si po připojení uloží provider lokálně.

## Android

Android vrstva je tenký Capacitor shell nad webovým MVP.

Aktuální Android identita:
- `appName`: `Producer.ai`
- `appId`: `com.producer.ai.app`
- plugin: `LyricsEditorPlugin`
- service: `LyricsEditorService`
- theme: `ProducerMvpTheme`

Základní workflow:

```bash
npm install
npm run build
npx cap sync android
./android/gradlew -p android assembleDebug
```

Výstup debug APK:
- `android/app/build/outputs/apk/debug/app-debug.apk`

## Poznámky k AI vrstvě

- celý text se posílá najednou kvůli kontextu
- výsledek se mapuje zpět na původní řádky
- pokud AI vrátí špatný JSON nebo slabé alternativy, UI nespadne a použije fallback
- při vstupu nad 30 řádků se zpracuje jen prvních 30
- prompt rozlišuje varianty `balanced`, `flow`, `rhyme` a hlídá klíčová slova (`panelák`, `makám`, `děti`)
- heuristická metrika `scoreLineStructure` a `computeRhymeDensity` pomáhá vyhodit špatné náhrady a ukazuje se v editoru
- detaily heuristiky jsou logované přes `logHeuristic` (console.debug) během vývoje; telemetry může tento výstup zachytit
- `testOllama` a `testGeminiKey` logují chyby do konzole (`console.error`), takže když server běží, lze přímo ve výstupu zjistit důvod, proč je Ollama připojení nevalidní

## Směr produktu

## Jak sbírat chyby AI backendu

1. Na zařízení nebo v Termuxu spusť aplikaci přes `npm run dev` a otevři vývojový režim (Chrome Remote Debugging nebo logcat).
2. Sleduj `console.error` zprávy obsahující `testOllama failed` nebo `testGeminiKey failed` – vypisují přesnou chybu fetch (timeout, 404, CORS apod.).
3. Pro Android shell spusť `adb logcat *:S Capacitor:V` / `adb logcat *:S DevTools:V` a vyhledej řádky se `logHeuristic` nebo `Ollama test failed`.
4. Pokud se ti log nezobrazuje, ujisti se, že v `AiProviderPanel` není uložen nevalidní klíč (vymaž `localStorage` / `AsyncStorage`).
5. Po důkladné analýze zkontroluj, že server Ollama běží na `http://localhost:11434` a odpovídá `/api/tags`; případně zvýš `testOllama` timeout nebo uprav adresu přes `OLLAMA_BASE_URL`.

## Když build selže kvůli service workeru

1. Spusť `SKIP_PWA=true npm run build`, aby se vynechalo generování `service-worker.js` (výsledkem je jen čistá webová verze bez PWA).  
2. Pokud chceš vypnout PWA trvale v Termuxu, nastav `SKIP_PWA=1` do `.env` nebo přímo před `npm run build`.  
3. Pro produkční build na serveru vrať `SKIP_PWA` zpět na `false`, jinak se service worker nebude vytvářet.

Cíl není vracet do aplikace původní široký toolset.

Cíl je:
- jedno tlačítko
- jeden problém
- jedno řešení

Tedy rychle zlepšit slabé řádky, zachovat význam a nechat uživateli kontrolu nad výsledkem.
