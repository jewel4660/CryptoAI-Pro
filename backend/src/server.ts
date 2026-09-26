import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import {
  getSymbols,
  getTicker,
  getCandles,
} from "./exchange.js";

import { analyze } from "./engine.js";

/* =========================================================
   APP
========================================================= */

const app = Fastify({
  logger: true,
});

/* =========================================================
   HELPERS
========================================================= */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function normalizeSymbol(value: unknown): string {
  const raw = decodeURIComponent(String(value ?? "")).trim();

  if (!raw) {
    throw new Error("Symbol is required");
  }

  return raw.includes("/")
    ? raw.toUpperCase()
    : raw.toUpperCase().replace(/USDT$/, "/USDT");
}

function getLimit(
  value: unknown,
  defaultValue: number,
  max: number
): number {
  const parsed = Number(value ?? defaultValue);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(
    max,
    Math.max(1, Math.floor(parsed))
  );
}

function getBalance(value: unknown): number {
  const parsed = Number(value ?? 1000);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1000;
  }

  return parsed;
}

function getRiskPercent(value: unknown): number {
  const parsed = Number(value ?? 1);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.min(100, parsed);
}

function getTimeframe(value: unknown): string {
  const allowedTimeframes = [
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "6h",
    "12h",
    "1d",
    "1w",
  ];

  const timeframe = String(
    value ?? "15m"
  );

  return allowedTimeframes.includes(
    timeframe
  )
    ? timeframe
    : "15m";
}

/* =========================================================
   PLUGINS
========================================================= */

await app.register(cors, {
  origin:
    process.env.CORS_ORIGIN &&
    process.env.CORS_ORIGIN !== "*"
      ? process.env.CORS_ORIGIN
      : true,
});

await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", async () => {
  return {
    ok: true,
    service: "CryptoAI Pro",
    time: new Date().toISOString(),
  };
});

/* =========================================================
   MARKETS
========================================================= */

app.get(
  "/api/v1/markets",
  async (req: any, reply) => {
    try {
      const limit = getLimit(
        req.query?.limit,
        100,
        500
      );

      const symbols =
        await getSymbols(limit);

      return {
        ok: true,
        data: symbols,
        count: symbols.length,
      };
    } catch (error: unknown) {
      const message =
        getErrorMessage(error);

      req.log.error(
        {
          error: message,
        },
        "Failed to load markets"
      );

      return reply.code(502).send({
        ok: false,
        error: "MARKET_DATA_UNAVAILABLE",
        message:
          message || "Unable to load markets",
      });
    }
  }
);

/* =========================================================
   TICKER
========================================================= */

app.get(
  "/api/v1/ticker/:symbol",
  async (req: any, reply) => {
    try {
      const symbol = normalizeSymbol(
        req.params?.symbol
      );

      const ticker =
        await getTicker(symbol);

      return {
        ok: true,
        data: {
          symbol: ticker.symbol,
          last: ticker.last,
          bid: ticker.bid,
          ask: ticker.ask,
          high: ticker.high,
          low: ticker.low,
          percentage:
            ticker.percentage,
          quoteVolume:
            ticker.quoteVolume,
          timestamp:
            ticker.timestamp,
        },
      };
    } catch (error: unknown) {
      const message =
        getErrorMessage(error);

      req.log.error(
        {
          error: message,
        },
        "Failed to load ticker"
      );

      return reply.code(502).send({
        ok: false,
        error: "MARKET_DATA_UNAVAILABLE",
        message:
          message || "Unable to load ticker",
      });
    }
  }
);

/* =========================================================
   CANDLES
========================================================= */

app.get(
  "/api/v1/candles/:symbol",
  async (req: any, reply) => {
    try {
      const symbol = normalizeSymbol(
        req.params?.symbol
      );

      const timeframe =
        getTimeframe(
          req.query?.timeframe
        );

      const limit = getLimit(
        req.query?.limit,
        200,
        1000
      );

      const candles =
        await getCandles(
          symbol,
          timeframe,
          limit
        );

      return {
        ok: true,
        data: candles,
        symbol,
        timeframe,
        count: candles.length,
      };
    } catch (error: unknown) {
      const message =
        getErrorMessage(error);

      req.log.error(
        {
          error: message,
        },
        "Failed to load candles"
      );

      return reply.code(502).send({
        ok: false,
        error: "MARKET_DATA_UNAVAILABLE",
        message:
          message || "Unable to load candles",
      });
    }
  }
);

