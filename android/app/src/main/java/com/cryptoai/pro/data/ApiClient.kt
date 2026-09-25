package com.cryptoai.pro.data
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
object ApiClient {
 private val http=OkHttpClient.Builder().connectTimeout(10,TimeUnit.SECONDS).readTimeout(20,TimeUnit.SECONDS).build()
 val api:MarketApi=Retrofit.Builder().baseUrl(ApiConfig.BASE_URL).client(http).addConverterFactory(MoshiConverterFactory.create()).build().create(MarketApi::class.java)
}
