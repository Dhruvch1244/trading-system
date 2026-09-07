'use strict';

const INSTRUMENTS = {
  AAPL: { name: 'Apple Inc.', basePrice: 190 },
  MSFT: { name: 'Microsoft Corp.', basePrice: 415 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 165 },
};

// Deterministic PRNG so restarts produce stable-looking data (mulberry32).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function buildCandles(symbol, basePrice, days = 30) {
  const rand = mulberry32(hashString(symbol));
  const candles = [];
  let price = basePrice;
  const today = new Date();

  for (let i = days; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const drift = (rand() - 0.48) * (basePrice * 0.015);
    const open = price;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + rand() * (basePrice * 0.005);
    const low = Math.min(open, close) - rand() * (basePrice * 0.005);
    const volume = Math.floor(1_000_000 + rand() * 5_000_000);

    candles.push({
      date: date.toISOString().slice(0, 10),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });

    price = close;
  }

  return { candles, lastClose: price };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Fauxnance backs a few hundred tradable instruments (see db/init/05_instruments_universe.sql).
// Rather than hand-maintain a matching basePrice entry per symbol here (guaranteed to drift),
// any symbol not in the small curated set above gets a deterministic synthetic basePrice derived
// from its own hash - same symbol always yields the same price series across restarts, without
// this file needing to know the DB's instrument list.
function syntheticInstrument(symbol) {
  const rand = mulberry32(hashString(symbol));
  const basePrice = round2(10 + rand() * 490); // $10-$500, deterministic per symbol
  return { name: symbol, basePrice };
}

function getQuote(symbol) {
  const instrument = INSTRUMENTS[symbol] ?? syntheticInstrument(symbol);

  const { candles, lastClose } = buildCandles(symbol, instrument.basePrice);
  const jitter = (Math.random() - 0.5) * (instrument.basePrice * 0.002);

  return {
    symbol,
    name: instrument.name,
    quote: {
      price: round2(lastClose + jitter),
      asOf: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      delayedMinutes: 15,
    },
    candles,
  };
}

module.exports = { INSTRUMENTS, getQuote };
