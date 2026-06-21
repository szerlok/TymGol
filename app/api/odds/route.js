import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ODDS_API_URL = "https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds";
const CACHE_SECONDS = 6 * 60 * 60;

export async function GET() {
  if (!process.env.THE_ODDS_API_KEY) {
    return NextResponse.json(
      { error: "Brak konfiguracji THE_ODDS_API_KEY" },
      { status: 503 }
    );
  }

  try {
    const url = new URL(ODDS_API_URL);
    url.searchParams.set("apiKey", process.env.THE_ODDS_API_KEY);
    url.searchParams.set("regions", "eu");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    const response = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || `The Odds API odpowiedziało kodem ${response.status}`);
    }

    return NextResponse.json({
      source: "the-odds-api",
      updatedAt: new Date().toISOString(),
      cacheHours: CACHE_SECONDS / 3600,
      quota: {
        remaining: numberHeader(response.headers.get("x-requests-remaining")),
        used: numberHeader(response.headers.get("x-requests-used")),
        last: numberHeader(response.headers.get("x-requests-last"))
      },
      events: payload.map(normalizeEvent).filter(event => event.outcomes.length >= 2)
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Nie udało się pobrać kursów", details: error.message },
      { status: 502 }
    );
  }
}

function normalizeEvent(event) {
  const prices = new Map();

  for (const bookmaker of event.bookmakers || []) {
    const market = bookmaker.markets?.find(item => item.key === "h2h");
    for (const outcome of market?.outcomes || []) {
      const entry = prices.get(outcome.name) || [];
      entry.push({ price: outcome.price, bookmaker: bookmaker.title });
      prices.set(outcome.name, entry);
    }
  }

  const consensus = [...prices.entries()].map(([name, offers]) => {
    const averageOdds = offers.reduce((sum, offer) => sum + offer.price, 0) / offers.length;
    const best = offers.reduce((current, offer) => offer.price > current.price ? offer : current);
    return { name, averageOdds, odds: best.price, bookmaker: best.bookmaker };
  });
  const probabilitySum = consensus.reduce((sum, outcome) => sum + 1 / outcome.averageOdds, 0);

  return {
    id: event.id,
    date: event.commence_time,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    outcomes: consensus.map(outcome => ({
      ...outcome,
      probability: (1 / outcome.averageOdds) / probabilitySum
    }))
  };
}

function numberHeader(value) {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
