# INIT

## Záměr aplikace

`Producer.ai` je úzké MVP pro rychlou úpravu českých rapových textů po řádcích.

Uživatel:
- vloží text
- zvolí styl a energii
- nechá AI označit slabé řádky
- pro problémové řádky dostane 3 varianty
- vybere lepší verze a zkopíruje výsledný text

## Co je teď hotové

- zúžené MVP flow bez původního dashboardu a vedlejších toolů
- přechod na architekturu `app/`, `features/`, `shared/`
- line-based AI analýza v jednom requestu
- varianty `balanced`, `flow`, `rhyme`
- regenerate jednoho řádku
- diff highlight proti originálu
- lokální ukládání draftu
- sticky preview a copy akce pro desktop i mobil
- AI provider panel pro Gemini a Ollama
- robustnější validace AI odpovědi a line-level fallbacky
- základní web testy pro MVP flow a provider panel
- základní Android shell přes Capacitor s novým namingem

## Co dál chceme dělat

### Produkt a UX

- ještě zrychlit flow "vyber a pokračuj"
- zlepšit čitelnost variant na menších displejích
- případně přidat jemný první onboarding bez rozšíření scope

### AI vrstva

- dál ladit prompt pro češtinu, rytmus a rýmy
- zpřesnit heuristiky pro označení problémových řádků
- rozšiřovat testy na další reálné regresní body AI validace

### Android

- ověřit debug build a shell na zařízení
- dočistit Android namespace a chování kolem shellu tam, kde to ještě zůstalo po staré appce

### Kód a kvalita

- držet dokumentaci synchronně s MVP realitou
- nepřidávat zpět mrtvé post-MVP moduly
- rozšiřovat testy pouze tam, kde kryjí skutečné riziko

## Co teď vědomě neděláme

- BPM analyzer
- batch processing
- širší project manager
- rhyme dictionary jako samostatný nástroj
- scoring 0-100
- explain why
- undo / redo
- rate limiting a PRO režim
- komplexní workstation funkce mimo hlavní line editor
