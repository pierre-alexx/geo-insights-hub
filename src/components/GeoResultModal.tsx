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

  const getPresenceLabel = (score: number) => {
    if (score === 2) return { label: "High Presence", variant: "default" as const };
    if (score === 1) return { label: "Medium Presence", variant: "secondary" as const };
    return { label: "Low Presence", variant: "destructive" as const };
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return { label: "Positive", variant: "default" as const };
    if (score > -0.3) return { label: "Neutral", variant: "secondary" as const };
    return { label: "Negative", variant: "destructive" as const };
  };

  const presenceInfo = getPresenceLabel(result.presenceScore);
  const sentimentInfo = getSentimentLabel(result.sentimentScore);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">GEO Test Result Details</DialogTitle>
          <DialogDescription>
            {new Date(result.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md whitespace-pre-wrap">
              {result.llmResponse}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Presence Score</h3>
              <Badge variant={presenceInfo.variant}>{presenceInfo.label}</Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Score: {result.presenceScore}/2
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Sentiment Score</h3>
              <Badge variant={sentimentInfo.variant}>{sentimentInfo.label}</Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Score: {result.sentimentScore.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-foreground">Recommendation Level</h3>
            <Badge variant={result.recommended ? "default" : "secondary"}>
              {result.recommended ? "Recommended" : "Not Recommended"}
            </Badge>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Auto-generated Recommendations</h3>
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
