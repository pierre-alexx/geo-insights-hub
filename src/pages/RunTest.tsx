import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPage, runPageGeoTest, GeoResult, Page, createPageManually, fetchPersonas, runPersonaGeoTest, type Persona } from "@/services/geoService";
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
import { PlayCircle, ExternalLink, Copy, Download, FileText, Target, User, TrendingUp, AlertCircle, CheckCircle2, Lightbulb, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const promptTypes = [
  "Informational",
  "Transactional",
  "Navigational",
  "Comparative",
  "Creative"
];

export default function RunTest() {
  const navigate = useNavigate();
  const [testMode, setTestMode] = useState<"general" | "persona">("general");
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

  // Persona test state
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(6);
  const [personaResults, setPersonaResults] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      console.error("Failed to load personas:", error);
    }
  };

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

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
    if (testMode === "general") {
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
      setPersonaResults(null);
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
    } else {
      // Persona mode
      if (!selectedPersonaId || !page) {
        toast.error("Please select both a persona and a page");
        return;
      }

      setLoading(true);
      setResult(null);
      setPersonaResults(null);
      try {
        const testResult = await runPersonaGeoTest(selectedPersonaId, page.id, numQuestions);
        setPersonaResults(testResult);
        toast.success("Persona GEO test completed!");
      } catch (error: any) {
        toast.error(error.message || "Failed to run persona test");
        console.error(error);
      } finally {
        setLoading(false);
      }
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
    setPersonaResults(null);
    setManualUrl("");
    setManualTitle("");
    setManualHtml("");
    setSelectedPersonaId("");
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
        <h1 className="text-3xl font-bold text-foreground">Run GEO Test</h1>
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

      {page && !result && !personaResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">2. Select Test Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={testMode === "general" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => setTestMode("general")}
                >
                  <Target className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">General Test</div>
                    <div className="text-xs opacity-80">Custom prompt evaluation</div>
                  </div>
                </Button>
                <Button
                  variant={testMode === "persona" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => setTestMode("persona")}
                >
                  <User className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Persona Test</div>
                    <div className="text-xs opacity-80">User journey simulation</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">3. Configure Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {testMode === "general" ? (
              <>
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
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Persona</Label>
                  <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId} disabled={loading}>
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

                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                    disabled={loading}
                  />
                </div>

                <Button 
                  onClick={handleRunTest} 
                  disabled={loading || !selectedPersonaId}
                  className="w-full"
                  size="lg"
                >
                  <Target className="mr-2 h-5 w-5" />
                  Run Persona GEO Test
                </Button>
              </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <Loader text={testMode === "general" ? "Running page GEO test... This may take 15-30 seconds..." : "Running persona GEO test... This may take up to 2 minutes..."} />
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

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Next Step: Optimize Your Page</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use these recommendations to automatically rewrite your page for better GEO performance
              </p>
              <Button 
                onClick={() => navigate(`/rewriter?pageId=${page?.id}&mode=general`)}
                variant="default"
                size="lg"
                className="w-full"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Rewrite Page According to These Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {personaResults && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Persona Test Results
                </div>
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
            <CardContent>
              <div className="space-y-2">
                {personaResults.questions.map((question: string, idx: number) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <span className="font-medium text-sm">Q{idx + 1}:</span> {question}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Individual GEO Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Relevance</TableHead>
                    <TableHead>Comprehension</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Global Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personaResults.individual_results.map((result: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="max-w-xs truncate">{result.question}</TableCell>
                      <TableCell>
                        <Badge variant={getScoreColor(result.relevance_score)}>
                          {formatScore(result.relevance_score)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreColor(result.comprehension_score)}>
                          {formatScore(result.comprehension_score)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreColor(result.visibility_score)}>
                          {formatScore(result.visibility_score)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreColor(result.recommendation_score)}>
                          {formatScore(result.recommendation_score)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreColor(result.global_geo_score)}>
                          {formatScore(result.global_geo_score)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result);
                            setShowDetailModal(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Aggregated Persona Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(personaResults.aggregated.avg_geo_score)}</div>
                  <div className="text-sm text-muted-foreground">Avg GEO Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(personaResults.aggregated.avg_relevance)}</div>
                  <div className="text-sm text-muted-foreground">Relevance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(personaResults.aggregated.avg_comprehension)}</div>
                  <div className="text-sm text-muted-foreground">Comprehension</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(personaResults.aggregated.avg_visibility)}</div>
                  <div className="text-sm text-muted-foreground">Visibility</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(personaResults.aggregated.avg_recommendation)}</div>
                  <div className="text-sm text-muted-foreground">Recommendation</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Persona Strengths
                  </h3>
                  <div className="space-y-1">
                    {personaResults.aggregated.persona_strengths.map((strength: string, idx: number) => (
                      <Badge key={idx} variant="default" className="mr-2 mb-2">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Persona Weaknesses
                  </h3>
                  <div className="space-y-1">
                    {personaResults.aggregated.persona_weaknesses.map((weakness: string, idx: number) => (
                      <Badge key={idx} variant="destructive" className="mr-2 mb-2">
                        {weakness}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Persona Opportunities
                  </h3>
                  <div className="space-y-1">
                    {personaResults.aggregated.persona_opportunities.map((opportunity: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="mr-2 mb-2">
                        {opportunity}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    Recommendations
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {personaResults.aggregated.persona_recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Next Step: Optimize for This Persona</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use these persona insights to automatically rewrite your page
                </p>
                <Button 
                  onClick={() => navigate(`/rewriter?pageId=${page?.id}&personaId=${selectedPersonaId}&mode=persona`)}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  <Wand2 className="mr-2 h-5 w-5" />
                  Rewrite for This Persona
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Question Details</DialogTitle>
                <DialogDescription>LLM response and recommendations</DialogDescription>
              </DialogHeader>
              {selectedResult && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Question</h3>
                    <p className="text-sm">{selectedResult.question}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">LLM Response</h3>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedResult.llm_response}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="text-sm space-y-1">
                      {Array.isArray(selectedResult.recommendations) && selectedResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}