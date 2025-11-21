import { useState } from "react";
import { GeoResult } from "@/services/geoService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface ResultsTableProps {
  results: GeoResult[];
  onViewDetails: (result: GeoResult) => void;
}

export function ResultsTable({ results, onViewDetails }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof GeoResult>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredResults = results.filter(
    (r) =>
      r.promptText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.promptType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pageUrl.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "timestamp") {
      return sortOrder === "asc"
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === "globalGeoScore") {
      return sortOrder === "asc"
        ? a.globalGeoScore - b.globalGeoScore
        : b.globalGeoScore - a.globalGeoScore;
    }
    return 0;
  });

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  const getScoreBadge = (score: number) => {
    const variant = score >= 0.7 ? "default" : score >= 0.4 ? "secondary" : "destructive";
    return <Badge variant={variant}>{formatScore(score)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by URL, prompt, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "timestamp" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (sortBy === "timestamp") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("timestamp");
                setSortOrder("desc");
              }
            }}
          >
            Date {sortBy === "timestamp" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
          <Button
            variant={sortBy === "globalGeoScore" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (sortBy === "globalGeoScore") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("globalGeoScore");
                setSortOrder("desc");
              }
            }}
          >
            Score {sortBy === "globalGeoScore" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>GEO Score</TableHead>
              <TableHead className="hidden md:table-cell">Relevance</TableHead>
              <TableHead className="hidden md:table-cell">Comprehension</TableHead>
              <TableHead className="hidden lg:table-cell">Visibility</TableHead>
              <TableHead className="hidden lg:table-cell">Recommendation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              sortedResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="max-w-xs">
                    <p className="text-sm font-medium truncate">{result.pageTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.pageUrl}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.promptType}</Badge>
                  </TableCell>
                  <TableCell>{getScoreBadge(result.globalGeoScore)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatScore(result.relevanceScore)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatScore(result.comprehensionScore)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatScore(result.visibilityScore)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatScore(result.recommendationScore)}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(result.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(result)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
