package ec.gpsecuador.mobile

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Requests customer-scoped data only. No embedded owner token or cleartext HTTP. */
class CustomerApi(private val baseUrl: String) {
    init {
        val uri = java.net.URI(baseUrl)
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null) {
            "Se requiere una dirección HTTPS válida"
        }
    }
    private fun request(path: String, method: String = "GET", body: JSONObject? = null, token: String? = null): JSONObject {
        val connection = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            if (status !in 200..299) throw IllegalStateException("Servidor HTTP $status")
            if (status == 204) return JSONObject()
            return JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
        } finally { connection.disconnect() }
    }
    fun login(email: String, password: String): String =
        request("/api/customer/login", "POST", JSONObject().put("email", email).put("password", password)).getString("token")
    fun vehicles(token: String): JSONObject = request("/api/customer/vehicles", token = token)
    fun positions(token: String): JSONObject = request("/api/customer/positions", token = token)
    fun sendPhonePosition(token: String, vehicleId: Int, latitude: Double, longitude: Double, recordedAt: String): JSONObject =
        request("/api/customer/phone-position", "POST", JSONObject().put("vehicleId", vehicleId).put("latitude", latitude).put("longitude", longitude).put("recordedAt", recordedAt), token)
    fun logout(token: String) { request("/api/customer/logout", "POST", token = token) }
}
