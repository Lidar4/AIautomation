package com.sentinelai.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlin.concurrent.thread
import org.json.JSONObject

/**
 * Foreground authenticated channel worker.
 * It polls only the authenticated /channel/next endpoint and executes
 * actions accepted by CommandPolicy. It never executes arbitrary shell code.
 */
class SentinelChannelService : Service() {
    private val channelId = "sentinel_authenticated_channel"
    @Volatile private var running = false
    private lateinit var channel: AuthenticatedChannel

    override fun onCreate() {
        super.onCreate()
        channel = AuthenticatedChannel(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!channel.isPaired()) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, notification("Authenticated channel active"))
        if (!running) {
            running = true
            thread(name = "sentinel-channel") { pollLoop() }
        }
        return START_STICKY
    }

    private fun pollLoop() {
        while (running) {
            try {
                val baseUrl = getSharedPreferences(PREFS, MODE_PRIVATE)
                    .getString(KEY_SERVER_URL, null)
                    ?.trim()
                if (!baseUrl.isNullOrBlank()) {
                    val heartbeat = channel.heartbeat(baseUrl)
                    if (heartbeat.isSuccess) {
                        val command = channel.nextCommand(baseUrl).getOrNull()
                        if (command != null) handleCommand(baseUrl, command)
                    }
                }
            } catch (_: Throwable) {
                // Keep the authenticated worker alive; the next cycle retries.
            }
            Thread.sleep(POLL_MS)
        }
    }

    private fun handleCommand(baseUrl: String, command: JSONObject) {
        val commandId = command.optString("commandId", "")
        val type = command.optString("type", "")
        val payloadJson = command.optJSONObject("payload") ?: JSONObject()
        val payload = mutableMapOf<String, String>()
        payloadJson.keys().forEach { key -> payload[key] = payloadJson.optString(key) }

        var ok = false
        var error: String? = null
        try {
            ok = CommandReceiver.execute(this, type, payload)
            if (!ok) error = "command_rejected_by_policy"
        } catch (t: Throwable) {
            error = t.message ?: "command_execution_failed"
        }

        if (commandId.length in 8..128) {
            channel.ack(baseUrl, commandId, ok, error)
        }

        if (type == "stop_agent" && ok) stopSelf()
    }

    private fun createNotificationChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(channelId, "Sentinel AI channel", NotificationManager.IMPORTANCE_LOW)
        )
    }

    private fun notification(text: String): Notification =
        NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Sentinel AI")
            .setContentText(text)
            .setOngoing(true)
            .build()

    override fun onDestroy() {
        running = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val NOTIFICATION_ID = 4101
        private const val POLL_MS = 15_000L
        const val PREFS = "sentinel_channel"
        const val KEY_SERVER_URL = "server_url"
    }
}
