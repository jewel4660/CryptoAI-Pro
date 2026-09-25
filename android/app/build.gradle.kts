plugins {
 id("com.android.application")
 id("org.jetbrains.kotlin.android")
 id("org.jetbrains.kotlin.plugin.compose")
}
android {
 namespace="com.cryptoai.pro"; compileSdk=35
 defaultConfig { applicationId="com.cryptoai.pro"; minSdk=26; targetSdk=35; versionCode=1; versionName="1.0.0" }
 buildTypes {
  debug { applicationIdSuffix=".debug"; versionNameSuffix="-debug" }
  release { isMinifyEnabled=false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"),"proguard-rules.pro") }
 }
 compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget="17" }
 buildFeatures { compose=true }
}
dependencies {
 implementation("androidx.core:core-ktx:1.15.0")
 implementation("androidx.activity:activity-compose:1.10.1")
 implementation("androidx.compose.ui:ui:1.7.8")
 implementation("androidx.compose.material3:material3:1.3.1")
 implementation("com.squareup.retrofit2:retrofit:2.11.0")
 implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
 implementation("com.squareup.moshi:moshi-kotlin:1.15.2")
 implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
