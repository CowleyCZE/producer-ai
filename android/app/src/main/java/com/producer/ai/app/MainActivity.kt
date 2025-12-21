package com.producer.ai.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Registrace vlastního nativního pluginu
        registerPlugin(AiProducerPlugin::class.java)
    }
}
