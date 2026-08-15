package com.sentinelai.agent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import java.util.UUID

/**
 * Explicit user-confirmation gate for commands that may change agent state.
 * A command is not executed until the user taps Confirm in the Android notification.
 */
object SensitiveActionGate {
    private const val CHANNEL_ID = "sentinel_confirmation"
    private const val ACTION_CONFIRM = "com.sentinelai.agent.CONFIRM_ACTION"
    private const val ACTION_DENY = "com.sentinelai.agent.DENY_ACTION"
    private val pending = mutableMapOf<String, PendingAction>()

    data class PendingAction(val type: String, val payload: Map<String, String>)

    fun requiresConfirmation(type: String): Boolean = type == "stop_agent"

    fun request(context: Context, type: String, payload: Map<String, String>): Boolean {
        val id = UUID.randomUUID().toString()
        synchronized(pending) { pending[id] = PendingAction(type, payload) }

        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Sentinel confirmations", NotificationManager.IMPORTANCE_HIGH)
        )

        val confirm = PendingIntent.getBroadcast(
            context, id.hashCode(), Intent(context, ConfirmationReceiver::class.java)
                .setAction(ACTION_CONFIRM).putExtra("id", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val deny = PendingIntent.getBroadcast(
            context, id.hashCode() + 1, Intent(context, ConfirmationReceiver::class.java)
                .setAction(ACTION_DENY).putExtra("id", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Sentinel AI confirmation required")
            .setContentText("Allow the requested $type action?")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(0, "Confirm", confirm)
            .addAction(0, "Deny", deny)
            .build()

        manager.notify(id.hashCode(), notification)
        return true
    }

    fun consume(id: String): PendingAction? = synchronized(pending) { pending.remove(id) }

    class ConfirmationReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val id = intent.getStringExtra("id") ?: return
            val action = consume(id) ?: return
            if (intent.action == ACTION_CONFIRM) {
                CommandReceiver.executeConfirmed(context, action.type, action.payload)
            }
            context.getSystemService(NotificationManager::class.java).cancel(id.hashCode())
        }
    }
}
