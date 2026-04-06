# Implementační tasky

Tento dokument převádí [IMPLEMENTACNI_PLAN_MVP.md](/home/cowley/Dokumenty/projekty/producer-ai/IMPLEMENTACNI_PLAN_MVP.md) na konkrétní pracovní tasky v doporučeném pořadí implementace.

Zásada:
- nejdřív ořez scope a datový model
- potom AI kontrakt
- potom UI a interakce
- až nakonec polish a fallbacky

## Fáze 1: Ořez scope a nová kostra aplikace

### Task 1.1: Vyhodit z hlavního flow vedlejší nástroje

Cíl:
- `App.tsx` přestat používat jako dashboard se sidebar nástroji

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/App.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/BPMAnalyzer.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/BatchProcessing.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/ProjectManager.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/RhymeDictionary.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/VersionHistory.tsx`

ToDo:
- odstranit sidebar a jeho stav z `App.tsx`
- odebrat tlačítka pro projekty, rýmovač, batch, BPM a historii z headeru
- zjednodušit header na brand, případně theme toggle a minimum akcí
- rozhodnout, zda vedlejší komponenty zůstanou pouze nepoužité, nebo se přesunou do post-MVP

Definition of done:
- aplikace už neotvírá vedlejší moduly v hlavním flow
- uživatel se z landing/input obrazovky dostane jen do výsledků a práce s textem

### Task 1.2: Zredukovat aplikační stavy

Cíl:
- místo třífázového produktu s extra produkčním výstupem držet jednoduché MVP flow

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/App.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/types.ts`

ToDo:
- zkontrolovat, zda `AppState.INPUT -> EDITING -> FINISHED` stále dává smysl
- pokud ne, převést flow na `INPUT -> RESULTS`
- zrušit závislost na generování finálního produkčního popisu, pokud není pro MVP nutný
- omezit globální loading logiku jen na akce, které v MVP skutečně zůstanou

Definition of done:
- stav aplikace odpovídá jednoduchému flow vložit text -> dostat varianty -> použít text

## Fáze 2: Nový datový model a AI kontrakt

### Task 2.1: Navrhnout nový typový model pro řádkovou editaci

Cíl:
- odtrhnout se od starého modelu `segments + variants` orientovaného na širokou analýzu

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/types.ts`
- `/home/cowley/Dokumenty/projekty/producer-ai/services/geminiService.ts`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`

ToDo:
- přidat typ pro AI odpověď po řádcích
- přidat typ pro UI řádek s výběrem varianty
- sjednotit názvy polí na:
- `original`
- `needsFix`
- `alternatives`
- `selectedOption`
- přidat typy pro varianty `balanced`, `flow`, `rhyme`
- rozhodnout, jak reprezentovat neprázdné a prázdné řádky

Definition of done:
- typy pokrývají nový AI JSON i nový editor bez ad-hoc mapování v komponentách

### Task 2.2: Přepsat system prompt pro MVP

Cíl:
- AI musí analyzovat text po řádcích a vracet přesně to, co UI potřebuje

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/services/geminiService.ts`

ToDo:
- odstranit staré prompty zaměřené na segmenty, módové analýzy a finální music description
- vložit nový system prompt podle `ZMENY.txt`
- přidat tuning pro češtinu, slabiky, flow a rýmy
- ponechat styl jako jednoduchý hint
- definovat oddělený prompt pro:
- full analysis request
- regenerate one line

Definition of done:
- prompty odpovídají MVP zadání a nepoužívají starou logiku s módy typu adaptace, překlad a podobně

### Task 2.3: Vynutit strict JSON a validaci

Cíl:
- AI vrstva musí vracet robustní strukturovaná data

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/services/geminiService.ts`

ToDo:
- upravit parser na kontrakt:
- `{ "lines": [...] }`
- validovat existenci pole `lines`
- validovat u každého řádku `original`, `needs_fix`, `alternatives`
- převést AI naming na interní naming konzistentně
- přidat fallback pro nevalidní nebo neúplnou odpověď
- filtrovat podezřelé návrhy podle délky a znaků

