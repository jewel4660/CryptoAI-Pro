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

const clamp = (x: number): number => {
  if (!Number.isFinite(x)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, x)
  );
};

const round = (
  x: number,
  digits = 8
): number => {
  if (!Number.isFinite(x)) {
    return 0;
  }

  const p = 10 ** digits;

  return Math.round(x * p) / p;
};

const avg = (
  values: number[]
): number => {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
};

/* =========================================================
   ANALYZE
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

  const data = c
    .filter(
      (x) =>
        Number.isFinite(
          x.timestamp
        ) &&
        Number.isFinite(
          x.open
        ) &&
        Number.isFinite(
          x.high
        ) &&
        Number.isFinite(
          x.low
        ) &&
        Number.isFinite(
          x.close
        ) &&
        Number.isFinite(
          x.volume
        )
    )
    .sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    );

  if (
    data.length < 220
  ) {
    throw new Error(
      "INSUFFICIENT_DATA"
    );
  }

  const last =
    data[data.length - 1];

  if (!last) {
    throw new Error(
      "NO_LAST_CANDLE"
    );
  }

  const close =
    last.close;

  const high =
    last.high;

  const low =
    last.low;

  /* =======================================================
     CLOSES
     ======================================================= */

  const closePrices =
    closes(data);

  /* =======================================================
     INDICATORS
     ======================================================= */

  const ema20 =
    ema(
      closePrices,
      20
    );

  const ema50 =
    ema(
      closePrices,
      50
    );

  const ema100 =
    ema(
      closePrices,
      100
    );

  const ema200 =
    ema(
      closePrices,
      200
    );

  const rsi14 =
    rsi(
      closePrices,
      14
    );

  const atr14 =
    atr(
      data,
      14
    );

  const macdData =
    macd(
      closePrices
    );

  const bb =
    bollinger(
      closePrices,
      20,
      2
    );

  const vwapValue =
    vwap(
      data,
      50
    );

  /* =======================================================
     LATEST VALUES
     ======================================================= */

  const E20 =
    ema20.length > 0
      ? (
          ema20[
            ema20.length - 1
          ] ?? close
        )
      : close;

  const E50 =
    ema50.length > 0
      ? (
          ema50[
            ema50.length - 1
          ] ?? close
        )
      : close;

  const E100 =
    ema100.length > 0
      ? (
          ema100[
            ema100.length - 1
          ] ?? close
        )
      : close;

  const E200 =
    ema200.length > 0
      ? (
          ema200[
            ema200.length - 1
          ] ?? close
        )
      : close;

  const RSI =
    rsi14.length > 0
      ? (
          rsi14[
            rsi14.length - 1
          ] ?? 50
        )
      : 50;

  const ATR =
    atr14.length > 0
      ? (
          atr14[
            atr14.length - 1
          ] ??
          close * 0.01
        )
      : close * 0.01;

  const MACD =
    macdData.macd.length > 0
      ? (
          macdData.macd[
            macdData.macd.length -
              1
          ] ?? 0
        )
      : 0;

  const MACDSignal =
    macdData.signal.length > 0
      ? (
          macdData.signal[
            macdData.signal.length -
              1
          ] ?? 0
        )
      : 0;

  const BBUpper =
    bb.upper.length > 0
      ? (
          bb.upper[
            bb.upper.length - 1
          ] ?? close
        )
      : close;

  const BBMiddle =
    bb.middle.length > 0
      ? (
          bb.middle[
            bb.middle.length - 1
          ] ?? close
        )
      : close;

  const BBLower =
    bb.lower.length > 0
      ? (
          bb.lower[
            bb.lower.length - 1
          ] ?? close
        )
      : close;

  /* =======================================================
     PRICE STRUCTURE
     ======================================================= */

  const recent =
    data.slice(-20);

  const recentHigh =
    Math.max(
      ...recent.map(
        (x) => x.high
      )
    );

  const recentLow =
    Math.min(
      ...recent.map(
        (x) => x.low
      )
    );

  const previous =
    data.slice(-40, -20);

  const previousHigh =
    previous.length > 0
      ? Math.max(
          ...previous.map(
            (x) => x.high
          )
        )
      : recentHigh;

  const previousLow =
    previous.length > 0
      ? Math.min(
          ...previous.map(
            (x) => x.low
          )
        )
      : recentLow;

  /* =======================================================
     SCORES
     ======================================================= */

  let longScore = 0;
  let shortScore = 0;

  const longReasons: string[] =
    [];

  const shortReasons: string[] =
    [];

  const warnings: string[] =
    [];

  /* =======================================================
     EMA TREND
     ======================================================= */

  if (close > E20) {
    longScore += 7;

    longReasons.push(
      "Price above EMA20"
    );
  } else {
    shortScore += 7;

    shortReasons.push(
      "Price below EMA20"
    );
  }

  if (E20 > E50) {
    longScore += 8;

    longReasons.push(
      "EMA20 above EMA50"
    );
  } else {
    shortScore += 8;

    shortReasons.push(
      "EMA20 below EMA50"
    );
  }

  if (E50 > E100) {
    longScore += 7;

    longReasons.push(
      "EMA50 above EMA100"
    );
  } else {
    shortScore += 7;

    shortReasons.push(
      "EMA50 below EMA100"
    );
  }

  if (E100 > E200) {
    longScore += 6;

    longReasons.push(
      "EMA100 above EMA200"
    );
  } else {
    shortScore += 6;

    shortReasons.push(
      "EMA100 below EMA200"
    );
  }

  /* =======================================================
     VWAP
     ======================================================= */

  if (
    Number.isFinite(
      vwapValue
    )
  ) {
    if (
      close >
      vwapValue
    ) {
      longScore += 7;

      longReasons.push(
        "Price above VWAP"
      );
    } else {
      shortScore += 7;

      shortReasons.push(
        "Price below VWAP"
      );
    }
  }

  /* =======================================================
     RSI
     ======================================================= */

  if (
    RSI >= 55 &&
    RSI <= 72
  ) {
    longScore += 8;

    longReasons.push(
      "Bullish RSI zone"
    );
  }

  if (
    RSI <= 45 &&
    RSI >= 28
  ) {
    shortScore += 8;

    shortReasons.push(
      "Bearish RSI zone"
    );
  }

  if (RSI > 78) {
    shortScore += 3;
    longScore -= 3;

    warnings.push(
      "RSI is extremely overbought"
    );
  }

  if (RSI < 22) {
    longScore += 3;
    shortScore -= 3;

    warnings.push(
      "RSI is extremely oversold"
    );
  }

  /* =======================================================
     MACD
     ======================================================= */

  if (
    MACD >
    MACDSignal
  ) {
    longScore += 9;

    longReasons.push(
      "MACD bullish crossover"
    );
  } else {
    shortScore += 9;

    shortReasons.push(
      "MACD bearish crossover"
    );
  }

  /* =======================================================
     BOLLINGER
     ======================================================= */

  if (
    close >
    BBMiddle
  ) {
    longScore += 4;

    longReasons.push(
      "Price above Bollinger middle"
    );
  } else {
    shortScore += 4;

    shortReasons.push(
      "Price below Bollinger middle"
    );
  }

  if (
    close >= BBUpper
  ) {
    warnings.push(
      "Price near or above upper Bollinger Band"
    );
  }

  if (
    close <= BBLower
  ) {
    warnings.push(
      "Price near or below lower Bollinger Band"
    );
  }

  /* =======================================================
     BREAK OF STRUCTURE
     ======================================================= */

  const BOSLong =
    close >
    previousHigh;

  const BOSShort =
    close <
    previousLow;

  if (BOSLong) {
    longScore += 10;

    longReasons.push(
      "Bullish break of structure"
    );
  }

  if (BOSShort) {
    shortScore += 10;

    shortReasons.push(
      "Bearish break of structure"
    );
  }

  /* =======================================================
     LIQUIDITY SWEEP
     ======================================================= */

  const bullishSweep =
    low <
      recentLow &&
    close >
      recentLow;

  const bearishSweep =
    high >
      recentHigh &&
    close <
      recentHigh;

  if (bullishSweep) {
    longScore += 8;

    longReasons.push(
      "Bullish liquidity sweep"
    );
  }

  if (bearishSweep) {
    shortScore += 8;

    shortReasons.push(
      "Bearish liquidity sweep"
    );
  }

  /* =======================================================
     VOLUME
     ======================================================= */

  const volumeWindow =
    data.slice(
      -21,
      -1
    );

  const avgVolume =
    avg(
      volumeWindow.map(
        (x) =>
          x.volume
      )
    );

  const volumeRatio =
    avgVolume > 0
      ? last.volume /
        avgVolume
      : 1;

  if (
    volumeRatio >= 1.5
  ) {
    if (
      close >=
      last.open
    ) {
      longScore += 5;

      longReasons.push(
        "Strong bullish volume"
      );
    } else {
      shortScore += 5;

      shortReasons.push(
        "Strong bearish volume"
      );
    }
  }

  /* =======================================================
     FINAL SCORE
     ======================================================= */

  longScore =
    clamp(
      longScore
    );

  shortScore =
    clamp(
      shortScore
    );

  const difference =
    Math.abs(
      longScore -
        shortScore
    );

  /* =======================================================
     DIRECTION
     ======================================================= */

  let direction:
    | "LONG"
    | "SHORT"
    | "NO_TRADE";

  if (
    longScore >= 70 &&
    longScore >
      shortScore + 8
  ) {
    direction =
      "LONG";
  } else if (
    shortScore >= 70 &&
    shortScore >
      longScore + 8
  ) {
    direction =
      "SHORT";
  } else {
    direction =
      "NO_TRADE";
  }

  /* =======================================================
     CONFIDENCE
     ======================================================= */

  const confidence =
    clamp(
      Math.max(
        longScore,
        shortScore
      ) *
        0.75 +
        difference *
          0.25
    );

  const probabilityEstimate =
    clamp(
      50 +
        difference *
          0.5
    );

  /* =======================================================
     ATR
     ======================================================= */

  const atrSafe =
    Number.isFinite(
      ATR
    ) &&
    ATR > 0
      ? ATR
      : close * 0.01;

  /* =======================================================
     ENTRY / STOP / TARGET
     ======================================================= */

  let entryLow =
    close;

  let entryHigh =
    close;

  let preferredEntry =
    close;

  let stopLoss =
    close;

  let takeProfit1 =
    close;

  let takeProfit2 =
    close;

  let takeProfit3 =
    close;

  /* =======================================================
     LONG
     ======================================================= */

  if (
    direction ===
    "LONG"
  ) {
    entryLow =
      Math.max(
        0,
        close -
          atrSafe *
            0.25
      );

    entryHigh =
      close +
      atrSafe *
        0.15;

    preferredEntry =
      (entryLow +
        entryHigh) /
      2;

    stopLoss =
      Math.min(
        recentLow,
        preferredEntry -
          atrSafe *
            1.5
      );

    const riskDistance =
      Math.max(
        preferredEntry -
          stopLoss,
        atrSafe
      );

    takeProfit1 =
      preferredEntry +
      riskDistance *
        1.5;

    takeProfit2 =
      preferredEntry +
      riskDistance *
        2.5;

    takeProfit3 =
      preferredEntry +
      riskDistance *
        4;
  }

  /* =======================================================
     SHORT
     ======================================================= */

  if (
    direction ===
    "SHORT"
  ) {
    entryLow =
      Math.max(
        0,
        close -
          atrSafe *
            0.15
      );

    entryHigh =
      close +
      atrSafe *
        0.25;

    preferredEntry =
      (entryLow +
        entryHigh) /
      2;

    stopLoss =
      Math.max(
        recentHigh,
        preferredEntry +
          atrSafe *
            1.5
      );

    const riskDistance =
      Math.max(
        stopLoss -
          preferredEntry,
        atrSafe
      );

    takeProfit1 =
      preferredEntry -
      riskDistance *
        1.5;

    takeProfit2 =
      preferredEntry -
      riskDistance *
        2.5;

    takeProfit3 =
      preferredEntry -
      riskDistance *
        4;
  }

  /* =======================================================
     NO TRADE
     ======================================================= */

  if (
    direction ===
    "NO_TRADE"
  ) {
    entryLow =
      Math.max(
        0,
        close -
          atrSafe *
            0.25
      );

    entryHigh =
      close +
      atrSafe *
        0.25;

    preferredEntry =
      close;

    stopLoss =
      close;

    takeProfit1 =
      close;

    takeProfit2 =
      close;

    takeProfit3 =
      close;
  }

  /* =======================================================
     RISK MANAGEMENT
     ======================================================= */

  const safeBalance =
    Math.max(
      0,
      Number.isFinite(
        balance
      )
        ? balance
        : 1000
    );

  const safeRiskPercent =
    Math.max(
      0,
      Number.isFinite(
        riskPercent
      )
        ? riskPercent
        : 1
    );

  const riskAmount =
    safeBalance *
    (safeRiskPercent /
      100);

  const stopDistance =
    Math.abs(
      preferredEntry -
        stopLoss
    );

  const stopDistancePercent =
    preferredEntry > 0
      ? (
          stopDistance /
          preferredEntry
        ) *
        100
      : 0;

  const quantity =
    stopDistance > 0
      ? riskAmount /
        stopDistance
      : 0;

  /* =======================================================
     RISK / REWARD
     ======================================================= */

  let risk = 0;

  if (
    direction ===
    "LONG"
  ) {
    risk =
      preferredEntry -
      stopLoss;
  }

  if (
    direction ===
    "SHORT"
  ) {
    risk =
      stopLoss -
      preferredEntry;
  }

  const tp1Reward =
    direction === "LONG"
      ? takeProfit1 -
        preferredEntry
      : direction === "SHORT"
        ? preferredEntry -
          takeProfit1
        : 0;

  const tp2Reward =
    direction === "LONG"
      ? takeProfit2 -
        preferredEntry
      : direction === "SHORT"
        ? preferredEntry -
          takeProfit2
        : 0;

  const tp3Reward =
    direction === "LONG"
      ? takeProfit3 -
        preferredEntry
      : direction === "SHORT"
        ? preferredEntry -
          takeProfit3
        : 0;

  const rr1 =
    risk > 0
      ? tp1Reward / risk
      : 0;

  const rr2 =
    risk > 0
      ? tp2Reward / risk
      : 0;

  const rr3 =
    risk > 0
      ? tp3Reward / risk
      : 0;

  /* =======================================================
     MARKET REGIME
     ======================================================= */

  let marketRegime =
    "RANGING";

  const bullishTrend =
    E20 > E50 &&
    E50 > E100 &&
    E100 > E200;

  const bearishTrend =
    E20 < E50 &&
    E50 < E100 &&
    E100 < E200;

  if (bullishTrend) {
    marketRegime =
      "BULLISH_TREND";
  } else if (
    bearishTrend
  ) {
    marketRegime =
      "BEARISH_TREND";
  } else if (
    Math.abs(
      close - BBMiddle
    ) >
    atrSafe
  ) {
    marketRegime =
      "VOLATILE";
  }

  /* =======================================================
     REASONS
     ======================================================= */

  let reasons: string[];

  if (
    direction ===
    "LONG"
  ) {
    reasons =
      longReasons.slice(
        0,
        10
      );
  } else if (
    direction ===
    "SHORT"
  ) {
    reasons =
      shortReasons.slice(
        0,
        10
      );
  } else {
    reasons = [
      "No sufficiently strong directional setup",
      "Long and short scores are not sufficiently separated",
    ];
  }

  /* =======================================================
     ADD GENERAL WARNINGS
     ======================================================= */

  if (
    volumeRatio < 0.7
  ) {
    warnings.push(
      "Trading volume is below average"
    );
  }

  if (
    confidence < 70
  ) {
    warnings.push(
      "Signal confidence is relatively low"
    );
  }

  if (
    direction ===
    "NO_TRADE"
  ) {
    warnings.push(
      "No trade setup confirmed"
    );
  }

  /* =======================================================
     SIGNAL ID
     ======================================================= */

  const signalId =
    crypto
      .createHash(
        "sha256"
      )
      .update(
        `${symbol}-${last.timestamp}-${direction}-${preferredEntry}`
      )
      .digest("hex")
      .slice(
        0,
        16
      );

  /* =======================================================
     STATUS
     ======================================================= */

  let status =
    "WAIT";

  if (
    direction !==
    "NO_TRADE"
  ) {
    if (
      confidence >= 85
    ) {
      status =
        "STRONG";
    } else if (
      confidence >= 75
    ) {
      status =
        "VALID";
    } else {
      status =
        "WATCH";
    }
  }

  /* =======================================================
     STOP LOSS REASON
     ======================================================= */

  let stopLossReason =
    "NO_TRADE";

  if (
    direction ===
    "LONG"
  ) {
    stopLossReason =
      "ATR_AND_SWING_LOW";
  }

  if (
    direction ===
    "SHORT"
  ) {
    stopLossReason =
      "ATR_AND_SWING_HIGH";
  }

  /* =======================================================
     CREATED / EXPIRES
     ======================================================= */

  const createdAt =
    new Date();

  const expiresAt =
    new Date(
      createdAt.getTime() +
        60 * 60 * 1000
    );

  /* =======================================================
     FINAL SIGNAL
     ======================================================= */

  return {
    signal_id:
      signalId,

    symbol,

    direction,

    status,

    long_score:
      round(
        longScore,
        2
      ),

    short_score:
      round(
        shortScore,
        2
      ),

    confidence:
      round(
        confidence,
        2
      ),

    probability_estimate:
      round(
        probabilityEstimate,
        2
      ),

    /* =====================================================
       ENTRY
       ===================================================== */

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
        direction ===
        "NO_TRADE"
          ? "MARKET_WAIT"
          : "LIMIT_ZONE",
    },

    /* =====================================================
       STOP LOSS
       ===================================================== */

    stop_loss: {
      price:
        round(
          stopLoss
        ),

      distance_percent:
        round(
          stopDistancePercent,
          4
        ),

      reason:
        stopLossReason,
    },

    /* =====================================================
       TAKE PROFIT
       ===================================================== */

    take_profit: {
      tp1:
        round(
          takeProfit1
        ),

      tp2:
        round(
          takeProfit2
        ),

      tp3:
        round(
          takeProfit3
        ),
    },

    /* =====================================================
       RISK REWARD
       ===================================================== */

    risk_reward: {
      tp1:
        round(
          rr1,
          2
        ),

      tp2:
        round(
          rr2,
          2
        ),

      tp3:
        round(
          rr3,
          2
        ),
    },

    /* =====================================================
       POSITION
       ===================================================== */

    position: {
      risk_percent:
        round(
          safeRiskPercent,
          2
        ),

      risk_amount:
        round(
          riskAmount,
          2
        ),

      quantity:
        round(
          quantity,
          8
        ),

      leverage: 1,
    },

    /* =====================================================
       MARKET REGIME
       ===================================================== */

    market_regime:
      marketRegime,

    /* =====================================================
       REASONS
       ===================================================== */

    reasons,

    /* =====================================================
       WARNINGS
       ===================================================== */

    warnings,

    /* =====================================================
       CREATED
       ===================================================== */

    created_at:
      createdAt.toISOString(),

    /* =====================================================
       EXPIRES
       ===================================================== */

    expires_at:
      expiresAt.toISOString(),
  };
}
