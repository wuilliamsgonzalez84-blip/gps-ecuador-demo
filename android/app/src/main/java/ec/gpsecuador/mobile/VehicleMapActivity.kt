package ec.gpsecuador.mobile

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

/** Displays only locations already authorized and fetched by the parent Activity. */
class VehicleMapActivity : Activity() {
    private var map: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val markers = JSONArray()
        val supplied = intent.getStringExtra("markersJson")
        if (supplied != null && supplied.length < 100000) {
            try {
                val source = JSONArray(supplied)
                for (i in 0 until minOf(source.length(), 200)) {
                    val point = source.getJSONObject(i)
                    val lat = point.getDouble("latitude")
                    val lon = point.getDouble("longitude")
                    if (!lat.isFinite() || !lon.isFinite() || lat !in -90.0..90.0 || lon !in -180.0..180.0) continue
                    markers.put(JSONObject().put("latitude", lat).put("longitude", lon)
                        .put("id", point.optInt("id", 0))
                        .put("name", point.optString("name", "Vehículo"))
                        .put("recordedAt", point.optString("recordedAt", "")))
                }
            } catch (_: Exception) { }
        }
        if (markers.length() == 0) {
            val lat = intent.getDoubleExtra("latitude", Double.NaN)
            val lon = intent.getDoubleExtra("longitude", Double.NaN)
            if (lat.isFinite() && lon.isFinite() && lat in -90.0..90.0 && lon in -180.0..180.0) {
                markers.put(JSONObject().put("latitude", lat).put("longitude", lon)
                    .put("name", "Última posición registrada").put("recordedAt", ""))
            }
        }
        if (markers.length() == 0) { finish(); return }

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(TextView(this).apply {
            text = "GPS Ecuador · ${markers.length()} vehículo(s) con ubicación · No en vivo"
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

        // JSON is encoded as a JavaScript string literal, not interpolated as executable code.
        val safeMarkers = JSONObject.quote(markers.toString())
        val html = """
            <!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
            <style>html,body,#map{height:100%;margin:0}.notice{position:absolute;bottom:8px;left:8px;z-index:1000;background:white;padding:5px;font:12px sans-serif}</style></head>
            <body><div id="map"></div><div class="notice">Últimas posiciones guardadas · No es rastreo en vivo</div>
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
              const points = JSON.parse($safeMarkers);
              const map = L.map('map');
              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
                maxZoom:19,attribution:'&copy; OpenStreetMap contributors'
              }).addTo(map);
              const bounds = [];
              for (const p of points) {
                const lat = Number(p.latitude), lon = Number(p.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
                const label = document.createElement('div');
                const title = document.createElement('strong');
                title.textContent = p.name || ('Vehículo ' + p.id);
                label.appendChild(title);
                const time = document.createElement('div');
                time.textContent = p.recordedAt ? ('Último reporte: ' + p.recordedAt) : 'Última posición registrada';
                label.appendChild(time);
                L.circleMarker([lat,lon],{radius:10,color:'#0066cc',fillColor:'#0088ff',fillOpacity:0.85})
                  .addTo(map).bindPopup(label);
                bounds.push([lat,lon]);
              }
              if (bounds.length === 1) map.setView(bounds[0],16);
              else if (bounds.length > 1) map.fitBounds(bounds,{padding:[35,35],maxZoom:16});
            </script></body></html>
        """.trimIndent()
        web.loadDataWithBaseURL("https://unpkg.com/", html, "text/html", "UTF-8", null)
    }

    override fun onDestroy() {
        map?.destroy()
        map = null
        super.onDestroy()
    }
}
