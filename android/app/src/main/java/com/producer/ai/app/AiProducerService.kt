package com.producer.ai.app
import android.content.Context
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
// Krok 1: Definice datových tříd
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
 
 // JSON parser
 private val json = Json { isLenient = true; ignoreUnknownKeys = true }
 
 private val systemInstruction = """
 ROLE: Elitní Hip-Hopový Producent.
 PRAVIDLO #1: Nevynechat žádný řádek.
 PRAVIDLO #2: Vždy pouze čistý JSON.
 """.trimIndent()

 // Inicializace s výchozím modelem v assetech
 fun initialize(): Result<Unit> = runCatching {
 if (llmInference != null) return@runCatching
 val modelName = "gemma-it-2b-int4.tflite"
 val modelFile = copyModelFromAssets(modelName)
 setupInference(modelFile.absolutePath)
 }

 // NOVÁ METODA: Inicializace z vlastní cesty (stažený model v tabletu)
 fun initializeWithCustomPath(path: String): Result<Unit> = runCatching {
 val file = File(path)
 if (!file.exists()) throw Exception("Soubor modelu nebyl nalezen na cestě: $path")
 
 // Uzavřeme předchozí instanci, pokud existuje, pro uvolnění RAM
 llmInference?.close()
 llmInference = null
 
 setupInference(file.absolutePath)
 }

 private fun setupInference(modelPath: String) {
 val options = LlmInference.LlmInferenceOptions.builder()
 .setModelPath(modelPath)
 .build()
 llmInference = LlmInference.createFromOptions(context, options)
 }

 suspend fun analyzeLyrics(text: String, context: String, selectedMode: String): Result<AnalysisResult> = runCatching {
 val prompt = "$systemInstruction
KONTEXT: $context
TEXT: $text"
 val rawResponse = llmInference?.generateResponse(prompt) ?: throw IllegalStateException("LlmInference not initialized.")
 val cleanedJson = cleanJsonString(rawResponse)
 json.decodeFromString<AnalysisResult>(cleanedJson)
 }

 private fun cleanJsonString(str: String): String {
 var cleaned = str.replace("```json", "").replace("```", "").trim()
 val startIdx = cleaned.indexOf('{')
 val endIdx = cleaned.lastIndexOf('}')
 return if (startIdx != -1 && endIdx != -1) cleaned.substring(startIdx, endIdx + 1) else "{}"
 }

 private fun generateAnalysisSchemaInstruction(): String = "{ \"mode\": \"string\", \"segments\": [] }"

 private fun copyModelFromAssets(modelName: String): File {
 val modelFile = File(context.cacheDir, modelName)
 if (modelFile.exists() && modelFile.length() < 100 * 1024 * 1024) {
     modelFile.delete()
 }
 if (!modelFile.exists()) {
 context.assets.open(modelName).use { input ->
 modelFile.outputStream().use { output -> input.copyTo(output) }
 }
 }
 return modelFile
 }
}
