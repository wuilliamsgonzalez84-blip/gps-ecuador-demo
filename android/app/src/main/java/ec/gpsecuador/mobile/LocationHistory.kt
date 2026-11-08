package ec.gpsecuador.mobile

import android.content.Context
import android.location.Location
import org.json.JSONArray
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date

/** Historial privado de este dispositivo; no se envía a ningún servidor. */
object LocationHistory {
    private const val PREFS = "gps_ecuador_local_history"
    private const val KEY = "points"
    private const val MAX_POINTS = 300

    @Synchronized
    fun add(context: Context, location: Location) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val list = readArray(prefs.getString(KEY, "[]"))
        val point = JSONObject()
            .put("lat", location.latitude)
            .put("lon", location.longitude)
            .put("accuracy", location.accuracy.toDouble())
            .put("time", System.currentTimeMillis())
        val updated = JSONArray()
        val start = (list.length() - (MAX_POINTS - 1)).coerceAtLeast(0)
        for (i in start until list.length()) updated.put(list.getJSONObject(i))
        updated.put(point)
        prefs.edit().putString(KEY, updated.toString()).apply()
    }

    @Synchronized
    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).commit()
    }

    @Synchronized
    fun summary(context: Context): String {
        val list = readArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"))
        if (list.length() == 0) return "Todavía no hay posiciones guardadas en este teléfono."
        val last = list.getJSONObject(list.length() - 1)
        val date = DateFormat.getDateTimeInstance().format(Date(last.optLong("time")))
        return "Posiciones locales: ${list.length()} (máximo $MAX_POINTS)\n" +
            "Última: ${last.optDouble("lat")}, ${last.optDouble("lon")}\n" +
            "Registrada: $date\n" +
            "Precisión aproximada: ${last.optDouble("accuracy").toInt()} m\n" +
            "Datos privados en este dispositivo; no se comparten."
    }

    private fun readArray(value: String?): JSONArray =
        try { JSONArray(value ?: "[]") } catch (_: Exception) { JSONArray() }
}
