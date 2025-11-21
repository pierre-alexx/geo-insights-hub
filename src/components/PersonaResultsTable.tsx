import { useState } from "react";
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

interface PersonaResultsTableProps {
  results: any[];
  onViewDetails: (group: any) => void;
}

export function PersonaResultsTable({ results, onViewDetails }: PersonaResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredResults = results.filter((r) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      r.persona_name.toLowerCase().includes(searchLower) ||
      r.page_title.toLowerCase().includes(searchLower)
    );
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "timestamp") {
      return sortOrder === "asc"
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === "globalGeoScore") {
      return sortOrder === "asc"
        ? a.global_geo_score - b.global_geo_score
        : b.global_geo_score - a.global_geo_score;
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
            placeholder="Search by persona or page..."
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
              <TableHead>Persona</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Avg GEO Score</TableHead>
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
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              sortedResults.map((group, idx) => (
                <TableRow key={`${group.persona_id}-${group.page_id}-${idx}`}>
                  <TableCell className="font-medium">{group.persona_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{group.page_title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{group.num_questions}</Badge>
                  </TableCell>
                  <TableCell>{getScoreBadge(group.global_geo_score)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatScore(group.relevance_score)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatScore(group.comprehension_score)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatScore(group.visibility_score)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatScore(group.recommendation_score)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(group.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(group)}
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
