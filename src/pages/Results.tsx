import { useEffect, useState } from "react";
import { fetchAllResults, GeoResult, fetchPersonaResults, PersonaResult } from "@/services/geoService";
import { ResultsTable } from "@/components/ResultsTable";
import { GeoResultModal } from "@/components/GeoResultModal";
import { Loader } from "@/components/Loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Results() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [personaResults, setPersonaResults] = useState<PersonaResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeoResult | PersonaResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultType, setResultType] = useState<"general" | "persona">("general");

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    const [generalData, personaData] = await Promise.all([
      fetchAllResults(),
      fetchPersonaResults("")
    ]);
    setResults(generalData);
    setPersonaResults(personaData);
    setLoading(false);
  };

  const handleViewDetails = (result: GeoResult | PersonaResult) => {
    setSelectedResult(result);
    setResultType("pageUrl" in result ? "general" : "persona");
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

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general">General Tests</TabsTrigger>
          <TabsTrigger value="persona">Persona Tests</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <ResultsTable results={results} onViewDetails={handleViewDetails} type="general" />
        </TabsContent>
        <TabsContent value="persona" className="mt-6">
          <ResultsTable results={personaResults} onViewDetails={handleViewDetails} type="persona" />
        </TabsContent>
      </Tabs>

      <GeoResultModal
        result={selectedResult}
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={resultType}
      />
    </div>
  );
}
