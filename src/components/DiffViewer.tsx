import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Code, Eye } from "lucide-react";

interface DiffViewerProps {
  originalHtml: string;
  rewrittenHtml: string;
  pageUrl: string;
}

export function DiffViewer({ originalHtml, rewrittenHtml, pageUrl }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"rendered" | "code">("rendered");

  const getBaseTag = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `<base href="${urlObj.origin}/" />`;
    } catch {
      return "";
    }
  };

  const baseTag = getBaseTag(pageUrl);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Before / After Comparison</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "rendered" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("rendered")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Rendered
            </Button>
            <Button
              variant={viewMode === "code" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("code")}
            >
              <Code className="mr-2 h-4 w-4" />
              Code
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "rendered" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Original</h3>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={`${baseTag}${originalHtml}`}
                  className="w-full h-[600px] bg-white"
                  sandbox="allow-same-origin allow-top-navigation-by-user-activation"
                  title="Original Page"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-primary">Rewritten (GEO Optimized)</h3>
              <div className="border rounded-lg overflow-hidden border-primary">
                <iframe
                  srcDoc={`${baseTag}${rewrittenHtml}`}
                  className="w-full h-[600px] bg-white"
                  sandbox="allow-same-origin allow-top-navigation-by-user-activation"
                  title="Rewritten Page"
                />
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="original" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="original">Original Code</TabsTrigger>
              <TabsTrigger value="rewritten">Rewritten Code</TabsTrigger>
            </TabsList>
            <TabsContent value="original">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs max-h-[600px] overflow-y-auto">
                <code>{originalHtml}</code>
              </pre>
            </TabsContent>
            <TabsContent value="rewritten">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs max-h-[600px] overflow-y-auto">
                <code>{rewrittenHtml}</code>
              </pre>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
