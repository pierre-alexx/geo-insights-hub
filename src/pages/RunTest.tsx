import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { runGeoTest, GeoResult } from "@/services/geoService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { PlayCircle, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

const promptTypes = [
  "Informational",
  "Transactional",
  "Navigational",
  "Comparative",
  "Creative"
];

export default function RunTest() {
  const navigate = useNavigate();
  const [promptType, setPromptType] = useState("");
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoResult | null>(null);

  const handleRunTest = async () => {
    if (!promptType || !promptText.trim()) {
      toast.error("Please select a prompt type and enter prompt text");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const testResult = await runGeoTest(promptType, promptText);
      setResult(testResult);
      toast.success("GEO test completed and saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to run GEO test");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTest = () => {
    setPromptType("");
    setPromptText("");
    setResult(null);
  };

  const handleCopyAnswer = () => {
    if (result) {
      navigator.clipboard.writeText(result.llmResponse);
      toast.success("Answer copied to clipboard");
    }
  };

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Run GEO Test</h1>
        <p className="text-muted-foreground mt-1">
          Test BNP Paribas presence in LLM responses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Configure Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-type">Prompt Type</Label>
            <Select value={promptType} onValueChange={setPromptType} disabled={loading || result !== null}>
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
              disabled={loading || result !== null}
            />
          </div>

          {!result && (
            <Button 
              onClick={handleRunTest} 
              disabled={loading || !promptType || !promptText.trim()}
              className="w-full"
              size="lg"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Run GEO Test
            </Button>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-12">
            <Loader text="Running GEO test... This may take 10-20 seconds..." />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Presence Score</h3>
                <Badge variant={getPresenceLabel(result.presenceScore).variant} className="text-base px-4 py-2">
                  {getPresenceLabel(result.presenceScore).label}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Score: {result.presenceScore}/2
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Sentiment Score</h3>
                <Badge variant={getSentimentLabel(result.sentimentScore).variant} className="text-base px-4 py-2">
                  {getSentimentLabel(result.sentimentScore).label}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Score: {result.sentimentScore.toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Recommendation Level</h3>
              <Badge 
                variant={result.recommended ? "default" : "secondary"}
                className="text-base px-4 py-2"
              >
                {result.recommended ? "✓ Recommended" : "Not Recommended"}
              </Badge>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Auto-generated Recommendations</h3>
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