Definition of done:
- nevalidní AI odpověď nerozbije UI a skončí bezpečným fallbackem

### Task 2.4: Přepsat `analyzeLyrics` na jeden request nad celým textem

Cíl:
- AI má dostat kontext celého textu, ale vrátit výsledek po řádcích

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/services/geminiService.ts`

ToDo:
- rozdělit text do řádků
- přidat limit maximálního počtu řádků
- vytvořit prompt s textem, stylem a instrukcemi
- odstranit závislost na starém `AiMode`, pokud už není potřeba
- vracet nový result model pro UI editor
- zachovat rozumný local fallback bez generování nesmyslů

Definition of done:
- `analyzeLyrics` vrací nový line-based model a ne starý segmentový output

## Fáze 3: Přestavba input obrazovky

### Task 3.1: Přepsat `InputStage` na minimalistické MVP UI

Cíl:
- první obrazovka má ukazovat jen to, co uživatel opravdu potřebuje

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/components/InputStage.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/src/index.css`

ToDo:
- odstranit jazyk typu `Prosodic Architect` a technické framingy
- zjednodušit layout na:
- velká textarea
- styl dropdown
- energie dropdown
- hlavní CTA
- zrušit nebo silně zkrátit sekundární helper texty
- upravit placeholder pro běžný rapový use-case
- zajistit mobilní layout s CTA v dosahu palce

Definition of done:
- input screen je čitelná do 3 sekund a vede k jediné akci

### Task 3.2: Zjednodušit progress/loading komunikaci

Cíl:
- loading musí zůstat srozumitelný, ale ne překomplikovaný

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/App.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/InputStage.tsx`

ToDo:
- rozhodnout, zda zachovat vícefázový progress, nebo ho zjednodušit na jeden loading stav
- upravit CTA text na `Vylepšit text`
- odstranit technické nebo přehnaně marketingové texty

Definition of done:
- loading komunikace nepůsobí jako analytický nástroj, ale jako rychlá úprava textu

## Fáze 4: Nový editor výsledků po řádcích

### Task 4.1: Přepsat `EditingStage` na editor problémových řádků

Cíl:
- místo starého segmentového editoru zobrazit jednoduchý výběr variant po řádcích

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/types.ts`

ToDo:
- odstranit staré UI pro issue description, smart suggestions a široké variantování
- zobrazit jeden řádek jako základní jednotku
- pro problémový řádek ukázat:
- originál
- balanced
- flow
- rhyme
- `Použít`
- `Zkus znovu`
- přidat přepínač `zobraz jen opravené řádky`
- u neprůchozích řádků zachovat originál bez zbytečného šumu

Definition of done:
- editor je čitelný po řádcích a uživatel chápe, co se mění a kde

### Task 4.2: Přidat okamžité skládání výsledného textu

Cíl:
- klik na variantu musí hned změnit výsledný text

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/App.tsx`

ToDo:
- zavést `selectedOption` na úrovni řádku
- při volbě varianty okamžitě přepočítat složený text
- mít jasně oddělený originál a průběžný výsledek
- rozhodnout, zda náhled výsledného textu bude nahoře, dole, nebo sticky

Definition of done:
- bez dalšího potvrzení je po kliknutí vidět nový výsledný text

### Task 4.3: Přidat copy akci pro aktuální výsledek

Cíl:
- uživatel musí umět odnést výsledek bez dalšího kroku

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/FinalStage.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/App.tsx`

ToDo:
- rozhodnout, zda `FinalStage` ještě dává smysl
- pokud ne, přesunout copy akci přímo do editoru výsledků
- zjednodušit clipboard feedback

Definition of done:
- uživatel z editoru přímo zkopíruje výsledný text

## Fáze 5: Diff highlight a wow efekt

### Task 5.1: Implementovat diff zvýraznění změn

