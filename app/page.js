"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
const RATINGS = {
  Argentyna: 1.18, Argentina: 1.18, Francja: 1.15, France: 1.15, Hiszpania: 1.14, Spain: 1.14,
  Brazylia: 1.12, Brazil: 1.12, Anglia: 1.11, England: 1.11, Portugalia: 1.08, Portugal: 1.08,
  Niemcy: 1.07, Germany: 1.07, Holandia: 1.05, Netherlands: 1.05, Włochy: 1.04, Italy: 1.04,
  Urugwaj: 1.03, Uruguay: 1.03, Kolumbia: 1.02, Colombia: 1.02, Belgia: 1.01, Belgium: 1.01,
  Chorwacja: 1, Croatia: 1, Meksyk: .96, Mexico: .96, "Stany Zjednoczone": .95, USA: .95,
  Kanada: .89, Canada: .89, Polska: .92, Poland: .92
};

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [meta, setMeta] = useState({ source: "—", updatedAt: null, notice: "" });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [simulation, setSimulation] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [couponMode, setCouponMode] = useState("safe");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [oddsData, setOddsData] = useState(null);
  const [now, setNow] = useState(Date.now());

  const loadData = useCallback(async (refresh = false) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/fixtures${refresh ? "?refresh=1" : ""}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.details || payload.error);
      const sorted = payload.matches.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMatches(sorted); setMeta(payload);
    } catch (requestError) {
      setError(`Błąd danych: ${requestError.message}. Sprawdź klucz API i spróbuj ponownie.`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const teams = useMemo(() => [...new Set(matches.flatMap(match => [match.home.name, match.away.name]))].sort((a, b) => a.localeCompare(b, "pl")), [matches]);
  useEffect(() => {
    if (teams.length && !homeTeam) { setHomeTeam(teams[0]); setAwayTeam(teams[1] || teams[0]); }
  }, [teams, homeTeam]);

  const shownMatches = useMemo(() => matches.filter(match => {
    const category = getCategory(match);
    return (filter === "all" || category === filter) && `${match.home.name} ${match.away.name}`.toLowerCase().includes(search.toLowerCase().trim());
  }), [matches, filter, search]);
  const finished = matches.filter(match => FINISHED.has(match.status));
  const upcoming = matches.filter(match => getCategory(match) === "upcoming");
  const nextMatch = upcoming.find(match => new Date(match.date).getTime() > now);
  const countdown = getCountdown(nextMatch?.date, now);

  function runSimulation() {
    if (homeTeam && awayTeam && homeTeam !== awayTeam) setSimulation(predict(homeTeam, awayTeam, matches));
  }

  async function generateCoupon(mode) {
    setCouponMode(mode); setCouponLoading(true); setCouponError("");
    try {
      let data = oddsData;
      if (!data) {
        const response = await fetch("/api/odds");
        data = await response.json();
        if (!response.ok) throw new Error(data.details || data.error);
        setOddsData(data);
      }
      setCoupon(buildCoupon(data.events, mode, matches, data.quota));
    } catch (requestError) {
      setCoupon(null); setCouponError(requestError.message);
    } finally {
      setCouponLoading(false);
    }
  }

  return <>
    <div className="noise" />
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">T</span><span>Tym<span>Gol</span></span></a>
      <nav className="nav" aria-label="Główna nawigacja"><a className="active" href="#mecze">Mecze</a><a href="#symulacja">Symulacja</a><a href="#kupon">Kupon AI</a></nav>
      <button className="refresh-button" onClick={() => loadData(true)} disabled={loading}><span className={loading ? "spinning" : ""}>↻</span> Odśwież</button>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> FIFA WORLD CUP 2026</p>
          <h1>Jasne, że wszystko<br /><em>się może zdarzyć.</em></h1>
          <p className="hero-description">Tymek z Igorem obstawiają, analizują i mają nadzieję, że wygrają. A nawet jeśli piłka znowu zaskoczy — będzie dobrze.</p>
          <div className="hero-actions"><a className="primary-button" href="#mecze">Zobacz mecze <span>↓</span></a><a className="ghost-button" href="#symulacja">Uruchom symulację</a></div>
        </div>
        <div className="hero-side">
          <div className="hero-photo-card">
            <img src="/tymek-igor.jpg" alt="Tymek i Igor — będzie dobrze" />
            <div><span>TYMEK + IGOR</span><strong>Obstawiamy. Liczymy. Wierzymy.</strong></div>
          </div>
          <div className="countdown-card">
            <div className="live-label"><span /> NAJBLIŻSZY MECZ</div>
            <div className="countdown-teams">{nextMatch ? `${nextMatch.home.name} — ${nextMatch.away.name}` : "Brak kolejnych meczów"}</div>
            <div className="countdown">
              {[[countdown.days, "DNI"], [countdown.hours, "GODZ"], [countdown.minutes, "MIN"], [countdown.seconds, "SEK"]].map(([value, label], index) => <span className="countdown-part" key={label}><div><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>{index < 3 && <i>:</i>}</span>)}
            </div>
            <p>{nextMatch ? `${formatDateTime(nextMatch.date)} · ${nextMatch.venue}` : "Terminarz nie jest jeszcze dostępny."}</p>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Podsumowanie turnieju">
        <div><span>Rozegrane mecze</span><strong>{finished.length}</strong></div>
        <div><span>Nadchodzące</span><strong>{upcoming.length}</strong></div>
        <div><span>Strzelone gole</span><strong>{finished.reduce((sum, match) => sum + (match.goals.home || 0) + (match.goals.away || 0), 0)}</strong></div>
        <div><span>Źródło danych</span><strong>{meta.source === "espn" ? "ESPN LIVE" : "—"}</strong></div>
      </section>

      <section className="section" id="mecze">
        <div className="section-heading"><div><p className="eyebrow">CENTRUM MECZOWE</p><h2>Terminarz i wyniki</h2></div><p className="updated">Aktualizacja: {meta.updatedAt ? formatDateTime(meta.updatedAt) : "—"}</p></div>
        {error && <div className="notice">{error}</div>}
        <div className="toolbar">
          <div className="filters" role="group" aria-label="Filtr meczów">
            {[['all', 'Wszystkie'], ['live', 'Na żywo'], ['upcoming', 'Nadchodzące'], ['finished', 'Zakończone']].map(([value, label]) => <button key={value} className={`filter ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
          <label className="search"><span>⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Szukaj drużyny…" /></label>
        </div>
        <div className="matches-grid">{shownMatches.map(match => <MatchCard key={match.id} match={match} />)}</div>
        {!loading && !shownMatches.length && <div className="empty-state">Brak meczów dla wybranych filtrów.</div>}
      </section>

      <section className="analysis-section" id="symulacja">
        <div className="section-heading light"><div><p className="eyebrow">MODEL STATYSTYCZNY</p><h2>Symulator meczu</h2></div><p>Model Poissona · aktualna forma</p></div>
        <div className="simulator-card">
          <TeamSelect label="Gospodarz" value={homeTeam} onChange={setHomeTeam} teams={teams} />
          <button className="swap-button" onClick={() => { setHomeTeam(awayTeam); setAwayTeam(homeTeam); }} aria-label="Zamień drużyny">⇄</button>
          <TeamSelect label="Gość" value={awayTeam} onChange={setAwayTeam} teams={teams} />
          <button className="simulate-button" onClick={runSimulation}>Symuluj mecz <span>→</span></button>
        </div>
        <div className="simulation-result">
          <Probability label="Wygrana gospodarzy" value={simulation?.homeWin} />
          <Probability label="Remis" value={simulation?.draw} />
          <Probability label="Wygrana gości" value={simulation?.awayWin} />
          <div className="score-prediction"><span>Najbardziej prawdopodobny wynik</span><strong>{simulation ? `${simulation.score[0]} : ${simulation.score[1]}` : "— : —"}</strong><small>{simulation ? `Oczekiwane gole: ${simulation.homeExpected.toFixed(2)} – ${simulation.awayExpected.toFixed(2)}` : "Wybierz drużyny i uruchom model"}</small></div>
        </div>
      </section>

      <section className="section coupon-section" id="kupon">
        <div className="section-heading"><div><p className="eyebrow">KURSY + MODEL STATYSTYCZNY</p><h2>Kupony wariantowe</h2></div></div>
        <p className="section-intro">Wybierz ostrożniejszy kupon z łącznym kursem 5–10 albo wariant z jednym ryzykownym zdarzeniem powyżej 5.00. Kursy są pobierane dopiero po kliknięciu.</p>
        <div className="coupon-controls">
          <button className={`coupon-mode ${couponMode === "safe" ? "active" : ""}`} onClick={() => generateCoupon("safe")} disabled={couponLoading}><span>🛡</span><strong>Pewniak</strong><small>Łączny kurs 5–10</small></button>
          <button className={`coupon-mode wild ${couponMode === "wild" ? "active" : ""}`} onClick={() => generateCoupon("wild")} disabled={couponLoading}><span>⚡</span><strong>Wariat</strong><small>Kurs pojedynczy &gt; 5.00</small></button>
        </div>
        <div className="coupon">
          {!coupon && !couponError && <div className="coupon-placeholder">{couponLoading ? "Pobieranie aktualnych kursów…" : "Wybierz „Pewniak” albo „Wariat”, aby wygenerować kupon."}</div>}
          {couponError && <div className="coupon-placeholder coupon-error">Nie udało się utworzyć kuponu: {couponError}</div>}
          {coupon && !coupon.picks.length && <div className="coupon-placeholder">Brak nadchodzących meczów do analizy.</div>}
          {coupon?.picks.length > 0 && <><div className={`coupon-header ${coupon.mode === "wild" ? "wild" : ""}`}><strong>{coupon.mode === "wild" ? "Wariat" : "Pewniak"} · {coupon.picks.length} zdarzenia</strong><span>Kurs łączny {coupon.totalOdds.toFixed(2)}</span></div>{coupon.picks.map(pick => <div className="coupon-pick" key={`${pick.eventId}-${pick.outcome}`}><time>{shortDate(pick.date)}</time><span className="pick-match">{pick.homeTeam} – {pick.awayTeam}</span><span className="pick-details"><strong>{pick.label}</strong><small>{pick.bookmaker} · kurs {pick.odds.toFixed(2)}</small></span><span className="confidence">{percent(pick.probability)}</span></div>)}</>}
        </div>
        {coupon?.quota?.remaining != null && <p className="quota-note">The Odds API: pozostało {coupon.quota.remaining} kredytów · ostatnie pobranie kosztowało {coupon.quota.last ?? "—"} · kursy są cache’owane 6 godzin.</p>}
        <p className="responsibility">⚠ Prognozy statystyczne nie gwarantują wyniku. Graj odpowiedzialnie i nie traktuj ich jako porady finansowej.</p>
      </section>
    </main>
    <footer><div className="brand"><span className="brand-mark">T</span><span>Tym<span>Gol</span></span></div><p>Dane i analizy dla kibiców · 2026</p></footer>
  </>;
}

function MatchCard({ match }) {
  const category = getCategory(match);
  const played = category !== "upcoming";
  const status = category === "live" ? `${match.elapsed || 0}' · NA ŻYWO` : category === "finished" ? "ZAKOŃCZONY" : formatDateTime(match.date);
  return <article className="match-card">
    <div className="match-meta"><span>{match.stage || "Mistrzostwa Świata"}</span><span className={`match-status ${category === "live" ? "live" : ""}`}>{status}</span></div>
    <TeamRow team={match.home} score={played ? match.goals.home : "–"} />
    <TeamRow team={match.away} score={played ? match.goals.away : "–"} />
    <div className="match-footer"><span>◉ {match.venue || "Do ustalenia"}</span><span>{category === "upcoming" ? timeUntil(match.date) : ""}</span></div>
  </article>;
}

function TeamRow({ team, score }) { return <div className="team-row"><div className="team-name"><span className="team-logo">{team.logo ? <img src={team.logo} alt="" loading="lazy" /> : team.name.slice(0, 2).toUpperCase()}</span>{team.name}</div><span className="score">{score ?? "–"}</span></div>; }
function TeamSelect({ label, value, onChange, teams }) { return <div className="team-select-block"><label>{label}</label><select value={value} onChange={event => onChange(event.target.value)}>{teams.map(team => <option key={team}>{team}</option>)}</select></div>; }
function Probability({ label, value }) { return <div className="probability"><span>{label}</span><strong>{value == null ? "—" : percent(value)}</strong><div><i style={{ width: value == null ? 0 : percent(value) }} /></div></div>; }

function buildCoupon(events, mode, matches, quota) {
  const candidates = createBetCandidates(events, matches);
  const seenEvents = new Set();
  const safeByEvent = candidates
    .filter(candidate => candidate.odds >= 1.15 && candidate.odds <= 2.75 && candidate.probability >= .4)
    .sort((a, b) => b.probability - a.probability)
    .filter(candidate => {
      if (seenEvents.has(candidate.eventId)) return false;
      seenEvents.add(candidate.eventId);
      return true;
    });

  let picks;
  if (mode === "wild") {
    const longshot = candidates
      .filter(candidate => candidate.odds > 5)
      .sort((a, b) => (b.probability * b.odds) - (a.probability * a.odds) || b.probability - a.probability)[0];
    const anchors = safeByEvent.filter(candidate => candidate.eventId !== longshot?.eventId).slice(0, 2);
    picks = longshot ? [longshot, ...anchors] : [];
  } else {
    picks = findSafeCombination(safeByEvent, 5, 10);
  }

  return {
    mode,
    picks,
    totalOdds: picks.reduce((total, pick) => total * pick.odds, 1),
    quota
  };
}

function createBetCandidates(events, matches) {
  return events.flatMap(event => {
    const model = predict(event.homeTeam, event.awayTeam, matches);
    return event.outcomes.map(outcome => {
      const isDraw = outcome.name.toLowerCase() === "draw";
      const modelProbability = isDraw ? model.draw : outcome.name === event.homeTeam ? model.homeWin : model.awayWin;
      return {
        eventId: event.id,
        date: event.date,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        outcome: outcome.name,
        label: isDraw ? "Remis" : `Wygra ${outcome.name}`,
        odds: outcome.odds,
        bookmaker: outcome.bookmaker,
        probability: outcome.probability * .7 + modelProbability * .3
      };
    });
  });
}

function findSafeCombination(candidates, minOdds, maxOdds) {
  const pool = candidates.slice(0, 16);
  let best = null;

  function search(index, picks, totalOdds, totalProbability) {
    if (totalOdds > maxOdds || picks.length > 6) return;
    if (picks.length >= 2 && totalOdds >= minOdds) {
      const score = Math.log(totalProbability) - Math.abs(Math.log(totalOdds / 7)) * .08;
      if (!best || score > best.score) best = { picks: [...picks], score };
    }
    for (let candidateIndex = index; candidateIndex < pool.length; candidateIndex++) {
      const candidate = pool[candidateIndex];
      search(candidateIndex + 1, [...picks, candidate], totalOdds * candidate.odds, totalProbability * candidate.probability);
    }
  }

  search(0, [], 1, 1);
  if (best) return best.picks;

  const fallback = [];
  let fallbackOdds = 1;
  for (const candidate of pool) {
    if (fallbackOdds * candidate.odds > maxOdds) continue;
    fallback.push(candidate);
    fallbackOdds *= candidate.odds;
    if (fallbackOdds >= minOdds) break;
  }
  return fallbackOdds >= minOdds ? fallback : [];
}

function predict(home, away, matches) {
  const homeRating = getRating(home, matches), awayRating = getRating(away, matches);
  const homeExpected = clamp(1.45 * homeRating / awayRating * 1.08, .3, 3.4);
  const awayExpected = clamp(1.2 * awayRating / homeRating, .25, 3.2);
  let homeWin = 0, draw = 0, awayWin = 0, best = { probability: 0, score: [0, 0] };
  for (let homeGoals = 0; homeGoals <= 8; homeGoals++) for (let awayGoals = 0; awayGoals <= 8; awayGoals++) {
    const probability = poisson(homeGoals, homeExpected) * poisson(awayGoals, awayExpected);
    if (homeGoals > awayGoals) homeWin += probability; else if (homeGoals === awayGoals) draw += probability; else awayWin += probability;
    if (probability > best.probability) best = { probability, score: [homeGoals, awayGoals] };
  }
  return { homeWin, draw, awayWin, score: best.score, homeExpected, awayExpected };
}

function getRating(team, matches) {
  const base = RATINGS[team] || .9;
  const recent = matches.filter(match => FINISHED.has(match.status) && (match.home.name === team || match.away.name === team)).slice(-8);
  if (!recent.length) return base;
  let points = 0, scored = 0, conceded = 0;
  recent.forEach(match => {
    const home = match.home.name === team, teamGoals = home ? match.goals.home : match.goals.away, opponentGoals = home ? match.goals.away : match.goals.home;
    scored += teamGoals; conceded += opponentGoals; points += teamGoals > opponentGoals ? 3 : teamGoals === opponentGoals ? 1 : 0;
  });
  return base * (.82 + (points / (recent.length * 3)) * .28 + clamp((scored - conceded) / (recent.length * 20), -.08, .08));
}

function getCategory(match) { return LIVE.has(match.status) ? "live" : FINISHED.has(match.status) ? "finished" : "upcoming"; }
function getCountdown(date, now) { const distance = date ? Math.max(0, new Date(date).getTime() - now) : 0; return { days: Math.floor(distance / 86400000), hours: Math.floor(distance / 3600000) % 24, minutes: Math.floor(distance / 60000) % 60, seconds: Math.floor(distance / 1000) % 60 }; }
function poisson(goals, expected) { return Math.exp(-expected) * expected ** goals / factorial(goals); }
function factorial(value) { let result = 1; for (let index = 2; index <= value; index++) result *= index; return result; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function percent(value) { return `${Math.round(value * 100)}%`; }
function formatDateTime(date) { return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(date)); }
function shortDate(date) { return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(date)); }
function timeUntil(date) { const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000); return days > 1 ? `za ${days} dni` : days === 1 ? "jutro" : "dzisiaj"; }
