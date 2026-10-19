package app.voltra.messenger;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class MainActivity extends Activity {
    private static final String HOME = "https://neon-steve-arena-server-production.up.railway.app/";
    private static final int FILE_CHOOSER = 41;
    private static final int BT_ENABLE = 42;
    private static final int BT_PERMISSION = 43;
    private static final int MEDIA_PERMISSION = 44;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private android.webkit.PermissionRequest pendingMediaRequest;
    private BluetoothSocket connectedSocket;
    private BluetoothServerSocket serverSocket;
    private OutputStreamWriter bluetoothWriter;
    private volatile boolean offlineFallbackShown = false;

    private BluetoothAdapter bluetoothAdapter() {
        BluetoothManager manager = (BluetoothManager) getSystemService(BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(10, 11, 19));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(10, 11, 19));
        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(10, 11, 19));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.addJavascriptInterface(new VoltraBridge(), "VOLTRA_NATIVE");

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) &&
                    "neon-steve-arena-server-production.up.railway.app".equals(uri.getHost())) return false;
                if ("file".equals(uri.getScheme()) && uri.getPath() != null &&
                    uri.getPath().contains("/android_asset/")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (ActivityNotFoundException ignored) {}
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(HOME)) view.evaluateJavascript(onlineToolbarScript(), null);
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame() && !offlineFallbackShown) {
                    offlineFallbackShown = true;
                    view.loadUrl("file:///android_asset/offline.html");
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_CHOOSER); return true; }
                catch (ActivityNotFoundException e) { fileCallback = null; return false; }
            }

            @Override public void onPermissionRequest(android.webkit.PermissionRequest request) {
                runOnUiThread(() -> {
                    Uri origin = request.getOrigin();
                    if (origin == null || !"https".equals(origin.getScheme()) ||
                        !"neon-steve-arena-server-production.up.railway.app".equals(origin.getHost())) {
                        request.deny();
                        return;
                    }
                    java.util.ArrayList<String> needed = new java.util.ArrayList<>();
                    for (String resource : request.getResources()) {
                        if (android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&
                            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                            needed.add(Manifest.permission.RECORD_AUDIO);
                        if (android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                            checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                            needed.add(Manifest.permission.CAMERA);
                    }
                    if (needed.isEmpty()) grantMediaRequest(request);
                    else {
                        if (pendingMediaRequest != null) pendingMediaRequest.deny();
                        pendingMediaRequest = request;
                        requestPermissions(needed.toArray(new String[0]), MEDIA_PERMISSION);
                    }
                });
            }
        });

        requestBluetoothPermissions();
        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(HOME);
    }

    private String onlineToolbarScript() {
        // No injected Offline / APK shortcut: the app opens directly into the online messenger.
        return "(function(){})();";
    }

    private boolean hasBluetoothPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            java.util.ArrayList<String> needed = new java.util.ArrayList<>();
            if (checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED)
                needed.add(Manifest.permission.BLUETOOTH_CONNECT);
            if (checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED)
                needed.add(Manifest.permission.BLUETOOTH_SCAN);
            if (!needed.isEmpty()) requestPermissions(needed.toArray(new String[0]), BT_PERMISSION);
        }
    }

    private void toast(String message) { runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show()); }

    private void notifyJs(String event, String message) {
        runOnUiThread(() -> {
            if (webView == null) return;
            String safe = JSONObject.quote(message == null ? "" : message);
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('" + event + "',{detail:{text:" + safe + "}}));", null);
        });
    }

    private synchronized void attachBluetoothSocket(BluetoothSocket socket) throws Exception {
        closeBluetoothConnection();
        connectedSocket = socket;
        bluetoothWriter = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8);
        String name;
        try { name = socket.getRemoteDevice().getName(); } catch (Exception e) { name = null; }
        notifyJs("voltraBluetoothStatus", "Подключено: " + (name == null ? socket.getRemoteDevice().getAddress() : name));
        Thread readerThread = new Thread(() -> {
            try {
                BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.length() <= 4000) notifyJs("voltraBluetoothMessage", line);
                }
            } catch (Exception ignored) {
                notifyJs("voltraBluetoothStatus", "Bluetooth-соединение закрыто");
            } finally {
                try { socket.close(); } catch (Exception ignored) {}
                synchronized (MainActivity.this) {
                    if (connectedSocket == socket) {
                        connectedSocket = null;
                        bluetoothWriter = null;
                    }
                }
            }
        }, "voltra-bt-reader");
        readerThread.start();
    }

    private synchronized void closeBluetoothConnection() {
        try { if (connectedSocket != null) connectedSocket.close(); } catch (Exception ignored) {}
        connectedSocket = null;
        bluetoothWriter = null;
    }

    private final class VoltraBridge {
        @JavascriptInterface public void openOfflinePanel() {
            runOnUiThread(() -> webView.loadUrl("file:///android_asset/offline.html"));
        }

        @JavascriptInterface public void loadOnline() {
            runOnUiThread(() -> { offlineFallbackShown = false; webView.loadUrl(HOME); });
        }

        @JavascriptInterface public void requestBluetoothEnable() {
            runOnUiThread(() -> {
                if (!hasBluetoothPermission()) { requestBluetoothPermissions(); return; }
                BluetoothAdapter adapter = bluetoothAdapter();
                if (adapter == null) { notifyJs("voltraBluetoothStatus", "На устройстве нет Bluetooth"); return; }
                try {
                    if (!adapter.isEnabled()) startActivityForResult(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), BT_ENABLE);
                    else notifyJs("voltraBluetoothStatus", "Bluetooth уже включён");
                } catch (SecurityException e) { requestBluetoothPermissions(); }
            });
        }

        @JavascriptInterface public void openBluetoothSettings() {
            runOnUiThread(() -> startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)));
        }

        @JavascriptInterface public String listPairedDevices() {
            JSONArray array = new JSONArray();
            if (!hasBluetoothPermission()) return array.toString();
            try {
                BluetoothAdapter adapter = bluetoothAdapter();
                if (adapter != null && adapter.getBondedDevices() != null) {
                    for (android.bluetooth.BluetoothDevice device : adapter.getBondedDevices()) {
                        JSONObject item = new JSONObject();
                        item.put("name", device.getName() == null ? "Bluetooth" : device.getName());
                        item.put("address", device.getAddress());
                        array.put(item);
                    }
                }
            } catch (Exception ignored) {}
            return array.toString();
        }

        @JavascriptInterface public void startBluetoothServer() {
            if (!hasBluetoothPermission()) { requestBluetoothPermissions(); notifyJs("voltraBluetoothStatus", "Разреши Bluetooth в запросе Android"); return; }
            new Thread(() -> {
                try {
                    BluetoothAdapter adapter = bluetoothAdapter();
                    if (adapter == null) throw new IllegalStateException("Bluetooth не поддерживается");
                    if (!adapter.isEnabled()) throw new IllegalStateException("Сначала включи Bluetooth");
                    try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
                    serverSocket = adapter.listenUsingRfcommWithServiceRecord("VOLTRA Offline", SPP_UUID);
                    notifyJs("voltraBluetoothStatus", "Ожидаю подключение… Сопряги телефоны в настройках Bluetooth");
                    BluetoothSocket socket = serverSocket.accept();
                    attachBluetoothSocket(socket);
                } catch (Exception e) {
                    notifyJs("voltraBluetoothStatus", "Не удалось ждать подключение: " + (e.getMessage() == null ? "ошибка" : e.getMessage()));
                }
            }, "voltra-bt-server").start();
        }

        @JavascriptInterface public void connectBluetooth(String address) {
            if (!hasBluetoothPermission()) { requestBluetoothPermissions(); notifyJs("voltraBluetoothStatus", "Разреши Bluetooth в запросе Android"); return; }
            new Thread(() -> {
                try {
                    BluetoothAdapter adapter = bluetoothAdapter();
                    if (adapter == null) throw new IllegalStateException("Bluetooth не поддерживается");
                    if (!adapter.isEnabled()) throw new IllegalStateException("Сначала включи Bluetooth");
                    android.bluetooth.BluetoothDevice device = adapter.getRemoteDevice(address);
                    notifyJs("voltraBluetoothStatus", "Подключаюсь к " + (device.getName() == null ? address : device.getName()) + "…");
                    BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                    attachBluetoothSocket(socket);
                } catch (Exception e) {
                    notifyJs("voltraBluetoothStatus", "Не удалось подключиться: " + (e.getMessage() == null ? "проверь сопряжение" : e.getMessage()));
                }
            }, "voltra-bt-connect").start();
        }

        @JavascriptInterface public void sendBluetoothMessage(String message) {
            final String safe = message == null ? "" : message.trim().replace("\r", " ").replace("\n", " ");
            if (safe.isEmpty()) return;
            new Thread(() -> {
                try {
                    OutputStreamWriter out;
                    synchronized (MainActivity.this) { out = bluetoothWriter; }
                    if (out == null) throw new IllegalStateException("Сначала подключись к другому телефону");
                    synchronized (out) { out.write(safe.substring(0, Math.min(4000, safe.length()))); out.write("\n"); out.flush(); }
                    notifyJs("voltraBluetoothStatus", "Сообщение отправлено по Bluetooth");
                } catch (Exception e) {
                    notifyJs("voltraBluetoothStatus", "Не удалось отправить: " + (e.getMessage() == null ? "нет соединения" : e.getMessage()));
                }
            }, "voltra-bt-send").start();
        }

        @JavascriptInterface public void setLauncherIcon(String name) {
            String[][] aliases = {
                {"purple", getPackageName() + ".VoltraPurple"},
                {"cyan", getPackageName() + ".VoltraCyan"},
                {"rose", getPackageName() + ".VoltraRose"}
            };
            String selected = getPackageName() + ".VoltraPurple";
            if (name != null) for (String[] pair : aliases) if (pair[0].equalsIgnoreCase(name)) selected = pair[1];
            final String chosen = selected;
            runOnUiThread(() -> {
                try {
                    for (String[] pair : aliases) {
                        getPackageManager().setComponentEnabledSetting(new ComponentName(MainActivity.this, pair[1]),
                            pair[1].equals(chosen) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                            PackageManager.DONT_KILL_APP);
                    }
                    toast("Иконка VOLTRA изменена. Если не обновилась, перезапусти лаунчер.");
                } catch (Exception e) { toast("Не удалось сменить иконку"); }
            });
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    private void grantMediaRequest(android.webkit.PermissionRequest request) {
        java.util.ArrayList<String> allowed = new java.util.ArrayList<>();
        for (String resource : request.getResources()) {
            if (android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&
                checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
                allowed.add(resource);
            if (android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
                allowed.add(resource);
        }
        if (allowed.isEmpty()) request.deny();
        else request.grant(allowed.toArray(new String[0]));
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == BT_PERMISSION) {
            boolean ok = true;
            for (int result : grantResults) if (result != PackageManager.PERMISSION_GRANTED) ok = false;
            if (!ok) toast("Для Bluetooth-чата нужно разрешение Bluetooth");
        } else if (requestCode == MEDIA_PERMISSION) {
            if (pendingMediaRequest != null) {
                android.webkit.PermissionRequest request = pendingMediaRequest;
                pendingMediaRequest = null;
                if (request.getOrigin() != null && "neon-steve-arena-server-production.up.railway.app".equals(request.getOrigin().getHost()))
                    grantMediaRequest(request);
                else request.deny();
            }
        }
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
        closeBluetoothConnection();
        if (webView != null) { webView.stopLoading(); webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
