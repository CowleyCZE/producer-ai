# Producer.ai MVP - Setup

Tento projekt je úzké MVP pro úpravu rapových textů po řádcích.

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

Vývojový server pak poběží na lokální Vite adrese, typicky:
- `http://localhost:5173`

## Web příkazy

```bash
npm run dev
npm run build
npm run preview
npm test
```

## AI backend

### Google Gemini

1. Získej API key na `https://aistudio.google.com/app/apikey`
2. Otevři v aplikaci panel AI provideru
3. Zadej API key
4. Potvrď `Připojit Gemini API`

### Ollama

1. Nainstaluj Ollama
2. Spusť `ollama serve`
3. V aplikaci přepni na `Lokální Ollama`
4. Potvrď připojení

## Android workflow

Android vrstva je tenký Capacitor shell nad webovým MVP.

Aktuální Android identita:
- `appName`: `Producer.ai`
- `appId`: `com.producer.ai.app`
- plugin: `LyricsEditorPlugin`
- service: `LyricsEditorService`
- theme: `ProducerMvpTheme`

Poznámka:
- `appId` zůstává beze změny schválně, aby se nerozbila identita aplikace

### Android build

```bash
npm install
npm run build
npx cap sync android
./android/gradlew -p android assembleDebug
```

Výstup:
- `android/app/build/outputs/apk/debug/app-debug.apk`

### Android shell sync po změně webu

```bash
npm run build
npx cap sync android
```

## Termux / mobilní lokální běh

```bash
pkg update
pkg install nodejs git
git clone https://github.com/CowleyCZE/producer-ai.git
cd producer-ai
npm install
npm run dev -- --host 0.0.0.0
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
