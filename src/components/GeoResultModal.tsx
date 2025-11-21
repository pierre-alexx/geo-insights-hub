import { GeoResult } from "@/services/geoService";
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
  result: GeoResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeoResultModal({ result, open, onOpenChange }: GeoResultModalProps) {
  if (!result) return null;

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  const getScoreVariant = (score: number) => {
    if (score >= 0.7) return "default" as const;
    if (score >= 0.4) return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Page GEO Test Result</DialogTitle>
          <DialogDescription>
            {new Date(result.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Page</h3>
            <p className="text-sm text-muted-foreground">{result.pageTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">{result.pageUrl}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Prompt Type</h3>
            <Badge variant="outline">{result.promptType}</Badge>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Prompt Text</h3>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {result.promptText}
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">LLM Raw Answer</h3>
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md whitespace-pre-wrap max-h-40 overflow-y-auto">
              {result.llmResponse}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">GEO Scores</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Global GEO Score</p>
                <Badge variant={getScoreVariant(result.globalGeoScore)} className="text-base">
                  {formatScore(result.globalGeoScore)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Relevance</p>
                <Badge variant={getScoreVariant(result.relevanceScore)} className="text-base">
                  {formatScore(result.relevanceScore)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Comprehension</p>
                <Badge variant={getScoreVariant(result.comprehensionScore)} className="text-base">
                  {formatScore(result.comprehensionScore)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Visibility</p>
                <Badge variant={getScoreVariant(result.visibilityScore)} className="text-base">
                  {formatScore(result.visibilityScore)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                <Badge variant={getScoreVariant(result.recommendationScore)} className="text-base">
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
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
