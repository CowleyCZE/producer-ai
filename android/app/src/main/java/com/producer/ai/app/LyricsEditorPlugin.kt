package com.producer.ai.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@CapacitorPlugin(name = "LyricsEditor")
class LyricsEditorPlugin : Plugin() {

    private val json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

    private val lyricsEditorService: LyricsEditorService by lazy {
        LyricsEditorService(context)
    }

    private val scope = CoroutineScope(Dispatchers.Main)
    private var isInitialized = false

    private suspend fun ensureInitialized(call: PluginCall): Boolean {
        if (isInitialized) return true

        return withContext(Dispatchers.IO) {
            val initResult = lyricsEditorService.initialize()
            initResult.onSuccess {
                isInitialized = true
            }.onFailure { error ->
                call.reject("Model initialization failed: ${error.message}", Exception(error))
                isInitialized = false
            }
            isInitialized
        }
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
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
                try {
                    val jsonString = json.encodeToString(analysisResult)
                    call.resolve(JSObject(jsonString))
                } catch (error: Exception) {
                    call.reject("Failed to parse analysis result", error)
                }
            }.onFailure { error ->
                call.reject("Error in analyzeLyrics: ${error.message}", Exception(error))
            }
        }
    }
}
