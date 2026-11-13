package ec.gpsecuador.mobile

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Bounded, private, best-effort queue for authorized phone GPS uploads.
 * Never stores the bearer token. Entries are scoped to the HTTPS endpoint and vehicle.
 * A logout or explicit stop must clear this queue.
 */
object PendingPositions {
    private const val PREFS = "gps_ecuador_pending_uploads"
    private const val KEY = "pending"
    private const val LIMIT = 100
    private fun read(context: Context): JSONArray = try {
        JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"))
    } catch (_: Exception) { JSONArray() }

    @Synchronized fun enqueue(context: Context, url: String, vehicleId: Int, lat: Double, lon: Double, recordedAt: String) {
        if (!url.startsWith("https://") || vehicleId <= 0 || !lat.isFinite() || !lon.isFinite() ||
            lat !in -90.0..90.0 || lon !in -180.0..180.0) return
        val old = read(context)
        val next = JSONArray()
        for (i in (old.length() - (LIMIT - 1)).coerceAtLeast(0) until old.length()) next.put(old.getJSONObject(i))
        next.put(JSONObject().put("url", url).put("vehicleId", vehicleId).put("lat", lat)
            .put("lon", lon).put("recordedAt", recordedAt))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, next.toString()).commit()
    }

    @Synchronized fun peek(context: Context, url: String, vehicleId: Int): JSONObject? {
        val items = read(context)
        for (i in 0 until items.length()) {
            val item = items.getJSONObject(i)
            if (item.optString("url") == url && item.optInt("vehicleId") == vehicleId) return item
        }
        return null
    }

    @Synchronized fun removeFirst(context: Context, url: String, vehicleId: Int) {
        val items = read(context)
        val next = JSONArray()
        var removed = false
        for (i in 0 until items.length()) {
            val item = items.getJSONObject(i)
            if (!removed && item.optString("url") == url && item.optInt("vehicleId") == vehicleId) {
                removed = true
            } else next.put(item)
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, next.toString()).commit()
    }

    @Synchronized fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).commit()
    }
}
