"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";

import { getProfileDisplayName } from "@/features/profile/components/profile-avatar";

import type { BlockedAccount } from "../types";

type BlockConfirmationDialogProps = Readonly<{
  account: BlockedAccount;
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function BlockConfirmationDialog({
  account,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: BlockConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const identity = getProfileDisplayName(
    account.profile?.displayName,
    account.username,
  );

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && !isSubmitting) {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === cancelButtonRef.current) {
      event.preventDefault();
      confirmButtonRef.current?.focus();
    } else if (!event.shiftKey && activeElement === confirmButtonRef.current) {
      event.preventDefault();
      cancelButtonRef.current?.focus();
    }
  }

  return (
    <div
      aria-describedby="block-confirmation-description"
      aria-labelledby="block-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid overscroll-contain place-items-center bg-foreground/20 p-5"
      onKeyDown={handleKeyDown}
      role="alertdialog"
    >
      <form
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2
          className="text-lg font-semibold text-foreground"
          id="block-confirmation-title"
        >
          Block {identity}?
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-foreground-muted"
          id="block-confirmation-description"
        >
          You will no longer be connected, and pending connection requests will
          be cancelled. You can unblock this person later in Settings &amp;
          Profile.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="min-h-10 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-10 rounded-full bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            ref={confirmButtonRef}
            type="submit"
          >
            {isSubmitting ? "Blocking…" : "Block user"}
          </button>
        </div>
      </form>
    </div>
  );
}
