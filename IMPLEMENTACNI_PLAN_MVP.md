# Implementační plán MVP

Tento dokument už neslouží jako původní návrh změny, ale jako aktuální stavový plán po velkém MVP refaktoru.

## Shrnutí

Velká změna aplikace proběhla:
- původní široký lyric workstation byl odstraněn
- aplikace je teď postavená kolem jediného flow `vložit text -> dostat varianty -> vybrat -> kopírovat`
- AI vrstva je line-based, validovaná a připravená na Gemini i Ollama

## Co je dokončeno

### 1. Zúžení produktu na MVP flow

Hotovo:
- odstraněné vedlejší nástroje z hlavního flow
- zrušený starý dashboard a přepnutí na jednoduchý editor
- potvrzené MVP vstupy: text, styl, energie
- potvrzené MVP výstupy: `balanced`, `flow`, `rhyme`, copy, regenerate

### 2. Přestavba UI na jednu hlavní obrazovku

Hotovo:
- input panel a results editor jsou dnes hlavní produkt
- hlavní CTA je `Vylepšit text`
- desktop i mobil mají jednoduchý layout bez produktového chaosu
- výsledkový editor má sticky preview a mobilní action bar

### 3. AI pipeline po řádcích

Hotovo:
- analýza celého textu v jednom requestu
- řádkový model `original`, `needsFix`, `alternatives`, `selectedOption`
- zachované řádkové mapování zpět na originál
- limit na prvních 30 řádků

### 4. Prompt a strict JSON kontrakt

Hotovo:
- system prompt je přepsaný pro český rapový use-case
- AI odpověď se parsuje jako strict JSON
- fallbacky řeší nevalidní JSON i slabé alternativy

### 5. Editor problémových řádků

Hotovo:
- výběr variant po řádcích
- přepínač `zobraz jen opravené řádky`
- okamžité skládání výsledného textu
- regenerate jednoho řádku bez reloadu celé stránky

### 6. Diff highlight

Hotovo:
- změny mezi originálem a návrhem se zvýrazňují token-based diffem

### 7. Copy a lokální save

Hotovo:
- copy akce přímo ve výsledcích
- draft save přes `localStorage`
- obnova práce po refreshi

### 8. Edge-case validace

Hotovo:
- fallback pro nevalidní AI strukturu
- fallback pro chybějící `alternatives`
- filtrace prázdných, duplicitních a téměř nezměněných variant
- heuristická kontrola, když AI označí vše jako bez problému

## Co zbývá jako další vlna

### A. Kvalita AI výstupu

Zbývá:
- ladit prompt na lepší češtinu a přirozenější rýmy
- případně zpřesnit heuristiky problematických řádků
- přidat další testy pro hraniční AI odpovědi

### B. UX polish

Zbývá:
- ještě zrychlit mobilní výběr variant
- případně zkrátit cestu mezi inputem a prvním použitelným výsledkem
- zvážit drobný onboarding pro první použití

### C. Android ověření

Zbývá:
- ověřit build a běh shellu na reálném zařízení
- případně dočistit zbylé Android detaily po refaktoru

## Co je mimo MVP

Tyto oblasti zůstávají mimo aktuální implementační vlnu:
- scoring 0-100
- rhyme density analyzer
- syllable consistency tool jako samostatná feature
- anti-AI detector
- explain why
- undo / redo
- rate limiting
- PRO režim
- usage tracking
- flow intensity slider
- rap persona mode

## Definice aktuálně hotového MVP

MVP je teď hotové v tom smyslu, že:
- uživatel otevře jednoduchou aplikaci bez vedlejšího chaosu
- vloží text a zvolí styl s energií
- dostane varianty pro problémové řádky
- může okamžitě vybírat a regenerovat konkrétní řádek
- vidí diff změn
- může zkopírovat výsledek
- po refreshi neztratí rozdělanou práci

Další práce už není zásadní refaktor, ale iterativní kvalita a polish.
