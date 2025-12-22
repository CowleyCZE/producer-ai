package com.producer.ai.app
import android.content.Context
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import android.net.Uri
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
 val mode: String = "UNKNOWN",
 var segments: List<LyricSegment> = emptyList()
)
@Serializable
data class FinalOutput(
 val lyrics: String,
 val musicDescription: String
)
// Třída pro obsluhu MediaPipe
class AiProducerService(private val context: Context) {
 private var llmInference: LlmInference? = null
 
 // JSON parser - přidáno coerceInputValues pro robustnější parsování
 private val json = Json { 
     isLenient = true 
     ignoreUnknownKeys = true 
     coerceInputValues = true
 }
 
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



 private fun setupInference(modelPath: String) {
 val options = LlmInference.LlmInferenceOptions.builder()
 .setModelPath(modelPath)
 .build()
 llmInference = LlmInference.createFromOptions(context, options)
 }

    fun loadModel(path: String): Result<Unit> = runCatching {
        val uri = Uri.parse(path)
        val fileStr = path
        val modelFile = if (fileStr.startsWith("content://")) {
            copyContentUriToCache(uri)
        } else if (fileStr.startsWith("file://")) {
            File(uri.path ?: fileStr)
        } else {
            File(fileStr)
        }

        if (!modelFile.exists()) {
             throw IllegalArgumentException("Model file not found at: $modelFile")
        }

        val options = LlmInference.LlmInferenceOptions.builder()
            .setModelPath(modelFile.absolutePath)
            .build()
            
        llmInference = LlmInference.createFromOptions(context, options)
    }

    private fun copyContentUriToCache(uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri) 
            ?: throw IllegalArgumentException("Cannot open content URI: $uri")
        // Zachováme původní příponu souboru (podporuje .bin i .tflite)
        val extension = uri.lastPathSegment?.substringAfterLast('.', "bin") ?: "bin"
        val outputFile = File(context.cacheDir, "imported_model.$extension")
        
        inputStream.use { input ->
            outputFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        return outputFile
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
