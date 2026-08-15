package com.sentinelai.agent

import android.content.Context
import android.util.Base64
import java.nio.charset.StandardCharsets
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Small local token store backed by the Android Keystore.
 * Tokens are encrypted at rest and never logged.
 */
class SecureTokenStore(context: Context) {
    private val prefs = context.getSharedPreferences("sentinel_secure_state", Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        require(token.isNotBlank()) { "token must not be blank" }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val encrypted = cipher.doFinal(token.toByteArray(StandardCharsets.UTF_8))
        prefs.edit()
            .putString(KEY_CIPHERTEXT, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .apply()
    }

    fun readToken(): String? {
        val ciphertext = prefs.getString(KEY_CIPHERTEXT, null) ?: return null
        val iv = prefs.getString(KEY_IV, null) ?: return null
        return runCatching {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(
                Cipher.DECRYPT_MODE,
                getOrCreateKey(),
                GCMParameterSpec(GCM_TAG_BITS, Base64.decode(iv, Base64.NO_WRAP))
            )
            String(cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)), StandardCharsets.UTF_8)
        }.getOrNull()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private fun getOrCreateKey(): SecretKey {
        val generator = KeyGenerator.getInstance("AES", ANDROID_KEYSTORE)
        val existing = runCatching {
            val entry = java.security.KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
                .getEntry(KEY_ALIAS, null) as? java.security.KeyStore.SecretKeyEntry
            entry?.secretKey
        }.getOrNull()
        if (existing != null) return existing

        generator.init(
            android.security.keystore.KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or
                    android.security.keystore.KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                .build()
        )
        return generator.generateKey()
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "sentinel_device_token"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_BITS = 128
        private const val KEY_CIPHERTEXT = "token_ciphertext"
        private const val KEY_IV = "token_iv"
    }
}
