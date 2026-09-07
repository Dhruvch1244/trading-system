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

const NEWS_SOURCES = ['MarketPulse Wire', 'Fauxnance News', 'The Ticker Tape', 'Street Signal', 'Capital Digest'];

const HEADLINE_TEMPLATES = [
  { text: (n) => `${n} beats quarterly expectations, shares react`, sentiment: 'POSITIVE' },
  { text: (n) => `Analysts raise price target on ${n} citing strong demand`, sentiment: 'POSITIVE' },
  { text: (n) => `${n} announces new product line, investors optimistic`, sentiment: 'POSITIVE' },
  { text: (n) => `${n} expands into new markets, momentum builds`, sentiment: 'POSITIVE' },
  { text: (n) => `${n} misses revenue estimates for the quarter`, sentiment: 'NEGATIVE' },
  { text: (n) => `Regulatory scrutiny weighs on ${n} outlook`, sentiment: 'NEGATIVE' },
  { text: (n) => `${n} faces supply chain headwinds heading into next quarter`, sentiment: 'NEGATIVE' },
  { text: (n) => `Analysts trim estimates for ${n} amid sector weakness`, sentiment: 'NEGATIVE' },
  { text: (n) => `${n} holds steady as broader market digests recent moves`, sentiment: 'NEUTRAL' },
  { text: (n) => `What to watch for ${n} in the coming weeks`, sentiment: 'NEUTRAL' },
  { text: (n) => `${n} announces executive leadership change`, sentiment: 'NEUTRAL' },
];

/**
 * Synthetic headlines, same deterministic-per-symbol approach as candles - no real news
 * source, but stable across restarts so a symbol's feed doesn't reshuffle on every request.
 */
function getNews(symbol, name) {
  const rand = mulberry32(hashString('news:' + symbol));
  const count = 5 + Math.floor(rand() * 4); // 5-8 headlines
  const displayName = name || symbol;
  const items = [];

  for (let i = 0; i < count; i++) {
    const template = HEADLINE_TEMPLATES[Math.floor(rand() * HEADLINE_TEMPLATES.length)];
    const source = NEWS_SOURCES[Math.floor(rand() * NEWS_SOURCES.length)];
    const hoursAgo = Math.floor(i * (6 + rand() * 18)) + 1;
    items.push({
      headline: template.text(displayName),
      source,
      sentiment: template.sentiment,
      publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    });
  }

  return items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

module.exports = { INSTRUMENTS, getQuote, getNews };
