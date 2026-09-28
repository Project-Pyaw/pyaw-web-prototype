"use client";

import { useState } from "react";

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
}>;

export function MessageReactions({
  isPending,
  message,
  onToggle,
  outgoing,
}: MessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function toggle(reaction: MessageReaction, reactedByMe: boolean): void {
    onToggle({
      messageId: message.id,
      reaction,
      reactedByMe,
    });
  }

  return (
    <div
      className={`relative mt-1 flex flex-wrap items-center gap-1 ${outgoing ? "justify-end" : "justify-start"}`}
    >
      {message.reactions.map((summary) => (
        <button
          aria-label={`${reactionLabels[summary.reaction]}, ${summary.count} reaction${summary.count === 1 ? "" : "s"}${summary.reactedByMe ? ", selected" : ""}`}
          aria-pressed={summary.reactedByMe}
          className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60 ${
            summary.reactedByMe
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface text-foreground hover:bg-surface-muted"
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
      <button
        aria-expanded={pickerOpen}
        aria-label="Add reaction"
        className="min-h-8 rounded-full border border-border bg-surface px-2 text-sm text-foreground-muted opacity-100 transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        onClick={() => setPickerOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true">☺</span>
      </button>
      {pickerOpen ? (
        <div
          aria-label="Reaction picker"
          className={`absolute bottom-full z-10 mb-1 flex min-h-10 items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-sm ${outgoing ? "right-0" : "left-0"}`}
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
                className="grid size-8 place-items-center rounded-full text-base transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60"
                disabled={isPending(message.id, reaction)}
                key={reaction}
                onClick={() => {
                  toggle(reaction, reactedByMe);
                  setPickerOpen(false);
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
