package ec.gpsecuador.mobile

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import java.util.concurrent.atomic.AtomicBoolean
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Button
import android.widget.EditText
import java.time.Instant
import java.time.temporal.ChronoUnit
import org.json.JSONArray
import org.json.JSONObject

/** Displays only locations already authorized and fetched by the parent Activity. */
class VehicleMapActivity : Activity() {
    private var map: WebView? = null
    private var loaded = false
    private val refreshHandler = Handler(Looper.getMainLooper())
    private val refreshing = AtomicBoolean(false)
    private var autoRefresh = false
    private var screenVisible = false
    private var refreshAction: (() -> Unit)? = null
    private val refreshTask = object : Runnable {
        override fun run() {
            if (!autoRefresh || !screenVisible) return
            refreshAction?.invoke()
            refreshHandler.postDelayed(this, 15_000L)
        }
    }

    private fun stopPolling() { refreshHandler.removeCallbacks(refreshTask) }
    override fun onResume() {
        super.onResume()
        screenVisible = true
        if (autoRefresh) { stopPolling(); refreshHandler.post(refreshTask) }
    }
    override fun onPause() {
        screenVisible = false
        stopPolling()
        super.onPause()
    }

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
                        .put("recordedAt", point.optString("recordedAt", ""))
                        .put("speedKmh", point.opt("speedKmh") ?: JSONObject.NULL))
                }
            } catch (_: Exception) { }
        }
        if (markers.length() == 0) {
            val lat = intent.getDoubleExtra("latitude", Double.NaN)
            val lon = intent.getDoubleExtra("longitude", Double.NaN)
            if (lat.isFinite() && lon.isFinite() && lat in -90.0..90.0 && lon in -180.0..180.0) {
                markers.put(JSONObject().put("latitude", lat).put("longitude", lon)
                    .put("name", "Última posición registrada").put("recordedAt", intent.getStringExtra("recordedAt") ?: ""))
            }
        }
        if (markers.length() == 0) { finish(); return }

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(TextView(this).apply {
            text = "GPS Ecuador · ${markers.length()} vehículo(s) con ubicación · No en vivo"
            textSize = 18f
            setPadding(18, 22, 18, 14)
        })
        val status = TextView(this).apply { text = "Posiciones del último reporte · Actualización manual"; setPadding(18, 8, 18, 8) }
        val vehicleSummary = TextView(this).apply { text = "Estado de los vehículos: consulta pendiente"; setPadding(18, 4, 18, 8) }
        root.addView(status)
        root.addView(vehicleSummary)
        val autoButton = Button(this).apply { text = "Activar actualización automática (15 s)" }
        root.addView(autoButton)
        autoButton.setOnClickListener {
            autoRefresh = !autoRefresh
            autoButton.text = if (autoRefresh) "Detener actualización automática" else "Activar actualización automática (15 s)"
            stopPolling()
            if (autoRefresh && screenVisible) refreshHandler.post(refreshTask)
            if (!autoRefresh) status.text = "Actualización automática detenida"
        }
        val controls = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val vehicleIdInput = EditText(this).apply {
            hint = "ID vehículo"; inputType = android.text.InputType.TYPE_CLASS_NUMBER
            val initialId = intent.getIntExtra("vehicleId", 0)
            if (initialId > 0) setText(initialId.toString())
            layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
        }
        controls.addView(vehicleIdInput)
        val refresh = Button(this).apply { text = "Actualizar" }
        controls.addView(refresh)
        root.addView(controls)
        val historyButton = Button(this).apply { text = "Ver recorrido de 7 días (ID indicado)" }
        root.addView(historyButton)
        val serverUrl = intent.getStringExtra("serverUrl")
        val token = intent.getStringExtra("customerToken")
        refresh.isEnabled = serverUrl != null && token != null
        historyButton.isEnabled = refresh.isEnabled
        autoButton.isEnabled = refresh.isEnabled
        refreshAction = { refresh.performClick() }
        refresh.setOnClickListener {
            if (serverUrl == null || token == null) return@setOnClickListener
            status.text = "Actualizando posiciones..."
            if (!refreshing.compareAndSet(false, true)) return@setOnClickListener
            Thread {
                try {
                    val api = CustomerApi(serverUrl)
                    val vehicles = api.vehicles(token).optJSONArray("vehicles") ?: JSONArray()
                    val positions = api.positions(token).optJSONArray("positions") ?: JSONArray()
                    val allowed = mutableMapOf<Int, String>()
                    for (i in 0 until vehicles.length()) {
                        val v = vehicles.getJSONObject(i)
                        allowed[v.getInt("id")] = v.optString("name", "Vehículo")
                    }
                    val latest = JSONArray()
                    for (i in 0 until positions.length()) {
                        val p = positions.getJSONObject(i)
                        val id = p.getInt("vehicleId")
                        if (!allowed.containsKey(id)) continue
                        val lat = p.getDouble("latitude"); val lon = p.getDouble("longitude")
                        if (!lat.isFinite() || !lon.isFinite() || lat !in -90.0..90.0 || lon !in -180.0..180.0) continue
                        latest.put(JSONObject().put("id", id).put("name", allowed[id])
                            .put("latitude", lat).put("longitude", lon)
                            .put("recordedAt", p.optString("recordedAt", ""))
                            .put("speedKmh", p.opt("speedKmh") ?: JSONObject.NULL))
                    }
                    runOnUiThread {
                        if (loaded) map?.evaluateJavascript("renderPositions(" + JSONObject.quote(latest.toString()) + ",false);", null)
                        status.text = "Actualizado: ${latest.length()} vehículo(s) · Consulta cada 15 s si está activada"
                        vehicleSummary.text = summarizeVehicleAges(latest)
                    }
                } catch (e: Exception) { runOnUiThread { status.text = "Error al actualizar: ${e.message}" } }
                finally { refreshing.set(false) }
            }.start()
        }
        historyButton.setOnClickListener {
            if (serverUrl == null || token == null) return@setOnClickListener
            val id = vehicleIdInput.text.toString().toIntOrNull()
            if (id == null || id <= 0) { status.text = "Escribe el ID del vehículo autorizado"; return@setOnClickListener }
            status.text = "Consultando recorrido..."
            Thread {
                try {
                    val to = Instant.now()
                    val from = to.minus(7, ChronoUnit.DAYS)
                    val result = CustomerApi(serverUrl).history(token, id, from.toString(), to.plusSeconds(60).toString())
                    val positions = result.optJSONArray("positions") ?: JSONArray()
                    val coords = JSONArray()
                    for (i in positions.length() - 1 downTo 0) {
                        val p = positions.getJSONObject(i)
                        val lat = p.getDouble("latitude"); val lon = p.getDouble("longitude")
                        if (lat.isFinite() && lon.isFinite() && lat in -90.0..90.0 && lon in -180.0..180.0)
                            coords.put(JSONObject().put("lat", lat).put("lon", lon)
                                .put("time", p.optString("recordedAt", "")))
                    }
                    runOnUiThread {
                        if (loaded) map?.evaluateJavascript("renderRoute(" + JSONObject.quote(coords.toString()) + ");", null)
                        status.text = if (coords.length() < 2) "Vehículo $id: ${coords.length()} punto(s). Se necesitan 2 o más para dibujar recorrido." else "Recorrido del vehículo $id: ${coords.length()} puntos (últimos 7 días)"
                    }
                } catch (e: Exception) { runOnUiThread { status.text = "No se pudo consultar recorrido: ${e.message}" } }
            }.start()
        }
        vehicleSummary.text = summarizeVehicleAges(markers)
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.setGeolocationEnabled(false)
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) { loaded = true }
            }
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
              const positionLayer = L.layerGroup().addTo(map);
              const routeLayer = L.layerGroup().addTo(map);
              function lastSeen(value) {
                if (!value) return {label:'Sin hora de reporte', color:'#777777'};
                const ms = Date.parse(value);
                if (!Number.isFinite(ms)) return {label:'Hora desconocida', color:'#777777'};
                const age = Date.now() - ms;
                if (age < -120000) return {label:'Hora del dispositivo por verificar', color:'#777777'};
                if (age < 120000) return {label:'Reporte reciente (menos de 2 min)', color:'#14804a'};
                if (age < 900000) return {label:'Último reporte hace '+Math.floor(age/60000)+' min', color:'#d18a00'};
                return {label:'Sin reporte reciente ('+Math.floor(age/60000)+' min)', color:'#777777'};
              }
              function renderPositions(json, fit) {
                const items = JSON.parse(json);
                positionLayer.clearLayers();
                const bounds = [];
                for (const p of items) {
                  const lat = Number(p.latitude), lon = Number(p.longitude);
                  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
                  const label = document.createElement('div');
                  const title = document.createElement('strong');
                  title.textContent = p.name || ('Vehículo ' + p.id);
                  label.appendChild(title);
                  const time = document.createElement('div');
                  const seen = lastSeen(p.recordedAt);
                  time.textContent = seen.label;
                  label.appendChild(time);
                  const date = document.createElement('div');
                  date.textContent = p.recordedAt ? ('Fecha: '+new Date(p.recordedAt).toLocaleString('es-EC')) : 'Fecha no disponible';
                  label.appendChild(date);
                  const speed = document.createElement('div');
                  const kmh = Number(p.speedKmh);
                  speed.textContent = p.speedKmh !== null && p.speedKmh !== undefined && Number.isFinite(kmh) && kmh >= 0 ? ('Velocidad reportada: '+kmh.toFixed(1)+' km/h') : 'Velocidad: no disponible';
                  label.appendChild(speed);
                  L.circleMarker([lat,lon],{radius:10,color:seen.color,fillColor:seen.color,fillOpacity:0.85})
                    .addTo(positionLayer).bindPopup(label);
                  bounds.push([lat,lon]);
                }
                if (fit && bounds.length === 1) map.setView(bounds[0],16);
                else if (fit && bounds.length > 1) map.fitBounds(bounds,{padding:[35,35],maxZoom:16});
              }
              function renderRoute(json) {
                routeLayer.clearLayers();
                const raw = JSON.parse(json);
                const points = raw.map(p => ({
                  lat: Number(p.lat), lon: Number(p.lon), time: Date.parse(p.time || '')
                })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
                if (!points.length) return;
                const bounds = [];
                let segment = [], gaps = 0;
                function flush() {
                  if (segment.length > 1) L.polyline(segment,{color:'#ef7c00',weight:5,opacity:0.85}).addTo(routeLayer);
                  else if (segment.length === 1) L.circleMarker(segment[0],{color:'#ef7c00',radius:5}).addTo(routeLayer);
                  segment = [];
                }
                let previous = null;
                for (const p of points) {
                  const coord = [p.lat,p.lon];
                  bounds.push(coord);
                  if (previous) {
                    const km = map.distance([previous.lat,previous.lon],coord)/1000;
                    const seconds = (p.time-previous.time)/1000;
                    // Do not imply a continuous route across long gaps or implausible jumps.
                    if (km > 2 || (Number.isFinite(seconds) && seconds > 0 &&
                        (seconds > 1800 || km/(seconds/3600) > 180))) {
                      flush(); gaps++;
                    }
                  }
                  segment.push(coord);
                  previous = p;
                }
                flush();
                L.circleMarker(bounds[0],{radius:7,color:'#14804a',fillOpacity:1})
                  .addTo(routeLayer).bindPopup('Inicio de posiciones registradas');
                L.circleMarker(bounds[bounds.length-1],{radius:7,color:'#be4b00',fillOpacity:1})
                  .addTo(routeLayer).bindPopup('Última posición del recorrido');
                if (gaps) console.info(gaps+' saltos de ubicación omitidos');
                map.fitBounds(bounds,{padding:[35,35],maxZoom:16});
              }
              renderPositions(JSON.stringify(points),true);
            </script></body></html>
        """.trimIndent()
        web.loadDataWithBaseURL("https://unpkg.com/", html, "text/html", "UTF-8", null)
    }

    private fun summarizeVehicleAges(points: JSONArray): String {
        var recent = 0
        var delayed = 0
        var old = 0
        var unknown = 0
        val now = System.currentTimeMillis()
        for (i in 0 until points.length()) {
            val recorded = points.optJSONObject(i)?.optString("recordedAt", "") ?: ""
            val age = try { now - Instant.parse(recorded).toEpochMilli() } catch (_: Exception) { null }
            when {
                age == null || age < -120_000L -> unknown++
                age < 120_000L -> recent++
                age < 900_000L -> delayed++
                else -> old++
            }
        }
        return "Reportes: $recent recientes · $delayed con demora · $old antiguos · $unknown sin hora válida"
    }

    override fun onDestroy() {
        autoRefresh = false
        stopPolling()
        refreshAction = null
        map?.destroy()
        map = null
        super.onDestroy()
    }
}
