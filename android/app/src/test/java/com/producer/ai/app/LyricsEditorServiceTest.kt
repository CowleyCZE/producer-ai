package com.producer.ai.app

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class LyricsEditorServiceTest {
    @Test
    fun `normalizePromptText truncates to 80 lines and 8000 chars`() {
        val input = (0 until 100).joinToString("\n") { "line-$it ${"a".repeat(100)}" }
        val normalized = LyricsEditorService.normalizePromptText(input)

        val lineCount = normalized.lineSequence().count()
        assertTrue(lineCount <= LyricsEditorService.MAX_ANALYZE_LINES)
        assertTrue(normalized.length <= LyricsEditorService.MAX_ANALYZE_TEXT_CHARS)
        assertEquals("line-0 ${"a".repeat(100)}", normalized.lineSequence().first())
    }

    @Test
    fun `validateModelFile throws for tiny file and accepts valid tflite`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val service = LyricsEditorService(context)

        val tmpValid = createTempFile("valid_model", ".tflite")
        tmpValid.writeBytes(ByteArray(2 * LyricsEditorService.MAX_ANALYZE_TEXT_CHARS) { 1 })

        assertTrue(tmpValid.length() > LyricsEditorService.MINIMUM_MODEL_SIZE_BYTES)

        service.validateModelFile(tmpValid, null)

        val tmpSmall = createTempFile("small_model", ".tflite")
        tmpSmall.writeBytes(ByteArray(10) { 0 })

        assertThrows(IllegalArgumentException::class.java) {
            service.validateModelFile(tmpSmall, null)
        }
    }
}
