package com.producer.ai.app

import android.content.Context
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File

// Krok 1: Definice datových tříd (odpovídají vašim 'types.ts')
@Serializable
data class Variant(
    val id: String,
    val text: String,
    val type: String
)

@Serializable
data class LyricSegment(
    val id: String,
    val originalText: String,
    var isProblematic: Boolean,
    var issueDescription: String? = null,
    var variants: List<Variant> = emptyList(),
    var selectedVariantId: String? = null
)

@Serializable
data class AnalysisResult(
    val mode: String,
    var segments: List<LyricSegment>
)

@Serializable
data class FinalOutput(
    val lyrics: String,
    val musicDescription: String
)

// Třída pro obsluhu MediaPipe
class AiProducerService(private val context: Context) {

    private var llmInference: LlmInference? = null

    // JSON parser s ignorováním neznámých klíčů pro větší robustnost
    private val json = Json { isLenient = true; ignoreUnknownKeys = true }

    // Systémová instrukce, stejná jako ve vašem JS kódu
    private val systemInstruction = """
        ROLE
        Jsi elitní Hip-Hopový Producent a "Prosodic Architect".

        ZÁKLADNÍ PRAVIDLO #1
        NIKDY nesmíš vynechat ani jeden řádek ze vstupního textu. Každý řádek (včetně prázdných řádků a tagů jako [Intro]) MUSÍ mít svůj vlastní objekt v poli 'segments'.

        ZÁKLADNÍ PRAVIDLO #2
        Vracíš VŽDY pouze čistý JSON. Žádný doprovodný text.

        FILOZOFIE ANALÝZY
        - Hledej rytmické chyby (rushing), slabé rýmy a špatnou artikulaci.
        - Pokud je řádek v pořádku, nastav isProblematic: false a nechej variants prázdné.
        - Pokud je řádek technicky špatný, nabídni 3 varianty úpravy.
    """.trimIndent()

    // Metoda pro inicializaci LLM
    // Musíte stáhnout .tflite model (např. Gemma 2B) a umístit ho do 'assets'
    suspend fun initialize() {
        withContext(Dispatchers.IO) {
            val modelName = "gemma-it-2b-int4.tflite" // Změňte na název vašeho modelu
            val modelPath = copyModelFromAssets(modelName)

            val options = LlmInference.LlmInferenceOptions.builder()
                .setModelPath(modelPath.absolutePath)
                .setSystemPrompt(systemInstruction)
                .build()

            llmInference = LlmInference.createFromOptions(context, options)
        }
    }

    // Hlavní analytická funkce
    suspend fun analyzeLyrics(text: String, context: String, selectedMode: String): Result<AnalysisResult> = runCatching {
        val modeInstruction = if (selectedMode == "AUTO") "Detekuj nejvhodnější MÓD automaticky." else "Mód: $selectedMode."
        
        val prompt = """
            INSTRUKCE: Vrať POUZE JSON podle zadaného schématu.
            ${generateAnalysisSchemaInstruction()}

            KONTEXT: $context
            $modeInstruction

            VSTUPNÍ TEXT K ANALÝZE:
            $text
        """.trimIndent()

        val rawResponse = llmInference?.generateResponse(prompt) ?: throw IllegalStateException("LlmInference not initialized.")
        val cleanedJson = cleanJsonString(rawResponse)
        var parsed = json.decodeFromString<AnalysisResult>(cleanedJson)

        // Zajištění unikátních ID
        parsed.segments = parsed.segments.mapIndexed { idx, seg ->
            seg.copy(id = seg.id.ifEmpty { "seg-$idx" })
        }
        parsed
    }
    
    // Funkce pro regeneraci segmentu
    suspend fun regenerateSegment(allSegments: List<LyricSegment>, currentIndex: Int): Result<List<Variant>> = runCatching {
        // ... implementace podobná 'analyzeLyrics' s použitím specifického promptu ...
        // llmInference?.generateResponse(prompt)
        emptyList<Variant>() // Placeholder
    }

    // Funkce pro finální výstup
    suspend fun generateFinalOutput(segments: List<LyricSegment>, context: String): Result<FinalOutput> = runCatching {
        // ... implementace podobná 'analyzeLyrics' s použitím specifického promptu ...
        // llmInference?.generateResponse(prompt)
        FinalOutput("placeholder lyrics", "placeholder description") // Placeholder
    }


    // Krok 2: Pomocné funkce
    private fun cleanJsonString(str: String): String {
        var cleaned = str.replace("```json", "").replace("```", "").trim()
        val firstBrace = cleaned.indexOf('{')
        val firstBracket = cleaned.indexOf('[')

        val startIdx = when {
            firstBrace != -1 && (firstBracket == -1 || firstBrace < firstBracket) -> firstBrace
            firstBracket != -1 -> firstBracket
            else -> -1
        }

        val endIdx = if (startIdx == firstBrace) cleaned.lastIndexOf('}') else cleaned.lastIndexOf(']')

        return if (startIdx != -1 && endIdx != -1) {
            cleaned.substring(startIdx, endIdx + 1)
        } else {
            "{}" // Vrať prázdný objekt, pokud JSON není nalezen
        }
    }

    // Jelikož MediaPipe nemá 'responseSchema', instruujeme model přímo v promptu
    private fun generateAnalysisSchemaInstruction(): String {
        return """
        Příklad JSON schématu, které MUSÍŠ dodržet:
        {
          "mode": "string",
          "segments": [
            {
              "id": "string",
              "originalText": "string",
              "isProblematic": boolean,
              "issueDescription": "string (pouze pokud isProblematic je true)",
              "variants": [
                {
                  "id": "string",
                  "text": "string",
                  "type": "string (např. 'Rým', 'Flow')"
                }
              ]
            }
          ]
        }
        """.trimIndent()
    }

    // Funkce pro zkopírování modelu z assets do mezipaměti
    private fun copyModelFromAssets(modelName: String): File {
        val assetManager = context.assets
        val modelFile = File(context.cacheDir, modelName)
        if (modelFile.exists()) return modelFile

        assetManager.open(modelName).use { inputStream ->
            modelFile.outputStream().use { outputStream ->
                inputStream.copyTo(outputStream)
            }
        }
        return modelFile
    }
}
