import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Filter,
} from "lucide-react";
import { BLOCK_TYPES, BLOCK_BY_TYPE, createBlock, blockSummary, newBlockId } from "./blockTypes";
import { cn } from "../../utils/cn";

/**
 * The visual builder's canvas: an ordered, reorderable list of block cards.
 *
 * Drag-and-drop uses the native HTML5 API rather than a library — the list is
 * short, vertical and single-column, which is the one case native DnD handles
 * well. Arrow buttons are kept alongside it because dragging is awkward on
 * touch and impossible with a keyboard.
 */

function AddBlockMenu({ onAdd, align = "left" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/15 dark:text-white/50"
      >
        <Plus className="h-4 w-4" />
        Add a block
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-away layer, below the menu but above everything else. */}
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-30 mt-2 w-[290px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[var(--admin-card,#1b2320)]",
                align === "right" ? "right-0" : "left-0",
              )}
            >
              <div className="max-h-[340px] overflow-y-auto">
                {BLOCK_TYPES.map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => {
                      onAdd(def.type);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60">
                      <def.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-gray-800 dark:text-white/85">
                        {def.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-gray-400">
                        {def.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BlockCanvas({ blocks, selectedId, onSelect, onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const update = (next) => onChange(next);

  const move = (from, to) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };

  const add = (type) => {
    const block = createBlock(type);
    if (!block) return;
    update([...blocks, block]);
    onSelect(block.id);
  };

  const duplicate = (index) => {
    const copy = { ...blocks[index], id: newBlockId() };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    update(next);
    onSelect(copy.id);
  };

  const remove = (index) => {
    const removed = blocks[index];
    update(blocks.filter((_, i) => i !== index));
    if (selectedId === removed.id) onSelect(null);
  };

  const toggleHidden = (index) => {
    const next = [...blocks];
    next[index] = { ...next[index], hidden: !next[index].hidden };
    update(next);
  };

  return (
    <div className="space-y-2">
      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-white/10">
          <p className="text-sm text-gray-500 dark:text-white/60">This email has no blocks yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Add one below, or hit <strong>Revert to default</strong> to start from the shipped
            version.
          </p>
        </div>
      )}

      {blocks.map((block, i) => {
        const def = BLOCK_BY_TYPE[block.type];
        const selected = block.id === selectedId;
        const isDropTarget = overIndex === i && dragIndex !== null && dragIndex !== i;

        return (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
              // Firefox refuses to start a drag without data on the transfer.
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onClick={() => onSelect(block.id)}
            className={cn(
              "group cursor-pointer rounded-xl border bg-white px-2.5 py-2 transition-all dark:bg-white/[0.03]",
              selected
                ? "border-accent shadow-[0_0_0_3px_rgba(var(--tenant-accent-rgb,16,185,129),0.12)]"
                : "border-gray-100 hover:border-gray-200 dark:border-white/10 dark:hover:border-white/20",
              isDropTarget && "border-accent border-dashed",
              dragIndex === i && "opacity-40",
              block.hidden && "opacity-55",
            )}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-gray-300 active:cursor-grabbing sm:block dark:text-white/20" />

              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60">
                {def ? <def.icon className="h-3.5 w-3.5" /> : "?"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-white/80">
                    {def?.label || block.type}
                  </span>
                  {block.showIf && (
                    <span
                      title={`Only shown when ${block.showIf}`}
                      className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-px font-mono text-[9px] text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                    >
                      <Filter className="h-2.5 w-2.5" />
                      {block.showIf}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-gray-400">{blockSummary(block)}</p>
              </div>

              {/* Always visible on touch — there is no hover event to reveal
                  them with — and on the selected card at any size. */}
              <div
                className={cn(
                  "flex shrink-0 items-center gap-0.5 transition-opacity",
                  selected ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <IconBtn title="Move up" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  title="Move down"
                  onClick={() => move(i, i + 1)}
                  disabled={i === blocks.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  title={block.hidden ? "Show this block" : "Hide without deleting"}
                  onClick={() => toggleHidden(i)}
                >
                  {block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </IconBtn>
                <IconBtn title="Duplicate" onClick={() => duplicate(i)}>
                  <Copy className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn title="Delete" danger onClick={() => remove(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-1">
        <AddBlockMenu onAdd={add} />
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-md transition-colors",
        disabled
          ? "cursor-not-allowed text-gray-200 dark:text-white/10"
          : danger
            ? "text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}
