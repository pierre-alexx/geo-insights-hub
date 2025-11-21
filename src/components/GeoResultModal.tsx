import { GeoResult, PersonaResult } from "@/services/geoService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface GeoResultModalProps {
  result: GeoResult | PersonaResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "general" | "persona";
}

export function GeoResultModal({ result, open, onOpenChange, type }: GeoResultModalProps) {
  if (!result) return null;

  const isGeneral = type === "general";
  const gr = result as GeoResult;
  const pr = result as PersonaResult;

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  const getScoreVariant = (score: number) => {
    if (score >= 0.7) return "default" as const;
    if (score >= 0.4) return "secondary" as const;
    return "destructive" as const;
  };

  const globalScore = isGeneral ? gr.globalGeoScore : pr.global_geo_score;
  const relevance = isGeneral ? gr.relevanceScore : pr.relevance_score;
  const comprehension = isGeneral ? gr.comprehensionScore : pr.comprehension_score;
  const visibility = isGeneral ? gr.visibilityScore : pr.visibility_score;
  const recommendation = isGeneral ? gr.recommendationScore : pr.recommendation_score;
  const llmResponse = isGeneral ? gr.llmResponse : pr.llm_response;
  const recommendations = result.recommendations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isGeneral ? "Page GEO Test Result" : "Persona Test Result"}
          </DialogTitle>
          <DialogDescription>
            {new Date(result.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isGeneral && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground">Page</h3>
                <p className="text-sm text-muted-foreground">{gr.pageTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">{gr.pageUrl}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground">Prompt Type</h3>
                <Badge variant="outline">{gr.promptType}</Badge>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-foreground">Prompt Text</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {gr.promptText}
                </p>
              </div>
            </>
          )}

          {!isGeneral && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Question</h3>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {pr.prompt}
              </p>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">LLM Raw Answer</h3>
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md whitespace-pre-wrap max-h-40 overflow-y-auto">
              {llmResponse}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">GEO Scores</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Global GEO Score</p>
                <Badge variant={getScoreVariant(globalScore)} className="text-base">
                  {formatScore(globalScore)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Relevance</p>
                <Badge variant={getScoreVariant(relevance)} className="text-base">
                  {formatScore(relevance)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Comprehension</p>
                <Badge variant={getScoreVariant(comprehension)} className="text-base">
                  {formatScore(comprehension)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Visibility</p>
                <Badge variant={getScoreVariant(visibility)} className="text-base">
                  {formatScore(visibility)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                <Badge variant={getScoreVariant(recommendation)} className="text-base">
                  {formatScore(recommendation)}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Recommendations</h3>
            <ul className="space-y-2">
              {Array.isArray(recommendations) && recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
