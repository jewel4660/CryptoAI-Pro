import { Candle } from "./types.js";

/* =========================================================
   CRYPTOAI PRO
   Technical Indicators
   Compatible with engine.ts
   ========================================================= */

/* =========================================================
   CLOSES
   ========================================================= */

export function closes(c: Candle[]): number[] {
  return c.map((x) => x.close);
}

/* =========================================================
   SMA
   ========================================================= */

export function sma(
  values: number[],
  period: number
): number[] {
  if (
    !Array.isArray(values) ||
    period <= 0
  ) {
    return [];
  }

  const result: number[] = [];

  if (values.length < period) {
    return result;
  }

  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];

    if (i >= period) {
      sum -= values[i - period];
    }

    if (i >= period - 1) {
      result.push(sum / period);
    }
  }

  return result;
}

/* =========================================================
   EMA
   ========================================================= */

export function ema(
  values: number[],
  period: number
): number[] {
  if (
    !Array.isArray(values) ||
    period <= 0 ||
    values.length < period
  ) {
    return [];
  }

  const result: number[] = [];

  const multiplier =
    2 / (period + 1);

  /*
   * First EMA = SMA of first period
   */

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  let previousEma =
    sum / period;

  result.push(previousEma);

  /*
   * Remaining EMA values
   */

  for (
    let i = period;
    i < values.length;
    i++
  ) {
    const current =
      values[i];

    previousEma =
      (current - previousEma) *
        multiplier +
      previousEma;

    result.push(previousEma);
  }

  return result;
}

/* =========================================================
   RSI
   ========================================================= */

export function rsi(
  values: number[],
  period = 14
): number[] {
  if (
    !Array.isArray(values) ||
    period <= 0 ||
    values.length <= period
  ) {
    return [];
  }

  const result: number[] = [];

  let gainSum = 0;
  let lossSum = 0;

  /*
   * Initial average gain/loss
   */

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    if (change >= 0) {
      gainSum += change;
    } else {
      lossSum += Math.abs(change);
    }
  }

  let avgGain =
    gainSum / period;

  let avgLoss =
    lossSum / period;

  let firstRsi: number;

  if (avgLoss === 0) {
    firstRsi = 100;
  } else {
    const rs =
      avgGain / avgLoss;

    firstRsi =
      100 - 100 / (1 + rs);
  }

  result.push(firstRsi);

  /*
   * Wilder RSI smoothing
   */

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {
    const change =
      values[i] -
      values[i - 1];

    const gain =
      change > 0
        ? change
        : 0;

    const loss =
      change < 0
        ? Math.abs(change)
        : 0;

    avgGain =
      (avgGain * (period - 1) +
        gain) /
      period;

    avgLoss =
      (avgLoss * (period - 1) +
        loss) /
      period;

    let currentRsi: number;

    if (avgLoss === 0) {
      currentRsi = 100;
    } else {
      const rs =
        avgGain / avgLoss;

      currentRsi =
        100 - 100 / (1 + rs);
    }

    result.push(currentRsi);
  }

  return result;
}

/* =========================================================
   TRUE RANGE
   ========================================================= */

function trueRange(
  candles: Candle[]
): number[] {
  if (candles.length < 2) {
    return [];
  }

  const result: number[] = [];

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const range1 =
      current.high -
      current.low;

    const range2 =
      Math.abs(
        current.high -
          previous.close
      );

    const range3 =
      Math.abs(
        current.low -
          previous.close
      );

    result.push(
      Math.max(
        range1,
        range2,
        range3
      )
    );
  }

  return result;
}

/* =========================================================
   ATR
   ========================================================= */

export function atr(
  candles: Candle[],
  period = 14
): number[] {
  if (
    !Array.isArray(candles) ||
    candles.length < period + 1
  ) {
    return [];
  }

  const tr =
    trueRange(candles);

  if (tr.length < period) {
    return [];
  }

  const result: number[] = [];

  /*
   * First ATR = SMA of TR
   */

  let sum = 0;

  for (
    let i = 0;
    i < period;
    i++
  ) {
    sum += tr[i];
  }

  let previousAtr =
    sum / period;

  result.push(previousAtr);

  /*
   * Wilder ATR smoothing
   */

  for (
    let i = period;
    i < tr.length;
    i++
  ) {
    previousAtr =
      (previousAtr *
        (period - 1) +
        tr[i]) /
      period;

    result.push(
      previousAtr
    );
  }

  return result;
}

