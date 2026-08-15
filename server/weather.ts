type Coordinates = { lat: number; lon: number };

const HOME_TEAM_COORDINATES: Record<string, Coordinates> = {
  ARI: { lat: 33.5276, lon: -112.2626 },
  ATL: { lat: 33.7554, lon: -84.4008 },
  BAL: { lat: 39.278, lon: -76.6227 },
  BUF: { lat: 42.7738, lon: -78.787 },
  CAR: { lat: 35.2258, lon: -80.8528 },
  CHI: { lat: 41.8623, lon: -87.6167 },
  CIN: { lat: 39.0954, lon: -84.516 },
  CLE: { lat: 41.5061, lon: -81.6995 },
  DAL: { lat: 32.7473, lon: -97.0945 },
  DEN: { lat: 39.7439, lon: -105.0201 },
  DET: { lat: 42.34, lon: -83.0456 },
  GB: { lat: 44.5013, lon: -88.0622 },
  HOU: { lat: 29.6847, lon: -95.4107 },
  IND: { lat: 39.7601, lon: -86.1639 },
  JAX: { lat: 30.3239, lon: -81.6373 },
  KC: { lat: 39.0489, lon: -94.4839 },
  LV: { lat: 36.0909, lon: -115.1833 },
  LAC: { lat: 33.9535, lon: -118.3392 },
  LAR: { lat: 33.9535, lon: -118.3392 },
  MIA: { lat: 25.958, lon: -80.2389 },
  MIN: { lat: 44.9738, lon: -93.2581 },
  NE: { lat: 42.0909, lon: -71.2643 },
  NO: { lat: 29.9511, lon: -90.0812 },
  NYG: { lat: 40.8135, lon: -74.0745 },
  NYJ: { lat: 40.8135, lon: -74.0745 },
  PHI: { lat: 39.9008, lon: -75.1675 },
  PIT: { lat: 40.4468, lon: -80.0158 },
  SEA: { lat: 47.5952, lon: -122.3316 },
  SF: { lat: 37.403, lon: -121.97 },
  TB: { lat: 27.9759, lon: -82.5033 },
  TEN: { lat: 36.1665, lon: -86.7713 },
  WAS: { lat: 38.9077, lon: -76.8645 },
};

export type GameOutlook = {
  id: string;
  kickoff: string;
  matchup: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  indoor: boolean;
  forecast: string;
  temperature: number | null;
  wind: string | null;
  precipitationChance: number | null;
};

let cache: { key: string; expiresAt: number; value: GameOutlook[] } | null =
  null;

async function fetchNwsForecast(coords: Coordinates, kickoff: Date) {
  if (kickoff.getTime() - Date.now() > 7 * 24 * 60 * 60 * 1000) return null;
  const headers = {
    "User-Agent": "TroubleInParadiseFantasy/1.0 (league-weather)",
  };
  const points = await fetch(
    `https://api.weather.gov/points/${coords.lat},${coords.lon}`,
    { headers }
  );
  if (!points.ok) return null;
  const pointData = (await points.json()) as any;
  const hourlyUrl = pointData?.properties?.forecastHourly;
  if (!hourlyUrl) return null;
  const hourly = await fetch(hourlyUrl, { headers });
  if (!hourly.ok) return null;
  const hourlyData = (await hourly.json()) as any;
  const periods = hourlyData?.properties?.periods ?? [];
  if (!periods.length) return null;
  const closest = periods.reduce((best: any, period: any) =>
    Math.abs(new Date(period.startTime).getTime() - kickoff.getTime()) <
    Math.abs(new Date(best.startTime).getTime() - kickoff.getTime())
      ? period
      : best
  );
  return {
    forecast: closest.shortForecast || "Forecast available",
    temperature: Number.isFinite(closest.temperature)
      ? closest.temperature
      : null,
    wind: closest.windSpeed || null,
    precipitationChance: closest.probabilityOfPrecipitation?.value ?? null,
  };
}

export async function getNFLWeekOutlook(
  seasonYear: number,
  week: number
): Promise<GameOutlook[]> {
  const key = `${seasonYear}-${week}`;
  if (cache?.key === key && cache.expiresAt > Date.now()) return cache.value;

  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${seasonYear}&seasontype=2&week=${week}`
  );
  if (!response.ok) throw new Error("NFL schedule is temporarily unavailable");
  const data = (await response.json()) as any;

  const games = await Promise.all(
    (data.events ?? []).map(async (event: any): Promise<GameOutlook> => {
      const competition = event.competitions?.[0] ?? {};
      const home = competition.competitors?.find(
        (team: any) => team.homeAway === "home"
      )?.team;
      const away = competition.competitors?.find(
        (team: any) => team.homeAway === "away"
      )?.team;
      const kickoff = new Date(event.date);
      const indoor = Boolean(competition.venue?.indoor);
      let weather = indoor
        ? {
            forecast: "Indoor / climate controlled",
            temperature: null,
            wind: null,
            precipitationChance: null,
          }
        : null;

      if (
        !weather &&
        home?.abbreviation &&
        HOME_TEAM_COORDINATES[home.abbreviation]
      ) {
        try {
          weather = await fetchNwsForecast(
            HOME_TEAM_COORDINATES[home.abbreviation],
            kickoff
          );
        } catch (error) {
          console.warn("[Weather] NWS forecast unavailable", String(error));
        }
      }

      return {
        id: String(event.id),
        kickoff: kickoff.toISOString(),
        matchup: `${away?.abbreviation || "TBD"} @ ${home?.abbreviation || "TBD"}`,
        homeTeam: home?.abbreviation || "TBD",
        awayTeam: away?.abbreviation || "TBD",
        venue: competition.venue?.fullName || "Venue TBD",
        indoor,
        forecast:
          weather?.forecast || "Forecast pending (available within 7 days)",
        temperature: weather?.temperature ?? null,
        wind: weather?.wind ?? null,
        precipitationChance: weather?.precipitationChance ?? null,
      };
    })
  );

  cache = { key, value: games, expiresAt: Date.now() + 15 * 60_000 };
  return games;
}
