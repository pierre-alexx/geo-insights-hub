import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPageById, fetchPageResults, GeoResult } from "@/services/geoService";
import { Loader } from "@/components/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { GeoResultModal } from "@/components/GeoResultModal";

export default function PageDetail() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeoResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!pageId) return;
      setLoading(true);
      const [pageData, resultsData] = await Promise.all([
        fetchPageById(pageId),
        fetchPageResults(pageId)
      ]);
      setPage(pageData);
      setResults(resultsData);
      setLoading(false);
    }
    loadData();
  }, [pageId]);

  if (loading) {
    return <Loader text="Loading page details..." />;
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Page not found</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;
  const avgScore = results.length > 0 
    ? results.reduce((sum, r) => sum + r.globalGeoScore, 0) / results.length 
    : 0;

  const handleViewDetails = (result: GeoResult) => {
    setSelectedResult(result);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate("/")} variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Page Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1">Title</p>
            <p className="text-sm text-muted-foreground">{page.title}</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">URL</p>
            <a 
              href={page.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {page.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Last Fetched</p>
            <p className="text-sm text-muted-foreground">
              {new Date(page.fetch_timestamp).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Average GEO Score</p>
            <Badge variant="default" className="text-base">
              {formatScore(avgScore)}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {results.length} test{results.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {page.html_content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">HTML Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {page.html_content.substring(0, 1000)}...
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Test Results ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result) => (
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
                  <div className="ml-4 shrink-0 flex items-center gap-2">
                    <Badge variant="default">
                      {formatScore(result.globalGeoScore)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(result)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No test results yet for this page.
            </p>
          )}
        </CardContent>
      </Card>

      <GeoResultModal
        result={selectedResult}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
