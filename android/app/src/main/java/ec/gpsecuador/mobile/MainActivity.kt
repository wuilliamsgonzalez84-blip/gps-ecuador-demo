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

class MainActivity : Activity() {
    private var customerToken: String? = null
    private lateinit var customerStatus: TextView
    private lateinit var state: TextView
    private lateinit var history: TextView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 48, 32, 32) }
        layout.addView(TextView(this).apply { text = "GPS Ecuador"; textSize = 26f })
        layout.addView(TextView(this).apply { text = "Compartir ubicación solo con tu autorización. Mientras esté activo, verás una notificación permanente. Esta versión guarda hasta 300 posiciones de forma privada en este teléfono. Aún NO transmite posiciones a otro teléfono." })
        layout.addView(TextView(this).apply { text = "Acceso privado a vehículos"; textSize = 20f })
        val serverUrl = EditText(this).apply { hint = "https://tu-servidor-seguro"; inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI }
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
