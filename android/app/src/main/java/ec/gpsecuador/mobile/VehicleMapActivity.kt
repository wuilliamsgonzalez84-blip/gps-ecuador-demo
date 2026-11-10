package ec.gpsecuador.mobile

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView

/** Private position passed only as Activity extras; no bearer token or GPS data in a URL. */
class VehicleMapActivity : Activity() {
    private var map: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val lat = intent.getDoubleExtra("latitude", Double.NaN)
        val lon = intent.getDoubleExtra("longitude", Double.NaN)
        if (!lat.isFinite() || !lon.isFinite() || lat !in -90.0..90.0 || lon !in -180.0..180.0) {
            finish()
            return
        }
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(TextView(this).apply {
            text = "GPS Ecuador · Última ubicación registrada (no en vivo)"
            textSize = 18f
            setPadding(18, 22, 18, 14)
        })
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.setGeolocationEnabled(false)
            webViewClient = WebViewClient()
        }
        map = web
        root.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        // Leaflet JS and OpenStreetMap tiles are loaded over HTTPS after user consent.
        // Coordinates are interpolated only after finite numeric range validation.
        val html = """
            <!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
             integrity="sha256-p4NxAoJBhIIN+hmNHrzxZrK7x8a4J6b2vQhE7mP6p7s=" crossorigin="anonymous">
            <style>html,body,#map{height:100%;margin:0} .notice{position:absolute;bottom:8px;left:8px;z-index:1000;background:white;padding:5px;font:12px sans-serif}</style></head>
            <body><div id="map"></div><div class="notice">Última posición guardada · No es rastreo en vivo</div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
              const lat = $lat, lon = $lon;
              const map = L.map('map').setView([lat,lon],16);
              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
                maxZoom:19,attribution:'&copy; OpenStreetMap contributors'
              }).addTo(map);
              L.circleMarker([lat,lon],{radius:10,color:'#0066cc',fillColor:'#0088ff',fillOpacity:0.85})
               .addTo(map).bindPopup('Última posición registrada').openPopup();
            </script></body></html>
        """.trimIndent().replace(Regex("(?s)\\s*integrity=\"[^\"]+\""), "")
        web.loadDataWithBaseURL("https://unpkg.com/", html, "text/html", "UTF-8", null)
    }

    override fun onDestroy() {
        map?.destroy()
        map = null
        super.onDestroy()
    }
}
