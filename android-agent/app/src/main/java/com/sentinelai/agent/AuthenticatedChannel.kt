package com.sentinelai.agent

import android.content.Context
import android.provider.Settings
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/** HTTPS client for the authenticated Sentinel AI device channel. */
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
        if (response.code !in 200..299) error(response.body)
        val token = JSONObject(response.body).getString("token")
        tokenStore.saveToken(token)
        token
    }

    fun heartbeat(baseUrl: String): Result<String> = runCatching {
        val token = tokenStore.readToken() ?: error("device_not_paired")
        val response = request(baseUrl, "/devices/${deviceId()}/heartbeat", "POST", "{}", token)
        if (response.code !in 200..299) error(response.body)
        response.body
    }

    fun nextCommand(baseUrl: String): Result<JSONObject?> = runCatching {
        val token = tokenStore.readToken() ?: error("device_not_paired")
        val response = request(baseUrl, "/channel/next", "GET", null, token)
        if (response.code !in 200..299) error(response.body)
        val command = JSONObject(response.body).opt("command")
        if (command == null || command == JSONObject.NULL) null else command as JSONObject
    }

    fun ack(baseUrl: String, commandId: String, ok: Boolean, error: String? = null): Result<String> = runCatching {
        val token = tokenStore.readToken() ?: error("device_not_paired")
        val body = JSONObject().put("commandId", commandId).put("ok", ok)
        if (error != null) body.put("error", error)
        val response = request(baseUrl, "/channel/ack", "POST", body.toString(), token)
        if (response.code !in 200..299) error(response.body)
        response.body
    }

    fun isPaired(): Boolean = !tokenStore.readToken().isNullOrBlank()
    fun clearPairing() = tokenStore.clear()

    private fun request(baseUrl: String, path: String, method: String, body: String?, token: String?): Response {
        val cleanBase = baseUrl.trim().trimEnd('/')
        require(cleanBase.startsWith("https://")) { "Production server URL must use HTTPS" }
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

    private data class Response(val code: Int, val body: String)
    companion object { private const val KEY_DEVICE_ID = "device_id" }
}
