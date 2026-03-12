import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "athlete-card-layout-v2-";

type LayoutColumns = [string[], string[], string[]];

interface LayoutState {
  columns: LayoutColumns;
}

const DEFAULT_LAYOUT: LayoutState = {
  columns: [
    ["body-model", "progress-chart", "metabolic-flux"],
    ["wellness-radar", "timeline-ai", "active-blocks"],
    ["chat-widget", "bloodwork-panel"],
  ],
};

interface DraggableCardLayoutProps {
  cards: Record<string, React.ReactNode>;
  cardLabels?: Record<string, string>;
  athleteId?: string;
}

/* ── Droppable Column ── */
function DroppableColumn({
  id,
  children,
  isActive,
}: {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-4 min-h-[120px] rounded-xl transition-all duration-200 relative",
        isActive && "before:absolute before:inset-0 before:border-2 before:border-dashed before:border-primary/20 before:rounded-xl before:pointer-events-none",
        isOver && isActive && "before:border-primary/50 bg-primary/5"
      )}
    >
      {children}
      {/* Empty column placeholder */}
      {React.Children.count(children) === 0 && (
        <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
          Kartı buraya sürükleyin
        </div>
      )}
    </div>
  );
}

/* ── Draggable + Droppable Card ── */
function DraggableCardItem({
  id,
  children,
  isDragActive,
}: {
  id: string;
  children: React.ReactNode;
  isDragActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `card-drop-${id}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      className={cn(
        "relative group transition-all duration-150",
        isDragging && "opacity-20 scale-95",
        isOver && isDragActive && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-xl"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-3 right-3 z-20 p-1.5 rounded-lg border shadow-sm transition-all cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100",
          "bg-background/90 backdrop-blur-sm border-border hover:bg-muted hover:border-primary/30"
        )}
        aria-label="Kartı sürükle"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

/* ── Main Layout Engine ── */
export function DraggableCardLayout({ cards, athleteId }: DraggableCardLayoutProps) {
  const cardIds = useMemo(() => Object.keys(cards), [cards]);
  const storageKey = `${STORAGE_KEY_PREFIX}${athleteId || "default"}`;

  const [layout, setLayout] = useState<LayoutState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutState;
        const allSavedIds = parsed.columns.flat();
        // Validate: all current card IDs must be present
        if (
          cardIds.every((id) => allSavedIds.includes(id)) &&
          allSavedIds.every((id) => cardIds.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_LAYOUT;
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      setActiveId(null);
      if (!over) return;

      const draggedId = active.id as string;
      const overId = over.id as string;
      if (draggedId === overId) return;

      let destCol: number;
      let destIdx: number;

      if (overId.startsWith("col-")) {
        // Dropped on empty column area
        destCol = parseInt(overId.replace("col-", ""));
        destIdx = layout.columns[destCol].filter((id) => id !== draggedId).length;
      } else if (overId.startsWith("card-drop-")) {
        // Dropped on another card
        const targetCardId = overId.replace("card-drop-", "");
        destCol = layout.columns.findIndex((col) => col.includes(targetCardId));
        if (destCol === -1) return;
        const filtered = layout.columns[destCol].filter((id) => id !== draggedId);
        destIdx = filtered.indexOf(targetCardId);
        if (destIdx === -1) destIdx = filtered.length;
      } else {
        return;
      }

      // Build new columns
      const newCols = layout.columns.map((col) =>
        col.filter((id) => id !== draggedId)
      ) as LayoutColumns;
      newCols[destCol].splice(destIdx, 0, draggedId);

      const newLayout: LayoutState = { columns: newCols };
      setLayout(newLayout);
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    },
    [layout]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <div className="space-y-3">
      {/* Reset button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetLayout}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Düzeni Sıfırla
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* 3 Fixed Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {layout.columns.map((col, colIdx) => (
            <DroppableColumn
              key={colIdx}
              id={`col-${colIdx}`}
              isActive={activeId !== null}
            >
              {col.map((cardId) =>
                cards[cardId] ? (
                  <DraggableCardItem
                    key={cardId}
                    id={cardId}
                    isDragActive={activeId !== null}
                  >
                    {cards[cardId]}
                  </DraggableCardItem>
                ) : null
              )}
            </DroppableColumn>
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeId && cards[activeId] ? (
            <div className="opacity-90 shadow-2xl rounded-xl pointer-events-none ring-2 ring-primary/30">
              <div className="max-w-[450px]">{cards[activeId]}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
