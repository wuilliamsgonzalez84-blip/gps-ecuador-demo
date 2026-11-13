package ec.gpsecuador.mobile

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper
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
    private val retryHandler = Handler(Looper.getMainLooper())
    private val retryTask = object : Runnable {
        override fun run() {
            if (tracking && remoteToken != null) flushPending()
            retryHandler.postDelayed(this, 30_000L)
        }
    }
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
                    if (remoteToken == token && remoteVehicleId == vehicleId && remoteUrl == url) {
                        PendingPositions.enqueue(this, url, vehicleId, latitude, longitude, recordedAt)
                    }
                } finally {
                    sending.set(false)
                    flushPending()
                }
            }
        }
    }

    // Independent of new GPS fixes: retry while an authorized tracking session is active.
    private fun flushPending() {
        val token = remoteToken ?: return
        val url = remoteUrl ?: return
        val vehicleId = remoteVehicleId
        if (vehicleId <= 0 || !sending.compareAndSet(false, true)) return
        executor.execute {
            try {
                val api = CustomerApi(url)
                for (i in 0 until 100) {
                    if (remoteToken != token || remoteUrl != url || remoteVehicleId != vehicleId) break
                    val item = PendingPositions.peek(this, url, vehicleId) ?: break
                    val age = System.currentTimeMillis() -
                        Instant.parse(item.getString("recordedAt")).toEpochMilli()
                    // Backend accepts offline fixes up to 31 days old; never fabricate time.
                    if (age > 31L * 86_400_000L || age < -300_000L) {
                        PendingPositions.removeFirst(this, url, vehicleId)
                        continue
                    }
                    api.sendPhonePosition(token, vehicleId,
                        item.getDouble("lat"), item.getDouble("lon"),
                        item.getString("recordedAt"))
                    PendingPositions.removeFirst(this, url, vehicleId)
                }
                notifyStatus("GPS Ecuador · sincronización revisada")
            } catch (_: Exception) {
                notifyStatus("GPS Ecuador · sin conexión; reintento automático pendiente")
            } finally {
                sending.set(false)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        manager = getSystemService(LOCATION_SERVICE) as LocationManager
        retryHandler.postDelayed(retryTask, 30_000L)
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
            flushPending()
        } else if (!tracking) {
            // Local-only mode cannot reuse a prior remote upload queue.
            PendingPositions.clear(this)
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
        retryHandler.removeCallbacks(retryTask)
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
