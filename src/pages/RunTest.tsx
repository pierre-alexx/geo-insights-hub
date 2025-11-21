import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPage, runPageGeoTest, GeoResult, Page, createPageManually } from "@/services/geoService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/Loader";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlayCircle, ExternalLink, Copy, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const promptTypes = [
  "Informational",
  "Transactional",
  "Navigational",
  "Comparative",
  "Creative"
];

export default function RunTest() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [fetchingPage, setFetchingPage] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const [promptType, setPromptType] = useState("");
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoResult | null>(null);
  
  // Manual input state
  const [manualUrl, setManualUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualHtml, setManualHtml] = useState("");
  const [creatingManually, setCreatingManually] = useState(false);

  const handleFetchPage = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setFetchingPage(true);
    try {
      const fetchedPage = await fetchPage(url);
      setPage(fetchedPage);
      toast.success("Page fetched successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch page");
      console.error(error);
    } finally {
      setFetchingPage(false);
    }
  };

  const handleRunTest = async () => {
    if (!page) {
      toast.error("Please fetch a page first");
      return;
    }
    if (!promptType || !promptText.trim()) {
      toast.error("Please select a prompt type and enter prompt text");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const testResult = await runPageGeoTest(page.id, promptType, promptText);
      setResult(testResult);
      toast.success("Page GEO test completed and saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to run GEO test");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManually = async () => {
    if (!manualUrl.trim() || !manualTitle.trim() || !manualHtml.trim()) {
      toast.error("Please fill in all fields (URL, Title, and HTML)");
      return;
    }

    setCreatingManually(true);
    try {
      const createdPage = await createPageManually(manualUrl, manualTitle, manualHtml);
      setPage(createdPage);
      toast.success("Page created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create page");
      console.error(error);
    } finally {
      setCreatingManually(false);
    }
  };

  const handleNewTest = () => {
    setUrl("");
    setPage(null);
    setPromptType("");
    setPromptText("");
    setResult(null);
    setManualUrl("");
    setManualTitle("");
    setManualHtml("");
  };

  const handleCopyAnswer = () => {
    if (result) {
      navigator.clipboard.writeText(result.llmResponse);
      toast.success("Answer copied to clipboard");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "default";
    if (score >= 0.4) return "secondary";
    return "destructive";
  };

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Run Page GEO Test</h1>
        <p className="text-muted-foreground mt-1">
          Evaluate how well LLMs understand and use specific BNP pages
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">1. Load Page</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fetch">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fetch">Fetch from URL</TabsTrigger>
              <TabsTrigger value="manual">Manual Input</TabsTrigger>
            </TabsList>
            
            <TabsContent value="fetch" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="url">BNP Paribas Page URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://www.bnpparibas.com/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={fetchingPage || page !== null}
                  />
                  <Button 
                    onClick={handleFetchPage} 
                    disabled={fetchingPage || !url.trim() || page !== null}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Fetch
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="manual-url">Page URL</Label>
                <Input
                  id="manual-url"
                  placeholder="https://group.bnpparibas/..."
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  disabled={creatingManually || page !== null}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-title">Page Title</Label>
                <Input
                  id="manual-title"
                  placeholder="Enter page title"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  disabled={creatingManually || page !== null}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-html">HTML Content</Label>
                <Textarea
                  id="manual-html"
                  placeholder="Paste the full HTML content here..."
                  value={manualHtml}
                  onChange={(e) => setManualHtml(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                  disabled={creatingManually || page !== null}
                />
              </div>

              <Button 
                onClick={handleCreateManually} 
                disabled={creatingManually || !manualUrl.trim() || !manualTitle.trim() || !manualHtml.trim() || page !== null}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Page from Manual Input
              </Button>
            </TabsContent>
          </Tabs>

          {page && (
            <div className="bg-muted p-4 rounded-md mt-4">
              <h3 className="font-semibold text-sm mb-2">Page Loaded:</h3>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-medium">Title:</span> {page.title}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">URL:</span> {page.url}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {page && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">2. Configure Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-type">Prompt Type</Label>
              <Select value={promptType} onValueChange={setPromptType} disabled={loading}>
                <SelectTrigger id="prompt-type">
                  <SelectValue placeholder="Select prompt type" />
                </SelectTrigger>
                <SelectContent>
                  {promptTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-text">Prompt to Send to LLM</Label>
              <Textarea
                id="prompt-text"
                placeholder="Enter your prompt here..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={4}
                className="resize-none"
                disabled={loading}
              />
            </div>

            <Button 
              onClick={handleRunTest} 
              disabled={loading || !promptType || !promptText.trim()}
              className="w-full"
              size="lg"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Run Page GEO Test
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <Loader text="Running page GEO test... This may take 15-30 seconds..." />
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center justify-between flex-wrap gap-2">
              <span>Test Result</span>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/results")} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Results
                </Button>
                <Button onClick={handleNewTest}>
                  New Test
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Page Tested</h3>
              <p className="text-sm text-muted-foreground">{result.pageTitle}</p>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">LLM Raw Answer</h3>
                <Button onClick={handleCopyAnswer} variant="ghost" size="sm">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground max-h-60 overflow-y-auto">
                {result.llmResponse}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-4 text-foreground">GEO Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Global GEO Score</p>
                  <Badge variant={getScoreColor(result.globalGeoScore)} className="text-base px-3 py-1">
                    {formatScore(result.globalGeoScore)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Relevance</p>
                  <Badge variant={getScoreColor(result.relevanceScore)} className="text-base px-3 py-1">
                    {formatScore(result.relevanceScore)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Comprehension</p>
                  <Badge variant={getScoreColor(result.comprehensionScore)} className="text-base px-3 py-1">
                    {formatScore(result.comprehensionScore)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Visibility</p>
                  <Badge variant={getScoreColor(result.visibilityScore)} className="text-base px-3 py-1">
                    {formatScore(result.visibilityScore)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                  <Badge variant={getScoreColor(result.recommendationScore)} className="text-base px-3 py-1">
                    {formatScore(result.recommendationScore)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
