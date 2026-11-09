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
import android.widget.ScrollView
import org.json.JSONArray

class MainActivity : Activity() {
    private var customerToken: String? = null
    private var customerApi: CustomerApi? = null
    private lateinit var customerResults: TextView
    private lateinit var refreshButton: Button
    private lateinit var logoutButton: Button
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
                    runOnUiThread { customerApi = api; customerToken = token; password.text.clear(); customerStatus.text = "Sesión iniciada correctamente"; customerResults.text = formatTracking(vehicles, positions); refreshButton.isEnabled = true; logoutButton.isEnabled = true }
                } catch (e: Exception) { runOnUiThread { customerStatus.text = "No se pudo conectar: ${e.message}" } }
            }.start()
        } })
        customerResults = TextView(this).apply { text = "Inicia sesión para consultar tus vehículos."; setPadding(0, 12, 0, 12) }
        layout.addView(customerResults)
        refreshButton = Button(this).apply { text = "Actualizar vehículos y ubicaciones"; isEnabled = false; setOnClickListener { refreshTracking() } }
        layout.addView(refreshButton)
        logoutButton = Button(this).apply { text = "Cerrar sesión privada"; isEnabled = false; setOnClickListener {
            val token = customerToken
            val api = customerApi
            customerToken = null
            customerApi = null
            refreshButton.isEnabled = false
            logoutButton.isEnabled = false
            customerResults.text = ""
            customerStatus.text = "Sesión cerrada en este teléfono"
            if (token != null && api != null) Thread { try { api.logout(token) } catch (_: Exception) {} }.start()
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
        setContentView(ScrollView(this).apply { addView(layout) })
    }
    private fun formatTracking(vehicles: JSONArray?, positions: JSONArray?): String {
        if (vehicles == null || positions == null) return "Respuesta inesperada del servidor."
        val authorized = mutableMapOf<Long, String>()
        for (i in 0 until vehicles.length()) {
            val v = vehicles.optJSONObject(i) ?: continue
            val id = v.optLong("id", -1)
            if (id > 0) authorized[id] = v.optString("name").ifBlank { "Vehículo $id" }
        }
        if (authorized.isEmpty()) return "No tienes vehículos asignados todavía."
        val output = StringBuilder("Vehículos autorizados: ${authorized.size}\n\n")
        val latest = mutableMapOf<Long, org.json.JSONObject>()
        for (i in 0 until positions.length()) {
            val p = positions.optJSONObject(i) ?: continue
            val id = p.optLong("vehicleId", -1)
            val lat = p.optDouble("latitude", Double.NaN)
            val lon = p.optDouble("longitude", Double.NaN)
            if (authorized.containsKey(id) && lat.isFinite() && lon.isFinite() && lat in -90.0..90.0 && lon in -180.0..180.0) latest[id] = p
        }
        for ((id, name) in authorized) {
            val p = latest[id]
            output.append(name).append("\n")
            if (p == null) output.append("Sin posición registrada")
            else output.append("Lat: ").append(p.optString("latitude")).append(" · Lon: ").append(p.optString("longitude")).append("\nÚltima lectura: ").append(p.optString("recordedAt"))
            output.append("\n\n")
        }
        return output.toString()
    }
    private fun refreshTracking() {
        val api = customerApi ?: return
        val token = customerToken ?: return
        refreshButton.isEnabled = false
        customerStatus.text = "Actualizando ubicaciones…"
        Thread {
            try {
                val vehicles = api.vehicles(token).optJSONArray("vehicles")
                val positions = api.positions(token).optJSONArray("positions")
                runOnUiThread {
                    if (customerToken == token) {
                        customerResults.text = formatTracking(vehicles, positions)
                        customerStatus.text = "Ubicaciones actualizadas"
                        refreshButton.isEnabled = true
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    if (customerToken == token) {
                        customerStatus.text = "Error al actualizar: ${e.message}"
                        refreshButton.isEnabled = true
                    }
                }
            }
        }.start()
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
