package com.thelastlaundromat.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Hosts the HTML5 game (packaged from /web) in a full-screen WebView.
 *
 * Assets are served from a virtual https origin so that fetch(), ES modules, Web Audio
 * and range requests for streamed music all behave exactly like on a normal web server.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE_URL = "https://" + HOST + "/";

    private WebView webView;
    private int insetLeft, insetTop, insetRight, insetBottom;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(22, 17, 13));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        setContentView(webView);
        enterImmersiveMode();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        // The game has its own text-size option; keep the layout independent of system font scale.
        s.setTextZoom(100);

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                android.util.Log.d("LastLaundromat", m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost())) return null;
                return serveAsset(uri, request.getRequestHeaders());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            readCutoutInsets(insets);
            return insets;
        });

        if (savedInstanceState == null) {
            webView.loadUrl(BASE_URL + "index.html");
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    // ------------------------------------------------------------------ asset server

    private WebResourceResponse serveAsset(Uri uri, Map<String, String> reqHeaders) {
        String path = uri.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        String assetPath = Uri.decode(path.substring(1));
        String mime = mimeFor(assetPath);
        String encoding = isText(mime) ? "utf-8" : null;
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Cache-Control", "no-cache");
        try {
            byte[] data = readAsset(assetPath);
            String range = null;
            if (reqHeaders != null) {
                for (Map.Entry<String, String> e : reqHeaders.entrySet()) {
                    if ("range".equalsIgnoreCase(e.getKey())) range = e.getValue();
                }
            }
            headers.put("Accept-Ranges", "bytes");
            if (range != null && range.startsWith("bytes=")) {
                long total = data.length;
                String[] parts = range.substring(6).split("-", -1);
                long start = parts[0].isEmpty() ? 0 : Long.parseLong(parts[0].trim());
                long end = (parts.length > 1 && !parts[1].trim().isEmpty()) ? Long.parseLong(parts[1].trim()) : total - 1;
                if (end >= total) end = total - 1;
                if (start > end) start = 0;
                int len = (int) (end - start + 1);
                headers.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
                headers.put("Content-Length", String.valueOf(len));
                return new WebResourceResponse(mime, encoding, 206, "Partial Content", headers,
                        new ByteArrayInputStream(data, (int) start, len));
            }
            headers.put("Content-Length", String.valueOf(data.length));
            return new WebResourceResponse(mime, encoding, 200, "OK", headers, new ByteArrayInputStream(data));
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers,
                    new ByteArrayInputStream(new byte[0]));
        }
    }

    private byte[] readAsset(String assetPath) throws IOException {
        try (InputStream in = getAssets().open(assetPath)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(4096, in.available()));
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private static boolean isText(String mime) {
        return mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("svg");
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".m4a")) return "audio/mp4";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".txt") || p.endsWith(".md")) return "text/plain";
        return "application/octet-stream";
    }

    // ------------------------------------------------------------------ window / lifecycle

    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }

    private void readCutoutInsets(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= 28) {
            DisplayCutout cut = insets.getDisplayCutout();
            float d = getResources().getDisplayMetrics().density;
            if (cut != null) {
                insetLeft = Math.round(cut.getSafeInsetLeft() / d);
                insetTop = Math.round(cut.getSafeInsetTop() / d);
                insetRight = Math.round(cut.getSafeInsetRight() / d);
                insetBottom = Math.round(cut.getSafeInsetBottom() / d);
            } else {
                insetLeft = insetTop = insetRight = insetBottom = 0;
            }
            if (webView != null) {
                webView.evaluateJavascript("window.__onInsets && window.__onInsets(" + insetLeft + "," + insetTop + ","
                        + insetRight + "," + insetBottom + ")", null);
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript("window.__onPause && window.__onPause()", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (webView != null) {
            webView.onResume();
            webView.evaluateJavascript("window.__onResume && window.__onResume()", null);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        // The game decides what "back" means (close a menu, open the pause menu, ...).
        webView.evaluateJavascript("(window.__onBack ? window.__onBack() : 'exit')", value -> {
            if (value != null && value.contains("exit")) finish();
        });
    }

    // ------------------------------------------------------------------ JS bridge

    private class Bridge {
        private File saveFile(String key) {
            String safe = key.replaceAll("[^A-Za-z0-9_\\-]", "_");
            return new File(getFilesDir(), "save_" + safe + ".json");
        }

        @JavascriptInterface
        public boolean saveBackup(String key, String data) {
            File f = saveFile(key);
            File tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(data.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            } catch (IOException e) {
                return false;
            }
            return tmp.renameTo(f);
        }

        @JavascriptInterface
        public String loadBackup(String key) {
            File f = saveFile(key);
            if (!f.exists()) return "";
            try (FileInputStream in = new FileInputStream(f)) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                return out.toString("UTF-8");
            } catch (IOException e) {
                return "";
            }
        }

        @JavascriptInterface
        public void deleteBackup(String key) {
            //noinspection ResultOfMethodCallIgnored
            saveFile(key).delete();
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                if (Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public String getSafeInsets() {
            return insetLeft + "," + insetTop + "," + insetRight + "," + insetBottom;
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(MainActivity.this::finish);
        }
    }
}
