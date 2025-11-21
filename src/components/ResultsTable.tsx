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
      r.promptType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "timestamp") {
      return sortOrder === "asc"
        ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === "presenceScore") {
      return sortOrder === "asc"
        ? a.presenceScore - b.presenceScore
        : b.presenceScore - a.presenceScore;
    }
    return 0;
  });

  const getPresenceBadge = (score: number) => {
    if (score === 2) return <Badge className="bg-success">High</Badge>;
    if (score === 1) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const getSentimentBadge = (score: number) => {
    if (score > 0.3) return <Badge className="bg-success">Positive</Badge>;
    if (score > -0.3) return <Badge variant="secondary">Neutral</Badge>;
    return <Badge variant="destructive">Negative</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by prompt or type..."
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
            variant={sortBy === "presenceScore" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (sortBy === "presenceScore") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("presenceScore");
                setSortOrder("desc");
              }
            }}
          >
            Score {sortBy === "presenceScore" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Presence</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              sortedResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <Badge variant="outline">{result.promptType}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {result.promptText}
                  </TableCell>
                  <TableCell>{getPresenceBadge(result.presenceScore)}</TableCell>
                  <TableCell>{getSentimentBadge(result.sentimentScore)}</TableCell>
                  <TableCell>
                    {new Date(result.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(result)}
                    >
                      View Details
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
