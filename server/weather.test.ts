import { afterEach, beforeEach, expect, it, vi } from "vitest";
const kickoff = "2026-09-10T00:20:00Z";
const venue = {
  id: "3673",
  fullName: "Lumen Field",
  indoor: false,
  address: { country: "USA" },
};
let calls: string[];
let competition: any;
let periods: any[];
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T12:00:00Z"));
  calls = [];
  competition = {
    venue,
    neutralSite: false,
    competitors: [
      { homeAway: "home", team: { abbreviation: "SEA" } },
      { homeAway: "away", team: { abbreviation: "NE" } },
    ],
  };
  periods = [
    {
      startTime: "2026-09-10T00:00:00Z",
      endTime: "2026-09-10T01:00:00Z",
      shortForecast: "Rain",
      temperature: 58,
      windSpeed: "20 mph",
      probabilityOfPrecipitation: { value: 80 },
    },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const data = url.includes("scoreboard")
        ? { events: [{ id: "1", date: kickoff, competitions: [competition] }] }
        : url.includes("/points/")
          ? {
              properties: {
                forecastHourly:
                  "https://api.weather.gov/gridpoints/SEW/1,2/forecast/hourly",
              },
            }
          : { properties: { periods } };
      return { ok: true, json: async () => data };
    })
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("uses a kickoff-hour forecast with its source and valid time", async () => {
  const { getNFLWeekOutlook } = await import("./weather");
  const [g] = await getNFLWeekOutlook(2026, 1);
  expect(g).toMatchObject({
    forecast: "Rain",
    precipitationChance: 80,
    wind: "20 mph",
    forecastValidAt: periods[0].startTime,
    forecastSource:
      "https://api.weather.gov/gridpoints/SEW/1,2/forecast/hourly",
  });
});
it("does not use the nearest hour when the forecast does not reach kickoff", async () => {
  periods[0].endTime = "2026-09-09T01:00:00Z";
  periods[0].startTime = "2026-09-09T00:00:00Z";
  const { getNFLWeekOutlook } = await import("./weather");
  const [g] = await getNFLWeekOutlook(2026, 1);
  expect(g.precipitationChance).toBeNull();
  expect(g.forecastSource).toBeNull();
  expect(g.forecast).toContain("unavailable");
});
it("does not substitute home-city weather for a neutral international game", async () => {
  competition.neutralSite = true;
  competition.venue = {
    ...venue,
    fullName: "Melbourne Cricket Ground",
    address: { country: "Australia" },
  };
  const { getNFLWeekOutlook } = await import("./weather");
  expect((await getNFLWeekOutlook(2026, 1))[0].forecast).toContain(
    "home-city weather is not applicable"
  );
  expect(calls).toHaveLength(1);
});
it("does not apply outdoor rain forecasts to a covered SoFi field", async () => {
  competition.venue = { ...venue, id: "7065" };
  const { getNFLWeekOutlook } = await import("./weather");
  const [g] = await getNFLWeekOutlook(2026, 1);
  expect(g.forecast).toContain("Covered stadium");
  expect(g.precipitationChance).toBeNull();
  expect(calls).toHaveLength(1);
});
