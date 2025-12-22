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
@CapacitorPlugin(name = "AiProducer")
class AiProducerPlugin : Plugin() {
 
 private val aiProducerService: AiProducerService by lazy {
 AiProducerService(context)
 }
 
 private val scope = CoroutineScope(Dispatchers.Main)
 private var isInitialized = false

 private suspend fun ensureInitialized(call: PluginCall): Boolean {
 if (isInitialized) return true
 
 return withContext(Dispatchers.IO) {
 val initResult = aiProducerService.initialize()
 initResult.onSuccess {
 isInitialized = true
 }.onFailure { error ->
 call.reject("Model initialization failed: ${error.message}", Exception(error))
 isInitialized = false
 }
 isInitialized
 }
 }

 // NOVÁ METODA: Umožňuje frontend aplikaci zvolit soubor z disku tabletu
 @PluginMethod
 fun loadModel(call: PluginCall) {
 val path = call.getString("path") ?: return call.reject("Nebyla zadána cesta k modelu")
 
 scope.launch {
 val result = withContext(Dispatchers.IO) {
 aiProducerService.initializeWithCustomPath(path)
 }
 
 result.onSuccess {
 isInitialized = true
 call.resolve()
 }.onFailure { error ->
    @PluginMethod
    fun loadModel(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("Path is required")
            return
        }

        scope.launch {
            val result = withContext(Dispatchers.IO) {
                aiProducerService.loadModel(path)
            }
            result.onSuccess {
                call.resolve()
            }.onFailure { error ->
                call.reject("Failed to load model: ${error.message}", error)
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
 aiProducerService.analyzeLyrics(text, context, selectedMode)
 }
 
 result.onSuccess { analysisResult ->
 try {
 val jsonString = Json.encodeToString(analysisResult)
 call.resolve(JSObject(jsonString))
 } catch (e: Exception) {
 call.reject("Failed to parse analysis result", e)
 }
 }.onFailure { error ->
 call.reject("Error in analyzeLyrics: ${error.message}", Exception(error))
 }
 }
 }

 @PluginMethod
 fun regenerateSegment(call: PluginCall) {
 call.reject("Not implemented yet")
 }
 @PluginMethod
 fun generateFinalOutput(call: PluginCall) {
 call.reject("Not implemented yet")
 }
}
