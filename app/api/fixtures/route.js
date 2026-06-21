import { NextResponse } from "next/server";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200";

export async function GET(request) {
  try {
    const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
    const apiResponse = await fetch(ESPN_SCOREBOARD, {
      ...(forceRefresh ? { cache: "no-store" } : { next: { revalidate: 300 } })
    });

    if (!apiResponse.ok) throw new Error(`ESPN odpowiedziało kodem ${apiResponse.status}`);
    const payload = await apiResponse.json();
    const matches = (payload.events || []).map(normalizeEvent).filter(Boolean);

    if (!matches.length) throw new Error("ESPN nie zwróciło spotkań MŚ 2026");

    return NextResponse.json({
      source: "espn",
      notice: "Terminarz i wyniki pobierane z publicznego API ESPN.",
      updatedAt: new Date().toISOString(),
      matches
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Nie udało się pobrać danych z ESPN", details: error.message },
      { status: 502 }
    );
  }
}

function normalizeEvent(event) {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const home = competition.competitors?.find(competitor => competitor.homeAway === "home");
  const away = competition.competitors?.find(competitor => competitor.homeAway === "away");
  if (!home || !away) return null;

  const status = competition.status || event.status;
  return {
    id: event.id,
    date: competition.date || event.date,
    timestamp: Math.floor(new Date(competition.date || event.date).getTime() / 1000),
    status: normalizeStatus(status),
    elapsed: status?.type?.state === "in" ? Math.floor((status.clock || 0) / 60) : null,
    stage: competition.altGameNote || formatStage(event.season?.slug),
    venue: competition.venue?.fullName || event.venue?.displayName || "Do ustalenia",
    home: normalizeTeam(home),
    away: normalizeTeam(away),
    goals: {
      home: parseScore(home.score, status?.type?.state),
      away: parseScore(away.score, status?.type?.state)
    }
  };
}

function normalizeTeam(competitor) {
  return {
    id: competitor.team.id,
    name: competitor.team.displayName || competitor.team.name,
    logo: competitor.team.logo || null
  };
}

function normalizeStatus(status) {
  if (status?.type?.completed || status?.type?.state === "post") return "FT";
  if (status?.type?.state === "in") {
    if (status.period === 1) return "1H";
    if (status.period === 2) return "2H";
    return "LIVE";
  }
  if (status?.type?.name === "STATUS_CANCELED") return "CANC";
  if (status?.type?.name === "STATUS_POSTPONED") return "PST";
  return "NS";
}

function parseScore(score, state) {
  if (state === "pre") return null;
  const value = Number.parseInt(score, 10);
  return Number.isNaN(value) ? null : value;
}

function formatStage(slug) {
  if (!slug) return "Mistrzostwa Świata";
  return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
