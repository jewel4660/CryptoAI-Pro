import { Candle } from "./types.js";

export const closes=(c:Candle[])=>c.map(x=>x.close);
export function sma(v:number[],p:number){if(v.length<p)return NaN;return v.slice(-p).reduce((a,b)=>a+b,0)/p;}
export function ema(v:number[],p:number){
 if(v.length<p)return NaN; const k=2/(p+1); let e=sma(v.slice(0,p),p);
 for(const x of v.slice(p)) e=x*k+e*(1-k); return e;
}
export function rsi(v:number[],p=14){
 if(v.length<p+1)return NaN; let g=0,l=0;
 for(let i=v.length-p;i<v.length;i++){const d=v[i]-v[i-1];if(d>=0)g+=d;else l-=d;}
 if(l===0)return 100; const rs=(g/p)/(l/p); return 100-100/(1+rs);
}
export function atr(c:Candle[],p=14){
 if(c.length<p+1)return NaN; const tr:number[]=[];
 for(let i=1;i<c.length;i++){const x=c[i],q=c[i-1];tr.push(Math.max(x.high-x.low,Math.abs(x.high-q.close),Math.abs(x.low-q.close)));}
 return sma(tr,p);
}
export function macd(v:number[]){return ema(v,12)-ema(v,26);}
export function bollinger(v:number[],p=20){
 const m=sma(v,p), s=v.slice(-p), sd=Math.sqrt(s.reduce((a,x)=>a+(x-m)**2,0)/p);
 return {middle:m,upper:m+2*sd,lower:m-2*sd};
}
export function vwap(c:Candle[],p=50){
 const s=c.slice(-p); let pv=0,v=0; for(const x of s){const typical=(x.high+x.low+x.close)/3;pv+=typical*x.volume;v+=x.volume;} return v?pv/v:NaN;
}
