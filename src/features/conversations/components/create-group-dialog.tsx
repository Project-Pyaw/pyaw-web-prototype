"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/api-error";
import { useConnections } from "@/features/connections/hooks/use-connections";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import { useCreateGroupConversation } from "../hooks/use-conversations";

type CreateGroupDialogProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}>;

function createClientGroupId(): string {
  return crypto.randomUUID();
}

function getCreateError(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.code === "GROUP_IDEMPOTENCY_CONFLICT"
  ) {
    return "This group request no longer matches its original details. Close this dialog and start again.";
  }

  return "Unable to create the group. Check your connection and try again.";
}

export function CreateGroupDialog({
  isOpen,
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const connections = useConnections(isOpen);
  const createGroup = useCreateGroupConversation();
  const [title, setTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [clientGroupId, setClientGroupId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const memberListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !clientGroupId) {
      setClientGroupId(createClientGroupId());
    }
  }, [clientGroupId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setSelectedMemberIds(new Set());
      setClientGroupId(null);
      setValidationError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape" && !createGroup.isPending) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", closeOnEscape);
    }

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [createGroup.isPending, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const selectedMembers = (connections.data?.items ?? []).filter((connection) =>
    selectedMemberIds.has(connection.counterpart.id),
  );
  const normalizedTitle = title.trim();
  function toggleMember(accountId: string): void {
    setValidationError(null);
    setSelectedMemberIds((current) => {
      const next = new Set(current);

      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }

      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!normalizedTitle) {
      setValidationError("Enter a group name.");
      titleInputRef.current?.focus();
      return;
    }

    if (selectedMemberIds.size === 0) {
      setValidationError("Select at least 1 person.");
      memberListRef.current?.focus();
      return;
    }

    if (!clientGroupId) {
      return;
    }

    createGroup.mutate(
      {
        clientGroupId,
        memberAccountIds: [...selectedMemberIds],
        title: normalizedTitle,
      },
      {
        onSuccess: (conversation) => onCreated(conversation.id),
      },
    );
  }

  return (
    <div
      aria-labelledby="create-group-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-foreground/20 p-0 sm:place-items-center sm:p-6"
      role="dialog"
    >
      <form
        className="max-h-[min(44rem,100dvh)] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-border bg-surface p-5 sm:max-w-xl sm:rounded-2xl"
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-bold text-foreground"
              id="create-group-title"
            >
              New group
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Choose people you already know on Pyaw.
            </p>
          </div>
          <button
            aria-label="Close new group"
            className="grid size-10 shrink-0 place-items-center rounded-full text-xl text-foreground-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:opacity-50"
            disabled={createGroup.isPending}
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-5">
          <label
            className="block text-sm font-semibold text-foreground"
            htmlFor="group-title"
          >
            Group name
          </label>
          <input
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-base text-foreground outline-none placeholder:text-foreground-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
            id="group-title"
            maxLength={150}
            name="group-title"
            onChange={(event) => {
              setTitle(event.target.value);
              setValidationError(null);
            }}
            placeholder="For example, Weekend plans…"
            ref={titleInputRef}
            value={title}
          />
          {title.trim().length === 0 ? (
            <p className="mt-1.5 text-sm text-foreground-muted">
              Add a name for the group.
            </p>
          ) : null}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-foreground">
            Add people
          </legend>
          <p className="mt-1 text-sm text-foreground-muted">
            Select at least 1 established person.
          </p>
          <div
            aria-busy={connections.isPending}
            className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-2"
            ref={memberListRef}
            tabIndex={-1}
          >
            {connections.isPending ? (
              <p className="p-3 text-sm text-foreground-muted" role="status">
                Loading people…
              </p>
            ) : null}
            {connections.isError ? (
              <p className="p-3 text-sm text-danger" role="alert">
                People are unavailable right now. Try again before creating a
                group.
              </p>
            ) : null}
            {!connections.isPending &&
            !connections.isError &&
            connections.data?.items.length === 0 ? (
              <p className="p-3 text-sm text-foreground-muted">
                Add an established connection before creating a group.
              </p>
            ) : null}
            {connections.data?.items.map((connection) => {
              const person = connection.counterpart;
              const name = getProfileDisplayName(
                person.profile?.displayName,
                person.username,
              );
              const checked = selectedMemberIds.has(person.id);

              return (
                <label
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted focus-within:ring-2 focus-within:ring-focus/20"
                  key={connection.id}
                >
                  <input
                    checked={checked}
                    className="size-4 accent-primary"
                    disabled={createGroup.isPending}
                    name="group-members"
                    onChange={() => toggleMember(person.id)}
                    type="checkbox"
                  />
                  <ProfileAvatar
                    name={name}
                    size="sm"
                    url={person.profile?.avatar ?? null}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {name}
                    </span>
                    {person.username ? (
                      <span className="block truncate text-sm text-foreground-muted">
                        @{person.username}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {selectedMembers.length > 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">
            {selectedMembers.length}{" "}
            {selectedMembers.length === 1 ? "person" : "people"} selected
          </p>
        ) : null}
        {createGroup.isError ? (
          <p
            aria-live="polite"
            className="mt-3 text-sm text-danger"
            role="alert"
          >
            {getCreateError(createGroup.error)}
          </p>
        ) : null}
        {validationError ? (
          <p
            aria-live="polite"
            className="mt-3 text-sm text-danger"
            role="alert"
          >
            {validationError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="min-h-11 rounded-full px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:opacity-50"
            disabled={createGroup.isPending}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={createGroup.isPending || connections.isError}
            type="submit"
          >
            {createGroup.isPending ? "Creating…" : "Create group"}
          </button>
        </div>
      </form>
    </div>
  );
}
