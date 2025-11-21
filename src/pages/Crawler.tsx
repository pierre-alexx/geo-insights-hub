import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, ChevronRight, ChevronDown, Globe } from "lucide-react";
import { crawlSite, fetchPages, autoGeoTestAllPages, refreshOldPages, type Page, type CrawlResult, type TreeNode } from "@/services/geoService";

const CrawlTreeNode = ({ node }: { node: TreeNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 py-1">
        {node.children.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        )}
        {node.children.length === 0 && <div className="w-6" />}
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{node.title}</span>
        <Badge variant="outline" className="ml-2">Depth {node.depth}</Badge>
      </div>
      {node.children.length > 0 && (
        <CollapsibleContent>
          <div className="ml-6 border-l pl-4">
            {node.children.map((child, idx) => (
              <CrawlTreeNode key={idx} node={child} />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export default function Crawler() {
  const navigate = useNavigate();
  const [startUrl, setStartUrl] = useState("https://www.bnpparibas.com");
  const [maxDepth, setMaxDepth] = useState("2");
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadPages = async () => {
    try {
      const data = await fetchPages();
      setPages(data);
    } catch (error) {
      console.error("Failed to load pages:", error);
      toast.error("Failed to load pages");
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleCrawl = async () => {
    if (!startUrl) {
      toast.error("Please enter a start URL");
      return;
    }

    setCrawling(true);
    try {
      const result = await crawlSite(startUrl, parseInt(maxDepth));
      setCrawlResult(result);
      toast.success(`Crawl complete: ${result.pagesDiscovered} pages discovered`);
      await loadPages();
    } catch (error) {
      console.error("Crawl failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to crawl site");
    } finally {
      setCrawling(false);
    }
  };

  const handleTestAll = async () => {
    if (pages.length === 0) {
      toast.error("No pages to test");
      return;
    }

    setTesting(true);
    setTestProgress(0);
    
    try {
      const total = pages.length;
      let completed = 0;

      for (const page of pages) {
        try {
          await autoGeoTestAllPages();
          completed++;
          setTestProgress((completed / total) * 100);
        } catch (error) {
          console.error(`Failed to test ${page.url}:`, error);
        }
      }

      toast.success(`Successfully tested ${completed} pages`);
    } catch (error) {
      console.error("Bulk testing failed:", error);
      toast.error("Failed to complete bulk testing");
    } finally {
      setTesting(false);
      setTestProgress(0);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await refreshOldPages();
      toast.success(`Refreshed ${result.pagesRefreshed} pages`);
      await loadPages();
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh pages");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Site Crawler</h1>
        <p className="text-muted-foreground">
          Discover and analyze BNP Paribas pages automatically
        </p>
      </div>

      {/* Manual Crawling Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Crawling</CardTitle>
          <CardDescription>
            Start a new crawl from a BNP Paribas URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startUrl">Starting URL</Label>
              <Input
                id="startUrl"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                placeholder="https://www.bnpparibas.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDepth">Max Depth</Label>
              <Select value={maxDepth} onValueChange={setMaxDepth}>
                <SelectTrigger id="maxDepth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 level</SelectItem>
                  <SelectItem value="2">2 levels</SelectItem>
                  <SelectItem value="3">3 levels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCrawl} disabled={crawling}>
              {crawling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Crawl
                </>
              )}
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Old Pages
                </>
              )}
            </Button>
          </div>

          {crawlResult && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{crawlResult.pagesDiscovered}</div>
                    <p className="text-sm text-muted-foreground">Pages Discovered</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{crawlResult.pagesUpdated}</div>
                    <p className="text-sm text-muted-foreground">Pages Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{crawlResult.pagesSkipped}</div>
                    <p className="text-sm text-muted-foreground">Pages Skipped</p>
                  </CardContent>
                </Card>
              </div>

              {crawlResult.tree.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Crawl Tree</h3>
                  <div className="border rounded-lg p-4 bg-muted/50 max-h-96 overflow-auto">
                    {crawlResult.tree.map((node, idx) => (
                      <CrawlTreeNode key={idx} node={node} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk GEO Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk GEO Testing</CardTitle>
          <CardDescription>
            Run GEO tests on all discovered pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTestAll} disabled={testing || pages.length === 0}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Pages...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run GEO Tests on All Pages ({pages.length})
              </>
            )}
          </Button>

          {testing && (
            <div className="space-y-2">
              <Progress value={testProgress} />
              <p className="text-sm text-muted-foreground">
                Testing in progress... {Math.round(testProgress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Page List */}
      <Card>
        <CardHeader>
          <CardTitle>Discovered Pages ({pages.length})</CardTitle>
          <CardDescription>
            All pages currently in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pages discovered yet. Start a crawl to begin.
            </p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Depth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Fetch</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-mono text-sm max-w-xs truncate">
                        {page.url}
                      </TableCell>
                      <TableCell>{page.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(page as any).depth ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(page as any).crawl_status === 'fetched' ? 'default' : 'destructive'}>
                          {(page as any).crawl_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(page.fetch_timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/page/${page.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}