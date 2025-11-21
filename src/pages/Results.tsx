import { useEffect, useState } from "react";
import { fetchAllResults, GeoResult, fetchPersonaResults, PersonaResult, fetchPersonas, fetchPages, fetchAllRewrites } from "@/services/geoService";
import { ResultsTable } from "@/components/ResultsTable";
import { PersonaResultsTable } from "@/components/PersonaResultsTable";
import { GeoResultModal } from "@/components/GeoResultModal";
import { DiffViewer } from "@/components/DiffViewer";
import { Loader } from "@/components/Loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export default function Results() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [personaResults, setPersonaResults] = useState<PersonaResult[]>([]);
  const [groupedPersonaResults, setGroupedPersonaResults] = useState<any[]>([]);
  const [rewrites, setRewrites] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeoResult | PersonaResult | null>(null);
  const [selectedPersonaGroup, setSelectedPersonaGroup] = useState<any>(null);
  const [selectedRewrite, setSelectedRewrite] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [personaGroupModalOpen, setPersonaGroupModalOpen] = useState(false);
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [resultType, setResultType] = useState<"general" | "persona">("general");

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    const [generalData, personaData, personas, pages, rewritesData] = await Promise.all([
      fetchAllResults(),
      fetchPersonaResults(""),
      fetchPersonas(),
      fetchPages(),
      fetchAllRewrites()
    ]);
    setResults(generalData);
    setPersonaResults(personaData);
    setRewrites(rewritesData);
    
    // Group persona results by persona_id + page_id
    const grouped = personaData.reduce((acc: any, result: PersonaResult) => {
      const key = `${result.persona_id}-${result.page_id}`;
      if (!acc[key]) {
        acc[key] = {
          persona_id: result.persona_id,
          page_id: result.page_id,
          persona_name: personas.find(p => p.id === result.persona_id)?.name || "Unknown Persona",
          page_title: pages.find(p => p.id === result.page_id)?.title || "Unknown Page",
          results: [],
          timestamp: result.timestamp
        };
      }
      acc[key].results.push(result);
      // Keep the most recent timestamp
      if (new Date(result.timestamp) > new Date(acc[key].timestamp)) {
        acc[key].timestamp = result.timestamp;
      }
      return acc;
    }, {});

    // Convert to array and calculate aggregate scores
    const groupedArray = Object.values(grouped).map((group: any) => {
      const results = group.results;
      const avgScores = {
        global_geo_score: results.reduce((sum: number, r: PersonaResult) => sum + r.global_geo_score, 0) / results.length,
        relevance_score: results.reduce((sum: number, r: PersonaResult) => sum + r.relevance_score, 0) / results.length,
        comprehension_score: results.reduce((sum: number, r: PersonaResult) => sum + r.comprehension_score, 0) / results.length,
        visibility_score: results.reduce((sum: number, r: PersonaResult) => sum + r.visibility_score, 0) / results.length,
        recommendation_score: results.reduce((sum: number, r: PersonaResult) => sum + r.recommendation_score, 0) / results.length,
      };
      return {
        ...group,
        ...avgScores,
        num_questions: results.length
      };
    });

    setGroupedPersonaResults(groupedArray);
    setLoading(false);
  };

  const handleViewDetails = (result: GeoResult | PersonaResult) => {
    setSelectedResult(result);
    setResultType("pageUrl" in result ? "general" : "persona");
    setModalOpen(true);
  };

  const handleViewPersonaGroup = (group: any) => {
    setSelectedPersonaGroup(group);
    setPersonaGroupModalOpen(true);
  };

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;
  
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "default";
    if (score >= 0.4) return "secondary";
    return "destructive";
  };

  if (loading) {
    return <Loader text="Loading results..." />;
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Test Results</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View and analyze all GEO test results
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="general">General Tests</TabsTrigger>
          <TabsTrigger value="persona">Persona Tests</TabsTrigger>
          <TabsTrigger value="rewrites">Rewrites</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <ResultsTable results={results} onViewDetails={handleViewDetails} type="general" />
        </TabsContent>
        <TabsContent value="persona" className="mt-6">
          <PersonaResultsTable results={groupedPersonaResults} onViewDetails={handleViewPersonaGroup} />
        </TabsContent>
        <TabsContent value="rewrites" className="mt-6">
          <div className="space-y-4">
            {rewrites.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No rewrites yet</p>
                </CardContent>
              </Card>
            ) : (
              rewrites.map((rewrite) => (
                <Card key={rewrite.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => {
                  setSelectedRewrite(rewrite);
                  setRewriteModalOpen(true);
                }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{rewrite.pageTitle}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <ExternalLink className="h-3 w-3" />
                          {rewrite.pageUrl}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {new Date(rewrite.timestamp).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {rewrite.summary}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <GeoResultModal
        result={selectedResult}
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={resultType}
      />

      <Dialog open={personaGroupModalOpen} onOpenChange={setPersonaGroupModalOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Persona Test Details</DialogTitle>
            <DialogDescription>
              {selectedPersonaGroup && (
                <>
                  {selectedPersonaGroup.persona_name} • {selectedPersonaGroup.page_title}
                  <br />
                  {new Date(selectedPersonaGroup.timestamp).toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPersonaGroup && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(selectedPersonaGroup.global_geo_score)}</div>
                  <div className="text-sm text-muted-foreground">Avg GEO Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(selectedPersonaGroup.relevance_score)}</div>
                  <div className="text-sm text-muted-foreground">Relevance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(selectedPersonaGroup.comprehension_score)}</div>
                  <div className="text-sm text-muted-foreground">Comprehension</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(selectedPersonaGroup.visibility_score)}</div>
                  <div className="text-sm text-muted-foreground">Visibility</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatScore(selectedPersonaGroup.recommendation_score)}</div>
                  <div className="text-sm text-muted-foreground">Recommendation</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Individual Questions</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Relevance</TableHead>
                      <TableHead>Comprehension</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Global</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPersonaGroup.results.map((result: PersonaResult, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{result.prompt}</div>
                        </TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rewriteModalOpen} onOpenChange={setRewriteModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rewrite Details</DialogTitle>
            <DialogDescription>
              {selectedRewrite && (
                <>
                  {selectedRewrite.pageTitle}
                  <br />
                  {new Date(selectedRewrite.timestamp).toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRewrite && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground">{selectedRewrite.summary}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">GEO Rationale</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                  {selectedRewrite.geoRationale}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">HTML Comparison</h3>
                <DiffViewer
                  originalHtml={selectedRewrite.originalHtml}
                  rewrittenHtml={selectedRewrite.rewrittenHtml}
                  pageUrl={selectedRewrite.pageUrl}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
