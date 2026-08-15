package com.sentinelai.agent

import android.content.Context
import android.content.Intent
import android.net.Uri

/** Executes only the small set of actions explicitly allowed by CommandPolicy. */
object CommandReceiver {
    fun execute(context: Context, type: String, payload: Map<String, String>): Boolean {
        if (!CommandPolicy.isAllowed(type)) return false
        return when (type) {
            "open_url" -> {
                val url = payload["url"] ?: return false
                if (!url.startsWith("https://") && !url.startsWith("http://")) return false
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                true
            }
            "stop_agent" -> true
            "device_status" -> true
            else -> false
        }
    }
}
