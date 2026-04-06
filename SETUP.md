# Producer.ai MVP - Setup

Tento projekt je aktuálně úzké MVP pro úpravu rapových textů po řádcích.

## Požadavky

- Node.js 18+
- npm
- Git

Pro Android build navíc:
- Java 21
- Android SDK

## Web rychlý start

```bash
git clone https://github.com/CowleyCZE/producer-ai.git
cd producer-ai
npm install
npm run dev
```

Dev server běží typicky na:
- `http://localhost:5173`

## Web příkazy

```bash
npm run dev
npm run build
npm run preview
npm test
```

## AI backend setup

V aplikaci je panel `AI Backend`, kde se provider připojuje a přepíná.

### Google Gemini

1. Získej API key na `https://aistudio.google.com/app/apikey`
2. Otevři panel `AI Backend`
3. Vyber `Google Gemini`
4. Vlož API key
5. Klikni na `Připojit Gemini API`

### Ollama

1. Nainstaluj Ollama
2. Spusť `ollama serve`
3. Otevři panel `AI Backend`
4. Vyber `Lokální Ollama`
5. Klikni na `Připojit k Ollama`

Poznámka:
- aplikace používá první vhodný dostupný model, typicky `qwen...`
- připojený provider se ukládá do `localStorage`

## Jak dnes funguje MVP flow

1. Připojíš AI backend
2. Vložíš text
3. Zvolíš styl a energii
4. Klikneš na `Vylepšit text`
5. Ve výsledcích vybíráš varianty po řádcích
6. Zkopíruješ složený text

## Limity a fallbacky

- AI request zpracuje maximálně prvních 30 řádků
- při nevalidní AI odpovědi se použije bezpečný fallback
- když AI vrátí prázdné nebo duplicitní varianty, aplikace je zahodí
- rozdělaná práce se obnoví po refreshi přes `localStorage`

## Android workflow

Android je tenký Capacitor shell nad webovým MVP.

Aktuální Android identita:
- `appName`: `Producer.ai`
- `appId`: `com.producer.ai.app`
- plugin: `LyricsEditorPlugin`
- service: `LyricsEditorService`
- theme: `ProducerMvpTheme`

### Android build

```bash
npm install
npm run build
npx cap sync android
./android/gradlew -p android assembleDebug
```

Výstup:
- `android/app/build/outputs/apk/debug/app-debug.apk`

### Sync po změně webu

```bash
npm run build
npx cap sync android
```

## PWA instalace

1. Otevři aplikaci v Chrome nebo Edge
2. Zvol instalaci aplikace
3. Aplikace poběží jako PWA shell

## Časté problémy

### Chybí moduly

```bash
npm install
```

### Potřebuji čistý web build

```bash
rm -rf dist
npm run build
```

### Android shell nevidí nové web změny

```bash
npm run build
npx cap sync android
```

### Port je obsazený

```bash
npm run dev -- --port 3001
```