/* =========================================================
   ANALYSIS
========================================================= */

app.get(
  "/api/v1/analysis/:symbol",
  async (req: any, reply) => {
    try {
      const symbol = normalizeSymbol(
        req.params?.symbol
      );

      const timeframe =
        getTimeframe(
          req.query?.timeframe
        );

      const balance =
        getBalance(
          req.query?.balance
        );

      const riskPercent =
        getRiskPercent(
          req.query?.riskPercent
        );

      const candles =
        await getCandles(
          symbol,
          timeframe,
          300
        );

      if (
        !candles ||
        candles.length === 0
      ) {
        return reply.code(404).send({
          ok: false,
          error: "NO_MARKET_DATA",
          message:
            "No candle data available for this symbol",
        });
      }

      const result = analyze(
        symbol,
        candles,
        balance,
        riskPercent
      );

      return {
        ok: true,
        data: result,
      };
    } catch (error: unknown) {
      const message =
        getErrorMessage(error);

      req.log.error(
        {
          error: message,
        },
        "Analysis failed"
      );

      return reply.code(400).send({
        ok: false,
        error: "ANALYSIS_FAILED",
        message:
          message || "Analysis failed",
      });
    }
  }
);

/* =========================================================
   SCANNER
========================================================= */

app.get(
  "/api/v1/scanner",
  async (req: any, reply) => {
    try {
      const limit = getLimit(
        req.query?.limit,
        50,
        500
      );

      const timeframe =
        getTimeframe(
          req.query?.timeframe
        );

      const symbols =
        await getSymbols(limit);

      const results: any[] = [];

      for (const symbol of symbols) {
        try {
          const candles =
            await getCandles(
              symbol,
              timeframe,
              300
            );

          if (
            !candles ||
            candles.length === 0
          ) {
            continue;
          }

          const result = analyze(
            symbol,
            candles,
            1000,
            1
          );

          results.push(result);
        } catch (error: unknown) {
          const message =
            getErrorMessage(error);

          req.log.warn(
            {
              symbol,
              error: message,
            },
            "Skipping unavailable symbol"
          );

          // Continue scanning other symbols.
        }
      }

      return {
        ok: true,
        requested: limit,
        scanned: results.length,
        timeframe,
        data: results,
      };
    } catch (error: unknown) {
      const message =
        getErrorMessage(error);

      req.log.error(
        {
          error: message,
        },
        "Scanner failed"
      );

      return reply.code(502).send({
        ok: false,
        error: "SCANNER_FAILED",
        message:
          message || "Scanner failed",
      });
    }
  }
);

/* =========================================================
   404 HANDLER
========================================================= */

app.setNotFoundHandler(
  async (req, reply) => {
    return reply.code(404).send({
      ok: false,
      error: "NOT_FOUND",
      message:
        `Route ${req.method}:${req.url} not found`,
    });
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.setErrorHandler(
  async (
    error: any,
    req,
    reply
  ) => {
    const message =
      getErrorMessage(error);

    req.log.error(
      {
        error: message,
      },
      "Unhandled server error"
    );

    const statusCode =
      typeof error?.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 600
        ? error.statusCode
        : 500;

    return reply.code(
      statusCode
    ).send({
      ok: false,
      error: "SERVER_ERROR",
      message:
        message || "Internal server error",
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

const portValue = Number(
  process.env.PORT ?? 8080
);

const port =
  Number.isFinite(portValue) &&
  portValue > 0
    ? portValue
    : 8080;

const host =
  process.env.HOST ??
  "0.0.0.0";

/* =========================================================
   START
========================================================= */

try {
  await app.listen({
    port,
    host,
  });

  app.log.info(
    `CryptoAI Pro API running on ${host}:${port}`
  );
} catch (error: unknown) {
  const message =
    getErrorMessage(error);

  app.log.error(
    {
      error: message,
    },
    "Failed to start server"
  );

  process.exit(1);
}
