package com.cryptoai.pro.data
data class Envelope<T>(val data:T)
data class TickerDto(
    val symbol:String, val last:Double?, val bid:Double?, val ask:Double?,
    val percentage:Double?, val quoteVolume:Double?, val timestamp:Long?
)
data class SignalDto(
    val signal_id:String, val symbol:String, val direction:String,
    val long_score:Int, val short_score:Int, val confidence:Int,
    val probability_estimate:Int
)
