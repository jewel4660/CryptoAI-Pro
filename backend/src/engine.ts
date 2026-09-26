// src/engine.ts

import crypto from "node:crypto";

import {
  Candle,
  Signal,
} from "./types.js";

import {
  ema,
  rsi,
  atr,
  macd,
  bollinger,
  vwap,
  closes,
} from "./indicators.js";

/* =========================================================
   HELPERS
========================================================= */

const clamp = (
  value: number,
  min = 0,
  max = 100
): number =>
  Math.max(
    min,
    Math.min(max, value)
  );

const round = (
  value: number,
  decimals = 2
): number => {
  const factor = 10 ** decimals;

  return (
    Math.round(
      value * factor
    ) / factor
  );
};

const safeNumber = (
  value: number,
  fallback = 0
): number =>
  Number.isFinite(value)
    ? value
    : fallback;

/* =========================================================
   ENV CONFIG
========================================================= */

const MIN_SCORE = Number(
  process.env.MIN_SCORE ?? 75
);

const MIN_DIRECTION_GAP = Number(
  process.env.MIN_DIRECTION_GAP ?? 10
);

const MIN_RR = Number(
  process.env.MIN_RR ?? 2
);

const ATR_MULTIPLIER = Number(
  process.env.ATR_MULTIPLIER ?? 1.5
);

const MAX_RISK_PERCENT = Number(
  process.env.MAX_RISK_PERCENT ?? 2
);

/* =========================================================
   MAIN ANALYSIS
========================================================= */

