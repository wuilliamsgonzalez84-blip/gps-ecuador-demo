package ec.gpsecuador.mobile

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.view.Gravity
import android.widget.TextView
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.webkit.SslErrorHandler
import android.net.http.SslError
import android.webkit.WebSettings

/** View authorized external GPS trackers; does not access phone location. */
class FleetActivity : Activity() {
    private var web: WebView? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val base = BuildConfig.FLEET_BASE_URL
        val uri = Uri.parse(base)
        if (uri.scheme != "https" || uri.host.isNullOrEmpty() || uri.host!!.endsWith(".invalid")) {
            setContentView(TextView(this).apply {
                text = "Panel de vehículos en preparación. Falta publicar el servidor HTTPS de GPS Ecuador."
                gravity = Gravity.CENTER
                setPadding(32, 32, 32, 32)
            })
            return
        }
        web = WebView(this).apply {
            setBackgroundColor(Color.rgb(11, 19, 34))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val target = request.url
                    if (target.scheme == "https" && target.host.equals(uri.host, true) &&
                        (target.port == -1 || target.port == 443)) return false
                    if (target.scheme == "https") startActivity(Intent(Intent.ACTION_VIEW, target))
                    return true
                }
                override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                    handler.cancel()
                }
            }
            loadUrl(base.trimEnd('/') + "/panel")
        }
        setContentView(web)
    }
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web?.canGoBack() == true) web?.goBack() else super.onBackPressed()
    }
    override fun onDestroy() {
        web?.destroy()
        web = null
        super.onDestroy()
    }
}
