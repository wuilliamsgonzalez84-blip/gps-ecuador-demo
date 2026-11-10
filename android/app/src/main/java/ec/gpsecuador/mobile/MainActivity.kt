package ec.gpsecuador.mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.EditText
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.location.LocationManager
import android.os.CancellationSignal
import android.net.Uri
import java.time.temporal.ChronoUnit
import java.time.format.DateTimeFormatter
import java.time.Instant

class MainActivity : Activity() {
    private var customerToken: String? = null
    private var latestAuthorizedLocation: Pair<Double, Double>? = null
    private lateinit var customerStatus: TextView
    private lateinit var state: TextView
    private lateinit var history: TextView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 48, 32, 32) }
        layout.addView(TextView(this).apply { text = "GPS Ecuador"; textSize = 26f })
        layout.addView(TextView(this).apply { text = "Compartir ubicación solo con tu autorización. Mientras esté activo, verás una notificación permanente. Esta versión guarda hasta 300 posiciones de forma privada en este teléfono. Aún NO transmite posiciones a otro teléfono." })
        layout.addView(TextView(this).apply { text = "Acceso privado a vehículos"; textSize = 20f })
        val serverUrl = EditText(this).apply { hint = "Servidor HTTPS"; setText("https://45-77-197-18.sslip.io"); inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI }
        layout.addView(serverUrl)
        val email = EditText(this).apply { hint = "Correo electrónico"; inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS }
        layout.addView(email)
        val password = EditText(this).apply { hint = "Contraseña"; inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD }
        layout.addView(password)
        customerStatus = TextView(this).apply { text = "Sin sesión iniciada" }
        layout.addView(customerStatus)
        layout.addView(Button(this).apply { text = "Entrar y consultar mis vehículos"; setOnClickListener {
            val url = serverUrl.text.toString().trim()
            val mail = email.text.toString().trim()
            val secret = password.text.toString()
            if (url.isBlank() || mail.isBlank() || secret.isBlank()) { customerStatus.text = "Completa HTTPS, correo y contraseña"; return@setOnClickListener }
            customerStatus.text = "Conectando..."
            Thread {
                try {
                    val api = CustomerApi(url)
                    val token = api.login(mail, secret)
                    val vehicles = api.vehicles(token).optJSONArray("vehicles")
                    val positions = api.positions(token).optJSONArray("positions")
                    customerToken = token
                    runOnUiThread { password.text.clear(); customerStatus.text = "Sesión iniciada. Vehículos autorizados: ${vehicles?.length() ?: 0}. Posiciones disponibles: ${positions?.length() ?: 0}." }
                } catch (e: Exception) { runOnUiThread { customerStatus.text = "No se pudo conectar: ${e.message}" } }
            }.start()
        } })
        layout.addView(Button(this).apply { text = "Cerrar sesión privada"; setOnClickListener {
            val token = customerToken
            customerToken = null
            customerStatus.text = "Sesión cerrada en este teléfono"
            if (token != null) Thread { try { CustomerApi(serverUrl.text.toString().trim()).logout(token) } catch (_: Exception) {} }.start()
        } })
        val uploadVehicleId = EditText(this).apply { hint = "ID del vehículo autorizado"; inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        layout.addView(uploadVehicleId)
        layout.addView(Button(this).apply { text = "Enviar UNA posición al servidor"; setOnClickListener {
            val token = customerToken
            val id = uploadVehicleId.text.toString().toIntOrNull()
            if (token == null || id == null || id <= 0) { customerStatus.text = "Inicia sesión e indica el ID autorizado"; return@setOnClickListener }
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                customerStatus.text = "Concede primero el permiso de ubicación"; return@setOnClickListener
            }
            val lm = getSystemService(LOCATION_SERVICE) as LocationManager
            val provider = when {
                lm.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> null
            }
            if (provider == null) { customerStatus.text = "Activa la ubicación"; return@setOnClickListener }
            customerStatus.text = "Obteniendo posición actual..."
            try {
                lm.getCurrentLocation(provider, CancellationSignal(), mainExecutor) { loc ->
                    if (loc == null) { customerStatus.text = "No se obtuvo una posición actual"; return@getCurrentLocation }
                    customerStatus.text = "Enviando posición autorizada..."
                    val url = serverUrl.text.toString().trim()
                    Thread {
                        try {
                            CustomerApi(url).sendPhonePosition(token, id, loc.latitude, loc.longitude, Instant.ofEpochMilli(loc.time).toString())
                            runOnUiThread { customerStatus.text = "Posición enviada y aceptada por el servidor" }
                        } catch (e: Exception) { runOnUiThread { customerStatus.text = "Envío fallido: ${e.message}" } }
                    }.start()
                }
            } catch (e: Exception) { customerStatus.text = "Error de ubicación: ${e.message}" }
        } })
        val serverHistory = TextView(this).apply { text = "Historial del servidor: sin consultar"; setPadding(0, 12, 0, 12) }
        layout.addView(serverHistory)
        layout.addView(Button(this).apply { text = "Consultar historial real (últimos 7 días)"; setOnClickListener {
            val token = customerToken
            val id = uploadVehicleId.text.toString().toIntOrNull()
            if (token == null || id == null || id <= 0) { serverHistory.text = "Inicia sesión y escribe el ID de tu vehículo"; return@setOnClickListener }
            val url = serverUrl.text.toString().trim()
            serverHistory.text = "Consultando historial privado..."
            Thread {
                try {
                    val api = CustomerApi(url)
                    val to = Instant.now()
                    val from = to.minus(7, ChronoUnit.DAYS)
                    val result = api.history(token, id, from.toString(), to.plusSeconds(60).toString())
                    val items = result.optJSONArray("positions")
                    val count = items?.length() ?: 0
                    val latest = if (count > 0) items!!.getJSONObject(0) else null
                    val lat = latest?.getDouble("latitude")
                    val lon = latest?.getDouble("longitude")
                    val whenRecorded = latest?.optString("recordedAt") ?: ""
                    runOnUiThread {
                        latestAuthorizedLocation = if (lat != null && lon != null) Pair(lat, lon) else null
                        serverHistory.text = if (count == 0) "No hay posiciones en el servidor para este vehículo durante los últimos 7 días." else "Historial real: $count posiciones. Última: $whenRecorded. Pulsa Ver ubicación en mapa para abrirla."
                    }
                } catch (e: Exception) { runOnUiThread { serverHistory.text = "No se pudo consultar el historial: ${e.message}" } }
            }.start()
        } })
        layout.addView(Button(this).apply { text = "Ver ubicación en mapa integrado"; setOnClickListener {
            val loc = latestAuthorizedLocation
            if (loc == null) { serverHistory.text = "Primero consulta el historial real"; return@setOnClickListener }
            android.app.AlertDialog.Builder(this@MainActivity)
                .setTitle("Mapa dentro de GPS Ecuador")
                .setMessage("Para mostrar el mapa se descargarán imágenes de OpenStreetMap. El proveedor de mapas puede recibir información de la zona consultada. ¿Continuar?")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Ver mapa") { _, _ ->
                    startActivity(Intent(this@MainActivity, VehicleMapActivity::class.java).apply {
                        putExtra("latitude", loc.first)
                        putExtra("longitude", loc.second)
                    })
                }.show()
        } })
        layout.addView(Button(this).apply { text = "Ver todos mis vehículos en el mapa"; setOnClickListener {
            val token = customerToken
            if (token == null) { customerStatus.text = "Inicia sesión para consultar tus vehículos"; return@setOnClickListener }
            val url = serverUrl.text.toString().trim()
            customerStatus.text = "Consultando ubicaciones autorizadas..."
            Thread {
                try {
                    val api = CustomerApi(url)
                    val vehicles = api.vehicles(token).optJSONArray("vehicles") ?: org.json.JSONArray()
                    val positions = api.positions(token).optJSONArray("positions") ?: org.json.JSONArray()
                    val names = mutableMapOf<Int, String>()
                    for (i in 0 until vehicles.length()) {
                        val v = vehicles.getJSONObject(i)
                        names[v.getInt("id")] = v.optString("name", "Vehículo ${v.getInt("id")}")
                    }
                    val markers = org.json.JSONArray()
                    for (i in 0 until positions.length()) {
                        val p = positions.getJSONObject(i)
                        val id = p.getInt("vehicleId")
                        val lat = p.getDouble("latitude")
                        val lon = p.getDouble("longitude")
                        if (!names.containsKey(id) || !lat.isFinite() || !lon.isFinite() || lat !in -90.0..90.0 || lon !in -180.0..180.0) continue
                        markers.put(org.json.JSONObject().put("id", id).put("name", names[id])
                            .put("latitude", lat).put("longitude", lon)
                            .put("recordedAt", p.optString("recordedAt", "")))
                    }
                    runOnUiThread {
                        customerStatus.text = "Vehículos autorizados: ${vehicles.length()}. Con ubicación: ${markers.length()}."
                        if (markers.length() == 0) {
                            customerStatus.text = "No hay ubicaciones registradas para tus vehículos"
                        } else {
                            android.app.AlertDialog.Builder(this@MainActivity)
                                .setTitle("Mapa de mis vehículos")
                                .setMessage("El mapa descargará imágenes de OpenStreetMap; el proveedor puede conocer la zona consultada. ¿Continuar?")
                                .setNegativeButton("Cancelar", null)
                                .setPositiveButton("Ver mapa") { _, _ ->
                                    startActivity(Intent(this@MainActivity, VehicleMapActivity::class.java).apply {
                                        putExtra("markersJson", markers.toString())
                                        putExtra("serverUrl", url)
                                        putExtra("customerToken", token)
                                    })
                                }.show()
                        }
                    }
                } catch (e: Exception) { runOnUiThread { customerStatus.text = "No se pudieron consultar los vehículos: ${e.message}" } }
            }.start()
        } })
        state = TextView(this).apply { text = "Seguimiento desactivado" }
        layout.addView(state)
        layout.addView(Button(this).apply { text = "Iniciar GPS"; setOnClickListener { requestLocation() } })
        layout.addView(Button(this).apply { text = "Detener GPS"; setOnClickListener { stopService(Intent(this@MainActivity, LocationService::class.java)); state.text = "Seguimiento detenido" } })
        history = TextView(this).apply { text = LocationHistory.summary(this@MainActivity); setPadding(0, 24, 0, 24) }
        layout.addView(history)
        layout.addView(Button(this).apply { text = "Actualizar historial local"; setOnClickListener { history.text = LocationHistory.summary(this@MainActivity) } })
        layout.addView(Button(this).apply { text = "Borrar historial local"; setOnClickListener {
            android.app.AlertDialog.Builder(this@MainActivity)
                .setTitle("¿Borrar historial GPS?")
                .setMessage("Se eliminarán las posiciones guardadas en este teléfono. Esta acción no se puede deshacer.")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Borrar") { _, _ -> LocationHistory.clear(this@MainActivity); history.text = LocationHistory.summary(this@MainActivity) }
                .show()
        } })
        setContentView(layout)
    }
    override fun onResume() {
        super.onResume()
        if (::history.isInitialized) history.text = LocationHistory.summary(this)
    }
    private fun requestLocation() {
        val permissions = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(permissions.toTypedArray(), 100)
        } else startGps()
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 100 && (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED)) startGps()
        else state.text = "Permiso de ubicación denegado"
    }
    private fun startGps() {
        try {
            startForegroundService(Intent(this, LocationService::class.java))
            state.text = "Servicio GPS solicitado"
        } catch (e: Exception) { state.text = "No se pudo iniciar: ${e.message}" }
    }
}
