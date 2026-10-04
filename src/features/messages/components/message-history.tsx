"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import { MessageImageAttachment } from "./message-image-attachment";
import { MessageActions } from "./message-actions";
import { MessageReactions } from "./message-reactions";
import { MessageReplyPreview } from "./message-reply-preview";
import type { MessageHistoryItem, OptimisticMessage } from "../types";
import { useMessageHistory } from "../hooks/use-message-history";
import { useMessageActions } from "../hooks/use-message-actions";
import { useMessageReactions } from "../hooks/use-message-reactions";

const MESSAGE_GROUP_GAP_MS = 5 * 60 * 1_000;
const MAX_TEXT_MESSAGE_LENGTH = 4_000;

type MessageHistoryProps = Readonly<{
  conversationId: string;
  conversationType: "DIRECT" | "SELF" | "GROUP";
  counterpart?: Readonly<{
    avatar: string | null;
    presenceStatus?: "ONLINE" | "OFFLINE" | "UNKNOWN";
    name: string;
  }>;
  currentAccountId: string;
  onReadIncoming: (messageId: string) => void;
  onMessageDeleted: (messageId: string) => void;
  onReply: (message: MessageHistoryItem) => void;
  onRetry: (message: OptimisticMessage) => void;
}>;

function isOptimisticMessage(message: object): message is OptimisticMessage {
  return "deliveryState" in message;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMessageDay(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const startOfMessageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const dayDifference = Math.round(
    (startOfToday - startOfMessageDay) / 86_400_000,
  );
  if (dayDifference === 0) {
    return "Today";
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function isSameMessageGroup(
  message: MessageHistoryItem | OptimisticMessage,
  adjacentMessage: MessageHistoryItem | OptimisticMessage | undefined,
  currentAccountId: string,
): boolean {
  if (!adjacentMessage) {
    return false;
  }

  const outgoing =
    isOptimisticMessage(message) ||
    message.sender.accountId === currentAccountId;
  const adjacentOutgoing =
    isOptimisticMessage(adjacentMessage) ||
    adjacentMessage.sender.accountId === currentAccountId;
  const sameSender =
    isOptimisticMessage(message) || isOptimisticMessage(adjacentMessage)
      ? outgoing === adjacentOutgoing
      : message.sender.accountId === adjacentMessage.sender.accountId;

  return (
    sameSender &&
    new Date(adjacentMessage.createdAt).toDateString() ===
      new Date(message.createdAt).toDateString() &&
    Math.abs(
      Date.parse(adjacentMessage.createdAt) - Date.parse(message.createdAt),
    ) <= MESSAGE_GROUP_GAP_MS
  );
}

function MessageHistorySkeleton({
  showIncomingAvatar,
}: Readonly<{
  showIncomingAvatar: boolean;
}>) {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-end gap-2"
    >
      <span className="sr-only" role="status">
        Loading messages…
      </span>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-44 max-w-[78%] rounded-2xl" />
      </div>
      <div className="flex items-end gap-2">
        {showIncomingAvatar ? (
          <Skeleton className="size-8 shrink-0 rounded-full" />
        ) : null}
        <div className="space-y-1">
          <Skeleton className="h-16 w-56 max-w-[82%] rounded-2xl" />
          <Skeleton className="h-10 w-32 max-w-[58%] rounded-2xl" />
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-52 max-w-[80%] rounded-2xl" />
      </div>
    </div>
  );
}

function DeliveryCheck({
  state,
}: Readonly<{
  state: "sending" | "sent" | "seen";
}>) {
  const label =
    state === "sending" ? "Sending" : state === "seen" ? "Seen" : "Sent";
  const colorClassName =
    state === "sending" ? "text-foreground-muted" : "text-primary";

  return (
    <span
      aria-label={label}
      className={`inline-flex ${colorClassName}`}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        viewBox="0 0 18 12"
      >
        <path
          d="m1 6 3 3 5-7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        {state === "seen" ? (
          <path
            d="m6 6 3 3 5-7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        ) : null}
      </svg>
    </span>
  );
}

export function MessageHistory({
  conversationId,
  conversationType,
  counterpart,
  currentAccountId,
  onReadIncoming,
  onMessageDeleted,
  onReply,
  onRetry,
}: MessageHistoryProps) {
  const history = useMessageHistory(conversationId, true);
  const messageActions = useMessageActions(conversationId);
  const messageReactions = useMessageReactions(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousScrollRef = useRef<{
    height: number;
    top: number;
  } | null>(null);
  const loadedConversationIdRef = useRef<string | null>(null);
  const shouldFollowLatestRef = useRef(true);
  const onReadIncomingRef = useRef(onReadIncoming);
  const messageElementRefs = useRef(new Map<string, HTMLElement>());
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [messageActionError, setMessageActionError] = useState<string | null>(
    null,
  );
  const [messageActionErrorId, setMessageActionErrorId] = useState<
    string | null
  >(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    string | null
  >(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(
    null,
  );
  const messages =
    history.data?.pages
      .toReversed()
      .flatMap((page) => page.items.toReversed())
      .filter(
        (message) =>
          message.type === "TEXT" &&
          ((!isOptimisticMessage(message) && message.deletedAt !== null) ||
            Boolean(message.content) ||
            message.attachments.some(
              (attachment) => attachment.kind === "IMAGE",
            )),
      ) ?? [];
  const isEmpty =
    !history.isPending && !history.isError && messages.length === 0;
  const hasActiveReactionPickerMessage = Boolean(
    reactionPickerMessageId &&
    messages.some(
      (message) =>
        !isOptimisticMessage(message) &&
        message.id === reactionPickerMessageId &&
        message.deletedAt === null,
    ),
  );
  const latestIncomingMessage = messages.findLast(
    (message): message is MessageHistoryItem =>
      !isOptimisticMessage(message) &&
      message.sender.accountId !== currentAccountId,
  );

  onReadIncomingRef.current = onReadIncoming;

  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || loadedConversationIdRef.current === conversationId) {
      return;
    }

    previousScrollRef.current = null;
    shouldFollowLatestRef.current = true;

    if (history.data) {
      container.scrollTop = container.scrollHeight;
      loadedConversationIdRef.current = conversationId;
    }
  }, [conversationId, history.data]);

  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || !history.data || history.isFetchingNextPage) {
      return;
    }

    const previousScroll = previousScrollRef.current;

    if (previousScroll) {
      container.scrollTop =
        previousScroll.top + (container.scrollHeight - previousScroll.height);
      previousScrollRef.current = null;
      return;
    }

    if (shouldFollowLatestRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [history.data, history.isFetchingNextPage]);

  useEffect(() => {
    if (
      conversationType === "SELF" ||
      !history.data ||
      !latestIncomingMessage ||
      !shouldFollowLatestRef.current ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    onReadIncomingRef.current(latestIncomingMessage.id);
  }, [conversationType, history.data, latestIncomingMessage]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        conversationType === "SELF" ||
        document.visibilityState !== "visible" ||
        !shouldFollowLatestRef.current ||
        !latestIncomingMessage
      ) {
        return;
      }

      onReadIncomingRef.current(latestIncomingMessage.id);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [conversationType, latestIncomingMessage]);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    cancelEditing();
    setReactionPickerMessageId(null);
    setOpenMessageMenuId(null);
  }, [conversationId]);

  useEffect(() => {
    if (!reactionPickerMessageId) {
      return;
    }

    if (!hasActiveReactionPickerMessage) {
      setReactionPickerMessageId(null);
      return;
    }

    function closeOnOutsideInteraction(event: PointerEvent): void {
      if (
        event.target instanceof Node &&
        reactionPickerRef.current?.contains(event.target)
      ) {
        return;
      }

      setReactionPickerMessageId(null);
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setReactionPickerMessageId(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [hasActiveReactionPickerMessage, reactionPickerMessageId]);

  function handleScroll() {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    shouldFollowLatestRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      96;

    if (
      conversationType !== "SELF" &&
      shouldFollowLatestRef.current &&
      latestIncomingMessage &&
      document.visibilityState === "visible"
    ) {
      onReadIncomingRef.current(latestIncomingMessage.id);
    }
  }

  function loadOlderMessages() {
    const container = scrollRef.current;

    if (!history.hasNextPage || history.isFetchingNextPage) {
      return;
    }

    if (container) {
      previousScrollRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop,
      };
    }

    history.fetchNextPage();
  }

  function scrollToMessage(messageId: string) {
    const messageElement = messageElementRefs.current.get(messageId);

    if (!messageElement) {
      return;
    }

    messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimeoutRef.current = null;
    }, 1_200);
  }

  function beginEditing(message: MessageHistoryItem): void {
    setEditingDraft(message.content ?? "");
    setEditingMessageId(message.id);
    setMessageActionError(null);
    setMessageActionErrorId(null);
  }

  function cancelEditing(): void {
    setEditingDraft("");
    setEditingMessageId(null);
    setMessageActionError(null);
    setMessageActionErrorId(null);
  }

  async function saveEdit(message: MessageHistoryItem): Promise<void> {
    const content = editingDraft.trim();

    if (!content) {
      setMessageActionError("A message cannot be empty.");
      setMessageActionErrorId(message.id);
      return;
    }

    if (content.length > MAX_TEXT_MESSAGE_LENGTH) {
      setMessageActionError("Messages can contain up to 4,000 characters.");
      setMessageActionErrorId(message.id);
      return;
    }

    const result = await messageActions.edit(message.id, content);

    if (result.ok) {
      cancelEditing();
      return;
    }

    setMessageActionError(
      result.code === "MESSAGE_EDIT_ATTACHMENTS_UNSUPPORTED"
        ? "Messages with attachments cannot be edited."
        : result.message,
    );
    setMessageActionErrorId(message.id);
  }

  async function deleteForEveryone(message: MessageHistoryItem): Promise<void> {
    const result = await messageActions.remove(message.id);

    if (result.ok) {
      onMessageDeleted(message.id);
      return;
    }

    setMessageActionError(result.message);
    setMessageActionErrorId(message.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-surface-muted px-5 py-6 sm:px-8"
        onScroll={handleScroll}
      >
        {history.isPending ? (
          <MessageHistorySkeleton
            showIncomingAvatar={conversationType !== "SELF"}
          />
        ) : null}
        <div
          className={`mx-auto flex min-h-full w-full max-w-5xl flex-col gap-px ${
            isEmpty ? "justify-center" : "justify-end"
          } ${history.isPending ? "hidden" : ""}`}
        >
          {history.hasNextPage ? (
            <button
              className="mx-auto mb-3 min-h-10 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              disabled={history.isFetchingNextPage}
              onClick={loadOlderMessages}
              type="button"
            >
              {history.isFetchingNextPage
                ? "Loading older messages…"
                : "Load older messages"}
            </button>
          ) : null}
          {history.isError ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-danger" role="alert">
                Messages are unavailable right now.
              </p>
              <button
                className="min-h-10 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
                onClick={() => void history.refetch()}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : null}
          {isEmpty ? (
            <p className="text-center text-sm text-foreground-muted">
              {conversationType === "SELF"
                ? "No notes yet."
                : "No messages yet."}
            </p>
          ) : null}
          {messages.map((message, index) => {
            const optimistic = isOptimisticMessage(message);
            const deleted = !optimistic && message.deletedAt !== null;
            const outgoing =
              optimistic || message.sender.accountId === currentAccountId;
            const seen =
              !optimistic &&
              outgoing &&
              message.readReceipt?.accountId !== currentAccountId;
            const deliveryState = optimistic
              ? message.deliveryState
              : seen
                ? "seen"
                : "sent";
            const previousMessage = messages[index - 1];
            const groupStart = !isSameMessageGroup(
              message,
              previousMessage,
              currentAccountId,
            );
            const groupEnd = !isSameMessageGroup(
              message,
              messages[index + 1],
              currentAccountId,
            );
            const showDateSeparator =
              !previousMessage ||
              new Date(previousMessage.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();
            const dayLabel = showDateSeparator
              ? formatMessageDay(message.createdAt)
              : null;
            const showIncomingAvatar =
              !outgoing &&
              conversationType !== "SELF" &&
              groupEnd &&
              (conversationType === "GROUP" || counterpart);
            const senderName =
              !optimistic && !outgoing
                ? getProfileDisplayName(
                    message.sender.profile?.displayName,
                    message.sender.username,
                  )
                : null;
            const imageAttachments = message.attachments.filter(
              (attachment) => attachment.kind === "IMAGE",
            );
            const replyTo = message.replyTo;
            const reactionError = optimistic
              ? undefined
              : messageReactions.getError(message.id);
            const isImageOnlyMessage =
              imageAttachments.length > 0 && !message.content && !replyTo;
            const canDelete =
              !optimistic &&
              !deleted &&
              message.type === "TEXT" &&
              message.sender.accountId === currentAccountId;
            const canEdit = canDelete && message.attachments.length === 0;
            const editing = !optimistic && editingMessageId === message.id;
            const messageBody = (
              <div className="min-w-0 max-w-[88%] sm:max-w-[min(52rem,76vw)]">
                <div
                  className={`relative text-sm leading-5 ${
                    deleted
                      ? "rounded-2xl border border-border bg-surface px-3.5 py-2 text-foreground-muted"
                      : isImageOnlyMessage
                        ? "p-0"
                        : outgoing
                          ? `relative rounded-[1.6rem] bg-message-outgoing px-4 py-3 text-message-outgoing-foreground ${groupStart ? "rounded-tr-lg" : "rounded-tr-xl"} ${groupEnd ? "rounded-br-lg" : "rounded-br-xl"}`
                          : `relative rounded-[1.6rem] border border-border/70 bg-message-incoming px-4 py-3 text-message-incoming-foreground ${groupStart ? "rounded-tl-lg" : "rounded-tl-xl"} ${groupEnd ? "rounded-bl-lg" : "rounded-bl-xl"}`
                  }`}
                >
                  {deleted ? (
                    <p className="italic text-foreground-muted">
                      This message was deleted
                    </p>
                  ) : editing ? (
                    <div className="space-y-2">
                      <label
                        className="sr-only"
                        htmlFor={`message-${message.id}`}
                      >
                        Edit message
                      </label>
                      <textarea
                        className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-foreground outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
                        id={`message-${message.id}`}
                        maxLength={MAX_TEXT_MESSAGE_LENGTH}
                        onChange={(event) =>
                          setEditingDraft(event.target.value)
                        }
                        value={editingDraft}
                      />
                      {messageActionErrorId === message.id &&
                      messageActionError ? (
                        <p className="text-xs text-danger" role="alert">
                          {messageActionError}
                        </p>
                      ) : null}
                      <div className="flex justify-end gap-2">
                        <button
                          className="min-h-8 rounded-md px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
                          disabled={messageActions.isPending(message.id)}
                          onClick={cancelEditing}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="min-h-8 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-wait disabled:opacity-60"
                          disabled={messageActions.isPending(message.id)}
                          onClick={() => void saveEdit(message)}
                          type="button"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {replyTo ? (
                        <div className="mb-2.5">
                          <MessageReplyPreview
                            onClick={() => scrollToMessage(replyTo.messageId)}
                            outgoing={outgoing}
                            replyTo={replyTo}
                          />
                        </div>
                      ) : null}
                      {imageAttachments.map((attachment) => (
                        <div className="mb-2 last:mb-0" key={attachment.id}>
                          <MessageImageAttachment
                            attachment={attachment}
                            localPreviewUrl={
                              optimistic
                                ? message.localImagePreviewUrl
                                : undefined
                            }
                          />
                        </div>
                      ))}
                      {message.content ? (
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      ) : null}
                      {!optimistic && !deleted ? (
                        <MessageActions
                          canDelete={canDelete}
                          canEdit={canEdit}
                          isPending={messageActions.isPending(message.id)}
                          message={message}
                          onDelete={() => void deleteForEveryone(message)}
                          onEdit={() => beginEditing(message)}
                          onReply={() => onReply(message)}
                          menuOpen={openMessageMenuId === message.id}
                          onMenuOpenChange={(open) => {
                            setOpenMessageMenuId(open ? message.id : null);
                            if (open) {
                              setReactionPickerMessageId(null);
                            }
                          }}
                          onToggleReaction={(reaction, reactedByMe) =>
                            messageReactions.toggleReaction({
                              messageId: message.id,
                              reaction,
                              reactedByMe,
                            })
                          }
                          outgoing={outgoing}
                        />
                      ) : null}
                    </>
                  )}
                </div>
                {!optimistic && !deleted ? (
                  <MessageReactions
                    isPending={messageReactions.isPending}
                    message={message}
                    onPickerOpenChange={(open) => {
                      setReactionPickerMessageId(open ? message.id : null);
                      if (open) {
                        setOpenMessageMenuId(null);
                      }
                    }}
                    onToggle={messageReactions.toggleReaction}
                    outgoing={outgoing}
                    pickerOpen={reactionPickerMessageId === message.id}
                    pickerRef={reactionPickerRef}
                  />
                ) : null}
                {!optimistic && !deleted && reactionError ? (
                  <p className="mt-1 px-1 text-xs text-danger" role="alert">
                    {reactionError}
                  </p>
                ) : null}
                <div
                  className={`mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-foreground-muted ${
                    outgoing ? "justify-end" : "justify-start"
                  }`}
                >
                  <time dateTime={message.createdAt}>
                    {formatTimestamp(message.createdAt)}
                  </time>
                  {!optimistic && message.editedAt ? <span>Edited</span> : null}
                  {outgoing && deliveryState !== "failed" ? (
                    <DeliveryCheck state={deliveryState} />
                  ) : null}
                  {deliveryState === "failed" ? (
                    <span className="font-medium text-danger">Failed</span>
                  ) : null}
                </div>
                {!optimistic &&
                !editing &&
                messageActionErrorId === message.id ? (
                  <p className="mt-1 px-1 text-xs text-danger" role="alert">
                    {messageActionError}
                  </p>
                ) : null}
                {optimistic && message.deliveryState === "failed" ? (
                  <div className="mt-1 flex items-center justify-end gap-2 text-xs text-danger">
                    <button
                      className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
                      onClick={() => onRetry(message)}
                      type="button"
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
            );

            return (
              <div key={optimistic ? message.clientMessageId : message.id}>
                {dayLabel ? (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground-muted">
                      {dayLabel}
                    </span>
                  </div>
                ) : null}
                <article
                  className={`group flex transition-shadow ${outgoing ? "justify-end" : "justify-start"} ${groupEnd ? "mb-4" : ""} ${
                    !optimistic && highlightedMessageId === message.id
                      ? "rounded-xl ring-2 ring-focus/40 ring-offset-2 ring-offset-surface-muted"
                      : ""
                  }`}
                  ref={(element) => {
                    if (optimistic) {
                      return;
                    }

                    if (element) {
                      messageElementRefs.current.set(message.id, element);
                      return;
                    }

                    messageElementRefs.current.delete(message.id);
                  }}
                >
                  {!outgoing && conversationType !== "SELF" ? (
                    <div className="relative max-w-full pl-10">
                      {conversationType === "GROUP" &&
                      groupStart &&
                      senderName ? (
                        <p className="mb-1 truncate px-1 text-xs font-semibold text-foreground-muted">
                          {senderName}
                        </p>
                      ) : null}
                      {showIncomingAvatar ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 z-10 overflow-visible"
                        >
                          <ProfileAvatar
                            name={
                              conversationType === "GROUP"
                                ? (senderName ?? "Pyaw member")
                                : (counterpart?.name ?? "Pyaw member")
                            }
                            presenceStatus={
                              conversationType === "GROUP"
                                ? undefined
                                : counterpart?.presenceStatus
                            }
                            size="sm"
                            url={
                              conversationType === "GROUP"
                                ? optimistic
                                  ? null
                                  : (message.sender.profile?.avatar ?? null)
                                : (counterpart?.avatar ?? null)
                            }
                          />
                        </span>
                      ) : null}
                      {messageBody}
                    </div>
                  ) : (
                    messageBody
                  )}
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
