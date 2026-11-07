package ec.gpsecuador.mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var state: TextView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 48, 32, 32) }
        layout.addView(TextView(this).apply { text = "GPS Ecuador"; textSize = 26f })
        layout.addView(TextView(this).apply { text = "Compartir ubicación solo con tu autorización. Mientras esté activo, verás una notificación permanente. Esta versión aún NO transmite posiciones a otro teléfono." })
        state = TextView(this).apply { text = "Seguimiento desactivado" }
        layout.addView(state)
        layout.addView(Button(this).apply { text = "Iniciar GPS"; setOnClickListener { requestLocation() } })
        layout.addView(Button(this).apply { text = "Detener GPS"; setOnClickListener { stopService(Intent(this@MainActivity, LocationService::class.java)); state.text = "Seguimiento detenido" } })
        setContentView(layout)
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
