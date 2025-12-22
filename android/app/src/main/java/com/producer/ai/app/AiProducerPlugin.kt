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
    
    // Použijeme 'lazy' inicializaci, aby se služba vytvořila až při prvním použití
    private val aiProducerService: AiProducerService by lazy {
        AiProducerService(context)
    }
    
    private val scope = CoroutineScope(Dispatchers.Main)
    private var isInitialized = false

    // Nová metoda pro zajištění inicializace, volaná před každou akcí
    private suspend fun ensureInitialized(call: PluginCall): Boolean {
        if (isInitialized) return true
        
        return withContext(Dispatchers.IO) {
            val initResult = aiProducerService.initialize()
            initResult.onSuccess {
                isInitialized = true
            }.onFailure { error ->
                // Pokud inicializace selže, pošleme chybu na frontend a aplikace nespadne
                // Capacitor's reject takes Exception, while onFailure provides Throwable
                call.reject("Model initialization failed: ${error.message}", Exception(error))
                isInitialized = false
            }
            isInitialized
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
                    val jsObject = JSObject(jsonString)
                    call.resolve(jsObject)
                } catch (e: Exception) {
                    call.reject("Failed to parse analysis result", e)
                }
            }.onFailure { error ->
                call.reject("Error in analyzeLyrics: ${error.message}", Exception(error))
            }
        }
    }

    // Zde by byly další @PluginMethod pro regenerateSegment a generateFinalOutput
    
    @PluginMethod
    fun regenerateSegment(call: PluginCall) {
        call.reject("Not implemented yet")
    }

    @PluginMethod
    fun generateFinalOutput(call: PluginCall) {
        call.reject("Not implemented yet")
    }
}
