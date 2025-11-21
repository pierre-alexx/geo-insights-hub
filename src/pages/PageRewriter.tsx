import { useState, useEffect } from "react";
import { fetchPages, rewritePage, fetchRewrites, type Page, type Rewrite } from "@/services/geoService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight, Wand2, FileCode, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PageRewriter() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [showOriginalHtml, setShowOriginalHtml] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [latestRewrite, setLatestRewrite] = useState<Rewrite | null>(null);
  const [rewrites, setRewrites] = useState<Rewrite[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (selectedPageId) {
      loadRewrites(selectedPageId);
    }
  }, [selectedPageId]);

  const loadPages = async () => {
    try {
      const data = await fetchPages();
      setPages(data);
    } catch (error) {
      toast.error("Failed to load pages");
    } finally {
      setLoadingPages(false);
    }
  };

  const loadRewrites = async (pageId: string) => {
    try {
      const data = await fetchRewrites(pageId);
      setRewrites(data);
      if (data.length > 0) {
        setLatestRewrite(data[0]);
      }
    } catch (error) {
      console.error("Failed to load rewrites:", error);
    }
  };

  const handleFetchPage = async () => {
    if (!selectedPageId) {
      toast.error("Please select a page");
      return;
    }

    try {
      const { fetchPageById } = await import("@/services/geoService");
      const page = await fetchPageById(selectedPageId);
      if (page) {
        setSelectedPage(page);
        setShowOriginalHtml(false);
      } else {
        toast.error("Page not found");
      }
    } catch (error) {
      console.error("Failed to fetch page:", error);
      toast.error("Failed to load page content");
    }
  };

  const handleRewrite = async () => {
    if (!selectedPageId) {
      toast.error("Please select a page first");
      return;
    }

    setRewriting(true);
    try {
      const result = await rewritePage(selectedPageId);
      setLatestRewrite(result);
      toast.success("Page rewritten successfully");
      await loadRewrites(selectedPageId);
    } catch (error) {
      console.error("Rewrite failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to rewrite page");
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Page Rewriter AI</h1>
        <p className="text-muted-foreground">
          Optimize BNP pages for maximum LLM understanding and recall
        </p>
      </div>

      {/* Page Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Page Selector</CardTitle>
          <CardDescription>
            Choose a page to analyze and rewrite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page-select">Select Page</Label>
            <Select value={selectedPageId} onValueChange={setSelectedPageId}>
              <SelectTrigger id="page-select">
                <SelectValue placeholder={loadingPages ? "Loading pages..." : "Select a page"} />
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

          <Button onClick={handleFetchPage} disabled={!selectedPageId}>
            <FileCode className="mr-2 h-4 w-4" />
            Fetch Page
          </Button>

          {selectedPage && (
            <Collapsible open={showOriginalHtml} onOpenChange={setShowOriginalHtml}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Original HTML</Label>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {showOriginalHtml ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {showOriginalHtml ? "Hide" : "Show"}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-xs">
                      <code>{selectedPage.html_content?.substring(0, 2000)}...</code>
                    </pre>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Rewrite Panel */}
      {selectedPage && (
        <Card>
          <CardHeader>
            <CardTitle>Rewrite Panel</CardTitle>
            <CardDescription>
              Generate LLM-optimized version of this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button onClick={handleRewrite} disabled={rewriting}>
                {rewriting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Rewrite Page for GEO Optimization
                  </>
                )}
              </Button>
              {rewrites.length > 0 && (
                <Badge variant="secondary">
                  {rewrites.length} rewrite{rewrites.length !== 1 ? "s" : ""} available
                </Badge>
              )}
            </div>

            {latestRewrite && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground">{latestRewrite.summary}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">GEO Rationale</h3>
                  <p className="text-sm text-muted-foreground">{latestRewrite.geoRationale}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Rewritten HTML</h3>
                  <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-xs">
                      <code>{latestRewrite.rewrittenHtml}</code>
                    </pre>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Generated: {new Date(latestRewrite.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison View */}
      {latestRewrite && selectedPage && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison View</CardTitle>
            <CardDescription>
              Side-by-side comparison of original and rewritten HTML
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="side-by-side">
              <TabsList>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="original">Original Only</TabsTrigger>
                <TabsTrigger value="rewritten">Rewritten Only</TabsTrigger>
              </TabsList>

              <TabsContent value="side-by-side">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">Original</Badge>
                    </h4>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe
                        srcDoc={`<base href="${new URL(selectedPage.url).origin}/">${selectedPage.html_content || ''}`}
                        className="w-full h-[600px] border-0"
                        title="Original HTML"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="default">Rewritten</Badge>
                    </h4>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe
                        srcDoc={`<base href="${new URL(selectedPage.url).origin}/">${latestRewrite.rewrittenHtml}`}
                        className="w-full h-[600px] border-0"
                        title="Rewritten HTML"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="original">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={`<base href="${new URL(selectedPage.url).origin}/">${selectedPage.html_content || ''}`}
                    className="w-full h-[600px] border-0"
                    title="Original HTML Full"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </TabsContent>

              <TabsContent value="rewritten">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={`<base href="${new URL(selectedPage.url).origin}/">${latestRewrite.rewrittenHtml}`}
                    className="w-full h-[600px] border-0"
                    title="Rewritten HTML Full"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Previous Rewrites */}
      {rewrites.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Rewrites</CardTitle>
            <CardDescription>
              History of all rewrites for this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rewrites.map((rewrite, idx) => (
                <div
                  key={rewrite.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setLatestRewrite(rewrite)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      Rewrite #{rewrites.length - idx}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rewrite.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}