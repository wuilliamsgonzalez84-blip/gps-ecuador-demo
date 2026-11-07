package ec.gpsecuador.mobile

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder

class LocationService : Service() {
    private lateinit var manager: LocationManager
    private val listener = LocationListener { location ->
        // Solo lectura local: NO se envían coordenadas a ningún servidor en esta versión.
        android.util.Log.d("GPSEcuador", "Actualización GPS recibida (sin guardar coordenadas)")
    }
    override fun onCreate() {
        super.onCreate()
        manager = getSystemService(LOCATION_SERVICE) as LocationManager
        val channel = NotificationChannel("gps_active", "Ubicación compartida", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
        val stop = Intent(this, LocationService::class.java).apply { action = "STOP" }
        val pending = PendingIntent.getService(this, 0, stop, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = Notification.Builder(this, "gps_active")
            .setContentTitle("GPS Ecuador · GPS activo")
            .setContentText("La ubicación se lee localmente. No se transmite.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .addAction(Notification.Action.Builder(null, "Detener", pending).build())
            .setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        else startForeground(1, notification)
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            try {
                val provider = if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER) &&
                    checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED)
                    LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
                manager.requestLocationUpdates(provider, 5000L, 10f, listener)
            } catch (e: Exception) { stopSelf() }
        } else stopSelf()
        return START_NOT_STICKY
    }
    override fun onDestroy() { manager.removeUpdates(listener); super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
}