/* =========================================================
   MACD
   ========================================================= */

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult {
  if (
    !Array.isArray(values) ||
    values.length < slowPeriod
  ) {
    return {
      macd: [],
      signal: [],
      histogram: [],
    };
  }

  const fastEma =
    ema(
      values,
      fastPeriod
    );

  const slowEma =
    ema(
      values,
      slowPeriod
    );

  /*
   * Align EMA arrays.
   *
   * fast EMA starts at index
   * fastPeriod - 1
   *
   * slow EMA starts at index
   * slowPeriod - 1
   */

  const offset =
    slowPeriod -
    fastPeriod;

  const macdLine: number[] = [];

  for (
    let i = 0;
    i < slowEma.length;
    i++
  ) {
    const fastIndex =
      i + offset;

    const fastValue =
      fastEma[fastIndex];

    const slowValue =
      slowEma[i];

    if (
      Number.isFinite(
        fastValue
      ) &&
      Number.isFinite(
        slowValue
      )
    ) {
      macdLine.push(
        fastValue -
          slowValue
      );
    }
  }

  /*
   * Signal line = EMA of MACD
   */

  const signalRaw =
    ema(
      macdLine,
      signalPeriod
    );

  /*
   * Align signal with MACD
   */

  const signal: number[] =
    [];

  const histogram: number[] =
    [];

  const signalOffset =
    macdLine.length -
    signalRaw.length;

  for (
    let i = 0;
    i < macdLine.length;
    i++
  ) {
    if (
      i >= signalOffset
    ) {
      const signalIndex =
        i - signalOffset;

      const signalValue =
        signalRaw[
          signalIndex
        ];

      signal.push(
        signalValue
      );

      histogram.push(
        macdLine[i] -
          signalValue
      );
    } else {
      /*
       * Keep array aligned.
       * Use 0 until signal becomes available.
       */

      signal.push(0);

      histogram.push(
        macdLine[i]
      );
    }
  }

  return {
    macd: macdLine,
    signal,
    histogram,
  };
}

/* =========================================================
   BOLLINGER BANDS
   ========================================================= */

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollinger(
  values: number[],
  period = 20,
  multiplier = 2
): BollingerResult {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  if (
    !Array.isArray(values) ||
    period <= 0 ||
    values.length < period
  ) {
    return {
      upper,
      middle,
      lower,
    };
  }

  for (
    let i = period - 1;
    i < values.length;
    i++
  ) {
    const window =
      values.slice(
        i - period + 1,
        i + 1
      );

    const mean =
      window.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / period;

    const variance =
      window.reduce(
        (sum, value) =>
          sum +
          (value - mean) ** 2,
        0
      ) / period;

    const standardDeviation =
      Math.sqrt(
        variance
      );

    middle.push(mean);

    upper.push(
      mean +
        multiplier *
          standardDeviation
    );

    lower.push(
      mean -
        multiplier *
          standardDeviation
    );
  }

  return {
    upper,
    middle,
    lower,
  };
}

/* =========================================================
   VWAP
   ========================================================= */

export function vwap(
  candles: Candle[],
  period = 50
): number {
  if (
    !Array.isArray(candles) ||
    candles.length === 0
  ) {
    return 0;
  }

  const data =
    candles.slice(
      -Math.max(1, period)
    );

  let priceVolume = 0;
  let volumeTotal = 0;

  for (const candle of data) {
    const typicalPrice =
      (candle.high +
        candle.low +
        candle.close) /
      3;

    const volume =
      Number.isFinite(
        candle.volume
      )
        ? candle.volume
        : 0;

    priceVolume +=
      typicalPrice *
      volume;

    volumeTotal +=
      volume;
  }

  if (
    volumeTotal <= 0
  ) {
    return (
      data[data.length - 1]
        ?.close ?? 0
    );
  }

  return (
    priceVolume /
    volumeTotal
  );
}
