package com.sentinelai.agent

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var channel: AuthenticatedChannel
    private lateinit var status: TextView
    private lateinit var serverUrl: EditText
    private lateinit var pairingCode: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        channel = AuthenticatedChannel(this)
        requestNotificationPermissionIfNeeded()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 60, 40, 40)
        }
        root.addView(TextView(this).apply {
            text = "Sentinel AI\n\nAuthenticated phone companion"
            textSize = 22f
        })
        status = TextView(this).apply { textSize = 16f; setPadding(0, 24, 0, 24) }
        root.addView(status)

        serverUrl = EditText(this).apply {
            hint = "Server URL (https://... or local http://192.168.x.x:8787)"
            setSingleLine(true)
        }
        root.addView(serverUrl)

        pairingCode = EditText(this).apply {
            hint = "6-digit pairing code"
            inputType = 2
            setSingleLine(true)
        }
        root.addView(pairingCode)

        root.addView(Button(this).apply {
            text = "Pair this phone"
            setOnClickListener { pairPhone() }
        })
        root.addView(Button(this).apply {
            text = "Start authenticated channel"
            setOnClickListener { startAuthenticatedChannel() }
        })
        root.addView(Button(this).apply {
            text = "Check authenticated channel"
            setOnClickListener { checkChannel() }
        })
        root.addView(Button(this).apply {
            text = "Open Accessibility Settings"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        })
        root.addView(Button(this).apply {
            text = "Stop Agent"
            setOnClickListener { stopService(Intent(this@MainActivity, SentinelChannelService::class.java)) }
        })
        root.addView(Button(this).apply {
            text = "Unpair phone"
            setOnClickListener {
                stopService(Intent(this@MainActivity, SentinelChannelService::class.java))
                channel.clearPairing()
                updateStatus()
            }
        })

        setContentView(root)
        updateStatus()
        if (channel.isPaired()) {
            val savedUrl = getSharedPreferences(SentinelChannelService.PREFS, MODE_PRIVATE)
                .getString(SentinelChannelService.KEY_SERVER_URL, "")
            serverUrl.setText(savedUrl)
            startAuthenticatedChannel()
        }
    }

    private fun pairPhone() {
        val baseUrl = serverUrl.text.toString().trim()
        val code = pairingCode.text.toString().trim()
        if (!isSupportedServerUrl(baseUrl) || !code.matches(Regex("\\d{6}"))) {
            toast("Use HTTPS, or HTTP only for localhost/private LAN/hotspot, plus a 6-digit code")
            return
        }
        status.text = "Pairing…"
        Thread {
            val result = channel.pair(baseUrl, code)
            runOnUiThread {
                result.onSuccess {
                    getSharedPreferences(SentinelChannelService.PREFS, MODE_PRIVATE)
                        .edit().putString(SentinelChannelService.KEY_SERVER_URL, baseUrl).apply()
                    status.text = "Paired ✓\nDevice: ${channel.deviceId()}"
                    startAuthenticatedChannel()
                }.onFailure { status.text = "Pairing failed: ${it.message}" }
            }
        }.start()
    }

    private fun startAuthenticatedChannel() {
        val baseUrl = serverUrl.text.toString().trim()
        if (!channel.isPaired()) {
            toast("Pair this phone first")
            return
        }
        if (!isSupportedServerUrl(baseUrl)) {
            toast("Enter a valid HTTPS or private LAN/hotspot HTTP server URL")
            return
        }
        getSharedPreferences(SentinelChannelService.PREFS, MODE_PRIVATE)
            .edit().putString(SentinelChannelService.KEY_SERVER_URL, baseUrl).apply()
        ContextCompat.startForegroundService(this, Intent(this, SentinelChannelService::class.java))
        status.text = "Authenticated channel started ✓"
    }

    private fun checkChannel() {
        val baseUrl = serverUrl.text.toString().trim()
        if (!isSupportedServerUrl(baseUrl)) {
            toast("Enter a valid HTTPS or private LAN/hotspot HTTP server URL")
            return
        }
        status.text = "Checking authenticated channel…"
        Thread {
            val heartbeat = channel.heartbeat(baseUrl)
            val command = if (heartbeat.isSuccess) channel.nextCommand(baseUrl) else null
            runOnUiThread {
                if (heartbeat.isFailure) {
                    status.text = "Channel error: ${heartbeat.exceptionOrNull()?.message}"
                } else {
                    status.text = if (command?.getOrNull() == null) {
                        "Authenticated ✓\nNo pending command"
                    } else {
                        "Authenticated ✓\nCommand received"
                    }
                }
            }
        }.start()
    }

    private fun isSupportedServerUrl(value: String): Boolean = runCatching {
        val url = java.net.URL(value)
        val protocol = url.protocol.lowercase()
        if (protocol == "https") true
        else if (protocol == "http") {
            val host = url.host.lowercase()
            host == "localhost" || host == "127.0.0.1" || host.endsWith(".local") ||
                host.startsWith("10.") || host.startsWith("192.168.") ||
                host.split('.').let { it.size >= 2 && it[0] == "172" && (it[1].toIntOrNull() ?: -1) in 16..31 }
        } else false
    }.getOrDefault(false)

    private fun updateStatus() {
        status.text = if (channel.isPaired()) "Paired ✓\nDevice: ${channel.deviceId()}" else "Android companion: Not paired"
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_NOTIFICATIONS)
        }
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_SHORT).show()

    companion object {
        private const val REQUEST_NOTIFICATIONS = 1001
    }
}
