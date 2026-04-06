package com.producer.ai.app

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@CapacitorPlugin(name = "LyricsEditor")
class LyricsEditorPlugin : Plugin() {
    companion object {
        private const val TAG = "LyricsEditorPlugin"
    }

    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

    private val lyricsEditorService: LyricsEditorService by lazy {
        LyricsEditorService(context)
    }

    private val coroutineErrorHandler = CoroutineExceptionHandler { _, error ->
        Log.e(TAG, "LyricsEditorPlugin coroutine failed", error)
    }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main + coroutineErrorHandler)
    private var isInitialized = false

    private suspend fun ensureInitialized(call: PluginCall): Boolean {
        if (isInitialized) return true

        val initResult = withContext(Dispatchers.IO) {
            lyricsEditorService.initialize()
        }

        return initResult.fold(
            onSuccess = {
                isInitialized = true
                true
            },
            onFailure = { error ->
                isInitialized = false
                call.reject("Model initialization failed: ${error.message}", Exception(error))
                false
            },
        )
    }

    override fun handleOnDestroy() {
        scope.cancel("LyricsEditorPlugin destroyed")
        super.handleOnDestroy()
    }

    private fun resolveAnalysis(call: PluginCall, analysisResult: EditorAnalysisResult) {
        try {
            val jsonString = json.encodeToString(analysisResult)
            call.resolve(JSObject(jsonString))
        } catch (error: Exception) {
            call.reject("Failed to parse analysis result", error)
        }
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val path = call.getString("path")?.trim()
        if (path.isNullOrEmpty()) {
            call.reject("Path is required")
            return
        }

        scope.launch {
            val result = withContext(Dispatchers.IO) {
                lyricsEditorService.loadModel(path)
            }
            result.onSuccess {
                isInitialized = true
                call.resolve()
            }.onFailure { error ->
                call.reject("Failed to load model: ${error.message}", Exception(error))
            }
        }
    }

    @PluginMethod
    fun analyzeLyrics(call: PluginCall) {
        val text = call.getString("text") ?: ""
        val context = call.getString("context") ?: ""
        val selectedMode = call.getString("selectedMode") ?: "AUTO"

        scope.launch {
            if (!ensureInitialized(call)) return@launch

            val result = withContext(Dispatchers.IO) {
                lyricsEditorService.analyzeLyrics(text, context, selectedMode)
            }

            result.onSuccess { analysisResult ->
                resolveAnalysis(call, analysisResult)
            }.onFailure { error ->
                call.reject("Error in analyzeLyrics: ${error.message}", Exception(error))
            }
        }
    }
}
