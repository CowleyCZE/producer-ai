package com.producer.ai.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Registrace vlastního nativního pluginu -- musí být před super.onCreate, aby o něm Bridge věděl při inicializaci
        registerPlugin(AiProducerPlugin::class.java)
        
        super.onCreate(savedInstanceState)
    }
}
