plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "ec.gpsecuador.mobile"
    compileSdk = 35
    buildFeatures { buildConfig = true }
    defaultConfig {
        buildConfigField("String", "FLEET_BASE_URL", "\"https://gps.example.invalid\"")
        applicationId = "ec.gpsecuador.mobile"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
