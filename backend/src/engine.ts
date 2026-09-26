import crypto from "node:crypto";
import { Candle, Signal } from "./types.js";
import {
  ema,
  rsi,
  atr,
  macd,
  bollinger,
  vwap,
  closes,
} from "./indicators.js";

const clamp = (x: number): number =>
  Math.max(0, Math.min(100, Number.isFinite(x) ? x : 0));

const round = (x: number, digits = 8): number => {
  const p = 10 ** digits;
  return Math.round(x * p) / p;
};

const avg = (arr: number[]): number => {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

export function analyze(
  symbol: string,
  c: Candle[],
  balance = 1000,
  riskPercent = 1
): Signal {
  if (!Array.isArray(c) || c.length < 220) {
    throw new Error("INSUFFICIENT_DATA");
  }

  const data = c
    .filter(
      (x) =>
        Number.isFinite(x.open) &&
        Number.isFinite(x.high) &&
        Number.isFinite(x.low) &&
        Number.isFinite(x.close) &&
        Number.isFinite(x.volume)
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (data.length < 220) {
    throw new Error("INSUFFICIENT_DATA");
  }

  const last = data[data.length - 1];

  const close = last.close;
  const high = last.high;
  const low = last.low;

  const closePrices = closes(data);

  // =========================
  // INDICATORS
  // =========================

  const ema20 = ema(closePrices, 20);
  const ema50 = ema(closePrices, 50);
  const ema100 = ema(closePrices, 100);
  const ema200 = ema(closePrices, 200);

  const rsi14 = rsi(closePrices, 14);
  const atr14 = atr(data, 14);

  const macdData = macd(closePrices);

  const bb = bollinger(closePrices, 20, 2);

  const vwapValue = vwap(data);

  const E20 = ema20[ema20.length - 1] ?? close;
  const E50 = ema50[ema50.length - 1] ?? close;
  const E100 = ema100[ema100.length - 1] ?? close;
  const E200 = ema200[ema200.length - 1] ?? close;

  const RSI = rsi14[rsi14.length - 1] ?? 50;

  const ATR = atr14[atr14.length - 1] ?? close * 0.01;

  const MACD = macdData.macd[macdData.macd.length - 1] ?? 0;
  const MACDSignal =
    macdData.signal[macdData.signal.length - 1] ?? 0;

  const BBUpper = bb.upper[bb.upper.length - 1] ?? close;
  const BBMiddle = bb.middle[bb.middle.length - 1] ?? close;
  const BBLower = bb.lower[bb.lower.length - 1] ?? close;

  // =========================
  // PRICE STRUCTURE
  // =========================

  const recent = data.slice(-20);

  const recentHigh = Math.max(...recent.map((x) => x.high));
  const recentLow = Math.min(...recent.map((x) => x.low));

  const previous = data.slice(-40, -20);

  const previousHigh =
    previous.length > 0
      ? Math.max(...previous.map((x) => x.high))
      : recentHigh;

  const previousLow =
    previous.length > 0
      ? Math.min(...previous.map((x) => x.low))
      : recentLow;

  // =========================
  // TREND
  // =========================

  let longScore = 0;
  let shortScore = 0;

  // EMA trend
  if (close > E20) longScore += 7;
  else shortScore += 7;

  if (E20 > E50) longScore += 8;
  else shortScore += 8;

  if (E50 > E100) longScore += 7;
  else shortScore += 7;

  if (E100 > E200) longScore += 6;
  else shortScore += 6;

  // Price vs VWAP
  if (close > vwapValue) longScore += 7;
  else shortScore += 7;

  // =========================
  // RSI
  // =========================

  if (RSI >= 55 && RSI <= 72) {
    longScore += 8;
  }

  if (RSI <= 45 && RSI >= 28) {
    shortScore += 8;
  }

  // Avoid chasing extreme RSI
  if (RSI > 78) {
    shortScore += 3;
    longScore -= 3;
  }

  if (RSI < 22) {
    longScore += 3;
    shortScore -= 3;
  }

  // =========================
  // MACD
  // =========================

  if (MACD > MACDSignal) {
    longScore += 9;
  } else {
    shortScore += 9;
  }

  // =========================
  // BOLLINGER
  // =========================

  if (close > BBMiddle) {
    longScore += 4;
  } else {
    shortScore += 4;
  }

  // =========================
  // BREAK OF STRUCTURE
  // =========================

  const BOSLong = close > previousHigh;
  const BOSShort = close < previousLow;

  if (BOSLong) {
    longScore += 10;
  }

  if (BOSShort) {
    shortScore += 10;
  }

  // =========================
  // LIQUIDITY SWEEP
  // =========================

  const lastLow = data[data.length - 2]?.low ?? low;
  const lastHigh = data[data.length - 2]?.high ?? high;

  const bullishSweep =
    low < recentLow && close > recentLow;

  const bearishSweep =
    high > recentHigh && close < recentHigh;

  if (bullishSweep) {
    longScore += 8;
  }

  if (bearishSweep) {
    shortScore += 8;
  }

  // =========================
  // VOLUME
  // =========================

  const volumeWindow = data.slice(-21, -1);
  const avgVolume = avg(volumeWindow.map((x) => x.volume));

  const volumeRatio =
    avgVolume > 0 ? last.volume / avgVolume : 1;

  if (volumeRatio >= 1.5) {
    if (close >= last.open) {
      longScore += 5;
    } else {
      shortScore += 5;
    }
  }

  // =========================
  // FINAL SCORE
  // =========================

  longScore = clamp(longScore);
  shortScore = clamp(shortScore);

  const difference = Math.abs(longScore - shortScore);

  let direction: "LONG" | "SHORT" | "NO_TRADE";

  if (longScore >= 70 && longScore > shortScore + 8) {
    direction = "LONG";
  } else if (
    shortScore >= 70 &&
    shortScore > longScore + 8
  ) {
    direction = "SHORT";
  } else {
    direction = "NO_TRADE";
  }

  // =========================
  // CONFIDENCE
  // =========================

  const confidence = clamp(
    Math.max(longScore, shortScore) * 0.75 +
      difference * 0.25
  );

  const probabilityEstimate = clamp(
    50 + difference * 0.5
  );

  // =========================
  // ENTRY / STOP / TARGET
  // =========================

  const atrSafe =
    Number.isFinite(ATR) && ATR > 0
      ? ATR
      : close * 0.01;

  let entryLow = close;
  let entryHigh = close;
  let preferredEntry = close;

  let stopLoss = close;
  let takeProfit1 = close;
  let takeProfit2 = close;
  let takeProfit3 = close;

  if (direction === "LONG") {
    entryLow = Math.max(
      0,
      close - atrSafe * 0.25
    );

    entryHigh = close + atrSafe * 0.15;

    preferredEntry =
      (entry
