plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "ec.gpsecuador.mobile"
    compileSdk = 35
    defaultConfig {
        applicationId = "ec.gpsecuador.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }
    val signingFile = System.getenv("GPS_UPLOAD_KEYSTORE_PATH")
    signingConfigs {
        create("playUpload") {
            if (!signingFile.isNullOrBlank()) {
                storeFile = file(signingFile)
                storePassword = System.getenv("GPS_UPLOAD_STORE_PASSWORD")
                keyAlias = System.getenv("GPS_UPLOAD_KEY_ALIAS") ?: "gps-ecuador-upload"
                keyPassword = System.getenv("GPS_UPLOAD_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        getByName("release") {
            if (!signingFile.isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("playUpload")
            }
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
