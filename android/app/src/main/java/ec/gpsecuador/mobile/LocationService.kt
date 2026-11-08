package ec.gpsecuador.mobile

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.SystemClock

/**
 * Prototipo local y voluntario. NO envía coordenadas a Internet.
 * El usuario puede detener el servicio desde la notificación persistente.
 */
class LocationService : Service() {
    private lateinit var manager: LocationManager
    private var tracking = false
    private var lastUpdateElapsed = 0L
    private val listener = LocationListener { location ->
        lastUpdateElapsed = SystemClock.elapsedRealtime()
        LocationHistory.add(this, location)
        // No guardar ni registrar coordenadas sensibles en logs.
        notifyStatus("GPS activo · posición guardada solo en este teléfono")
    }

    override fun onCreate() {
        super.onCreate()
        manager = getSystemService(LOCATION_SERVICE) as LocationManager
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "GPS Ecuador · seguimiento activo", NotificationManager.IMPORTANCE_LOW)
        )
    }

    private fun notification(message: String): Notification {
        val stopIntent = Intent(this, LocationService::class.java).apply { action = ACTION_STOP }
        val stop = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, CHANNEL)
            .setContentTitle("GPS Ecuador · ubicación activa")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(Notification.Action.Builder(null, "Detener GPS", stop).build())
            .setOngoing(true)
            .build()
    }

    private fun notifyStatus(message: String) {
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(message))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(
                NOTIFICATION_ID, notification("Historial local · no transmite coordenadas"),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else startForeground(NOTIFICATION_ID, notification("Solo lectura local · no transmite coordenadas"))

        if (tracking) return START_NOT_STICKY
        val fine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) {
            stopSelf()
            return START_NOT_STICKY
        }
        try {
            val provider = when {
                fine && manager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
                manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> null
            }
            if (provider == null) {
                notifyStatus("Activa la ubicación del teléfono")
                stopSelf()
            } else {
                manager.requestLocationUpdates(provider, 5000L, 10f, listener)
                tracking = true
                notifyStatus("Esperando señal GPS · historial privado")
            }
        } catch (e: SecurityException) {
            stopSelf()
        } catch (e: IllegalArgumentException) {
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        if (tracking) manager.removeUpdates(listener)
        tracking = false
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object {
        private const val CHANNEL = "gps_active"
        private const val NOTIFICATION_ID = 1
        private const val ACTION_STOP = "STOP"
    }
}
