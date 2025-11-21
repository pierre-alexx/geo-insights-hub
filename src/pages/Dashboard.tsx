import { useEffect, useState } from "react";
import { fetchStats, fetchAllResults, GeoResult } from "@/services/geoService";
import { ScoreCard } from "@/components/ScoreCard";
import { ChartPresenceByType } from "@/components/ChartPresenceByType";
import { Loader } from "@/components/Loader";
import { Activity, TrendingUp, ThumbsUp, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentResults, setRecentResults] = useState<GeoResult[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [statsData, allResults] = await Promise.all([
        fetchStats(),
        fetchAllResults()
      ]);
      setStats(statsData);
      setRecentResults(allResults.slice(0, 10));
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">GEO Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor BNP Paribas presence in LLM responses
        </p>
      </div>

      {/* GEO Visibility Score - Hero Card */}
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">GEO Visibility Score</p>
              <div className="text-5xl font-bold">{stats.geoVisibilityScore}</div>
              <p className="text-sm opacity-75 mt-2">
                Computed from {recentResults.length} test results
              </p>
            </div>
            <Award className="h-20 w-20 opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard
          title="Average Presence Score"
          value={stats.avgPresenceScore.toFixed(2)}
          icon={Activity}
          description="Scale: 0 (absent) to 2 (prominent)"
        />
        <ScoreCard
          title="Average Sentiment"
          value={stats.avgSentiment > 0 ? `+${stats.avgSentiment.toFixed(2)}` : stats.avgSentiment.toFixed(2)}
          icon={TrendingUp}
          description="Scale: -1 (negative) to +1 (positive)"
        />
        <ScoreCard
          title="Recommendation Rate"
          value={`${stats.recommendationRate.toFixed(0)}%`}
          icon={ThumbsUp}
          description="% tests where BNP was recommended"
        />
      </div>

      {/* Chart */}
      <ChartPresenceByType data={stats.presenceByType} />

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Recent Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="shrink-0">
                      {result.promptType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground truncate">
                    {result.promptText}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  <Badge 
                    variant={
                      result.presenceScore === 2 
                        ? "default" 
                        : result.presenceScore === 1 
                        ? "secondary" 
                        : "destructive"
                    }
                  >
                    Score: {result.presenceScore}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
