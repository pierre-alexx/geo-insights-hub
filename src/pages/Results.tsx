import { useEffect, useState } from "react";
import { fetchAllResults, GeoResult } from "@/services/geoService";
import { ResultsTable } from "@/components/ResultsTable";
import { GeoResultModal } from "@/components/GeoResultModal";
import { Loader } from "@/components/Loader";

export default function Results() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeoResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    const data = await fetchAllResults();
    setResults(data);
    setLoading(false);
  };

  const handleViewDetails = (result: GeoResult) => {
    setSelectedResult(result);
    setModalOpen(true);
  };

  if (loading) {
    return <Loader text="Loading results..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Test Results</h1>
        <p className="text-muted-foreground mt-1">
          View and analyze all GEO test results
        </p>
      </div>

      <ResultsTable results={results} onViewDetails={handleViewDetails} />

      <GeoResultModal
        result={selectedResult}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
