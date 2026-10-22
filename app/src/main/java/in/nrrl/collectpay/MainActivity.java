package in.nrrl.collectpay;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        // Close the full-screen QR or the edit sheet first, if open.
        web.evaluateJavascript(
            "(function(){var p=document.querySelector('.present .close');if(p){p.click();return 1}" +
            "var s=document.querySelector('.sheet-bg');if(s){s.remove();return 1}return 0})()",
            v -> { if ("0".equals(v)) MainActivity.super.onBackPressed(); });
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
        public void shareImage(final String base64Png, final String text) {
            runOnUiThread(() -> {
                try {
                    File dir = new File(getCacheDir(), "shared");
                    dir.mkdirs();
                    File f = new File(dir, "payment-qr.png");
                    try (FileOutputStream out = new FileOutputStream(f)) {
                        out.write(Base64.decode(base64Png, Base64.DEFAULT));
                    }
                    Uri uri = FileProvider.getUriForFile(MainActivity.this, "in.nrrl.collectpay.files", f);
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
