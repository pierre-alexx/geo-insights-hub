import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPageStats, fetchPages, fetchRewriteStats, fetchIndexabilityStats } from "@/services/geoService";
import { ScoreCard } from "@/components/ScoreCard";
import { Loader } from "@/components/Loader";
import { Activity, TrendingUp, Eye, ThumbsUp, Award, Globe, Wand2, FileSearch, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [rewriteStats, setRewriteStats] = useState<any>(null);
  const [indexabilityStats, setIndexabilityStats] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<number>(0.85);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [statsData, pagesData, rewriteData, indexabilityData] = await Promise.all([
        fetchPageStats(),
        fetchPages(),
        fetchRewriteStats(),
        fetchIndexabilityStats()
      ]);
      setStats(statsData);
      setPages(pagesData);
      setRewriteStats(rewriteData);
      setIndexabilityStats(indexabilityData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  const chartData = stats.geoScoreByPage.slice(0, 10).map((page: any) => ({
    name: page.title.length > 30 ? page.title.substring(0, 30) + '...' : page.title,
    score: Math.round(page.avgScore * 100)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Page GEO Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor BNP Paribas page performance in LLM responses
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Average Global GEO Score</p>
              <div className="text-5xl font-bold">{formatScore(stats.avgGlobalGeoScore)}</div>
              <p className="text-sm opacity-75 mt-2">
                Across {pages.length} pages
              </p>
            </div>
            <Award className="h-20 w-20 opacity-20" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-6">
        <ScoreCard
          title="Relevance"
          value={formatScore(stats.avgRelevance)}
          icon={Activity}
          description="Does the LLM use page info?"
        />
        <ScoreCard
          title="Comprehension"
          value={formatScore(stats.avgComprehension)}
          icon={TrendingUp}
          description="Is the content understood?"
        />
        <ScoreCard
          title="Visibility"
          value={formatScore(stats.avgVisibility)}
          icon={Eye}
          description="Is the page cited?"
        />
        <ScoreCard
          title="Recommendation"
          value={formatScore(stats.avgRecommendation)}
          icon={ThumbsUp}
          description="Would the LLM recommend it?"
        />
        <ScoreCard
          title="Indexability"
          value={indexabilityStats ? formatScore(indexabilityStats.avgIndexability) : 'N/A'}
          icon={FileSearch}
          description="How LLM-friendly is the HTML?"
        />
        <ScoreCard
          title="Quality"
          value={formatScore(qualityScore)}
          icon={ShieldCheck}
          description="GEO Master Quality compliance"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Rewrite Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Wand2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{rewriteStats.rewrittenPages}</p>
                <p className="text-sm text-muted-foreground">Pages Rewritten</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{rewriteStats.totalPages}</p>
                <p className="text-sm text-muted-foreground">Total Pages</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{Math.round(rewriteStats.percentageRewritten)}%</p>
                <p className="text-sm text-muted-foreground">Coverage</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => navigate("/rewriter")} variant="outline">
              <Wand2 className="mr-2 h-4 w-4" />
              Open Rewriter
            </Button>
          </div>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">GEO Score by Page (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs text-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  className="text-xs text-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">All Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <div className="space-y-3">
              {pages.map((page) => {
                const pageStats = stats.geoScoreByPage.find((p: any) => p.pageId === page.id);
                return (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/page/${page.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {page.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {page.url}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last fetched: {new Date(page.fetch_timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-4 shrink-0">
                      {pageStats ? (
                        <div className="text-right">
                          <Badge variant="default" className="mb-1">
                            {formatScore(pageStats.avgScore)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {pageStats.testCount} test{pageStats.testCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="secondary">No tests</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No pages yet. Fetch your first page to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
