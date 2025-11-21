import { useState, useEffect } from "react";
import { fetchPages, fetchPersonas, rewritePageWithContext, fetchLatestRecommendations, fetchPersonaAggregatedResults, type Page, type Persona, type RewriteResult } from "@/services/geoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader } from "@/components/Loader";
import { toast } from "sonner";
import { DiffViewer } from "@/components/DiffViewer";
import { Download, FileText, Copy, Target, User, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function PageRewriter() {
  const [pages, setPages] = useState<Page[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [mode, setMode] = useState<"general" | "persona">("general");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [showQualityPanel, setShowQualityPanel] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pagesData, personasData] = await Promise.all([
        fetchPages(),
        fetchPersonas(),
      ]);
      setPages(pagesData);
      setPersonas(personasData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    }
  };

  const selectedPage = pages.find(p => p.id === selectedPageId);
  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  const handleLoadRecommendations = async () => {
    if (!selectedPageId) {
      toast.error("Please select a page first");
      return;
    }

    try {
      if (mode === "general") {
        const recs = await fetchLatestRecommendations(selectedPageId);
        setRecommendations(recs);
        if (recs.length === 0) {
          toast.info("No recommendations found. Run a GEO test first.");
        } else {
          toast.success(`Loaded ${recs.length} recommendations`);
        }
      } else {
        if (!selectedPersonaId) {
          toast.error("Please select a persona");
          return;
        }
        const data = await fetchPersonaAggregatedResults(selectedPersonaId, selectedPageId);
        if (data) {
          setRecommendations(data.allRecommendations);
          toast.success(`Loaded ${data.allRecommendations.length} persona recommendations`);
        } else {
          toast.info("No persona test results found. Run a persona test first.");
          setRecommendations([]);
        }
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      toast.error("Failed to load recommendations");
    }
  };

  const handleRewrite = async () => {
    if (!selectedPageId) {
      toast.error("Please select a page");
      return;
    }

    if (mode === "persona" && !selectedPersonaId) {
      toast.error("Please select a persona");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const rewriteResult = await rewritePageWithContext({
        pageId: selectedPageId,
        personaId: mode === "persona" ? selectedPersonaId : null,
        recommendations,
        mode,
      });
      setResult(rewriteResult);
      toast.success("Page rewritten successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to rewrite page");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportHtml = () => {
    if (!result) return;
    const blob = new Blob([result.new_page_html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rewritten-${selectedPage?.title || "page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML exported");
  };

  const handleOpenInNewTab = () => {
    if (!result) return;

    const newWindow = window.open("", "_blank");
    if (!newWindow) {
      toast.error("Please allow pop-ups to open the rewritten page.");
      return;
    }

    const getBaseHref = () => {
      try {
        const url = new URL(result.page_url);
        return `${url.origin}/`;
      } catch {
        return "";
      }
    };

    const baseHref = getBaseHref();
    let html = result.new_page_html || "";

    if (baseHref) {
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(
          /<head([^>]*)>/i,
          `<head$1><base href="${baseHref}" />`
        );
      } else {
        html = `<head><base href="${baseHref}" /></head>${html}`;
      }
    }

    const docHtml = /^<!doctype html/i.test(html) ? html : `<!DOCTYPE html>${html}`;

    newWindow.document.open();
    newWindow.document.write(docHtml);
    newWindow.document.close();
  };

  const handleCopyOutline = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.new_page_outline);
    toast.success("Outline copied to clipboard");
  };

  const handleCopyRationale = () => {
    if (!result) return;
    const text = `GEO Rationale:\n${result.geo_rationale}\n\n${result.persona_rationale ? `Persona Rationale:\n${result.persona_rationale}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Rationale copied to clipboard");
  };

  const handleNewRewrite = () => {
    setResult(null);
    setRecommendations([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Page Rewriter (GEO Optimized)</h1>
        <p className="text-muted-foreground mt-1">
          Rewrite pages using GEO recommendations and persona insights
        </p>
      </div>

      {!result ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>1. Select Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Choose a page to rewrite</Label>
                <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title} - {page.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPage && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>URL:</strong> {selectedPage.url}
                  </p>
                  <p className="text-sm">
                    <strong>Title:</strong> {selectedPage.title}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Choose Rewrite Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={mode === "general" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => setMode("general")}
                >
                  <Target className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">General GEO Rewrite</div>
                    <div className="text-xs opacity-80">Based on GEO framework</div>
                  </div>
                </Button>
                <Button
                  variant={mode === "persona" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => setMode("persona")}
                >
                  <User className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Persona GEO Rewrite</div>
                    <div className="text-xs opacity-80">Tailored for specific persona</div>
                  </div>
                </Button>
              </div>

              {mode === "persona" && (
                <div className="space-y-2 mt-4">
                  <Label>Select Persona</Label>
                  <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPersona && (
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <p><strong>Description:</strong> {selectedPersona.description}</p>
                      <p><strong>Goal:</strong> {selectedPersona.goal}</p>
                      <p><strong>Risk Profile:</strong> {selectedPersona.risk_profile}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Load Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleLoadRecommendations} disabled={!selectedPageId}>
                <FileText className="mr-2 h-4 w-4" />
                Load {mode === "persona" ? "Persona" : "Latest"} Recommendations
              </Button>

              {recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Loaded Recommendations:</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((rec, idx) => (
                      <Badge key={idx} variant="secondary">{rec}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Run Rewrite</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRewrite}
                disabled={loading || !selectedPageId || (mode === "persona" && !selectedPersonaId)}
                size="lg"
                className="w-full"
              >
                {loading ? "Rewriting..." : "Rewrite Page According to GEO Recommendations"}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Rewrite Results</h2>
            <div className="flex gap-2">
              <Button onClick={handleOpenInNewTab} variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Rewritten Page
              </Button>
              <Button onClick={handleExportHtml} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export HTML
              </Button>
              <Button onClick={handleNewRewrite}>
                New Rewrite
              </Button>
            </div>
          </div>

          {result.quality_check && (
            <Card className={`border-2 ${
              result.quality_check.passes_validation 
                ? 'border-primary' 
                : result.quality_check.quality_score > 0.6 
                  ? 'border-yellow-500' 
                  : 'border-destructive'
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {result.quality_check.passes_validation ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    Quality Check Results
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge variant={result.quality_check.passes_validation ? "default" : "secondary"}>
                      Quality Score: {Math.round(result.quality_check.quality_score * 100)}%
                    </Badge>
                    <Button
                      onClick={() => setShowQualityPanel(!showQualityPanel)}
                      variant="ghost"
                      size="sm"
                    >
                      {showQualityPanel ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showQualityPanel && (
                <CardContent className="space-y-4">
                  {result.quality_check.structural_issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        Structural Issues
                      </h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {result.quality_check.structural_issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.quality_check.compliance_issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Compliance Issues
                      </h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {result.quality_check.compliance_issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.quality_check.accuracy_issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        Accuracy Issues
                      </h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {result.quality_check.accuracy_issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.quality_check.hallucination_risks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Hallucination Risks
                      </h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {result.quality_check.hallucination_risks.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.quality_check.recommended_fixes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Recommended Fixes
                      </h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {result.quality_check.recommended_fixes.map((fix, idx) => (
                          <li key={idx}>{fix}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.quality_check.passes_validation && 
                   result.quality_check.structural_issues.length === 0 &&
                   result.quality_check.compliance_issues.length === 0 &&
                   result.quality_check.accuracy_issues.length === 0 &&
                   result.quality_check.hallucination_risks.length === 0 && (
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <p className="text-sm font-medium">
                        All quality checks passed! This rewrite meets GEO Master Quality Framework standards.
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          <DiffViewer
            originalHtml={result.original_page_html}
            rewrittenHtml={result.new_page_html}
            pageUrl={result.page_url}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>New Page Outline</CardTitle>
                  <Button onClick={handleCopyOutline} variant="ghost" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {result.new_page_outline}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Rationale</CardTitle>
                  <Button onClick={handleCopyRationale} variant="ghost" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">GEO Rationale</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {result.geo_rationale}
                  </p>
                </div>

                {result.persona_rationale && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Persona Rationale</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {result.persona_rationale}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <Loader text="Rewriting page with GEO optimizations... This may take 30-60 seconds..." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
