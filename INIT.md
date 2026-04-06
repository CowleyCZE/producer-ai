# INIT

## Záměr aplikace

`Producer.ai` má být úzké MVP pro rychlou úpravu rapových textů po řádcích.

Uživatel:
- vloží text
- zvolí styl a energii
- nechá AI vytipovat slabé řádky
- pro každý problémový řádek dostane 3 použitelné varianty
- vybere lepší verzi a zkopíruje výsledný text

## Co už je hotové

- zúžené MVP flow bez původního širokého dashboardu
- line-based AI analýza v jednom requestu
- varianty `balanced`, `flow`, `rhyme`
- regenerate jednoho řádku
- diff highlight proti originálu
- lokální ukládání draftu
- základní Android shell přes Capacitor
- základní testy pro MVP flow a provider restore

## Co chceme dál udělat

### Produkt

- dotáhnout editor do opravdu rychlého "vyber a pokračuj" flow
- zlepšit čitelnost problémových řádků na mobilu
- držet produkt úzký a nevracet do MVP vedlejší nástroje

### AI vrstva

- zpřesnit fallbacky pro slabé nebo nevalidní odpovědi modelu
- dál ladit prompt pro češtinu, rytmus a přirozenější rýmy
- přidat robustnější validaci line-level výstupu

### UX a UI

- doladit input obrazovku a provider panel pro menší displeje
- zlepšit sticky akce a preview výsledného textu
- případně přidat jemný onboarding pro první použití

### Android

- dočistit Android package a test namespace na `com.producer.ai.app`
- udržet Android shell jako tenkou obálku kolem webového MVP
- později ověřit build a chování na reálném zařízení

### Kód a kvalita

- průběžně držet naming konzistentní s MVP strukturou
- nepřidávat zpět mrtvé post-MVP moduly
- rozšiřovat testy jen tam, kde kryjí reálné regresní body

## Co teď vědomě neděláme

- BPM analyzer
- batch processing
- širší projekt manager
- rhyme dictionary jako samostatný nástroj
- komplexní workstation funkce mimo hlavní line editor
