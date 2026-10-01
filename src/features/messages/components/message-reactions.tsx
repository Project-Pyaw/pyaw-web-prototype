"use client";

import type { RefObject } from "react";

import type { MessageHistoryItem, MessageReaction } from "../types";

const reactionLabels: Record<MessageReaction, string> = {
  THUMBS_UP: "Like",
  HEART: "Heart",
  FACE_WITH_TEARS_OF_JOY: "Laugh",
  OPEN_MOUTH: "Surprised",
  CRY: "Sad",
  ANGRY: "Angry",
};

const reactionEmoji: Record<MessageReaction, string> = {
  THUMBS_UP: "👍",
  HEART: "❤️",
  FACE_WITH_TEARS_OF_JOY: "😂",
  OPEN_MOUTH: "😮",
  CRY: "😢",
  ANGRY: "😠",
};

const supportedReactions = Object.keys(reactionEmoji) as MessageReaction[];

type MessageReactionsProps = Readonly<{
  isPending: (messageId: string, reaction: MessageReaction) => boolean;
  message: MessageHistoryItem;
  onToggle: (
    variables: Readonly<{
      messageId: string;
      reaction: MessageReaction;
      reactedByMe: boolean;
    }>,
  ) => void;
  outgoing: boolean;
  pickerOpen: boolean;
  pickerRef: RefObject<HTMLDivElement | null>;
  onPickerOpenChange: (open: boolean) => void;
}>;

export function MessageReactions({
  isPending,
  message,
  onPickerOpenChange,
  onToggle,
  outgoing,
  pickerOpen,
  pickerRef,
}: MessageReactionsProps) {
  function toggle(reaction: MessageReaction, reactedByMe: boolean): void {
    onToggle({
      messageId: message.id,
      reaction,
      reactedByMe,
    });
  }

  if (message.reactions.length === 0 && !pickerOpen) {
    return null;
  }

  return (
    <div
      className={`relative flex flex-wrap items-center gap-1.5 ${message.reactions.length > 0 ? "mt-1" : "h-0"} ${outgoing ? "justify-end" : "justify-start"}`}
    >
      {message.reactions.map((summary) => (
        <button
          aria-label={`${reactionLabels[summary.reaction]}, ${summary.count} reaction${summary.count === 1 ? "" : "s"}${summary.reactedByMe ? ", selected" : ""}`}
          aria-pressed={summary.reactedByMe}
          className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60 ${
            summary.reactedByMe
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-transparent bg-surface/75 text-foreground hover:border-border hover:bg-surface"
          }`}
          disabled={isPending(message.id, summary.reaction)}
          key={summary.reaction}
          onClick={() => toggle(summary.reaction, summary.reactedByMe)}
          type="button"
        >
          <span aria-hidden="true">{reactionEmoji[summary.reaction]}</span>
          <span>{summary.count}</span>
        </button>
      ))}
      {pickerOpen ? (
        <div
          aria-label="Reaction picker"
          className={`absolute bottom-full z-30 mb-2 flex max-w-[calc(100vw-2rem)] items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-surface p-1 shadow-sm ${outgoing ? "right-0" : "left-0"}`}
          ref={pickerRef}
          role="group"
        >
          {supportedReactions.map((reaction) => {
            const existing = message.reactions.find(
              (summary) => summary.reaction === reaction,
            );
            const reactedByMe = existing?.reactedByMe ?? false;

            return (
              <button
                aria-label={reactionLabels[reaction]}
                aria-pressed={reactedByMe}
                className="grid size-10 place-items-center rounded-lg text-lg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60 sm:size-8 sm:text-base"
                disabled={isPending(message.id, reaction)}
                key={reaction}
                onClick={() => {
                  toggle(reaction, reactedByMe);
                  onPickerOpenChange(false);
                }}
                type="button"
              >
                <span aria-hidden="true">{reactionEmoji[reaction]}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
