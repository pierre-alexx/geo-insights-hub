import { useState, useEffect } from "react";
import { fetchPersonas, createPersona, updatePersona, deletePersona, type Persona } from "@/services/geoService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, User } from "lucide-react";

export default function PersonaManagement() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goal: "",
    risk_profile: "",
    needs: "",
    typical_questions: [] as string[],
  });
  const [newQuestion, setNewQuestion] = useState("");

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      toast.error("Failed to load personas");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editingPersona) {
        await updatePersona(editingPersona.id, formData);
        toast.success("Persona updated");
      } else {
        await createPersona(formData);
        toast.success("Persona created");
      }
      setShowCreateModal(false);
      setEditingPersona(null);
      resetForm();
      loadPersonas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save persona");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this persona?")) return;
    
    try {
      await deletePersona(id);
      toast.success("Persona deleted");
      loadPersonas();
    } catch (error) {
      toast.error("Failed to delete persona");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      goal: "",
      risk_profile: "",
      needs: "",
      typical_questions: [],
    });
    setNewQuestion("");
  };

  const openEditModal = (persona: Persona) => {
    setEditingPersona(persona);
    setFormData({
      name: persona.name,
      description: persona.description,
      goal: persona.goal,
      risk_profile: persona.risk_profile,
      needs: persona.needs,
      typical_questions: persona.typical_questions || [],
    });
    setShowCreateModal(true);
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setFormData({
        ...formData,
        typical_questions: [...formData.typical_questions, newQuestion.trim()]
      });
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData({
      ...formData,
      typical_questions: formData.typical_questions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Persona Management</h1>
          <p className="text-muted-foreground">Create and manage user personas for testing</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setEditingPersona(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Persona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPersona ? "Edit Persona" : "Create New Persona"}</DialogTitle>
              <DialogDescription>Define a user persona for GEO testing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., High Net Worth Individual"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this persona"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Goals</Label>
                <Textarea
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="What are their primary goals?"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Risk Profile</Label>
                <Input
                  value={formData.risk_profile}
                  onChange={(e) => setFormData({ ...formData, risk_profile: e.target.value })}
                  placeholder="e.g., Conservative, Moderate, Aggressive"
                />
              </div>
              <div className="space-y-2">
                <Label>Needs</Label>
                <Textarea
                  value={formData.needs}
                  onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                  placeholder="What do they need from the content?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Typical Questions</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add example questions this persona might ask
                </p>
                <div className="space-y-2">
                  {formData.typical_questions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="text-sm flex-1">{question}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a typical question..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuestion();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddQuestion}
                      disabled={!newQuestion.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? "Saving..." : editingPersona ? "Update Persona" : "Create Persona"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Personas</CardTitle>
          <CardDescription>Manage your user personas</CardDescription>
        </CardHeader>
        <CardContent>
          {personas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No personas created yet</p>
              <p className="text-sm">Create your first persona to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Risk Profile</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personas.map((persona) => (
                  <TableRow key={persona.id}>
                    <TableCell className="font-medium">{persona.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{persona.description}</TableCell>
                    <TableCell>{persona.risk_profile}</TableCell>
                    <TableCell>{new Date(persona.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(persona)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(persona.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
