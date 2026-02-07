import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // League management
  league: router({
    // Get all leagues
    list: protectedProcedure.query(async () => {
      const { getAllLeagues } = await import('./leagueDb');
      return await getAllLeagues();
    }),

    // Sync league data from ESPN
    sync: protectedProcedure
      .input(z.object({
        espnLeagueId: z.string(),
        seasonYear: z.number(),
        currentWeek: z.number().default(1),
        espnS2: z.string().optional(),
        swid: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { fullLeagueSync } = await import('./espnSync');
        return await fullLeagueSync(
          input.espnLeagueId,
          input.seasonYear,
          input.currentWeek,
          input.espnS2,
          input.swid
        );
      }),

    // Sync all historical seasons
    syncAllSeasons: protectedProcedure
      .input(z.object({
        espnLeagueId: z.string(),
        espnS2: z.string().optional(),
        swid: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { syncAllSeasons } = await import('./espnMultiSeasonSync');
        return await syncAllSeasons(
          input.espnLeagueId,
          input.espnS2,
          input.swid
        );
      }),

    // Get teams for a league
    teams: protectedProcedure
      .input(z.object({ leagueId: z.number() }))
      .query(async ({ input }) => {
        const { getTeamsByLeague } = await import('./leagueDb');
        return await getTeamsByLeague(input.leagueId);
      }),

    // Get matchups for a specific week
    matchups: protectedProcedure
      .input(z.object({
        leagueId: z.number(),
        week: z.number(),
        seasonYear: z.number(),
      }))
      .query(async ({ input }) => {
        const { getMatchupsByWeek } = await import('./leagueDb');
        return await getMatchupsByWeek(input.leagueId, input.week, input.seasonYear);
      }),

    // Get all matchups for a league
    allMatchups: protectedProcedure
      .input(z.object({ leagueId: z.number() }))
      .query(async ({ input }) => {
        const { getAllMatchupsByLeague } = await import('./leagueDb');
        return await getAllMatchupsByLeague(input.leagueId);
      }),

    // Get recent transactions
    transactions: protectedProcedure
      .input(z.object({
        leagueId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const { getRecentTransactions } = await import('./leagueDb');
        return await getRecentTransactions(input.leagueId, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
