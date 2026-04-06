# Producer.ai

`Producer.ai` je jednoduché MVP pro úpravu rapových textů v češtině.

Základní flow je záměrně úzké:
- vložíš text
- zvolíš styl a energii
- AI vytipuje problémové řádky
- pro každý problémový řádek vrátí 3 varianty: `balanced`, `flow`, `rhyme`
- vybereš si, co použiješ, a zkopíruješ výsledný text

## Co appka teď umí

- řádkovou analýzu textu v jednom AI requestu
- strict JSON kontrakt pro odpověď AI
- 3 varianty pro problematické řádky
- regenerate pouze jednoho řádku
- diff highlight změn vůči originálu
- průběžně skládaný výsledný text
- copy do schránky
- lokální draft save přes `localStorage`

## Co je mimo MVP

Tyto věci nejsou součástí hlavního flow a nejsou aktuálně cílem produktu:
- BPM analyzer
- beat grid
- batch processing
- meta tags editor
- smart suggestions mimo základní řádkové varianty
- pokročilé AI módy
- PRO monetizace

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

## Build

```bash
npm run build
```

## Android

Android shell je vedený jako tenká obálka kolem webového MVP.

Aktuální Android naming:
- `appName`: `Producer.ai`
- `appId`: `com.producer.ai.app`
- hlavní nativní plugin: `LyricsEditorPlugin`
- hlavní nativní service: `LyricsEditorService`
- hlavní Android theme: `ProducerMvpTheme`

Poznámka:
- `appId` jsem záměrně neměnil, aby se nerozbila identita aplikace a navázané buildy

Základní Android workflow:

```bash
npm install
npm run build
npx cap sync android
./android/gradlew -p android assembleDebug
```

Výstup debug APK:
- `android/app/build/outputs/apk/debug/app-debug.apk`

## Testy

```bash
npm test
```

## Poznámky k AI vrstvě

- aplikace posílá celý text najednou kvůli kontextu
- výstup se mapuje zpět po řádcích
- při nevalidní AI odpovědi se použije bezpečný fallback
- aktuální limit je maximálně 30 řádků na request

## Aktuální směr produktu

Cíl není budovat široký “lyric workstation”.

Cíl je:
- jedno tlačítko
- jeden problém
- jedno řešení

Tedy rychle zlepšit slabé řádky, zachovat význam a dát uživateli kontrolu nad výsledkem.
