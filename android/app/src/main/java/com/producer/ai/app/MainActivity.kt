package com.producer.ai.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Registrace nativního pluginu pro MVP editor.
        registerPlugin(LyricsEditorPlugin::class.java)
        
        super.onCreate(savedInstanceState)
    }
}
