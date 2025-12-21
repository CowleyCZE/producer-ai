# Producer.ai - Lyric Architect & Creative Agent

**Producer.ai** je pokročilá webová aplikace poháněná umělou inteligencí (Google Gemini), která slouží jako virtuální hudební producent a textař. Je navržena speciálně pro tvůrce používající AI generátory hudby (jako Suno v5, Udio) nebo pro muzikanty hledající vylepšení svých textů.

Aplikace analyzuje texty z hlediska rytmu, sémantiky a emocí, navrhuje vylepšení a připravuje finální výstup včetně profesionálních Meta Tagů pro generování zvuku.

## Klíčové Funkce

*   **Deep Lyric Scan:** Hloubková analýza textu. Detekuje rytmické chyby ("rushing"), klišé, slabé rýmy a nadměrné opakování slov.
*   **Prosodic Architect:** Automatické generování 3 variant pro každý problematický úsek textu (zaměření na flow, význam nebo rým).
*   **Iterativní Editor:** Interaktivní rozhraní, kde si uživatel vybírá nejlepší varianty nebo nechává AI generovat nové.
*   **Re-Check Loop:** Možnost zpětné kontroly již hotového textu pro dosažení dokonalosti.
*   **Finalizer:** Exportuje text s Meta Tagy (např. `[Verse]`, `[Drop]`) a vytváří detailní "Music Description" prompt pro hudební modely.

## Detekce Módů (Modes)

AI automaticky detekuje záměr uživatele na základě vstupu a aktivuje jeden z následujících módů:

*   **MÓD 1 (Adaptace podle Žánru):**
    *   *Vstup:* Text + Žánr (např. "Hip-Hop").
    *   *Funkce:* Upraví text tak, aby rytmicky a stylisticky seděl do zvoleného žánru (např. zrychlení flow pro rap, sjednocení slabik).
*   **MÓD 2 (Adaptace podle Interpreta):**
    *   *Vstup:* Text + Jméno interpreta.
    *   *Funkce:* Přepíše text a frázování do stylu konkrétního umělce a vytvoří tomu odpovídající hudební popis.
*   **MÓD 3 (Generování Promptu):**
    *   *Vstup:* Hrubý nápad nebo téma.
    *   *Funkce:* Zaměřuje se primárně na vytvoření masivního, detailního promptu pro generování hudby (instrumentace, nálada, technické parametry).
*   **MÓD 4 (Překlad a Analýza):**
    *   *Vstup:* Cizojazyčný text.
    *   *Funkce:* Umělecký překlad textu se zachováním rytmiky a analýza struktury původní skladby.
*   **MÓD 5 (Interaktivní Editace / Remix):**
    *   *Vstup:* Instrukce k úpravě (např. "Změň to na smutnější náladu").
    *   *Funkce:* Provádí specifické strukturální nebo náladové změny v již existujícím materiálu.
*   **MÓD 6 (Kompozice k Vokálu):**
    *   *Vstup:* Acappella (text bez hudby).
    *   *Funkce:* Navrhne hudební kompozici a strukturu, která podpoří čistý vokál.

## Technologie

*   **Frontend:** React, Tailwind CSS
*   **AI Engine:** Google Gemini API (`gemini-2.5-flash`)
*   **Design:** Moderní "Dark Mode" rozhraní optimalizované pro studiovou práci.

## Jak používat

1.  Vložte svůj text a kontext (žánr/instrukce) do **Input Stage**.
2.  Klikněte na "Spustit Analýzu".
3.  V **Interaktivním Editoru** projděte označené chyby a vyberte si z nabízených variant, nebo si vyžádejte nové.
4.  Potvrďte výběr a získejte finální výstup s Meta Tagy v **Final Stage**.
5.  Zkopírujte výsledek a vložte jej do svého DAW nebo AI generátoru hudby.
