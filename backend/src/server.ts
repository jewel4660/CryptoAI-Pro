import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";

import {
  getSymbols,
  getTicker,
  getCandles,
} from "./exchange.js";

import { analyze } from "./engine.js";

const app = Fastify({
  logger: true,
});

/* ================================
   PLUGINS
================================ */

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

/* ================================
   HEALTH
================================ */

app.get("/health", async () => {
  return {
    ok: true,
    service: "CryptoAI Pro",
    time: new Date().toISOString(),
  };
});

/* ================================
   MARKETS
================================ */

app.get("/api/v1/markets", async (req: any, reply) => {
  try {
    const limit = Math.min(
      500,
      Math.max(
        1,
        Number(req.query?.limit ?? 100)
      )
    );

    const symbols = await getSymbols(limit);

    return {
      data: symbols,
    };
  } catch (e: any) {
    return reply.code(502).send({
      error: "MARKET_DATA_UNAVAILABLE",
      message: e?.message ?? "Unable to load markets",
    });
  }
});

/* ================================
   TICKER
================================ */

app.get(
  "/api/v1/ticker/:symbol",
  async (req: any, reply) => {
    try {
      const raw = decodeURIComponent(
        req.params.symbol
      );

      const symbol = raw.includes("/")
        ? raw
        : raw.replace(/USDT$/, "/USDT");

      const t = await getTicker(symbol);

      return {
        data: {
          symbol: t.symbol,
          last: t.last,
          bid: t.bid,
          ask: t.ask,
          high: t.high,
          low: t.low,
          percentage: t.percentage,
          quoteVolume: t.quoteVolume,
          timestamp: t.timestamp,
        },
      };
    } catch (e: any) {
      return reply.code(502).send({
        error: "MARKET_DATA_UNAVAILABLE",
        message:
          e?.message ?? "Unable to load ticker",
      });
    }
  }
);

/* ================================
   CANDLES
================================ */

app.get(
  "/api/v1/candles/:symbol",
  async (req: any, reply) => {
    try {
      const raw = decodeURIComponent(
        req.params.symbol
      );

      const symbol = raw.includes("/")
        ? raw
        : raw.replace(/USDT$/, "/USDT");

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

      const requestedTimeframe = String(
        req.query?.timeframe ?? "15m"
      );

      const timeframe =
        allowedTimeframes.includes(
          requestedTimeframe
        )
          ? requestedTimeframe
          : "15m";

      const limit = Math.min(
        1000,
        Math.max(
          1,
          Number(req.query?.limit ?? 200)
        )
      );

      const candles = await getCandles(
        symbol,
        timeframe,
        limit
      );

      return {
        data: candles,
        symbol,
        timeframe,
        count: candles.length,
      };
    } catch (e: any) {
      return reply.code(502).send({
        error: "MARKET_DATA_UNAVAILABLE",
        message:
          e?.message ?? "Unable to load candles",
      });
    }
  }
);

/* ================================
   ANALYSIS
================================ */

app.get(
  "/api/v1/analysis/:symbol",
  async (req: any, reply) => {
    try {
      const raw = decodeURIComponent(
        req.params.symbol
      );

      const symbol = raw.includes("/")
        ? raw
        : raw.replace(/USDT$/, "/USDT");

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

      const requestedTimeframe = String(
        req.query?.timeframe ?? "15m"
      );

      const timeframe =
        allowedTimeframes.includes(
          requestedTimeframe
        )
          ? requestedTimeframe
          : "15m";

      const balance = Number(
        req.query?.balance ?? 1000
      );

      const riskPercent = Number(
        req.query?.riskPercent ?? 1
      );

      const candles = await getCandles(
        symbol,
        timeframe,
        300
      );

      const result = analyze(
        symbol,
        candles,
        balance,
        riskPercent
      );

      return {
        data: result,
      };
    } catch (e: any) {
      return reply.code(400).send({
        error: e?.message ?? "Analysis failed",
      });
    }
  }
);

/* ================================
   SCANNER
================================ */

app.get(
  "/api/v1/scanner",
  async (req: any, reply) => {
    try {
      const limit = Math.min(
        500,
        Math.max(
          1,
          Number(req.query?.limit ?? 50)
        )
      );

      const timeframe = String(
        req.query?.timeframe ?? "15m"
      );

      const symbols =
        await getSymbols(limit);

      const results: any[] = [];

      for (const symbol of symbols) {
        try {
          const candles = await getCandles(
            symbol,
            timeframe,
            300
          );

          const result = analyze(
            symbol,
            candles,
            1000,
            1
          );

          results.push(result);
        } catch {
          // Unavailable symbols are skipped.
        }
      }

      return {
        requested: limit,
        scanned: results.length,
        data: results,
      };
    } catch (e: any) {
      return reply.code(502).send({
        error: "SCANNER_FAILED",
        message:
          e?.message ?? "Scanner failed",
      });
    }
  }
);

/* ================================
   404
================================ */

app.setNotFoundHandler(
  async (req, reply) => {
    return reply.code(404).send({
      error: "NOT_FOUND",
      message: `Route ${req.method}:${req.url} not found`,
    });
  }
);

/* ================================
   ERROR HANDLER
================================ */

app.setErrorHandler(
  async (error, req, reply) => {
    req.log.error(error);

    return reply.code(
      error.statusCode ?? 500
    ).send({
      error: "SERVER_ERROR",
      message:
        error.message ?? "Internal server error",
    });
  }
);

/* ================================
   START SERVER
================================ */

const port = Number(
  process.env.PORT ?? 8080
);

const host =
  process.env.HOST ?? "0.0.0.0";

app.listen({
  port,
  host,
});
