# Producer.ai - Lyric Architect & Creative Agent

**Producer.ai** je pokročilá webová aplikace poháněná umělou inteligencí (Google Gemini), která slouží jako virtuální hudební producent a textař. Je navržena speciálně pro tvůrce používající AI generátory hudby (jako Suno v5, Udio) nebo pro muzikanty hledající vylepšení svých textů.

Aplikace analyzuje texty z hlediska rytmu, sémantiky a emocí, navrhuje vylepšení a připravuje finální výstup včetně profesionálních Meta Tagů pro generování zvuku.

## 🚀 Klíčové Funkce

### Analýza a Editace
- **Deep Lyric Scan:** Hloubková analýza textu. Detekuje rytmické chyby ("rushing"), klišé, slabé rýmy a nadměrné opakování slov.
- **Prosodic Architect:** Automatické generování 3 variant pro každý problematický úsek textu (zaměření na flow, význam nebo rým).
- **Smart Suggestions:** Chytrá vylepšení i pro ne-problematické segmenty - alternativní frázování, rýmová vylepšení, flow variace.
- **Iterativní Editor:** Interaktivní rozhraní, kde si uživatel vybírá nejlepší varianty nebo nechává AI generovat nové.
- **Vizualizace rytmu:** Vizuální zobrazení slabik, rýmů a stress patternů.

### Meta Tags a Export
- **Meta Tags Editor:** Manuální přidávání tagů jako [Verse], [Chorus], [Drop], [Bridge], [Intro], [Outro] a dalších.
- **AI návrhy tagů:** Umělá inteligence navrhne vhodné tagy podle struktury textu.
- **Export formáty:** TXT, JSON, Suno/Udio formát.

### Nástroje
- **BPM Analyzer:** Detekce tempa z textu/kontextu, žánrové BPM rozsahy, flow intensity.
- **Beat Grid:** Vizuální zobrazení rytmu na časové ose.
- **Rýmovač:** Český slovník rýmů s detekcí dokonalých a přibližných rýmů.
- **Batch zpracování:** Zpracování více textů najednou.
- **Versionování:** Historie změn segmentů s možností undo/redo.

### AI Módy

AI automaticky detekuje záměr uživatele na základě vstupu a aktivuje jeden z následujících módů:

- **MÓD 1 (Adaptace podle Žánru):** Upraví text pro konkrétní žánr (Hip-Hop, Trap, Lo-Fi, Boombap...)
- **MÓD 2 (Adaptace podle Interpreta):** Přepíše text ve stylu konkrétního umělce.
- **MÓD 3 (Generování Promptu):** Vytvoří masivní prompt pro AI hudební generátory.
- **MÓD 4 (Překlad a Analýza):** Umělecký překlad se zachováním rytmiky.
- **MÓD 5 (Interaktivní Editace / Remix):** Provede specifické strukturální nebo náladové změny.
- **MÓD 6 (Kompozice k Vokálu):** Navrhne hudební kompozici pro acappella.

### Multi-Provider Support
- **Google Gemini API:** Hlavní AI engine (gemini-2.0-flash-exp)
- **Ollama:** Lokální inference pro offline použití
- **Semantic Caching:** 30min cache pro stejné vstupy

## 💻 Technologie

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **AI Engine:** Google Gemini API / Ollama
- **PWA:** Offline režim, instalovatelná aplikace
- **Design:** Moderní Dark Mode s micro-interakcemi

## 🛠️ Instalace

```bash
npm install
npm run dev
```

## 📦 Build

```bash
npm run build
```

## 🧪 Testy

```bash
npm test        # Spustit testy
npm run test:watch  # Watch mode
```

## 📱 PWA Instalace

1. Nasadit na HTTPS server
2. Otevřít v prohlížeči (Chrome/Safari/Edge)
3. Zvolit "Instalovat aplikaci"

## 📋 Nové funkce (poslední aktualizace)

- ✅ Smart Suggestions pro všechny segmenty
- ✅ Manuální Meta Tags editor
- ✅ BPM Analyzer s Beat Grid
- ✅ Versionování s undo/redo
- ✅ Rýmovač a slovník
- ✅ Batch zpracování
- ✅ Export TXT/JSON/Suno
- ✅ Offline PWA režim
- ✅ Tooltips a nápovědy
- ✅ Dark/Light mode
- ✅ Mobile swipe gestures
- ✅ Projekt saving/loading

## 📁 Struktura projektu

```
/producer
├── src/
│   ├── components/       # React komponenty
│   │   ├── ui/          # UI komponenty (Tooltip, BeatGrid, Skeleton)
│   │   └── *.tsx        # Hlavní komponenty
│   ├── contexts/         # React Contexts
│   │   ├── ThemeContext.tsx
│   │   ├── ToastContext.tsx
│   │   ├── ProjectContext.tsx
│   │   ├── VersionContext.tsx
│   │   └── FeedbackContext.tsx
│   ├── services/         # API služby
│   │   └── geminiService.ts
│   ├── utils/            # Utility funkce
│   │   ├── bpmAnalysis.ts
│   │   ├── rhyme.ts
│   │   └── export.ts
│   ├── hooks/            # Custom hooks
│   ├── test/             # Testy
│   └── types.ts          # TypeScript typy
├── public/               # Statické soubory
├── vite.config.ts        # Vite konfigurace
├── tailwind.config.js    # Tailwind konfigurace
└── package.json
```

## 📄 License

MIT
