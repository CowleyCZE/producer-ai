# Implementační plán změn

Tento plán vychází z `PORADI_ZMEN.txt` a `ZMENY.txt`.

Hlavní rozhodnutí:
- priorita je ostré MVP, ne rozšiřování současného širokého feature setu
- cílový produkt je jednoduchý flow: vložit text -> kliknout -> dostat 3 varianty -> použít jednu
- AI má pracovat po řádcích v rámci jednoho requestu a vracet strict JSON
- změny po MVP zůstávají mimo první implementační vlnu

## 1. Zúžit produkt na MVP flow

Smysl:
- odstranit chaos v produktu a vrátit appku k jedné hlavní hodnotě
- přestat stavět kolem BPM, batch, meta tagů a dalších vedlejších nástrojů

ToDo:
- projít současné uživatelské flow a označit části, které nepatří do MVP
- definovat jediný primární use-case: zlepšení textu se zachováním významu
- potvrdit finální MVP vstupy: text, styl, energie
- potvrdit finální MVP výstupy: 3 varianty a možnost použít nebo zkusit znovu
- sepsat, co se v první verzi schová, odstraní nebo odloží

## 2. Přestavět UI na jednu hlavní obrazovku

Smysl:
- UI má být rychlé, čitelné a bez rozptylování
- uživatel má hned po otevření vidět textarea, volby stylu a hlavní CTA

ToDo:
- navrhnout nové rozložení jedné obrazovky pro desktop i mobil
- odstranit nebo schovat boční panely, sekundární nástroje a přebytečné akce
- zachovat pouze tyto hlavní prvky:
- velká textarea pro text
- dropdown stylu
- dropdown energie
- hlavní tlačítko `Vylepšit text`
- sekci výsledků pro varianty A/B/C
- doplnit mobilní chování: textarea přes většinu obrazovky, CTA dole, swipe mezi výsledky
- upravit texty v UI tak, aby komunikovaly jednu funkci místo celé sady nástrojů

## 3. Upravit AI pipeline na řádkovou analýzu v jednom requestu

Smysl:
- AI nesmí přepisovat celý text bez kontroly
- backend logika se musí opřít o řádky a kontext celého textu najednou

ToDo:
- změnit vstupní logiku na rozdělení textu po řádcích
- zachovat prázdné a neprázdné řádky podle potřeb skládání výsledku
- navrhnout datový model pro řádek:
- `original`
- `needsFix`
- `alternatives.balanced`
- `alternatives.flow`
- `alternatives.rhyme`
- posílat do AI celý text v jednom requestu kvůli kontextu
- držet styl jako jednoduchý hint, ne samostatný režim
- přidat limit pro dlouhé vstupy, ideálně max 30 řádků na request

## 4. Přepsat prompt a vynutit strict JSON výstup

Smysl:
- současný systém musí vracet předvídatelná data pro UI
- prompt musí být naladěný na češtinu, flow, rýmy a přirozenost

ToDo:
- vytvořit nový system prompt podle `ZMENY.txt`
- doplnit prompt tuning pro rytmus, slabiky, rýmy a přirozenou češtinu
- sjednotit user prompt na tři vstupy:
- text
- styl
- instrukce pro flow, rýmy a přirozenost
- vynutit strict JSON kontrakt s polem `lines`
- doplnit validaci odpovědi a fallback pro chybějící pole
- připravit ochranu proti nesmyslným odpovědím a divným znakům

## 5. Namapovat AI odpověď do jednoduchého editoru po řádcích

Smysl:
- uživatel musí dostat kontrolu nad každým problematickým řádkem
- aplikace má být interaktivní, ale ne složitá

ToDo:
- vytvořit transformační vrstvu z AI JSON do UI modelu
- zobrazit jen problematické řádky nebo nabídnout přepínač `zobraz jen opravené řádky`
- pro každý problémový řádek zobrazit:
- původní řádek
- 3 varianty: balanced, flow, rhyme
- akci `Použít`
- akci `Zkus znovu`
- zajistit, že klik okamžitě mění vybraný řádek bez dalšího potvrzení
- složit průběžný výsledný text z vybraných variant a původních řádků

