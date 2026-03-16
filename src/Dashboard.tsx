import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";

export default function Dashboard() {
  const items = useQuery(api.items.list);
  const questions = useQuery(api.questions.list);
  const allAssignments = useQuery(api.assignments.listAll);

  const createItem = useMutation(api.items.create);
  const removeItem = useMutation(api.items.remove);
  const createQuestion = useMutation(api.questions.create);
  const updateQuestion = useMutation(api.questions.update);
  const removeQuestion = useMutation(api.questions.remove);
  const assignMutation = useMutation(api.assignments.assign);
  const renameCategoryMutation = useMutation(api.questions.renameCategory);
  const deleteCategoryMutation = useMutation(api.questions.deleteCategory);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  if (!items || !questions || !allAssignments) {
    return <div className="loading">Loading...</div>;
  }

  const activeItem = activeDragId
    ? items.find((i) => i._id === activeDragId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over?.data?.current) return;

    const itemId = active.id as Id<"items">;
    const { questionId, category } = over.data.current as {
      questionId: Id<"questions">;
      category: string;
    };

    assignMutation({ itemId, questionId, category });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <header>
        <h1>Sorting Dashboard</h1>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowAddItem(true)}>
            + Project
          </button>
          <button className="btn" onClick={() => setShowAddQuestion(true)}>
            + Question
          </button>
        </div>
      </header>

      <div className="item-pool">
        <h2>Projects</h2>
        <div className="pool-items">
          {items.map((item) => {
            const sortedCount = new Set(
              allAssignments
                .filter((a) => a.itemId === item._id)
                .map((a) => a.questionId)
            ).size;
            return (
              <DraggableChip
                key={item._id}
                item={item}
                sortedCount={sortedCount}
                totalQuestions={questions.length}
                onDelete={() => {
                  if (confirm(`Delete "${item.name}"?`)) {
                    removeItem({ id: item._id });
                  }
                }}
              />
            );
          })}
          {items.length === 0 && (
            <span className="empty-hint">No projects yet</span>
          )}
        </div>
      </div>

      <div className="questions-container">
        {questions.map((q) => (
          <QuestionBlock
            key={q._id}
            question={q}
            items={items}
            assignments={allAssignments.filter((a) => a.questionId === q._id)}
            onUpdateText={(text) => updateQuestion({ id: q._id, text })}
            onDelete={() => {
              if (confirm("Delete this question?")) {
                removeQuestion({ id: q._id });
              }
            }}
            onUnassign={(itemId) =>
              assignMutation({ itemId, questionId: q._id, category: null })
            }
            onRenameCategory={(oldCat, newCat) =>
              renameCategoryMutation({
                questionId: q._id,
                oldCategory: oldCat,
                newCategory: newCat,
              })
            }
            onDeleteCategory={(category) =>
              deleteCategoryMutation({ questionId: q._id, category })
            }
            onAddCategory={(category) => {
              const cats = [...q.categories, category];
              updateQuestion({ id: q._id, categories: cats });
            }}
          />
        ))}
        {questions.length === 0 && (
          <div className="empty-state">
            No questions yet. Add one to start sorting.
          </div>
        )}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="item-chip drag-overlay">{activeItem.name}</div>
        ) : null}
      </DragOverlay>

      {showAddItem && (
        <Modal
          title="Add Project"
          fields={[
            {
              key: "name",
              label: "Name",
              placeholder: "Company or project (comma-separated for batch)",
            },
          ]}
          onClose={() => setShowAddItem(false)}
          onSave={async (values) => {
            const names = values.name
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            for (const name of names) {
              await createItem({ name });
            }
          }}
        />
      )}

      {showAddQuestion && (
        <Modal
          title="Add Question"
          fields={[
            {
              key: "text",
              label: "Question",
              placeholder: "e.g., Did I feel genuine curiosity?",
              type: "textarea",
            },
            {
              key: "categories",
              label: "Categories",
              placeholder: "e.g., Yes, No, Maybe (comma-separated)",
            },
          ]}
          onClose={() => setShowAddQuestion(false)}
          onSave={async (values) => {
            const categories = values.categories
              ? values.categories
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
            await createQuestion({ text: values.text, categories });
          }}
        />
      )}
    </DndContext>
  );
}

// --- Draggable chip (pool items) ---

function DraggableChip({
  item,
  onDelete,
  sortedCount = 0,
  totalQuestions = 0,
}: {
  item: Doc<"items">;
  onDelete: () => void;
  sortedCount?: number;
  totalQuestions?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item._id });

  const fullySorted = totalQuestions > 0 && sortedCount >= totalQuestions;
  const unsorted = sortedCount === 0;
  const chipClass = `item-chip${unsorted ? " unsorted" : ""}${fullySorted ? " fully-sorted" : ""}`;

  const style: React.CSSProperties = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.3 : 1,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      className={chipClass}
      style={style}
      {...listeners}
      {...attributes}
    >
      <span>{item.name}</span>
      <button
        className="chip-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        &times;
      </button>
    </div>
  );
}

