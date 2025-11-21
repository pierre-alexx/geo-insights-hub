import { useState } from "react";
import { GeoResult, PersonaResult } from "@/services/geoService";
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
  results: (GeoResult | PersonaResult)[];
  onViewDetails: (result: GeoResult | PersonaResult) => void;
  type: "general" | "persona";
}

export function ResultsTable({ results, onViewDetails, type }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredResults = results.filter((r) => {
    const searchLower = searchTerm.toLowerCase();
    if (type === "general") {
      const gr = r as GeoResult;
      return (
        gr.promptText.toLowerCase().includes(searchLower) ||
        gr.promptType.toLowerCase().includes(searchLower) ||
        gr.pageUrl.toLowerCase().includes(searchLower)
      );
    } else {
      const pr = r as PersonaResult;
      return pr.prompt.toLowerCase().includes(searchLower);
    }
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "timestamp") {
      return sortOrder === "asc"
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === "globalGeoScore") {
      const aScore = type === "general" ? (a as GeoResult).globalGeoScore : (a as PersonaResult).global_geo_score;
      const bScore = type === "general" ? (b as GeoResult).globalGeoScore : (b as PersonaResult).global_geo_score;
      return sortOrder === "asc" ? aScore - bScore : bScore - aScore;
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

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">URL</TableHead>
                <TableHead className="min-w-[100px]">Type</TableHead>
                <TableHead className="min-w-[100px]">GEO Score</TableHead>
                <TableHead className="hidden md:table-cell min-w-[100px]">Relevance</TableHead>
                <TableHead className="hidden md:table-cell min-w-[120px]">Comprehension</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[100px]">Visibility</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[130px]">Recommendation</TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="text-right min-w-[100px]">Actions</TableHead>
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
              sortedResults.map((result) => {
                const isGeneral = type === "general";
                const gr = result as GeoResult;
                 const pr = result as PersonaResult;
                
                return (
                  <TableRow key={result.id}>
                    <TableCell>
                      {isGeneral ? (
                        <div className="max-w-[200px]">
                          <p className="text-sm font-medium truncate">{gr.pageTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{gr.pageUrl}</p>
                        </div>
                      ) : (
                        <p className="text-sm truncate max-w-[200px]">{pr.prompt}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{isGeneral ? gr.promptType : "Persona"}</Badge>
                    </TableCell>
                    <TableCell>{getScoreBadge(isGeneral ? gr.globalGeoScore : pr.global_geo_score)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatScore(isGeneral ? gr.relevanceScore : pr.relevance_score)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatScore(isGeneral ? gr.comprehensionScore : pr.comprehension_score)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatScore(isGeneral ? gr.visibilityScore : pr.visibility_score)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatScore(isGeneral ? gr.recommendationScore : pr.recommendation_score)}
                    </TableCell>
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
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
