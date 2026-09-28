"use client";

import { useState } from "react";

import type { MessageHistoryItem } from "../types";

const actionClassName =
  "flex min-h-9 w-full items-center rounded-md px-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60";

type MessageActionsProps = Readonly<{
  canDelete: boolean;
  canEdit: boolean;
  isPending: boolean;
  message: MessageHistoryItem;
  onDelete: () => void;
  onEdit: () => void;
  onReact: () => void;
  onReply: () => void;
  outgoing: boolean;
}>;

export function MessageActions({
  canDelete,
  canEdit,
  isPending,
  message,
  onDelete,
  onEdit,
  onReact,
  onReply,
  outgoing,
}: MessageActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function copyText(): Promise<void> {
    if (!message.content || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // Clipboard permissions are controlled by the browser.
    } finally {
      setMenuOpen(false);
    }
  }

  function closeMenu(): void {
    setConfirmingDelete(false);
    setMenuOpen(false);
  }

  return (
    <div className="relative">
      <button
        aria-expanded={menuOpen}
        aria-label="Message actions"
        className="grid min-h-9 min-w-9 place-items-center rounded-full border border-border bg-surface text-base text-foreground-muted opacity-100 transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {menuOpen ? (
        <div
          aria-label="Message actions"
          className={`absolute bottom-full z-10 mb-1 w-40 rounded-lg border border-border bg-surface p-1 shadow-sm ${outgoing ? "right-0" : "left-0"}`}
          role="menu"
        >
          {confirmingDelete ? (
            <div className="space-y-2 p-2">
              <p className="text-xs leading-4 text-foreground-muted">
                Delete for everyone?
              </p>
              <div className="flex gap-2">
                <button
                  className="min-h-8 flex-1 rounded-md px-2 text-xs font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
                  onClick={() => setConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="min-h-8 flex-1 rounded-md bg-danger px-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60"
                  disabled={isPending}
                  onClick={() => {
                    onDelete();
                    closeMenu();
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
                className={actionClassName}
                onClick={() => {
                  onReply();
                  closeMenu();
                }}
                role="menuitem"
                type="button"
              >
                Reply
              </button>
              <button
                className={actionClassName}
                onClick={() => {
                  onReact();
                  closeMenu();
                }}
                role="menuitem"
                type="button"
              >
                React
              </button>
              <button
                className={actionClassName}
                onClick={copyText}
                role="menuitem"
                type="button"
              >
                Copy
              </button>
              {canEdit ? (
                <button
                  className={actionClassName}
                  disabled={isPending}
                  onClick={() => {
                    onEdit();
                    closeMenu();
                  }}
                  role="menuitem"
                  type="button"
                >
                  Edit
                </button>
              ) : null}
              {canDelete ? (
                <button
                  className={`${actionClassName} text-danger hover:bg-danger/10`}
                  disabled={isPending}
                  onClick={() => setConfirmingDelete(true)}
                  role="menuitem"
                  type="button"
                >
                  Delete
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