Cíl:
- vizuálně ukázat, co AI změnila oproti originálu

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/utils`
- `/home/cowley/Dokumenty/projekty/producer-ai/src/index.css`

ToDo:
- vytvořit utilitu pro token-based nebo word-based diff
- zvýraznit změněná slova v návrzích
- zkontrolovat chování pro češtinu, interpunkci a různé délky řádků
- navrhnout nenásilný, ale jasný vizuální styl highlightu

Definition of done:
- uživatel vidí rozdíl mezi originálem a variantou bez nutnosti ručního čtení slovo po slovu

## Fáze 6: Regenerate pouze jednoho řádku

### Task 6.1: Přepsat `regenerateSegment` na řádkový regenerate flow

Cíl:
- regenerace musí pracovat nad jedním řádkem, ale s kontextem celého textu

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/services/geminiService.ts`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`

ToDo:
- přejmenovat logiku z `segment` na `line`
- poslat originální řádek + celý text jako kontext
- vrátit přesně 3 varianty ve formátu balanced/flow/rhyme
- přidat fallback, když AI vrátí méně variant

Definition of done:
- `Zkus znovu` mění pouze jeden řádek a nerozbíjí zbytek textu

### Task 6.2: Přidat line-level loading stav

Cíl:
- regenerace jedné položky nesmí zamknout celou appku

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`

ToDo:
- zavést loading flag per line
- zablokovat jen konkrétní tlačítko a příslušný blok variant
- zachovat zbytek editoru interaktivní

Definition of done:
- při regenerate se blokuje jen příslušný řádek

## Fáze 7: Lokální save rozdělané práce

### Task 7.1: Zredukovat projektové ukládání na jednoduchý draft state

Cíl:
- uložit jen to, co MVP potřebuje

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/contexts/ProjectContext.tsx`
- `/home/cowley/Dokumenty/projekty/producer-ai/App.tsx`

ToDo:
- zkontrolovat, jestli současný `ProjectContext` není zbytečně široký
- určit minimální draft payload:
- input text
- styl
- energie
- line selections
- assembled result
- uložit draft automaticky nebo explicitně podle jednoduchosti implementace

Definition of done:
- po refreshi se vrátí rozdělaný text a zvolené varianty

## Fáze 8: Cleanup a edge cases

### Task 8.1: Fallback když AI vrátí nesmysl nebo nic

Cíl:
- aplikace nesmí působit rozbitě

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/services/geminiService.ts`
- `/home/cowley/Dokumenty/projekty/producer-ai/components/EditingStage.tsx`

ToDo:
- vynutit minimálně 1 až 2 problematické řádky, pokud AI vrátí vše jako OK a text je slabý
- nastavit fallback na původní řádky s bezpečnými variantami
- přidat srozumitelný toast nebo inline error

Definition of done:
- uživatel i při špatné AI odpovědi dostane použitelný výsledek nebo srozumitelnou chybu

### Task 8.2: Opravit texty v dokumentaci a produktu

Cíl:
- produkt a repo už nesmí tvrdit, že MVP umí desítky vedlejších funkcí

Dotčené soubory:
- `/home/cowley/Dokumenty/projekty/producer-ai/README.md`
- `/home/cowley/Dokumenty/projekty/producer-ai/metadata.json`
- případně další onboarding texty v komponentách

ToDo:
- přepsat README z širokého "lyric architect" positioning na MVP popis
- odebrat neaktuální claimy o BPM, beat gridu, batchi, multi-mode a podobně
- srovnat názvosloví v UI a dokumentaci

Definition of done:
- README a UI odpovídají tomu, co aplikace skutečně dělá

## Doporučená realizační dávka

První implementační vlna:
1. Task 1.1
2. Task 1.2
3. Task 2.1
4. Task 2.2
5. Task 2.3
6. Task 2.4
7. Task 3.1
8. Task 4.1

Druhá implementační vlna:
1. Task 4.2
2. Task 4.3
3. Task 5.1
4. Task 6.1
5. Task 6.2

Třetí implementační vlna:
1. Task 7.1
2. Task 8.1
3. Task 8.2

## Nejbližší praktický start

Pokud se má začít hned implementovat, nejlepší start je:
1. přepsat `types.ts` a `geminiService.ts`
2. potom zjednodušit `App.tsx`
3. pak přestavět `InputStage.tsx` a `EditingStage.tsx`
