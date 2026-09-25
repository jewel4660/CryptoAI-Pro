package com.cryptoai.pro.data
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
interface MarketApi {
 @GET("api/v1/ticker/{symbol}") suspend fun ticker(@Path("symbol") symbol:String):Envelope<TickerDto>
 @GET("api/v1/analysis/{symbol}") suspend fun analysis(@Path("symbol") symbol:String,@Query("timeframe") timeframe:String="15m"):Envelope<SignalDto>
}