## 6. Přidat diff highlight a rychlý wow efekt

Smysl:
- uživatel musí okamžitě vidět, co AI změnila
- tohle je jedna z klíčových hodnot MVP

ToDo:
- navrhnout způsob zvýraznění změněných slov nebo částí řádku
- zobrazit porovnání původní vs nová verze alespoň na úrovni řádku
- přidat hover nebo fokus stav pro lepší čitelnost změn
- ověřit, že diff funguje i pro češtinu a interpunkci
- udržet zobrazení jednoduché i na mobilu

## 7. Doplnit akce `Copy`, `Use`, `Regenerate this line`

Smysl:
- uživatel potřebuje rychle použít výsledek bez složitého workflow
- `Regenerate pouze jeden řádek` je podle zadání kritická funkce hned po základu

ToDo:
- přidat copy tlačítko pro finální složený text
- zavést akci `Použít` pro vybranou variantu řádku
- implementovat `Zkus znovu` pouze pro jeden řádek
- pro regenerate jednoho řádku zachovat kontext celého textu
- vracet z regenerate zase 3 varianty stejného typu
- ošetřit loading stav na úrovni jednoho řádku, ne celé stránky

## 8. Zjednodušit stav aplikace a lokální ukládání

Smysl:
- MVP nepotřebuje robustní projektový systém, ale nesmí ztrácet rozdělanou práci
- lokální save je v `PORADI_ZMEN.txt` vedený jako core vrstva

ToDo:
- určit minimální uložený stav:
- vstupní text
- vybraný styl a energii
- vybrané varianty řádků
- finální složený text
- uložit stav lokálně bez komplikovaného versioningu
- obnovit rozepsanou práci po refreshi
- zkontrolovat, že ukládání neblokuje jednoduchost UI

## 9. Přidat validace a fallbacky pro edge cases

Smysl:
- AI vrstva bude občas chybovat, MVP musí zůstat použitelné

ToDo:
- ošetřit stav, kdy AI vrátí nevalidní JSON
- ošetřit stav, kdy AI nevrátí `alternatives`
- přidat fallback na původní řádek, pokud návrhy neprojdou validací
- filtrovat varianty s podezřelou délkou mimo přibližný rozsah
- řešit případ, kdy AI označí všechny řádky jako bez problému
- nastavit uživatelsky srozumitelné chybové hlášky

## 10. Uklidit backlog a odložit post-MVP funkce

Smysl:
- tým musí mít jasně oddělené MVP a pozdější rozšíření
- bez toho se scope znovu rozjede do šířky

ToDo:
- přesunout mimo MVP tyto oblasti:
- scoring 0-100
- rhyme density analyzer
- syllable consistency check jako samostatný nástroj
- anti-AI detector
- explain why
- undo/redo
- rate limiting a PRO režim
- usage tracking
- flow intensity slider
- rap persona mode
- sepsat krátký seznam funkcí pro verzi 1.1
- označit, co zůstává technicky připravené, ale nebude v prvním releasu viditelné

## Doporučené pořadí implementace

1. Zúžení produktu a UI na MVP
2. Nový AI prompt a strict JSON kontrakt
3. Řádkový datový model a mapování do UI
4. Výběr variant a skládání finálního textu
5. Diff highlight
6. Regenerate pouze jeden řádek
7. Lokální save
8. Edge-case validace a polish

## Definice hotového MVP

MVP je hotové, pokud:
- uživatel otevře jednu hlavní obrazovku bez vedlejšího chaosu
- vloží text a zvolí styl
- po kliknutí dostane pro problémové řádky 3 varianty
- může pro každý řádek okamžitě vybrat variantu
- vidí, co se změnilo
- může regenerovat jen jeden řádek
- může zkopírovat finální text
- po refreshi neztratí rozdělanou práci
