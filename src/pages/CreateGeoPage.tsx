import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader } from "@/components/Loader";
import { toast } from "sonner";
import { createGeoPage, fetchPersonas, type Persona } from "@/services/geoService";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText, Eye, Download } from "lucide-react";

export default function CreateGeoPage() {
  const [mode, setMode] = useState<'general' | 'persona'>('general');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageGoal, setPageGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [requiredSections, setRequiredSections] = useState('');
  const [keyMessages, setKeyMessages] = useState('');
  const [faqs, setFaqs] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [inspirationUrls, setInspirationUrls] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPage, setGeneratedPage] = useState<any>(null);

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: fetchPersonas
  });

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  const handleGenerate = async () => {
    if (!pageTitle || !pageGoal) {
      toast.error('Please provide at least a page title and goal');
      return;
    }

    setIsGenerating(true);
    setGeneratedPage(null);

    try {
      const urlsArray = inspirationUrls
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);

      const page = await createGeoPage({
        mode,
        personaId: mode === 'persona' ? selectedPersonaId : null,
        pageTitle,
        pageGoal,
        targetAudience,
        tone,
        requiredSections,
        keyMessages,
        faqs,
        additionalContext,
        inspirationUrls: urlsArray
      });

      setGeneratedPage(page);
      toast.success('GEO-optimized page generated successfully!');
    } catch (error: any) {
      console.error('Error generating page:', error);
      toast.error(error.message || 'Failed to generate page');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportHTML = () => {
    if (!generatedPage) return;
    const blob = new Blob([generatedPage.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageTitle.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
  };

  const handleCopyHTML = () => {
    if (!generatedPage) return;
    navigator.clipboard.writeText(generatedPage.html_content);
    toast.success('HTML copied to clipboard');
  };

  if (generatedPage) {
    return (
      <div className="flex-1 space-y-6 p-6 w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Generated Page</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Your new GEO-optimized page is ready
            </p>
          </div>
          <Button variant="outline" onClick={() => setGeneratedPage(null)}>
            Create Another
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Rendered Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border border-border rounded-lg p-4 max-h-[500px] overflow-y-auto bg-background"
                dangerouslySetInnerHTML={{ __html: generatedPage.html_content }}
              />
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={handleExportHTML}>
                  <Download className="h-4 w-4 mr-2" />
                  Export HTML
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopyHTML}>
                  Copy HTML
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Page Outline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs sm:text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-[200px] overflow-y-auto">
                {generatedPage.outline}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>GEO Rationale</CardTitle>
            <CardDescription>Why these optimization choices were made</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{generatedPage.rationale}</p>
          </CardContent>
        </Card>

        {generatedPage.persona_rationale && (
          <Card>
            <CardHeader>
              <CardTitle>Persona Rationale</CardTitle>
              <CardDescription>Persona-specific tailoring</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{generatedPage.persona_rationale}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 w-full overflow-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New GEO Page</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Generate a brand-new, GEO-optimized page from scratch
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mode Selection</CardTitle>
          <CardDescription>Choose how to optimize your new page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'general' | 'persona')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="general" id="general" />
              <Label htmlFor="general">General GEO Page</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="persona" id="persona" />
              <Label htmlFor="persona">Persona-Optimized Page</Label>
            </div>
          </RadioGroup>

          {mode === 'persona' && (
            <div className="space-y-2">
              <Label>Select Persona</Label>
              <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a persona..." />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPersona && (
                <Card className="mt-2 bg-muted">
                  <CardContent className="pt-4">
                    <p className="text-sm"><strong>Description:</strong> {selectedPersona.description}</p>
                    <p className="text-sm mt-1"><strong>Goal:</strong> {selectedPersona.goal}</p>
                    <p className="text-sm mt-1"><strong>Needs:</strong> {selectedPersona.needs}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page Intent</CardTitle>
          <CardDescription>Define what this page should accomplish</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pageTitle">Page Title *</Label>
            <Input
              id="pageTitle"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="e.g., Wealth Management Solutions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pageGoal">Page Goal *</Label>
            <Textarea
              id="pageGoal"
              value={pageGoal}
              onChange={(e) => setPageGoal(e.target.value)}
              placeholder="e.g., Explain our wealth management services to high-net-worth individuals"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., High-net-worth individuals aged 40-65"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Input
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g., Professional, confident, reassuring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredSections">Required Sections</Label>
            <Textarea
              id="requiredSections"
              value={requiredSections}
              onChange={(e) => setRequiredSections(e.target.value)}
              placeholder="e.g., Introduction, Services Overview, Benefits, Contact"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyMessages">Key Messages</Label>
            <Textarea
              id="keyMessages"
              value={keyMessages}
              onChange={(e) => setKeyMessages(e.target.value)}
              placeholder="e.g., Personalized service, 50+ years experience, global reach"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="faqs">FAQs to Address</Label>
            <Textarea
              id="faqs"
              value={faqs}
              onChange={(e) => setFaqs(e.target.value)}
              placeholder="e.g., What is wealth management? How much do I need to invest?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Context Inputs</CardTitle>
          <CardDescription>Provide additional information to guide the generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="additionalContext">Additional Context / Information</Label>
            <Textarea
              id="additionalContext"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Paste any notes, bullet points, content requirements, regulatory constraints, etc."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspirationUrls">Similar Websites (URLs)</Label>
            <Textarea
              id="inspirationUrls"
              value={inspirationUrls}
              onChange={(e) => setInspirationUrls(e.target.value)}
              placeholder="Paste up to 5 URLs (one per line) for inspiration"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              The system will analyze these pages for structure and key messages
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          size="lg"
          onClick={handleGenerate}
          disabled={isGenerating || !pageTitle || !pageGoal}
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Loader />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate GEO-Optimized Page
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
