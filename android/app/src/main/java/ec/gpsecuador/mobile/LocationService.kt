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
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Servicio voluntario: historial local o envío HTTPS autenticado, solo tras autorización explícita.
 * El usuario puede detener el servicio desde la notificación persistente.
 */
class LocationService : Service() {
    private lateinit var manager: LocationManager
    private var tracking = false
    private var lastUpdateElapsed = 0L
    private var remoteToken: String? = null
    private var remoteUrl: String? = null
    private var remoteVehicleId = 0
    private var lastSentElapsed = 0L
    private val sending = AtomicBoolean(false)
    private val executor = Executors.newSingleThreadExecutor()
    private val listener = LocationListener { location ->
        lastUpdateElapsed = SystemClock.elapsedRealtime()
        LocationHistory.add(this, location)
        // Nunca registrar coordenadas ni credenciales en logs.
        val token = remoteToken
        val url = remoteUrl
        val vehicleId = remoteVehicleId
        if (token == null || url == null || vehicleId <= 0) {
            notifyStatus("GPS local activo · posiciones privadas")
        } else if (lastUpdateElapsed - lastSentElapsed >= 15_000L && sending.compareAndSet(false, true)) {
            lastSentElapsed = lastUpdateElapsed
            val latitude = location.latitude
            val longitude = location.longitude
            val recordedAt = Instant.ofEpochMilli(location.time).toString()
            executor.execute {
                try {
                    // Detener/cerrar sesión invalida la autorización de nuevos envíos.
                    if (remoteToken == token && remoteVehicleId == vehicleId) {
                        // Queue before network I/O so transient connection failures do not lose the fix.
                        PendingPositions.enqueue(this, url, vehicleId, latitude, longitude, recordedAt)
                        val api = CustomerApi(url)
                        // Backend rejects positions older than five minutes. Drop expired
                        // fixes rather than replaying them with a falsified timestamp.
                        repeat(100) {
                            if (remoteToken != token || remoteVehicleId != vehicleId) return@execute
                            val item = PendingPositions.peek(this, url, vehicleId) ?: return@repeat
                            val age = System.currentTimeMillis() -
                                (java.time.Instant.parse(item.getString("recordedAt")).toEpochMilli())
                            if (age !in -300_000L..300_000L) {
                                PendingPositions.removeFirst(this, url, vehicleId)
                            } else {
                                api.sendPhonePosition(token, vehicleId,
                                    item.getDouble("lat"), item.getDouble("lon"),
                                    item.getString("recordedAt"))
                                PendingPositions.removeFirst(this, url, vehicleId)
                            }
                        }
                        notifyStatus("GPS Ecuador · posiciones pendientes sincronizadas")
                    }
                } catch (_: Exception) {
                    notifyStatus("GPS Ecuador · sin conexión; posición guardada localmente")
                } finally {
                    sending.set(false)
                }
            }
        }
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
            remoteToken = null
            remoteUrl = null
            remoteVehicleId = 0
            PendingPositions.clear(this)
            stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action == ACTION_REMOTE) {
            val url = intent.getStringExtra(EXTRA_URL)
            val token = intent.getStringExtra(EXTRA_TOKEN)
            val vehicleId = intent.getIntExtra(EXTRA_VEHICLE_ID, 0)
            if (url.isNullOrBlank() || token.isNullOrBlank() || vehicleId <= 0) {
                stopSelf()
                return START_NOT_STICKY
            }
            try { CustomerApi(url) } catch (_: Exception) {
                stopSelf()
                return START_NOT_STICKY
            }
            remoteUrl = url
            remoteToken = token
            remoteVehicleId = vehicleId
            lastSentElapsed = 0L
        } else if (!tracking) {
            remoteUrl = null
            remoteToken = null
            remoteVehicleId = 0
        }
        val message = if (remoteToken != null) "Envío GPS autorizado · detener desde la notificación" else "Historial local · no transmite coordenadas"
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(
                NOTIFICATION_ID, notification(message),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else startForeground(NOTIFICATION_ID, notification(message))

        if (tracking) {
            notifyStatus(message)
            return START_NOT_STICKY
        }
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
                notifyStatus(if (remoteToken != null) "Esperando GPS · envío automático autorizado" else "Esperando señal GPS · historial privado")
            }
        } catch (e: SecurityException) {
            stopSelf()
        } catch (e: IllegalArgumentException) {
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        // Preserve queued fixes on system shutdown; never retain the auth token.
        // Upload requires a new explicitly authorized tracking session.
        remoteToken = null
        remoteUrl = null
        remoteVehicleId = 0
        if (tracking) manager.removeUpdates(listener)
        tracking = false
        executor.shutdownNow()
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object {
        private const val CHANNEL = "gps_active"
        private const val NOTIFICATION_ID = 1
        private const val ACTION_STOP = "STOP"
        const val ACTION_REMOTE = "START_AUTHORIZED_REMOTE"
        const val EXTRA_URL = "remote_url"
        const val EXTRA_TOKEN = "remote_token"
        const val EXTRA_VEHICLE_ID = "remote_vehicle_id"
    }
}
