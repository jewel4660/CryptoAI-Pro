import ccxt from "ccxt";
import { Candle } from "./types.js";

export const exchange=new ccxt.binance({enableRateLimit:true,options:{defaultType:"spot"}});

export async function getSymbols(limit=500){
 const m=await exchange.loadMarkets();
 return Object.values(m).filter((x:any)=>x.active&&x.spot&&x.quote==="USDT")
   .sort((a:any,b:any)=>(Number(b.info?.quoteVolume||0)-Number(a.info?.quoteVolume||0)))
   .slice(0,Math.min(500,Math.max(1,limit))).map((x:any)=>x.symbol);
}
export async function getTicker(symbol:string){return exchange.fetchTicker(symbol);}
export async function getCandles(symbol:string,timeframe="15m",limit=300):Promise<Candle[]>{
 const rows=await exchange.fetchOHLCV(symbol,timeframe,undefined,Math.min(1000,Math.max(50,limit)));
 return rows.map(r=>({timestamp:r[0],open:r[1],high:r[2],low:r[3],close:r[4],volume:r[5]}));
}
