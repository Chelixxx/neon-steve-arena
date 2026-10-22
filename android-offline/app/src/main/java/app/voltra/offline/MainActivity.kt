package app.voltra.offline

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/**
 * VOLTRA Offline MVP: direct Bluetooth RFCOMM chat.
 * No account, server, internet, or Google Play Services required.
 */
class MainActivity : Activity() {
    private val bluetoothUuid = UUID.fromString("f0a17a10-2d7e-4c9b-9f2a-6f2a6e7a1001")
    private val io = Executors.newSingleThreadExecutor()
    private var adapter: BluetoothAdapter? = null
    private var socket: BluetoothSocket? = null
    private var writer: PrintWriter? = null
    private var serverSocket: BluetoothServerSocket? = null
    private var receiverRegistered = false

    private lateinit var status: TextView
    private lateinit var devicesBox: LinearLayout
    private lateinit var messagesBox: LinearLayout
    private lateinit var messageInput: EditText
    private lateinit var scanButton: Button
    private lateinit var messagesScroll: ScrollView
    private val foundDevices = linkedMapOf<String, BluetoothDevice>()
    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

    private val discoveryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val device = if (Build.VERSION.SDK_INT >= 33) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    } ?: return
                    try {
                        foundDevices[device.address] = device
                        renderDevices()
                    } catch (_: SecurityException) { }
                }
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> runOnUiThread {
                    scanButton.isEnabled = true
                    scanButton.text = "Найти устройства поблизости"
                    status.text = if (socket?.isConnected == true) "Подключено • офлайн" else "Поиск завершён"
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        adapter = BluetoothAdapter.getDefaultAdapter()
        buildUi()
        loadHistory()
        if (adapter == null) {
            status.text = "На устройстве нет Bluetooth"
            scanButton.isEnabled = false
        } else requestPermissionsIfNeeded()
    }

    private fun buildUi() {
        window.statusBarColor = Color.rgb(12, 15, 28)
        window.navigationBarColor = Color.rgb(12, 15, 28)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(12))
            setBackgroundColor(Color.rgb(12, 15, 28))
        }
        root.addView(TextView(this).apply {
            text = "VOLTRA  /  OFFLINE"
            textSize = 24f
            setTextColor(Color.rgb(130, 174, 255))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        })
        status = TextView(this).apply {
            text = "Сообщения рядом — без интернета"
            textSize = 13f
            setTextColor(Color.rgb(178, 188, 210))
            setPadding(0, dp(7), 0, dp(12))
        }
        root.addView(status)
        scanButton = Button(this).apply {
            text = "Найти устройства поблизости"
            setOnClickListener { startDiscovery() }
        }
        root.addView(scanButton, matchWrap())
        root.addView(label("УСТРОЙСТВА ПОБЛИЗОСТИ").apply { setPadding(0, dp(12), 0, dp(4)) })
        val deviceScroll = ScrollView(this)
        devicesBox = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        deviceScroll.addView(devicesBox)
        root.addView(deviceScroll, LinearLayout.LayoutParams(-1, dp(118)))
        root.addView(label("ЛОКАЛЬНЫЙ ЧАТ").apply { setPadding(0, dp(10), 0, dp(4)) })
        messagesScroll = ScrollView(this)
        messagesBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(2), dp(4), dp(2), dp(8))
        }
        messagesScroll.addView(messagesBox)
        root.addView(messagesScroll, LinearLayout.LayoutParams(-1, 0, 1f))
        val composer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        messageInput = EditText(this).apply {
            hint = "Сообщение…"
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            textSize = 15f
            setSingleLine(true)
            setBackgroundColor(Color.rgb(30, 35, 54))
            setPadding(dp(12), 0, dp(12), 0)
        }
        composer.addView(messageInput, LinearLayout.LayoutParams(0, dp(50), 1f))
        composer.addView(Button(this).apply {
            text = "➤"
            setOnClickListener { sendMessage() }
        }, LinearLayout.LayoutParams(dp(70), dp(50)))
        root.addView(composer)
        setContentView(root)
    }

    private fun label(value: String) = TextView(this).apply {
        text = value
        textSize = 11f
        setTextColor(Color.rgb(120, 142, 181))
        typeface = android.graphics.Typeface.DEFAULT_BOLD
    }

    private fun matchWrap() = LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun requestPermissionsIfNeeded() {
        val needed = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= 31) {
            if (checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) needed += Manifest.permission.BLUETOOTH_SCAN
            if (checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) needed += Manifest.permission.BLUETOOTH_CONNECT
        } else if (Build.VERSION.SDK_INT >= 23 &&
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            needed += Manifest.permission.ACCESS_FINE_LOCATION
        }
        if (needed.isNotEmpty()) requestPermissions(needed.toTypedArray(), 40) else startServer()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 40) {
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) startServer()
            else status.text = "Разреши Bluetooth, чтобы искать устройства рядом"
        }
    }

    private fun startServer() {
        val bt = adapter ?: return
        try {
            if (!bt.isEnabled) {
                @Suppress("DEPRECATION")
                startActivityForResult(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), 41)
                return
            }
            thread(name = "voltra-bt-listener") {
                while (!isFinishing) {
                    try {
                        val server = bt.listenUsingRfcommWithServiceRecord("VOLTRA Offline", bluetoothUuid)
                        serverSocket = server
                        val incoming = server.accept()
                        server.close()
                        onConnected(incoming)
                    } catch (_: Exception) {
                        if (!isFinishing) runOnUiThread { status.text = "Ожидание подключения • Bluetooth" }
                        try { Thread.sleep(700) } catch (_: InterruptedException) { break }
                    }
                }
            }
            status.text = "Готов к подключению • включи видимость Bluetooth"
        } catch (_: SecurityException) {
            status.text = "Нет разрешения Bluetooth"
        } catch (e: Exception) {
            status.text = "Bluetooth недоступен: \${e.message ?: "ошибка"}"
        }
    }

    @Deprecated("Deprecated by Android")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 41 && resultCode == RESULT_OK) startServer()
    }

    private fun startDiscovery() {
        val bt = adapter ?: return
        try {
            if (!bt.isEnabled) {
                @Suppress("DEPRECATION")
                startActivityForResult(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), 41)
                return
            }
            if (!receiverRegistered) {
                val filter = IntentFilter().apply {
                    addAction(BluetoothDevice.ACTION_FOUND)
                    addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
                }
                if (Build.VERSION.SDK_INT >= 33) registerReceiver(discoveryReceiver, filter, Context.RECEIVER_EXPORTED)
                else registerReceiver(discoveryReceiver, filter)
                receiverRegistered = true
            }
            foundDevices.clear()
            devicesBox.removeAllViews()
            scanButton.isEnabled = false
            scanButton.text = "Идёт поиск…"
            status.text = "Ищем Bluetooth-устройства рядом…"
            if (bt.isDiscovering) bt.cancelDiscovery()
            if (!bt.startDiscovery()) {
                scanButton.isEnabled = true
                scanButton.text = "Повторить поиск"
                status.text = "Не удалось начать поиск. Проверь разрешения."
            }
        } catch (_: SecurityException) {
            scanButton.isEnabled = true
            status.text = "Нужно разрешение Bluetooth"
        } catch (e: Exception) {
            scanButton.isEnabled = true
            status.text = "Ошибка поиска: \${e.message ?: "неизвестно"}"
        }
    }

    private fun renderDevices() {
        runOnUiThread {
            devicesBox.removeAllViews()
            if (foundDevices.isEmpty()) {
                devicesBox.addView(label("Пока никого не найдено"))
                return@runOnUiThread
            }
            foundDevices.values.forEach { device ->
                val name = try { device.name ?: "Устройство VOLTRA" } catch (_: SecurityException) { "Bluetooth-устройство" }
                devicesBox.addView(Button(this).apply {
                    text = "$name  •  Подключиться"
                    textSize = 12f
                    setOnClickListener { connectTo(device) }
                }, matchWrap())
            }
        }
    }

    private fun connectTo(device: BluetoothDevice) {
        val bt = adapter ?: return
        try {
            if (bt.isDiscovering) bt.cancelDiscovery()
            status.text = "Подключаемся…"
            io.execute {
                try {
                    val newSocket = device.createRfcommSocketToServiceRecord(bluetoothUuid)
                    newSocket.connect()
                    onConnected(newSocket)
                } catch (_: Exception) {
                    runOnUiThread { status.text = "Не удалось подключиться. Открой VOLTRA Offline на обоих телефонах и повтори." }
                }
            }
        } catch (_: SecurityException) {
            status.text = "Нет разрешения Bluetooth"
        }
    }

    @Synchronized
    private fun onConnected(newSocket: BluetoothSocket) {
        try { socket?.close() } catch (_: Exception) { }
        socket = newSocket
        writer = PrintWriter(newSocket.outputStream, true)
        val peer = try { newSocket.remoteDevice.name ?: "устройство рядом" } catch (_: Exception) { "устройство рядом" }
        runOnUiThread {
            status.text = "Подключено к $peer • без интернета"
            appendMessage("Система", "Соединение установлено с $peer", false, false)
        }
        thread(name = "voltra-bt-reader") {
            try {
                val reader = BufferedReader(InputStreamReader(newSocket.inputStream, StandardCharsets.UTF_8))
                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.startsWith("M|")) {
                        val decoded = String(Base64.decode(line.substringAfter("M|"), Base64.NO_WRAP), StandardCharsets.UTF_8)
                        runOnUiThread { appendMessage(peer, decoded, false) }
                    }
                }
            } catch (_: Exception) {
                runOnUiThread {
                    status.text = "Связь прервана • история сохранена"
                    appendMessage("Система", "Соединение завершено", false, false)
                }
            }
        }
    }

    private fun sendMessage() {
        val text = messageInput.text.toString().trim()
        if (text.isEmpty()) return
        val activeWriter = writer
        if (activeWriter == null || socket?.isConnected != true) {
            Toast.makeText(this, "Сначала подключись к устройству поблизости", Toast.LENGTH_SHORT).show()
            return
        }
        val encoded = Base64.encodeToString(text.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)
        io.execute {
            try {
                activeWriter.println("M|$encoded")
                if (activeWriter.checkError()) throw IllegalStateException("send failed")
                runOnUiThread {
                    appendMessage("Ты", text, true)
                    messageInput.setText("")
                }
            } catch (_: Exception) {
                runOnUiThread { status.text = "Не удалось отправить. Проверь соединение." }
            }
        }
    }

    private fun appendMessage(author: String, text: String, outgoing: Boolean, persist: Boolean = true) {
        val stamp = timeFormat.format(Date())
        val row = TextView(this).apply {
            this.text = "$author  •  $stamp\n$text"
            textSize = 14f
            setTextColor(Color.rgb(238, 242, 255))
            setPadding(dp(12), dp(9), dp(12), dp(9))
            setBackgroundColor(if (outgoing) Color.rgb(37, 57, 100) else Color.rgb(30, 35, 54))
        }
        val params = LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT)
        params.setMargins(0, dp(3), 0, dp(5))
        messagesBox.addView(row, params)
        messagesScroll.post { messagesScroll.fullScroll(View.FOCUS_DOWN) }
        if (persist) saveHistory("$author|$stamp|$text")
    }

    private fun saveHistory(line: String) {
        val prefs = getSharedPreferences("voltra_offline_history", MODE_PRIVATE)
        val old = prefs.getString("history", "") ?: ""
        val next = (old.lines().filter { it.isNotBlank() } +
            Base64.encodeToString(line.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)).takeLast(500)
        prefs.edit().putString("history", next.joinToString("\n")).apply()
    }

    private fun loadHistory() {
        val prefs = getSharedPreferences("voltra_offline_history", MODE_PRIVATE)
        prefs.getString("history", "")?.lines()?.filter { it.isNotBlank() }?.forEach { encoded ->
            try {
                val item = String(Base64.decode(encoded, Base64.NO_WRAP), StandardCharsets.UTF_8)
                val parts = item.split("|", limit = 3)
                if (parts.size == 3) {
                    val row = TextView(this).apply {
                        text = "\${parts[0]}  •  \${parts[1]}\n\${parts[2]}"
                        textSize = 14f
                        setTextColor(Color.rgb(238, 242, 255))
                        setPadding(dp(12), dp(9), dp(12), dp(9))
                        setBackgroundColor(if (parts[0] == "Ты") Color.rgb(37, 57, 100) else Color.rgb(30, 35, 54))
                    }
                    val params = LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT)
                    params.setMargins(0, dp(3), 0, dp(5))
                    messagesBox.addView(row, params)
                }
            } catch (_: Exception) { }
        }
    }

    override fun onDestroy() {
        try { if (adapter?.isDiscovering == true) adapter?.cancelDiscovery() } catch (_: Exception) { }
        try { if (receiverRegistered) unregisterReceiver(discoveryReceiver) } catch (_: Exception) { }
        try { socket?.close() } catch (_: Exception) { }
        try { serverSocket?.close() } catch (_: Exception) { }
        io.shutdownNow()
        super.onDestroy()
    }
}
