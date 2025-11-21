import { useState, useEffect } from "react";
import { fetchPages, fetchPersonas, runPersonaGeoTest, fetchPage, type Page, type Persona } from "@/services/geoService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, User, Target, TrendingUp, AlertCircle, CheckCircle2, Lightbulb, Download } from "lucide-react";

export default function PersonaGeoTest() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // For URL input
  const [url, setUrl] = useState("");
  const [fetchingPage, setFetchingPage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [personasData, pagesData] = await Promise.all([
        fetchPersonas(),
        fetchPages()
      ]);
      setPersonas(personasData);
      setPages(pagesData);
    } catch (error) {
      toast.error("Failed to load data");
    }
  };

  const handleFetchPage = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setFetchingPage(true);
    try {
      const fetchedPage = await fetchPage(url);
      setSelectedPage(fetchedPage);
      toast.success("Page fetched successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch page");
      console.error(error);
    } finally {
      setFetchingPage(false);
    }
  };

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  const handleRunTest = async () => {
    if (!selectedPersonaId || !selectedPage) {
      toast.error("Please select both a persona and a page");
      return;
    }

    setLoading(true);
    try {
      const result = await runPersonaGeoTest(selectedPersonaId, selectedPage.id, numQuestions);
      setResults(result);
      toast.success("Persona GEO test completed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run test");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "default";
    if (score >= 0.4) return "secondary";
    return "destructive";
  };

  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Persona GEO Test</h1>
        <p className="text-muted-foreground">
          Test how well pages serve specific user personas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Select a persona and page to test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="url">BNP Paribas Page URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://www.bnpparibas.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={fetchingPage || selectedPage !== null}
                />
                <Button 
                  onClick={handleFetchPage} 
                  disabled={fetchingPage || !url.trim() || selectedPage !== null}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Fetch
                </Button>
              </div>

              {selectedPage && (
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1 mt-4">
                  <p><strong>Selected:</strong> {selectedPage.title}</p>
                  <p><strong>URL:</strong> {selectedPage.url}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPage(null);
                      setUrl("");
                    }}
                  >
                    Change Page
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
            />
          </div>

          <Button onClick={handleRunTest} disabled={loading || !selectedPersonaId || !selectedPage} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Persona GEO Test...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Run Persona GEO Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Persona Questions Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.questions.map((question: string, idx: number) => (
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
                  {results.individual_results.map((result: any, idx: number) => (
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
                  <div className="text-2xl font-bold">{formatScore(results.aggregated.avg_geo_score)}</div>
                  <div className="text-sm text-muted-foreground">Avg GEO Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(results.aggregated.avg_relevance)}</div>
                  <div className="text-sm text-muted-foreground">Relevance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(results.aggregated.avg_comprehension)}</div>
                  <div className="text-sm text-muted-foreground">Comprehension</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(results.aggregated.avg_visibility)}</div>
                  <div className="text-sm text-muted-foreground">Visibility</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(results.aggregated.avg_recommendation)}</div>
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
                    {results.aggregated.persona_strengths.map((strength: string, idx: number) => (
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
                    {results.aggregated.persona_weaknesses.map((weakness: string, idx: number) => (
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
                    {results.aggregated.persona_opportunities.map((opportunity: string, idx: number) => (
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
                    {results.aggregated.persona_recommendations.map((rec: string, idx: number) => (
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
        </>
      )}

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
    </div>
  );
}
