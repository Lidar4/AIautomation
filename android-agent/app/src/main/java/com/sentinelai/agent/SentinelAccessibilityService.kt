package com.sentinelai.agent

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

class SentinelAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Intentionally allow-listed and command-driven. No autonomous actions are performed here.
    }

    override fun onInterrupt() = Unit
}
