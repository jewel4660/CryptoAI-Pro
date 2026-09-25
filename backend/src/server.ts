import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {z} from "zod";
import {getSymbols,getTicker,getCandles} from "./exchange.js";
import {analyze} from "./engine.js";

const app=Fastify({logger:true});
await app.register(cors,{origin:process.env.CORS_ORIGIN==="*"||!process.env.CORS_ORIGIN?true:process.env.CORS_ORIGIN});
await app.register(rateLimit,{max:120,timeWindow:"1 minute"});

app.get("/health",async()=>({ok:true,service:"CryptoAI Pro",time:new Date().toISOString()}));

app.get("/api/v1/markets",async(req:any)=>({data:await getSymbols(Number(req.query?.limit||100))}));

app.get("/api/v1/ticker/:symbol",async(req:any,reply)=>{
 try{
  const raw=decodeURIComponent(req.params.symbol),sym=raw.includes("/")?raw:raw.replace(/USDT$/,"/USDT");
  const t=await getTicker(sym);
  return {data:{symbol:t.symbol,last:t.last,bid:t.bid,ask:t.ask,percentage:t.percentage,quoteVolume:t.quoteVolume,timestamp:t.timestamp}};
 }catch(e:any){reply.code(502);return {error:"MARKET_DATA_UNAVAILABLE",message:e.message};}
});

app.get("/api/v1/analysis/:symbol",async(req:any,reply)=>{
 try{
  const raw=decodeURIComponent(req.params.symbol),sym=raw.includes("/")?raw:raw.replace(/USDT$/,"/USDT");
  const tf=z.enum(["1m","3m","5m","15m","30m","1h","2h","4h","6h","12h","1d","1w"]).parse(req.query?.timeframe||"15m");
  const c=await getCandles(sym,tf,300);
  return {data:analyze(sym,c,Number(req.query?.balance||1000),Number(req.query?.riskPercent||1))};
 }catch(e:any){reply.code(400);return {error:e.message};}
});

app.get("/api/v1/scanner",async(req:any)=>{
 const limit=Math.min(500,Math.max(1,Number(req.query?.limit||50)));
 const tf=String(req.query?.timeframe||"15m");
 const symbols=await getSymbols(limit);
 const results=[];
 for(const s of symbols){
  try{results.push(analyze(s,await getCandles(s,tf,300)));}
  catch{/* unavailable symbols are skipped, never fabricated */}
 }
 return {requested:limit,scanned:results.length,data:results};
});

app.listen({port:Number(process.env.PORT||8080),host:process.env.HOST||"0.0.0.0"});
