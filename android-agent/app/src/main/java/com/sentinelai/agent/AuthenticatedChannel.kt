package com.sentinelai.agent

import android.content.Context
import android.provider.Settings
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * Authenticated client for production HTTPS and explicit private-network HTTP testing.
 * Public production endpoints must remain HTTPS.
 */
class AuthenticatedChannel(private val context: Context) {
    private val prefs = context.getSharedPreferences("sentinel_channel", Context.MODE_PRIVATE)
    private val tokenStore = SecureTokenStore(context)

    fun deviceId(): String {
        val existing = prefs.getString(KEY_DEVICE_ID, null)
        if (!existing.isNullOrBlank()) return existing
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val id = "android-${androidId ?: UUID.randomUUID()}"
        prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        return id
    }

    fun pair(baseUrl: String, code: String): Result<String> = runCatching {
        val body = JSONObject().put("code", code).put("deviceId", deviceId())
        val response = request(baseUrl, "/pairing/claim", "POST", body.toString(), null)
        if (response.code !in 200..299) error(response.body.ifBlank { "pairing_failed_http_${response.code}" })
        val token = JSONObject(response.body).getString("token")
        tokenStore.saveToken(token)
        token
    }

    fun heartbeat(baseUrl: String): Result<String> = runCatching {
        val token = tokenStore.readToken() ?: error("device_not_paired")
        val response = request(baseUrl, "/devices/${deviceId()}/heartbeat", "POST", "{}", token)
        if (response.code !in 200..299) error(response.body.ifBlank { "heartbeat_failed_http_${response.code}" })
        response.body
    }

    fun nextCommand(baseUrl: String): Result<JSONObject?> = runCatching {
        val token = tokenStore.readToken() ?: error("device_not_paired")
        val response = request(baseUrl, "/channel/next", "GET", null, token)
        if (response.code !in 200..299) error(response.body.ifBlank { "command_poll_failed_http_${response.code}" })
        val command = JSONObject(response.body).opt("command")
        if (command == null || command == JSONObject.NULL) null else command as JSONObject
    }

    fun ack(baseUrl: String, commandId: String, ok: Boolean, error: String? = null): Result<String> = runCatching {
        val token = tokenStore.readToken() ?: error("device_not_paired")
        val body = JSONObject().put("commandId", commandId).put("ok", ok)
        if (error != null) body.put("error", error)
        val response = request(baseUrl, "/channel/ack", "POST", body.toString(), token)
        if (response.code !in 200..299) error(response.body.ifBlank { "ack_failed_http_${response.code}" })
        response.body
    }

    fun isPaired(): Boolean = !tokenStore.readToken().isNullOrBlank()
    fun clearPairing() = tokenStore.clear()

    private fun request(baseUrl: String, path: String, method: String, body: String?, token: String?): Response {
        val cleanBase = baseUrl.trim().trimEnd('/')
        require(isAllowedServerUrl(cleanBase)) {
            "Use HTTPS for production, or HTTP only on localhost/private LAN/hotspot"
        }
        val connection = (URL(cleanBase + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 10_000
            readTimeout = 15_000
            setRequestProperty("Accept", "application/json")
            if (token != null) setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }
        if (body != null) connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        val stream = if (code in 200..399) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
        connection.disconnect()
        return Response(code, text)
    }

    private fun isAllowedServerUrl(baseUrl: String): Boolean {
        val url = runCatching { URL(baseUrl) }.getOrNull() ?: return false
        val protocol = url.protocol.lowercase()
        if (protocol == "https") return true
        if (protocol != "http") return false
        val host = url.host.lowercase()
        return host == "localhost" || host == "127.0.0.1" || host == "::1" ||
            host.endsWith(".local") || host.startsWith("10.") ||
            host.startsWith("192.168.") || isPrivate172(host)
    }

    private fun isPrivate172(host: String): Boolean {
        val parts = host.split('.')
        if (parts.size < 2 || parts[0] != "172") return false
        val second = parts[1].toIntOrNull() ?: return false
        return second in 16..31
    }

    private data class Response(val code: Int, val body: String)
    companion object { private const val KEY_DEVICE_ID = "device_id" }
}
