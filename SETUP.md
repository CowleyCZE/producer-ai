# Producer.ai - Spuštění aplikace

## Požadavky

- **Node.js** verze 18+
- **npm** nebo **yarn**
- **Git**

---

## ⚡ Rychlý start

```bash
# 1. Klonování repozitáře
git clone https://github.com/CowleyCZE/producer-ai.git
cd producer-ai

# 2. Instalace závislostí
npm install

# 3. Spuštění vývojového serveru
npm run dev
```

Aplikace bude dostupná na: `http://localhost:3000`

---

## 📋 Další příkazy

### Vývoj
```bash
npm run dev          # Spustit vývojový server (doporučeno)
npm run build        # Build produkční verze
npm run preview     # Náhled produkční verze
```

### Testy
```bash
npm test           # Spustit všechny testy (49 testů)
npm run test:watch # Spustit testy v watch módu
```

### PWA / Offline
```bash
# PWA funguje automaticky po buildu
npm run build
# Výsledek je v /dist složce
```

---

## 🔧 Konfigurace API

### Google Gemini API

1. Získejte API klíč z: https://aistudio.google.com/app/apikey
2. V aplikaci klikněte na 🌐 Google Gemini
3. Vložte API klíč
4. Klikněte na "Připojit Gemini API"

### Ollama (lokální)

1. Nainstalujte Ollama: https://ollama.ai
2. Spusťte: `ollama serve`
3. V aplikaci klikněte na 💻 Lokální Ollama
4. Klikněte na "Připojit k Ollama"

---

## 📱 Mobilní použití

### Termux (Android)
```bash
pkg update
pkg install nodejs
git clone https://github.com/CowleyCZE/producer-ai.git
cd producer-ai
npm install
npm run dev -- --host 0.0.0.0
```

### PWA instalace
1. Otevřete aplikaci v Chrome/Edge
2. Klikněte na "Instalovat aplikaci"
3. Aplikace bude dostupná offline

---

## 🐛 Řešení problémů

### "Module not found"
```bash
npm install
```

### Port je obsazený
```bash
npm run dev -- --port 3001
```

### Cache problémy
```bash
rm -rf node_modules
npm install
```

### GitHub push (pro vývojáře)
```bash
git config user.email "your@email.com"
git config user.name "Your Name"
git add .
git commit -m "your message"
git push origin main
```

---

## 📦 Struktura příkazů

| Příkaz | Popis |
|--------|-------|
| `npm install` | Nainstalovat závislosti |
| `npm run dev` | Spustit vývojový server |
| `npm run build` | Build produkce |
| `npm run preview` | Náhled produkce |
| `npm test` | Spustit testy |

---

## 🌐 Live Demo

Aplikace je dostupná po buildu v `dist/` složce.
Pro deployment doporučujeme Vercel, Netlify nebo GitHub Pages.

```bash
# Příklad deploy na Vercel
npm i -g vercel
vercel
```

---

## 📞 Podpora

- GitHub Issues: https://github.com/CowleyCZE/producer-ai/issues
