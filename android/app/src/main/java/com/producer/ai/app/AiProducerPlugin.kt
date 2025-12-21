package com.producer.ai.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@CapacitorPlugin(name = "AiProducer")
class AiProducerPlugin : Plugin() {

    private lateinit var aiProducerService: AiProducerService
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun load() {
        super.load()
        // Inicializace naší servisní třídy s kontextem aplikace
        aiProducerService = AiProducerService(context)
        scope.launch {
            // Předběžná inicializace modelu na pozadí
            aiProducerService.initialize()
        }
    }

    @PluginMethod
    fun analyzeLyrics(call: PluginCall) {
        val text = call.getString("text") ?: ""
        val context = call.getString("context") ?: ""
        val selectedMode = call.getString("selectedMode") ?: "AUTO"

        scope.launch {
            val result = aiProducerService.analyzeLyrics(text, context, selectedMode)
            result.onSuccess { analysisResult ->
                // Převedeme Kotlin datovou třídu na JSON řetězec a pak na JSObject
                val jsonString = Json.encodeToString(analysisResult)
                val jsObject = JSObject(jsonString)
                call.resolve(jsObject)
            }.onFailure { error ->
                call.reject("Error in analyzeLyrics: ${error.message}")
            }
        }
    }

    // Zde by byly další @PluginMethod pro regenerateSegment a generateFinalOutput
    // Příklad:
    @PluginMethod
    fun regenerateSegment(call: PluginCall) {
         call.reject("Not implemented yet")
    }

    @PluginMethod
    fun generateFinalOutput(call: PluginCall) {
         call.reject("Not implemented yet")
    }
}
