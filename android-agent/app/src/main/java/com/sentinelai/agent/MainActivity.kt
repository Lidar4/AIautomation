package com.sentinelai.agent

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(40, 60, 40, 40) }
        root.addView(TextView(this).apply { text = "Sentinel AI\n\nPhone companion is ready. Device actions require your explicit Android permissions."; textSize = 20f })
        root.addView(Button(this).apply { text = "Open Accessibility Settings"; setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) } })
        root.addView(Button(this).apply { text = "Stop Agent"; setOnClickListener { stopService(Intent(this@MainActivity, SentinelAccessibilityService::class.java)) } })
        setContentView(root)
    }
}
