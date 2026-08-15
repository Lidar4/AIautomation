package com.sentinelai.agent

/** Central allow-list for commands that the Android companion may accept. */
object CommandPolicy {
    private val allowed = setOf("open_url", "device_status", "stop_agent")

    fun isAllowed(type: String): Boolean = type in allowed
}
