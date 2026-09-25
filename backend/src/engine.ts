import crypto from "node:crypto";
import {Candle,Signal} from "./types.js";
import {ema,rsi,atr,macd,bollinger,vwap,closes} from "./indicators.js";

const clamp=(x:number)=>Math.max(0,Math.min(100,x));

export function analyze(symbol:string,c:Candle[],balance=1000,riskPercent=1):Signal{
 if(c.length<220) throw new Error("INSUFFICIENT_DATA");
 const v=closes(c), last=c.at(-1)!;
 const e20=ema(v,20),e50=ema(v,50),e200=ema(v,200),rrsi=rsi(v),aatr=atr(c),mm=macd(v),vw=vwap(c);
 const bb=bollinger(v);
 const highs=c.slice(-21,-1).map(x=>x.high), lows=c.slice(-21,-1).map(x=>x.low);
 const prevHigh=Math.max(...highs),prevLow=Math.min(...lows);
 const avgVol=c.slice(-21,-1).reduce((s,x)=>s+x.volume,0)/20;
 const vol=last.volume>avgVol*1.25;
 let L=50,S=50; const lr:string[]=[],sr:string[]=[];
 if(last.close>e200&&e20>e50){L+=14;lr.push("Bullish EMA alignment");}
 if(last.close<e200&&e20<e50){S+=14;sr.push("Bearish EMA alignment");}
 if(rrsi>52){L+=7;lr.push("RSI bullish");} if(rrsi<48){S+=7;sr.push("RSI bearish");}
 if(mm>0){L+=7;lr.push("MACD positive");} if(mm<0){S+=7;sr.push("MACD negative");}
 if(last.close>vw){L+=5;lr.push("Price above VWAP");} if(last.close<vw){S+=5;sr.push("Price below VWAP");}
 if(last.close>prevHigh){L+=12;lr.push("Breakout");}
 if(last.close<prevLow){S+=12;sr.push("Breakdown");}
 if(vol){L+=4;S+=4;lr.push("Volume expansion");sr.push("Volume expansion");}
 if(last.close<bb.lower){L+=4;lr.push("Below lower Bollinger band");}
 if(last.close>bb.upper){S+=4;sr.push("Above upper Bollinger band");}
 L=clamp(L);S=clamp(S);
 const min=Number(process.env.MIN_SCORE||75),gap=Number(process.env.MIN_DIRECTION_GAP||10);
 let direction:"LONG"|"SHORT"|"NO_TRADE"="NO_TRADE";
 if(L>=min&&L-S>=gap)direction="LONG"; else if(S>=min&&S-L>=gap)direction="SHORT";
 const entry=last.close,dist=Math.max(aatr*1.5,entry*0.005);
 const sl=direction==="LONG"?entry-dist:direction==="SHORT"?entry+dist:entry;
 const tp1=direction==="LONG"?entry+dist*2:direction==="SHORT"?entry-dist*2:entry;
 const tp2=direction==="LONG"?entry+dist*3.5:direction==="SHORT"?entry-dist*3.5:entry;
 const tp3=direction==="LONG"?entry+dist*5:direction==="SHORT"?entry-dist*5:entry;
 const risk=balance*riskPercent/100,qty=direction==="NO_TRADE"?0:risk/dist;
 const rr=(x:number)=>direction==="NO_TRADE"?0:Math.abs(x-entry)/dist;
 const score=direction==="LONG"?L:direction==="SHORT"?S:Math.max(L,S);
 return {
  signal_id:crypto.randomUUID(),symbol,direction,status:"ACTIVE",
  long_score:Math.round(L),short_score:Math.round(S),confidence:Math.round(score),
  probability_estimate:Math.round(50+(score-50)*.45),
  entry:{low:entry-dist*.25,high:entry+dist*.25,preferred:entry,type:"MARKET"},
  stop_loss:{price:sl,distance_percent:dist/entry*100,reason:"ATR/volatility invalidation buffer"},
  take_profit:{tp1,tp2,tp3},risk_reward:{tp1:rr(tp1),tp2:rr(tp2),tp3:rr(tp3)},
  position:{risk_percent:riskPercent,risk_amount:risk,quantity:qty,leverage:1},
  market_regime:last.close>e200&&e20>e50?"TRENDING_BULLISH":last.close<e200&&e20<e50?"TRENDING_BEARISH":"RANGING",
  reasons:direction==="LONG"?lr:direction==="SHORT"?sr:[],
  warnings:direction==="NO_TRADE"?["No validated directional edge"]:[],
  created_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString()
 };
}
