package com.producer.ai.app

import org.junit.Assert.assertEquals
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
}
