package in.nrrl.collectpay;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import androidx.core.content.FileProvider;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

/**
 * Orbe Pay: the app page runs in a WebView served from the app's own assets under a private
 * https address, so it works fully offline and nothing is loaded from the internet.
 */
public class MainActivity extends Activity {
    private static final String HOST = "app.orbe.local";
    private WebView web;
    private String insetJs = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15+ draws apps edge to edge: pad the page away from the status/navigation bars,
        // camera cutout and the on-screen keyboard.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF1C2232);
        web = new WebView(this);
        web.setBackgroundColor(0xFF1C2232);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        if (Build.VERSION.SDK_INT >= 30) {
            // same edge-to-edge layout on Android 11-14 as Android 15+ enforces
            getWindow().setDecorFitsSystemWindows(false);
            getWindow().setStatusBarColor(0x00000000);
            getWindow().setNavigationBarColor(0x00000000);
            if (Build.VERSION.SDK_INT >= 29) getWindow().setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            // The dusk scene runs edge to edge behind the status and navigation bars; the page is told how
            // big the bars are (as CSS variables) so its buttons and text stay clear of them.
            root.setOnApplyWindowInsetsListener((v, ins) -> {
                android.graphics.Insets b = ins.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets k = ins.getInsets(WindowInsets.Type.ime());
                v.setPadding(0, 0, 0, Math.max(0, k.bottom - b.bottom));
                float d = getResources().getDisplayMetrics().density;
                insetJs = "document.documentElement.style.setProperty('--sat','" + Math.round(b.top / d) + "px');"
                        + "document.documentElement.style.setProperty('--sab','" + Math.round(b.bottom / d) + "px');"
                        + "document.documentElement.style.setProperty('--sal','" + Math.round(b.left / d) + "px');"
                        + "document.documentElement.style.setProperty('--sar','" + Math.round(b.right / d) + "px');";
                if (web != null) web.evaluateJavascript(insetJs, null);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not found", null, new ByteArrayInputStream(new byte[0]));
                }
                String path = u.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
                try {
                    InputStream in = getAssets().open(path.substring(1));
                    return new WebResourceResponse(mimeFor(path), "utf-8", in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not found", null, new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!insetJs.isEmpty()) view.evaluateJavascript(insetJs, null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/index.html");

        // Back gesture / button (Android 13+ predictive back; required when targeting Android 16)
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    private static String mimeFor(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    /** Close the full-screen QR, a sheet or the QR screen first; otherwise leave the app. */
    private void handleBack() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(window.__back?window.__back():0)", v -> { if ("0".equals(v)) finish(); });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack(); // Android 12 and older
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();   // stops animations and timers while in the background
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    class Bridge {
        @JavascriptInterface
        public void keepAwake(final boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("UPI link", text));
                Toast.makeText(MainActivity.this, "Copied", Toast.LENGTH_SHORT).show();
            });
        }

        @JavascriptInterface
        public void showKeyboard() {
            runOnUiThread(() -> {
                web.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                if (imm != null) imm.showSoftInput(web, InputMethodManager.SHOW_IMPLICIT);
            });
        }

        @JavascriptInterface
        public void shareImage(final String base64Png, final String text) {
            runOnUiThread(() -> {
                try {
                    File dir = new File(getCacheDir(), "shared");
                    dir.mkdirs();
                    File f = new File(dir, "payment-qr.png");
                    try (FileOutputStream out = new FileOutputStream(f)) {
                        out.write(Base64.decode(base64Png, Base64.DEFAULT));
                    }
                    Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("image/png");
                    i.putExtra(Intent.EXTRA_STREAM, uri);
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    i.setClipData(ClipData.newRawUri("payment-qr", uri));
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(i, "Share payment QR"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Couldn't share the QR image", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Send payment request"));
            });
        }
    }
}