// --- Category drop zone ---

function CategoryDropZone({
  questionId,
  category,
  children,
}: {
  questionId: Id<"questions">;
  category: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${questionId}__${category}`,
    data: { questionId, category },
  });

  return (
    <div ref={setNodeRef} className={`drop-zone ${isOver ? "drag-over" : ""}`}>
      {children}
    </div>
  );
}

// --- Question block ---

function QuestionBlock({
  question,
  items,
  assignments,
  onUpdateText,
  onDelete,
  onUnassign,
  onRenameCategory,
  onDeleteCategory,
  onAddCategory,
}: {
  question: Doc<"questions">;
  items: Doc<"items">[];
  assignments: Doc<"assignments">[];
  onUpdateText: (text: string) => void;
  onDelete: () => void;
  onUnassign: (itemId: Id<"items">) => void;
  onRenameCategory: (oldCat: string, newCat: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddCategory: (category: string) => void;
}) {
  const [editingText, setEditingText] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [editingCat, setEditingCat] = useState<number | null>(null);
  const [editCatValue, setEditCatValue] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  function startEditText() {
    setEditText(question.text);
    setEditingText(true);
  }

  function saveText() {
    const val = editText.trim();
    if (val && val !== question.text) onUpdateText(val);
    setEditingText(false);
  }

  function startEditCat(idx: number) {
    setEditCatValue(question.categories[idx]);
    setEditingCat(idx);
  }

  function saveCatEdit() {
    if (editingCat === null) return;
    const val = editCatValue.trim();
    const oldName = question.categories[editingCat];
    if (val && val !== oldName) onRenameCategory(oldName, val);
    setEditingCat(null);
  }

  function addCategory() {
    const val = newCatName.trim();
    if (val) onAddCategory(val);
    setNewCatName("");
    setAddingCat(false);
  }

  return (
    <div className="question-block">
      <div className="question-header">
        {editingText ? (
          <input
            className="inline-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveText();
              if (e.key === "Escape") setEditingText(false);
            }}
            onBlur={saveText}
            autoFocus
          />
        ) : (
          <div className="question-text" onClick={startEditText}>
            {question.text}
          </div>
        )}
        <div className="question-actions">
          <button className="btn-icon" onClick={startEditText} title="Edit">
            &#9998;
          </button>
          <button
            className="btn-icon btn-danger"
            onClick={onDelete}
            title="Delete"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="question-categories">
        {question.categories.map((cat, idx) => {
          const assignedItems = assignments
            .filter((a) => a.category === cat)
            .map((a) => items.find((i) => i._id === a.itemId))
            .filter(Boolean) as Doc<"items">[];

          return (
            <div key={cat} className="category-row">
              <div className="category-label">
                {editingCat === idx ? (
                  <input
                    className="inline-input"
                    value={editCatValue}
                    onChange={(e) => setEditCatValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveCatEdit();
                      if (e.key === "Escape") setEditingCat(null);
                    }}
                    onBlur={saveCatEdit}
                    autoFocus
                  />
                ) : (
                  <span onClick={() => startEditCat(idx)}>{cat}</span>
                )}
                <button
                  className="btn-icon btn-danger cat-delete"
                  onClick={() => onDeleteCategory(cat)}
                  title="Delete category"
                >
                  &times;
                </button>
              </div>
              <CategoryDropZone questionId={question._id} category={cat}>
                {assignedItems.map((item) => (
                  <div key={item._id} className="item-chip assigned">
                    <span>{item.name}</span>
                    <button
                      className="chip-delete"
                      onClick={() => onUnassign(item._id)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {assignedItems.length === 0 && (
                  <span className="drop-hint">Drop projects here</span>
                )}
              </CategoryDropZone>
            </div>
          );
        })}

        <div className="add-category-row">
          {addingCat ? (
            <input
              className="inline-input"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCategory();
                if (e.key === "Escape") {
                  setAddingCat(false);
                  setNewCatName("");
                }
              }}
              onBlur={addCategory}
              placeholder="Category name..."
              autoFocus
            />
          ) : (
            <button
              className="add-category-btn"
              onClick={() => setAddingCat(true)}
            >
              + Add category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Modal ---

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea";
};

function Modal({
  title,
  fields,
  onClose,
  onSave,
}: {
  title: string;
  fields: FieldDef[];
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );

  async function handleSave() {
    await onSave(values);
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>{title}</h3>
        {fields.map((f) => (
          <div key={f.key} className="modal-field">
            <label>{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                value={values[f.key]}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
                placeholder={f.placeholder}
                autoFocus={f === fields[0]}
              />
            ) : (
              <input
                type="text"
                value={values[f.key]}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.value })
                }
                placeholder={f.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                autoFocus={f === fields[0]}
              />
            )}
          </div>
        ))}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
