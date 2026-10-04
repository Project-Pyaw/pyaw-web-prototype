"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { MessageHistoryItem, MessageReaction } from "../types";

const menuItemClassName =
  "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60";

const quickReactions: ReadonlyArray<
  readonly [reaction: MessageReaction, emoji: string, label: string]
> = [
  ["THUMBS_UP", "👍", "Like"],
  ["HEART", "❤️", "Heart"],
  ["FACE_WITH_TEARS_OF_JOY", "😂", "Laugh"],
  ["OPEN_MOUTH", "😮", "Surprised"],
  ["CRY", "😢", "Sad"],
  ["ANGRY", "😡", "Angry"],
];

type MessageActionsProps = Readonly<{
  canDelete: boolean;
  canEdit: boolean;
  isPending: boolean;
  message: MessageHistoryItem;
  onDelete: () => void;
  onEdit: () => void;
  onOpenReactionPicker?: () => void;
  onReply: () => void;
  onToggleReaction: (reaction: MessageReaction, reactedByMe: boolean) => void;
  onMenuOpenChange: (open: boolean) => void;
  outgoing: boolean;
  reactionPickerOpen: boolean;
  useCompactActions: boolean;
  menuOpen: boolean;
}>;

function ActionIcon({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span aria-hidden="true" className="grid size-4 place-items-center">
      {children}
    </span>
  );
}

export function MessageActions({
  canDelete,
  canEdit,
  isPending,
  message,
  onDelete,
  onEdit,
  onOpenReactionPicker,
  onReply,
  onToggleReaction,
  onMenuOpenChange,
  outgoing,
  reactionPickerOpen,
  useCompactActions,
  menuOpen,
}: MessageActionsProps) {
  const interactionRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const reactionTriggerRef = useRef<HTMLButtonElement>(null);
  const wasReactionPickerOpenRef = useRef(false);
  const [railOpen, setRailOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8 });

  useEffect(() => {
    if (wasReactionPickerOpenRef.current && !reactionPickerOpen) {
      requestAnimationFrame(() => reactionTriggerRef.current?.focus());
    }

    wasReactionPickerOpenRef.current = reactionPickerOpen;
  }, [reactionPickerOpen]);

  function closeInteraction(): void {
    setConfirmingDelete(false);
    onMenuOpenChange(false);
    setRailOpen(false);
  }

  async function copyText(): Promise<void> {
    if (!message.content || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // Clipboard permissions are controlled by the browser.
    } finally {
      closeInteraction();
    }
  }

  function reply(): void {
    onReply();
    closeInteraction();
  }

  function openReactionPicker(): void {
    onOpenReactionPicker?.();
    closeInteraction();
  }

  function toggleQuickReaction(reaction: MessageReaction): void {
    const summary = message.reactions.find(
      (item) => item.reaction === reaction,
    );

    onToggleReaction(reaction, summary?.reactedByMe ?? false);
    closeInteraction();
  }

  useLayoutEffect(() => {
    if (!menuOpen) {
      return;
    }

    function positionMenu(): void {
      const trigger = menuTriggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 48 + (canEdit ? 40 : 0) + (canDelete ? 49 : 0);
      const margin = 8;
      const preferredLeft = rect.right - menuWidth;
      const left = Math.max(
        margin,
        Math.min(preferredLeft, window.innerWidth - menuWidth - margin),
      );
      const top =
        rect.bottom + margin + menuHeight <= window.innerHeight
          ? rect.bottom + margin
          : Math.max(margin, rect.top - menuHeight - margin);

      setMenuPosition({ left, top });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);

    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [canDelete, canEdit, menuOpen]);

  useEffect(() => {
    if (!railOpen && !menuOpen) {
      return;
    }

    function closeOnOutsideInteraction(event: PointerEvent): void {
      if (
        event.target instanceof Node &&
        (interactionRef.current?.contains(event.target) ||
          menuRef.current?.contains(event.target))
      ) {
        return;
      }

      setConfirmingDelete(false);
      onMenuOpenChange(false);
      setRailOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        const trigger = menuOpen ? menuTriggerRef.current : null;

        setConfirmingDelete(false);
        onMenuOpenChange(false);
        setRailOpen(false);
        if (trigger) {
          requestAnimationFrame(() => trigger.focus());
        }
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, onMenuOpenChange, railOpen]);

  return (
    <div
      className={`absolute bottom-full z-20 mb-1 ${outgoing ? "right-1" : "left-1"}`}
      ref={interactionRef}
    >
      <button
        aria-expanded={railOpen}
        aria-label="Message actions"
        className="grid size-9 place-items-center rounded-full border border-border bg-surface text-foreground-muted shadow-sm transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:hidden"
        onClick={() => setRailOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className="text-base leading-none">
          ⋯
        </span>
      </button>
      <div
        aria-label="Message quick actions"
        className={`${railOpen ? "flex" : "hidden"} max-w-[calc(100vw-2rem)] items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-surface p-1 shadow-md sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
        role="toolbar"
      >
        {useCompactActions ? (
          <button
            aria-label="React to message"
            className="min-h-10 rounded-lg px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:min-h-7 sm:px-2 sm:text-xs"
            onClick={openReactionPicker}
            ref={reactionTriggerRef}
            type="button"
          >
            React
          </button>
        ) : (
          quickReactions.map(([reaction, emoji, label]) => (
            <button
              aria-label={label}
              aria-pressed={
                message.reactions.find((item) => item.reaction === reaction)
                  ?.reactedByMe ?? false
              }
              className="grid size-10 place-items-center rounded-lg text-lg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:size-7 sm:text-base"
              key={reaction}
              onClick={() => toggleQuickReaction(reaction)}
              type="button"
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))
        )}
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
        <button
          aria-label="Reply"
          className="grid size-10 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:size-7"
          onClick={reply}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m10 7-5 5 5 5M5 12h8a5 5 0 0 1 5 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.9"
            />
          </svg>
        </button>
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-label="More message actions"
            className="grid size-10 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:size-7"
            onClick={() => onMenuOpenChange(!menuOpen)}
            ref={menuTriggerRef}
            type="button"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ⋯
            </span>
          </button>
        </div>
      </div>
      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-label="Message action menu"
              className="fixed z-[60] w-44 rounded-xl border border-border bg-surface p-1 shadow-md"
              ref={menuRef}
              role="menu"
              style={menuPosition}
            >
              {confirmingDelete ? (
                <div className="space-y-2 p-2">
                  <p className="text-xs leading-4 text-foreground-muted">
                    Delete for everyone?
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="min-h-8 flex-1 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
                      onClick={() => setConfirmingDelete(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="min-h-8 flex-1 rounded-lg bg-danger px-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60"
                      disabled={isPending}
                      onClick={() => {
                        onDelete();
                        closeInteraction();
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className={menuItemClassName}
                    onClick={() => void copyText()}
                    role="menuitem"
                    type="button"
                  >
                    <ActionIcon>▣</ActionIcon>Copy
                  </button>
                  {canEdit ? (
                    <button
                      className={menuItemClassName}
                      disabled={isPending}
                      onClick={() => {
                        onEdit();
                        closeInteraction();
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <ActionIcon>✎</ActionIcon>Edit
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      className={`${menuItemClassName} mt-1 border-t border-border pt-2 text-danger hover:bg-danger/10`}
                      disabled={isPending}
                      onClick={() => setConfirmingDelete(true)}
                      role="menuitem"
                      type="button"
                    >
                      <ActionIcon>×</ActionIcon>Delete
                    </button>
                  ) : null}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
