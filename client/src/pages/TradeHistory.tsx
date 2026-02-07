import { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Loader2, ArrowRightLeft, Calendar, Users, Sparkles, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function TradeHistory() {
  const { espnLeagueId } = useParams<{ espnLeagueId: string }>();
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [analyzingTradeId, setAnalyzingTradeId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  const analyzeTradeMutation = trpc.trades.analyze.useMutation();

  // Fetch trades
  const { data: trades, isLoading } = trpc.trades.byLeague.useQuery(
    { espnLeagueId: espnLeagueId! },
    { enabled: !!espnLeagueId && selectedSeason === 'all' }
  );

  const { data: seasonTrades, isLoading: isLoadingSeason } = trpc.trades.bySeason.useQuery(
    { espnLeagueId: espnLeagueId!, seasonYear: selectedSeason as number },
    { enabled: !!espnLeagueId && selectedSeason !== 'all' }
  );

  const displayTrades = selectedSeason === 'all' ? trades : seasonTrades;
  const loading = isLoading || isLoadingSeason;

  // Get unique seasons from trades
  const seasons = Array.from(
    new Set(trades?.map(t => t.seasonYear) || [])
  ).sort((a, b) => b - a);

  const handleAnalyzeTrade = async (trade: any) => {
    setAnalyzingTradeId(trade.id);
    try {
      const result = await analyzeTradeMutation.mutateAsync({
        tradeId: trade.id,
        leagueId: trade.leagueId,
        seasonYear: trade.seasonYear,
        week: trade.week || 1,
        team1Id: trade.team1Id,
        team1Name: trade.team1Name || 'Team 1',
        team2Id: trade.team2Id,
        team2Name: trade.team2Name || 'Team 2',
      });
      setAnalysisResult(result);
      setShowAnalysisDialog(true);
    } catch (error) {
      console.error('Trade analysis error:', error);
      alert('Could not analyze this trade. Please try again.');
    } finally {
      setAnalyzingTradeId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trade History</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View all trades and analyze their impact on team performance
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Season</label>
              <Select
                value={selectedSeason.toString()}
                onValueChange={(value) => setSelectedSeason(value === 'all' ? 'all' : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season} value={season.toString()}>
                      {season} Season
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Trades</CardDescription>
            <CardTitle className="text-3xl">{displayTrades?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Seasons Covered</CardDescription>
            <CardTitle className="text-3xl">{seasons.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Players Traded</CardDescription>
            <CardTitle className="text-3xl">
              {displayTrades?.reduce((sum, t) => sum + t.players.length, 0) || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Trade Timeline */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Trade Timeline
        </h2>

        {!displayTrades || displayTrades.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No trades found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedSeason === 'all'
                  ? 'No trades have been synced yet. Try syncing your league data.'
                  : `No trades were made during the ${selectedSeason} season.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayTrades.map((trade) => (
              <Card key={trade.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">
                        {format(new Date(trade.tradeDate), 'MMMM d, yyyy')}
                      </CardTitle>
                      <Badge variant="outline">{trade.seasonYear}</Badge>
                      {trade.week && <Badge variant="secondary">Week {trade.week}</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyzeTrade(trade)}
                      disabled={analyzingTradeId === trade.id}
                      className="w-full sm:w-auto"
                    >
                      {analyzingTradeId === trade.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze Trade
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team 1 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                          {trade.team1Name}
                        </h3>
                        <Badge variant="outline" className="ml-auto">Gave Up</Badge>
                      </div>
                      <div className="space-y-2">
                        {trade.players
                          .filter(p => p.fromEspnTeamId === trade.team1EspnId)
                          .map((player, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <span className="font-medium text-sm line-clamp-1">{player.playerName}</span>
                              {player.playerPosition && (
                                <Badge variant="secondary" className="ml-2 shrink-0">
                                  {player.playerPosition}
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                      <div className="pt-2 border-t">
                        <Badge variant="outline" className="mb-2">Received</Badge>
                        <div className="space-y-2">
                          {trade.players
                            .filter(p => p.toEspnTeamId === trade.team1EspnId)
                            .map((player, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-green-500/10"
                              >
                                <span className="font-medium text-sm line-clamp-1">{player.playerName}</span>
                                {player.playerPosition && (
                                  <Badge variant="secondary" className="ml-2 shrink-0">
                                    {player.playerPosition}
                                  </Badge>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                          {trade.team2Name}
                        </h3>
                        <Badge variant="outline" className="ml-auto">Gave Up</Badge>
                      </div>
                      <div className="space-y-2">
                        {trade.players
                          .filter(p => p.fromEspnTeamId === trade.team2EspnId)
                          .map((player, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <span className="font-medium text-sm line-clamp-1">{player.playerName}</span>
                              {player.playerPosition && (
                                <Badge variant="secondary" className="ml-2 shrink-0">
                                  {player.playerPosition}
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                      <div className="pt-2 border-t">
                        <Badge variant="outline" className="mb-2">Received</Badge>
                        <div className="space-y-2">
                          {trade.players
                            .filter(p => p.toEspnTeamId === trade.team2EspnId)
                            .map((player, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-green-500/10"
                              >
                                <span className="font-medium text-sm line-clamp-1">{player.playerName}</span>
                                {player.playerPosition && (
                                  <Badge variant="secondary" className="ml-2 shrink-0">
                                    {player.playerPosition}
                                  </Badge>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Trade Analysis
            </DialogTitle>
            <DialogDescription>
              AI-powered evaluation of this trade's impact
            </DialogDescription>
          </DialogHeader>
          {analysisResult && (
            <div className="space-y-4 pt-4">
              {/* Winner Badge */}
              {analysisResult.winner !== 'even' && (
                <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">
                    Trade Winner: {analysisResult.winnerName}
                  </span>
                </div>
              )}

              {/* AI Analysis Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {analysisResult.analysis}
                  </p>
                </CardContent>
              </Card>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Team 1 Post-Trade Points</CardDescription>
                    <CardTitle className="text-2xl">{analysisResult.team1Score}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Team 2 Post-Trade Points</CardDescription>
                    <CardTitle className="text-2xl">{analysisResult.team2Score}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
