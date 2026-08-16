import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";

export function ensureLeagueSetupAccess(
  commissionerUserId: number | null | undefined,
  userId: number
) {
  if (commissionerUserId && commissionerUserId !== userId) {
    throw new Error(
      "This league is already connected. Return to the dashboard, choose Join Team League, and enter the invite code from your commissioner."
    );
  }
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      // Clerk session is cleared on the client; server has no app cookie to clear.
      return { success: true } as const;
    }),
  }),

  // League management
  league: router({
    // Get all leagues
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getLeaguesForUser } = await import("./leagueDb");
      return await getLeaguesForUser(ctx.user.id);
    }),

    join: protectedProcedure
      .input(z.object({ inviteCode: z.string().trim().min(6).max(32) }))
      .mutation(async ({ input, ctx }) => {
        const { joinLeagueByInvite } = await import("./leagueAccess");
        return joinLeagueByInvite(input.inviteCode, ctx.user.id);
      }),

    assignMyTeam: protectedProcedure
      .input(z.object({ leagueId: z.number(), espnTeamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { assignMemberTeam } = await import("./leagueAccess");
        return assignMemberTeam(input.leagueId, ctx.user.id, input.espnTeamId);
      }),

    // Sync league data from ESPN
    sync: protectedProcedure
      .input(
        z.object({
          espnLeagueId: z.string(),
          seasonYear: z.number(),
          currentWeek: z.number().default(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { getLeagueByEspnId } = await import("./leagueDb");
        const { requireCommissioner, claimLeagueForCommissioner } =
          await import("./leagueAccess");
        const existing = await getLeagueByEspnId(input.espnLeagueId);
        ensureLeagueSetupAccess(existing?.commissionerUserId, ctx.user.id);
        if (existing?.commissionerUserId)
          await requireCommissioner(existing.id, ctx.user.id);
        const { fullLeagueSync } = await import("./espnSync");
        const result = await fullLeagueSync(
          input.espnLeagueId,
          input.seasonYear,
          input.currentWeek
        );
        // Claim whenever a league row exists for this user, even after a
        // partial sync failure — an unclaimed league with no members would
        // otherwise block every league endpoint until a full sync succeeds.
        const league = await getLeagueByEspnId(input.espnLeagueId);
        if (
          league &&
          (!league.commissionerUserId ||
            league.commissionerUserId === ctx.user.id)
        ) {
          await claimLeagueForCommissioner(league.id, ctx.user.id);
        }
        return result;
      }),

    // Sync all historical seasons
    syncAllSeasons: protectedProcedure
      .input(
        z.object({
          espnLeagueId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { getLeagueByEspnId } = await import("./leagueDb");
        const { requireCommissioner, claimLeagueForCommissioner } =
          await import("./leagueAccess");
        const existing = await getLeagueByEspnId(input.espnLeagueId);
        ensureLeagueSetupAccess(existing?.commissionerUserId, ctx.user.id);
        if (existing?.commissionerUserId)
          await requireCommissioner(existing.id, ctx.user.id);
        const { syncAllSeasons } = await import("./espnMultiSeasonSync");
        const result = await syncAllSeasons(input.espnLeagueId);
        const league = await getLeagueByEspnId(input.espnLeagueId);
        if (
          league &&
          (!league.commissionerUserId ||
            league.commissionerUserId === ctx.user.id)
        ) {
          await claimLeagueForCommissioner(league.id, ctx.user.id);
        }
        return result;
      }),

    // Import sanitized standings exported from an authenticated ESPN History
    // page. Passwords and ESPN session cookies are never included.
    importHistoryFile: protectedProcedure
      .input(
        z.object({
          leagueId: z.string().trim().min(1).max(64),
          source: z.string().trim().max(64).optional(),
          standingsComplete: z.boolean().optional(),
          matchupsComplete: z.boolean().optional(),
          seasons: z
            .array(
              z.object({
                year: z.number().int().min(2000).max(2100),
                champion: z.string().trim().max(200).nullable().optional(),
                runnerUp: z.string().trim().max(200).nullable().optional(),
                thirdPlace: z.string().trim().max(200).nullable().optional(),
                teams: z
                  .array(
                    z.object({
                      rank: z.number().int().min(1).max(32),
                      teamName: z.string().trim().min(1).max(200),
                      wins: z.number().int().min(0).max(30),
                      losses: z.number().int().min(0).max(30),
                      ties: z.number().int().min(0).max(30).optional(),
                      ownerNames: z
                        .array(z.string().trim().min(1).max(120))
                        .max(6)
                        .optional(),
                      franchiseKey: z.string().trim().max(120).optional(),
                    })
                  )
                  .min(2)
                  .max(32),
              })
            )
            .min(1)
            .max(20),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { getLeagueByEspnId } = await import("./leagueDb");
        const { requireCommissioner } = await import("./leagueAccess");
        const league = await getLeagueByEspnId(input.leagueId);
        if (!league) throw new Error("League not found");
        await requireCommissioner(league.id, ctx.user.id);
        const { importManualHistory } = await import("./manualHistoryImport");
        return importManualHistory(input);
      }),

    historicalOwnership: protectedProcedure
      .input(z.object({ leagueId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const { requireCommissioner } = await import("./leagueAccess");
        await requireCommissioner(input.leagueId, ctx.user.id);
        const { getHistoricalOwnershipRows } = await import(
          "./manualHistoryImport"
        );
        return getHistoricalOwnershipRows(input.leagueId);
      }),

    updateHistoricalOwnership: protectedProcedure
      .input(
        z.object({
          leagueId: z.number().int().positive(),
          assignments: z
            .array(
              z.object({
                teamId: z.number().int().positive(),
                ownerNames: z.array(z.string().trim().min(1).max(120)).max(6),
                franchiseKey: z.string().trim().min(1).max(120),
              })
            )
            .min(1)
            .max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { requireCommissioner } = await import("./leagueAccess");
        await requireCommissioner(input.leagueId, ctx.user.id);
        const { updateHistoricalOwnership } = await import(
          "./manualHistoryImport"
        );
        return updateHistoricalOwnership(input.leagueId, input.assignments);
      }),

    availablePlayers: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          position: z.string().optional(),
          limit: z.number().min(1).max(300).default(100),
        })
      )
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        const { getAvailablePlayers } = await import("./leagueDb");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        return getAvailablePlayers(input.leagueId, input.limit, input.position);
      }),

    weekOutlook: protectedProcedure
      .input(z.object({ leagueId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess, getLeagueMembership } = await import(
          "./leagueAccess"
        );
        const { getLeagueById, getRosterForTeamWeek } = await import(
          "./leagueDb"
        );
        const { getNFLWeekOutlook } = await import("./weather");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const league = await getLeagueById(input.leagueId);
        if (!league) throw new Error("League not found");

        const week = Math.max(1, league.currentWeek || 1);
        const games = await getNFLWeekOutlook(league.seasonYear, week);

        // Annotate each NFL game with the viewer's own players, so the page
        // can lead with the games that actually affect their lineup.
        const membership = await getLeagueMembership(
          input.leagueId,
          ctx.user.id
        );
        const roster = membership?.espnTeamId
          ? await getRosterForTeamWeek(
              input.leagueId,
              league.seasonYear,
              week,
              membership.espnTeamId
            )
          : [];

        return {
          week,
          hasRoster: roster.length > 0,
          rosterWeek: roster[0]?.week ?? null,
          games: games.map(game => ({
            ...game,
            myPlayers: roster.filter(
              p =>
                p.nflTeam &&
                (p.nflTeam === game.homeTeam || p.nflTeam === game.awayTeam)
            ),
          })),
        };
      }),

    // Get teams for a league
    teams: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          seasonYear: z.number().optional(),
          espnLeagueId: z.string().optional(),
          allTime: z.boolean().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const {
          getTeamsByLeague,
          getTeamsByLeagueAndSeason,
          getTeamsByEspnLeagueAllTime,
        } = await import("./leagueDb");

        // All-time mode: aggregate across all seasons
        if (input.allTime && input.espnLeagueId) {
          return await getTeamsByEspnLeagueAllTime(input.espnLeagueId);
        }

        // Single season mode
        if (input.seasonYear) {
          return await getTeamsByLeagueAndSeason(
            input.leagueId,
            input.seasonYear
          );
        }

        // Default: all teams for league
        return await getTeamsByLeague(input.leagueId);
      }),

    // Get matchups for a specific week
    matchups: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          week: z.number(),
          seasonYear: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const { getMatchupsByWeek } = await import("./leagueDb");
        return await getMatchupsByWeek(
          input.leagueId,
          input.week,
          input.seasonYear
        );
      }),

    // Get all matchups for a league
    allMatchups: protectedProcedure
      .input(z.object({ leagueId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const { getAllMatchupsByLeague } = await import("./leagueDb");
        return await getAllMatchupsByLeague(input.leagueId);
      }),

    // Get recent transactions
    transactions: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          limit: z.number().default(50),
        })
      )
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const { getRecentTransactions } = await import("./leagueDb");
        return await getRecentTransactions(input.leagueId, input.limit);
      }),

    // Delete a league
    delete: protectedProcedure
      .input(z.object({ leagueId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { requireCommissioner } = await import("./leagueAccess");
        await requireCommissioner(input.leagueId, ctx.user.id);
        const { deleteLeague } = await import("./leagueDb");
        return await deleteLeague(input.leagueId);
      }),

    // Rename a league
    rename: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          newName: z.string().min(1).max(255),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { requireCommissioner } = await import("./leagueAccess");
        await requireCommissioner(input.leagueId, ctx.user.id);
        const { renameLeague } = await import("./leagueDb");
        return await renameLeague(input.leagueId, input.newName);
      }),

    // AI-powered data query
    aiQuery: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          question: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const { answerLeagueQuestion } = await import("./aiQuery");
        return await answerLeagueQuestion(input.leagueId, input.question);
      }),

    // Export league stats as markdown (for PDF conversion)
    exportStats: protectedProcedure
      .input(z.object({ leagueId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const { generateLeagueStatsMarkdown } = await import("./pdfExport");
        return await generateLeagueStatsMarkdown(input.leagueId);
      }),

    // Generate AI-powered weekly recap
    weeklyRecap: protectedProcedure
      .input(
        z.object({
          leagueId: z.number(),
          week: z.number(),
          seasonYear: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { requireLeagueAccess } = await import("./leagueAccess");
        await requireLeagueAccess(input.leagueId, ctx.user.id);
        const { generateWeeklyRecap } = await import("./weeklyRecap");
        return await generateWeeklyRecap(
          input.leagueId,
          input.week,
          input.seasonYear
        );
      }),

    // Get team history across all seasons
    teamHistory: protectedProcedure
      .input(
        z.object({
          espnTeamId: z.number(),
          espnLeagueId: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getTeamHistory, getLeagueByEspnId } = await import(
          "./leagueDb"
        );
        const { requireLeagueAccess } = await import("./leagueAccess");
        const league = await getLeagueByEspnId(input.espnLeagueId);
        if (!league) return [];
        await requireLeagueAccess(league.id, ctx.user.id);
        return await getTeamHistory(input.espnTeamId, input.espnLeagueId);
      }),

    // Get season summaries for all seasons
    seasonSummaries: protectedProcedure
      .input(
        z.object({
          espnLeagueId: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getSeasonSummaries, getLeagueByEspnId } = await import(
          "./leagueDb"
        );
        const { requireLeagueAccess } = await import("./leagueAccess");
        const league = await getLeagueByEspnId(input.espnLeagueId);
        if (!league) return [];
        await requireLeagueAccess(league.id, ctx.user.id);
        return await getSeasonSummaries(input.espnLeagueId);
      }),

    // All-play records: how much of a record was schedule rather than scoring
    allPlay: protectedProcedure
      .input(
        z.object({
          espnLeagueId: z.string(),
          seasonYear: z.number().int().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getLeagueByEspnId } = await import("./leagueDb");
        const { requireLeagueAccess } = await import("./leagueAccess");
        const league = await getLeagueByEspnId(input.espnLeagueId);
        if (!league) return [];
        await requireLeagueAccess(league.id, ctx.user.id);
        const { getAllPlayStandings, getSeasonAllPlay } = await import(
          "./allPlay"
        );
        return input.seasonYear
          ? getSeasonAllPlay(input.espnLeagueId, input.seasonYear)
          : getAllPlayStandings(input.espnLeagueId);
      }),

    // Get owner leaderboard with lifetime stats
    ownerLeaderboard: protectedProcedure
      .input(
        z.object({
          espnLeagueId: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { getOwnerLeaderboard, getLeagueByEspnId } = await import(
          "./leagueDb"
        );
        const { requireLeagueAccess } = await import("./leagueAccess");
        const league = await getLeagueByEspnId(input.espnLeagueId);
        if (!league) throw new Error("League not found");
        await requireLeagueAccess(league.id, ctx.user.id);
        return await getOwnerLeaderboard(input.espnLeagueId);
      }),
  }),

  // User/Dashboard statistics
  stats: router({
    // Get aggregate statistics across all leagues
    aggregateStats: protectedProcedure.query(async () => {
      const { getUserAggregateStats } = await import("./userStatsDb");
      return await getUserAggregateStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