export function analyze(
  symbol: string,
  c: Candle[],
  balance = 1000,
  riskPercent = 1
): Signal {

  /* =======================================================
     VALIDATION
  ======================================================= */

  if (
    !Array.isArray(c) ||
    c.length < 220
  ) {
    throw new Error(
      "INSUFFICIENT_DATA"
    );
  }

  const validBalance =
    Number.isFinite(balance) &&
    balance > 0
      ? balance
      : 1000;

  const validRiskPercent =
    clamp(
      Number.isFinite(riskPercent)
        ? riskPercent
        : 1,
      0.1,
      MAX_RISK_PERCENT
    );

  /* =======================================================
     MARKET DATA
  ======================================================= */

  const v = closes(c);

  const last =
    c[c.length - 1];

  const previous =
    c[c.length - 2];

  if (
    !last ||
    !previous
  ) {
    throw new Error(
      "INVALID_MARKET_DATA"
    );
  }

  const currentPrice =
    safeNumber(
      last.close
    );

  if (
    currentPrice <= 0
  ) {
    throw new Error(
      "INVALID_PRICE"
    );
  }

  /* =======================================================
     INDICATORS
  ======================================================= */

  const e20 =
    safeNumber(
      ema(v, 20)
    );

  const e50 =
    safeNumber(
      ema(v, 50)
    );

  const e200 =
    safeNumber(
      ema(v, 200)
    );

  const rrsi =
    safeNumber(
      rsi(v),
      50
    );

  const aatr =
    Math.max(
      safeNumber(
        atr(c)
      ),
      currentPrice * 0.001
    );

  const mm =
    safeNumber(
      macd(v)
    );

  const vw =
    safeNumber(
      vwap(c),
      currentPrice
    );

  const bb =
    bollinger(v);

  /* =======================================================
     MARKET STRUCTURE
  ======================================================= */

  const structureCandles =
    c.slice(-21, -1);

  const highs =
    structureCandles.map(
      (x) => x.high
    );

  const lows =
    structureCandles.map(
      (x) => x.low
    );

  const prevHigh =
    highs.length > 0
      ? Math.max(...highs)
      : currentPrice;

  const prevLow =
    lows.length > 0
      ? Math.min(...lows)
      : currentPrice;

  /* =======================================================
     SWING LEVELS
  ======================================================= */

  const swingCandles =
    c.slice(-51, -1);

  const swingHigh =
    swingCandles.length > 0
      ? Math.max(
          ...swingCandles.map(
            (x) => x.high
          )
        )
      : currentPrice;

  const swingLow =
    swingCandles.length > 0
      ? Math.min(
          ...swingCandles.map(
            (x) => x.low
          )
        )
      : currentPrice;

  /* =======================================================
     VOLUME
  ======================================================= */

  const volumeCandles =
    c.slice(-21, -1);

  const avgVolume =
    volumeCandles.length > 0
      ? volumeCandles.reduce(
          (sum, x) =>
            sum + x.volume,
          0
        ) /
        volumeCandles.length
      : last.volume;

  const volumeExpansion =
    avgVolume > 0 &&
    last.volume >
      avgVolume * 1.25;

  const strongVolume =
    avgVolume > 0 &&
    last.volume >
      avgVolume * 1.5;

  /* =======================================================
     TREND
  ======================================================= */

  const bullishTrend =
    currentPrice > e200 &&
    e20 > e50;

  const bearishTrend =
    currentPrice < e200 &&
    e20 < e50;

  const ranging =
    !bullishTrend &&
    !bearishTrend;

  /* =======================================================
     MOMENTUM
  ======================================================= */

  const bullishRSI =
    rrsi >= 52 &&
    rrsi < 70;

  const bearishRSI =
    rrsi <= 48 &&
    rrsi > 30;

  const RSI_OVERBOUGHT =
    rrsi >= 70;

  const RSI_OVERSOLD =
    rrsi <= 30;

  const bullishMACD =
    mm > 0;

  const bearishMACD =
    mm < 0;

  const aboveVWAP =
    currentPrice > vw;

  const belowVWAP =
    currentPrice < vw;

  /* =======================================================
     BREAKOUT / BREAKDOWN
  ======================================================= */

  const breakout =
    currentPrice >
    prevHigh;

  const breakdown =
    currentPrice <
    prevLow;

  /* =======================================================
     BOLLINGER
  ======================================================= */

  const belowLowerBB =
    currentPrice <
    bb.lower;

  const aboveUpperBB =
    currentPrice >
    bb.upper;

  /* =======================================================
     SCORES
  ======================================================= */

  let longScore = 50;
  let shortScore = 50;

  const longReasons: string[] =
    [];

  const shortReasons: string[] =
    [];

  /* =======================================================
     TREND SCORE
  ======================================================= */

  if (bullishTrend) {

    longScore += 14;

    longReasons.push(
      "Bullish EMA alignment"
    );
  }

  if (bearishTrend) {

    shortScore += 14;

    shortReasons.push(
      "Bearish EMA alignment"
    );
  }

  /* =======================================================
     RSI
  ======================================================= */

  if (bullishRSI) {

    longScore += 7;

    longReasons.push(
      "RSI bullish momentum"
    );
  }

  if (bearishRSI) {

    shortScore += 7;

    shortReasons.push(
      "RSI bearish momentum"
    );
  }

  /* =======================================================
     MACD
  ======================================================= */

  if (bullishMACD) {

    longScore += 7;

    longReasons.push(
      "MACD positive"
    );
  }

  if (bearishMACD) {

    shortScore += 7;

    shortReasons.push(
      "MACD negative"
    );
  }

  /* =======================================================
     VWAP
  ======================================================= */

  if (aboveVWAP) {

    longScore += 5;

    longReasons.push(
      "Price above VWAP"
    );
  }

  if (belowVWAP) {

    shortScore += 5;

    shortReasons.push(
      "Price below VWAP"
    );
  }

  /* =======================================================
     BREAKOUT
  ======================================================= */

  if (breakout) {

    longScore += 12;

    longReasons.push(
      "Market structure breakout"
    );
  }

  if (breakdown) {

    shortScore += 12;

    shortReasons.push(
      "Market structure breakdown"
    );
  }

  /* =======================================================
     VOLUME
  ======================================================= */

  if (volumeExpansion) {

    longScore += 4;
    shortScore += 4;

    longReasons.push(
      "Volume expansion"
    );

    shortReasons.push(
      "Volume expansion"
    );
  }

  if (strongVolume) {

    longScore += 3;
    shortScore += 3;

    longReasons.push(
      "Strong volume confirmation"
    );

    shortReasons.push(
      "Strong volume confirmation"
    );
  }

  /* =======================================================
     BOLLINGER
  ======================================================= */

  if (belowLowerBB) {

    longScore += 4;

    longReasons.push(
      "Price below lower Bollinger Band"
    );
  }

  if (aboveUpperBB) {

    shortScore += 4;

    shortReasons.push(
      "Price above upper Bollinger Band"
    );
  }

  /* =======================================================
     EXTREME MOMENTUM PENALTY
  ======================================================= */

  if (RSI_OVERBOUGHT) {

    longScore -= 8;

    longReasons.push(
      "RSI overbought risk"
    );
  }

  if (RSI_OVERSOLD) {

    shortScore -= 8;

    shortReasons.push(
      "RSI oversold risk"
    );
  }

  /* =======================================================
     TREND CONSISTENCY
  ======================================================= */

  if (
    bullishTrend &&
    aboveVWAP &&
    bullishMACD
  ) {

    longScore += 5;

    longReasons.push(
      "Multi-factor bullish confirmation"
    );
  }

  if (
    bearishTrend &&
    belowVWAP &&
    bearishMACD
  ) {

    shortScore += 5;

    shortReasons.push(
      "Multi-factor bearish confirmation"
    );
  }

  /* =======================================================
     FINAL SCORES
  ======================================================= */

  longScore =
    clamp(
      Math.round(
        longScore
      )
    );

  shortScore =
    clamp(
      Math.round(
        shortScore
      )
    );

  const directionGap =
    Math.abs(
      longScore -
      shortScore
    );

  /* =======================================================
     INITIAL DIRECTION
  ======================================================= */

  let direction:
    | "LONG"
    | "SHORT"
    | "NO_TRADE" =
    "NO_TRADE";

  if (
    longScore >= MIN_SCORE &&
    longScore -
      shortScore >=
      MIN_DIRECTION_GAP
  ) {

    direction =
      "LONG";

  } else if (
    shortScore >= MIN_SCORE &&
    shortScore -
      longScore >=
      MIN_DIRECTION_GAP
  ) {

    direction =
      "SHORT";
  }

  /* =======================================================
     VOLATILITY / SL DISTANCE
  ======================================================= */

  const atrDistance =
    aatr *
    Math.max(
      1,
      ATR_MULTIPLIER
    );

  const minimumDistance =
    currentPrice *
    0.005;

  const baseDistance =
    Math.max(
      atrDistance,
      minimumDistance
    );

  /* =======================================================
     ENTRY
  ======================================================= */

  let entryLow =
    currentPrice;

  let entryHigh =
    currentPrice;

  let preferredEntry =
    currentPrice;

  /* =======================================================
     STOP LOSS
  ======================================================= */

  let stopLoss =
    currentPrice;

  let stopDistance =
    baseDistance;

  /* =======================================================
     LONG STOP LOSS
  ======================================================= */

  if (
    direction === "LONG"
  ) {

    const structureSL =
      swingLow -
      aatr * 0.25;

    stopLoss =
      Math.min(
        currentPrice -
          baseDistance,
        structureSL
      );

    stopDistance =
      currentPrice -
      stopLoss;

    if (
      stopDistance >
      currentPrice * 0.08
    ) {

      stopLoss =
        currentPrice -
        baseDistance;

      stopDistance =
        baseDistance;
    }

    entryLow =
      currentPrice -
      aatr * 0.25;

    entryHigh =
      currentPrice +
      aatr * 0.1;

    preferredEntry =
      currentPrice;
  }

  /* =======================================================
     SHORT STOP LOSS
  ======================================================= */

  if (
    direction === "SHORT"
  ) {

    const structureSL =
      swingHigh +
      aatr * 0.25;

    stopLoss =
      Math.max(
        currentPrice +
          baseDistance,
        structureSL
      );

    stopDistance =
      stopLoss -
      currentPrice;

    if (
      stopDistance >
      currentPrice * 0.08
    ) {

      stopLoss =
        currentPrice +
        baseDistance;

      stopDistance =
        baseDistance;
    }

    entryLow =
      currentPrice -
      aatr * 0.1;

    entryHigh =
      currentPrice +
      aatr * 0.25;

    preferredEntry =
      currentPrice;
  }

  /* =======================================================
     NO TRADE
  ======================================================= */

  if (
    direction === "NO_TRADE"
  ) {

    const score =
      Math.max(
        longScore,
        shortScore
      );

    const confidence =
      clamp(
        Math.round(
          50 +
          directionGap * 1.5 +
          (score - 50) *
            0.35
        ),
        0,
        95
      );

    const probability =
      clamp(
        Math.round(
          50 +
          directionGap * 1.2 +
          (score - 50) *
            0.2
        ),
        50,
        90
      );

    return {

      signal_id:
        crypto.randomUUID(),

      symbol,

      direction:
        "NO_TRADE",

      status:
        "ACTIVE",

      long_score:
        longScore,

      short_score:
        shortScore,

      confidence,

      probability_estimate:
        probability,

      entry: {

        low:
          round(
            currentPrice -
            aatr * 0.25
          ),

        high:
          round(
            currentPrice +
            aatr * 0.25
          ),

        preferred:
          round(
            currentPrice
          ),

        type:
          "MARKET",
      },

      stop_loss: {

        price:
          round(
            currentPrice
          ),

        distance_percent:
          0,

        reason:
          "No trade setup validated",
      },

      take_profit: {

        tp1:
          round(
            currentPrice
          ),

        tp2:
          round(
            currentPrice
          ),

        tp3:
          round(
            currentPrice
          ),
      },

      risk_reward: {

        tp1: 0,

        tp2: 0,

        tp3: 0,
      },

      position: {

        risk_percent:
          validRiskPercent,

        risk_amount:
          0,

        quantity:
          0,

        leverage:
          1,
      },

      market_regime:
        bullishTrend
          ? "TRENDING_BULLISH"
          : bearishTrend
            ? "TRENDING_BEARISH"
            : "RANGING",

      reasons: [
        "No trade setup validated",

        ...(longScore >= shortScore
          ? longReasons
          : shortReasons),
      ],
    };
  }

  /* =======================================================
     RISK AMOUNT
  ======================================================= */

  const riskAmount =
    validBalance *
    (
      validRiskPercent /
      100
    );

  /* =======================================================
     VALIDATE STOP DISTANCE
  ======================================================= */

  if (
    !Number.isFinite(
      stopDistance
    ) ||
    stopDistance <= 0
  ) {

    stopDistance =
      baseDistance;
  }

  /* =======================================================
     TAKE PROFIT
  ======================================================= */

  let tp1 =
    currentPrice;

  let tp2 =
    currentPrice;

  let tp3 =
    currentPrice;

  if (
    direction === "LONG"
  ) {

    tp1 =
      preferredEntry +
      stopDistance * 1.0;

    tp2 =
      preferredEntry +
      stopDistance * 2.0;

    tp3 =
      preferredEntry +
      stopDistance *
      Math.max(
        3.0,
        MIN_RR + 1
      );
  }

  if (
    direction === "SHORT"
  ) {

    tp1 =
      preferredEntry -
      stopDistance * 1.0;

    tp2 =
      preferredEntry -
      stopDistance * 2.0;

    tp3 =
      preferredEntry -
      stopDistance *
      Math.max(
        3.0,
        MIN_RR + 1
      );
  }

  /* =======================================================
     RISK / REWARD
  ======================================================= */

  const rr1 =
    stopDistance > 0
      ? Math.abs(
          tp1 -
          preferredEntry
        ) /
        stopDistance
      : 0;

  const rr2 =
    stopDistance > 0
      ? Math.abs(
          tp2 -
          preferredEntry
        ) /
        stopDistance
      : 0;

  const rr3 =
    stopDistance > 0
      ? Math.abs(
          tp3 -
          preferredEntry
        ) /
        stopDistance
      : 0;

  /* =======================================================
     POSITION SIZE
  ======================================================= */

  const quantity =
    stopDistance > 0
      ? riskAmount /
        stopDistance
      : 0;

  /*
   * Signal engine only.
   * No automatic order execution.
   */
  const leverage =
    1;

  /* =======================================================
     CONFIDENCE
  ======================================================= */

  const winningScore =
    Math.max(
      longScore,
      shortScore
    );

  const confidence =
    clamp(
      Math.round(
        50 +
        directionGap * 1.5 +
        (winningScore - 50) *
          0.35
      ),
      0,
      95
    );

  const probability =
    clamp(
      Math.round(
        50 +
        directionGap * 1.2 +
        (winningScore - 50) *
          0.2
      ),
      50,
      95
    );

  /* =======================================================
     MARKET REGIME
  ======================================================= */

  const marketRegime =
    bullishTrend
      ? "TRENDING_BULLISH"
      : bearishTrend
        ? "TRENDING_BEARISH"
        : ranging
          ? "RANGING"
          : "RANGING";

  /* =======================================================
     REASONS
  ======================================================= */

  const reasons =
    direction === "LONG"
      ? longReasons
      : shortReasons;

  /* =======================================================
     FINAL SIGNAL
  ======================================================= */

  return {

    signal_id:
      crypto.randomUUID(),

    symbol,

    direction,

    status:
      "ACTIVE",

    long_score:
      longScore,

    short_score:
      shortScore,

    confidence,

    probability_estimate:
      probability,

    entry: {

      low:
        round(
          entryLow
        ),

      high:
        round(
          entryHigh
        ),

      preferred:
        round(
          preferredEntry
        ),

      type:
        "MARKET",
    },

    stop_loss: {

      price:
        round(
          stopLoss
        ),

      distance_percent:
        round(
          (
            stopDistance /
            currentPrice
          ) * 100
        ),

      reason:
        direction === "LONG"
          ? "Below recent swing structure with ATR buffer"
          : "Above recent swing structure with ATR buffer",
    },

    take_profit: {

      tp1:
        round(
          tp1
        ),

      tp2:
        round(
          tp2
        ),

      tp3:
        round(
          tp3
        ),
    },

    risk_reward: {

      tp1:
        round(
          rr1
        ),

      tp2:
        round(
          rr2
        ),

      tp3:
        round(
          rr3
        ),
    },

    position: {

      risk_percent:
        validRiskPercent,

      risk_amount:
        round(
          riskAmount
        ),

      quantity:
        round(
          quantity,
          6
        ),

      leverage,
    },

    market_regime:
      marketRegime,

    reasons:
      reasons.length > 0
        ? reasons
        : [
            direction === "LONG"
              ? "Bullish setup validated"
              : "Bearish setup validated",
          ],
  };
}
