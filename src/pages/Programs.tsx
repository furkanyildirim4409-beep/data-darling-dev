import { useState, useCallback } from "react";
import TemplateDashboard, { type WorkoutTemplate } from "@/components/program-architect/TemplateDashboard";
import RoutineBuilder from "@/components/program-architect/RoutineBuilder";
import AssignTemplateDialog from "@/components/program-architect/AssignTemplateDialog";

type View = "dashboard" | "builder";

export default function Programs() {
  const [view, setView] = useState<View>("dashboard");
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [assignTemplate, setAssignTemplate] = useState<WorkoutTemplate | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);

  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    setView("builder");
  }, []);

  const handleEdit = useCallback((t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setView("builder");
  }, []);

  const handleAssign = useCallback((t: WorkoutTemplate) => {
    setAssignTemplate(t);
    setAssignOpen(true);
  }, []);

  const handleBack = useCallback(() => {
    setView("dashboard");
    setEditingTemplate(null);
  }, []);

  const handleSaved = useCallback(() => {
    setDashboardKey((k) => k + 1);
    setView("dashboard");
    setEditingTemplate(null);
  }, []);

  if (view === "builder") {
    return (
      <RoutineBuilder
        editingTemplate={editingTemplate}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <>
      <TemplateDashboard
        key={dashboardKey}
        onCreateNew={handleCreate}
        onEdit={handleEdit}
        onAssign={handleAssign}
      />
      <AssignTemplateDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        template={assignTemplate}
      />
    </>
  );
}
