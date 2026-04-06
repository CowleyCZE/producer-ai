package com.producer.ai.app

import android.content.Context
import android.net.Uri
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.util.Locale
import java.util.UUID

@Serializable
data class EditorLineAlternative(
    val id: String,
    val text: String,
    val type: String,
)

@Serializable
data class EditorLineResult(
    val id: String,
    val originalText: String,
    var isProblematic: Boolean,
    var issueDescription: String? = null,
    var variants: List<EditorLineAlternative> = emptyList(),
    var selectedVariantId: String? = null,
)

@Serializable
data class EditorAnalysisResult(
    val mode: String = "UNKNOWN",
    var segments: List<EditorLineResult> = emptyList(),
)

class LyricsEditorService(private val context: Context) {
    private var llmInference: LlmInference? = null
    private val inferenceLock = Any()
    private val supportedModes = setOf("AUTO", "BALANCED", "FLOW", "RHYME")
    private val minimumModelSizeBytes = 1L * 1024L * 1024L
    private val maxAnalyzeLines = 80
    private val maxAnalyzeTextChars = 8000
    private val maxContextChars = 2000

    private val json = Json {
        isLenient = true
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    fun initialize(): Result<Unit> = runCatching {
        if (llmInference != null) return@runCatching
        val modelName = "gemma-it-2b-int4.tflite"
        val modelFile = copyModelFromAssets(modelName)
        validateModelFile(modelFile, null)
        setupInference(modelFile.absolutePath)
    }

    private fun setupInference(modelPath: String) {
        synchronized(inferenceLock) {
            closeInferenceIfNeeded()
            val options = LlmInference.LlmInferenceOptions.builder()
                .setModelPath(modelPath)
                .build()
            llmInference = LlmInference.createFromOptions(context, options)
        }
    }

    fun loadModel(path: String): Result<Unit> = runCatching {
        val uri = Uri.parse(path)
        val isContentUriPath = path.startsWith("content://")
        val modelFile = when {
            isContentUriPath -> copyContentUriToCache(uri)
            path.startsWith("file://") -> File(uri.path ?: path)
            else -> File(path)
        }

        validateModelFile(modelFile, uri.takeIf { isContentUriPath })

        setupInference(modelFile.absolutePath)
    }

    private fun copyContentUriToCache(uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Cannot open content URI: $uri")
        val extension = uri.lastPathSegment?.substringAfterLast('.', "bin") ?: "bin"
        pruneImportedModelCache()
        val outputFile = File(context.cacheDir, "imported_model_${UUID.randomUUID()}.$extension")

        inputStream.use { input ->
            outputFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        return outputFile
    }

    private fun validateModelFile(modelFile: File, sourceUri: Uri?) {
        if (!modelFile.exists()) {
            throw IllegalArgumentException("Model file not found at: $modelFile")
        }
        if (modelFile.length() <= 0L) {
            throw IllegalArgumentException("Model file is empty: $modelFile")
        }
        if (modelFile.length() < minimumModelSizeBytes) {
            throw IllegalArgumentException("Model file is too small to be a valid LLM model: $modelFile")
        }
        if (!isSupportedModelFile(modelFile, sourceUri)) {
            throw IllegalArgumentException("Unsupported model format. Expected .tflite file.")
        }
    }

    private fun pruneImportedModelCache() {
        val imported = context.cacheDir
            .listFiles { file -> file.isFile && file.name.startsWith("imported_model_") }
            ?.sortedByDescending { it.lastModified() }
            ?: return

        imported.drop(2).forEach { file ->
            runCatching { file.delete() }
        }
    }

    private fun isSupportedModelFile(modelFile: File, sourceUri: Uri?): Boolean {
        val extension = modelFile.extension.lowercase(Locale.ROOT)
        if (extension == "tflite") {
            return true
        }

        if (sourceUri == null) {
            return false
        }

        val mimeType = context.contentResolver.getType(sourceUri)?.lowercase(Locale.ROOT).orEmpty()
        if (mimeType.contains("tflite")) {
            return true
        }
        if (mimeType.isNotEmpty() && mimeType != "application/octet-stream") {
            return false
        }

        // Some document providers omit original extension/type for binary files.
        return extension.isEmpty() || extension == "bin"
    }

    suspend fun analyzeLyrics(text: String, context: String, selectedMode: String): Result<EditorAnalysisResult> = runCatching {
        val normalizedText = normalizePromptText(text)
        if (normalizedText.isEmpty()) {
            return@runCatching EditorAnalysisResult(mode = "AUTO", segments = emptyList())
        }
        val normalizedContext = context.trim().take(maxContextChars)

        val normalizedMode = selectedMode.trim().uppercase(Locale.ROOT).ifEmpty { "AUTO" }
        val effectiveMode = if (supportedModes.contains(normalizedMode)) normalizedMode else "AUTO"
        val modeInstruction = if (effectiveMode == "AUTO") {
            "Detekuj nejvhodnější režim automaticky."
        } else {
            "Režim: $effectiveMode."
        }

        val prompt = """
            INSTRUKCE: Vrať POUZE JSON podle zadaného schématu.
            ${generateAnalysisSchemaInstruction()}

            KONTEXT: $normalizedContext
            $modeInstruction

            VSTUPNÍ TEXT K ANALÝZE:
            $normalizedText
        """.trimIndent()

        val rawResponse = synchronized(inferenceLock) {
            llmInference?.generateResponse(prompt)
        } ?: throw IllegalStateException("LlmInference not initialized.")
        val cleanedJson = cleanJsonString(rawResponse)
        json.decodeFromString<EditorAnalysisResult>(cleanedJson)
    }

    private fun cleanJsonString(value: String): String {
        val cleaned = value.replace("```json", "").replace("```", "").trim()
        val startIndex = cleaned.indexOf('{')
        val endIndex = cleaned.lastIndexOf('}')
        return if (startIndex != -1 && endIndex != -1 && startIndex <= endIndex) {
            cleaned.substring(startIndex, endIndex + 1)
        } else {
            throw IllegalArgumentException("Model response does not contain valid JSON object")
        }
    }

    private fun generateAnalysisSchemaInstruction(): String = """{ "mode": "string", "segments": [] }"""

    private fun copyModelFromAssets(modelName: String): File {
        val modelFile = File(context.cacheDir, modelName)
        if (modelFile.exists() && modelFile.length() == 0L) {
            modelFile.delete()
        }
        if (!modelFile.exists()) {
            context.assets.open(modelName).use { input ->
                modelFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
        }
        return modelFile
    }

    companion object {
        internal const val MAX_ANALYZE_LINES = 80
        internal const val MAX_ANALYZE_TEXT_CHARS = 8000

        internal fun normalizePromptText(rawText: String): String {
            if (rawText.isBlank()) {
                return ""
            }

            val normalizedLines = rawText
                .lineSequence()
                .take(MAX_ANALYZE_LINES)
                .joinToString("\n")

            return normalizedLines.trim().take(MAX_ANALYZE_TEXT_CHARS)
        }
    }


    private fun closeInferenceIfNeeded() {
        (llmInference as? AutoCloseable)?.let { inference ->
            runCatching { inference.close() }
        }
        llmInference = null
    }

    fun release() {
        synchronized(inferenceLock) {
            closeInferenceIfNeeded()
        }
    }
}
