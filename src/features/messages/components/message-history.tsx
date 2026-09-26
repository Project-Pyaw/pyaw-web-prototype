"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";

import type { MessageHistoryItem, OptimisticMessage } from "../types";
import { useMessageHistory } from "../hooks/use-message-history";

const MESSAGE_GROUP_GAP_MS = 5 * 60 * 1_000;

type MessageHistoryProps = Readonly<{
  conversationId: string;
  conversationType: "DIRECT" | "SELF";
  counterpart?: Readonly<{
    avatar: string | null;
    name: string;
  }>;
  currentAccountId: string;
  onReadIncoming: (messageId: string) => void;
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

function isGroupEnd(
  message: MessageHistoryItem | OptimisticMessage,
  nextMessage: MessageHistoryItem | OptimisticMessage | undefined,
  currentAccountId: string,
): boolean {
  const outgoing =
    isOptimisticMessage(message) ||
    message.sender.accountId === currentAccountId;
  const nextOutgoing = nextMessage
    ? isOptimisticMessage(nextMessage) ||
      nextMessage.sender.accountId === currentAccountId
    : undefined;

  return (
    !nextMessage ||
    outgoing !== nextOutgoing ||
    new Date(nextMessage.createdAt).toDateString() !==
      new Date(message.createdAt).toDateString() ||
    Date.parse(nextMessage.createdAt) - Date.parse(message.createdAt) >
      MESSAGE_GROUP_GAP_MS
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
  onRetry,
}: MessageHistoryProps) {
  const history = useMessageHistory(conversationId, true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousScrollRef = useRef<{
    height: number;
    top: number;
  } | null>(null);
  const loadedConversationIdRef = useRef<string | null>(null);
  const shouldFollowLatestRef = useRef(true);
  const onReadIncomingRef = useRef(onReadIncoming);
  const messages =
    history.data?.pages
      .toReversed()
      .flatMap((page) => page.items.toReversed())
      .filter((message) => message.type === "TEXT" && message.content) ?? [];
  const isEmpty =
    !history.isPending && !history.isError && messages.length === 0;
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
      !history.data ||
      !latestIncomingMessage ||
      !shouldFollowLatestRef.current ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    onReadIncomingRef.current(latestIncomingMessage.id);
  }, [history.data, latestIncomingMessage]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (
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
  }, [latestIncomingMessage]);

  function handleScroll() {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    shouldFollowLatestRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      96;

    if (
      shouldFollowLatestRef.current &&
      latestIncomingMessage &&
      document.visibilityState === "visible"
    ) {
      onReadIncomingRef.current(latestIncomingMessage.id);
    }
  }

  function loadOlderMessages() {
    const container = scrollRef.current;

    if (container) {
      previousScrollRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop,
      };
    }

    history.fetchNextPage();
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
            showIncomingAvatar={conversationType === "DIRECT"}
          />
        ) : null}
        <div
          className={`mx-auto flex min-h-full w-full max-w-5xl flex-col gap-1 ${
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
            <p className="text-center text-sm text-danger" role="alert">
              Messages are unavailable right now.
            </p>
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
            const groupEnd = isGroupEnd(
              message,
              messages[index + 1],
              currentAccountId,
            );
            const previousMessage = messages[index - 1];
            const showDateSeparator =
              !previousMessage ||
              new Date(previousMessage.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();
            const dayLabel = showDateSeparator
              ? formatMessageDay(message.createdAt)
              : null;
            const showIncomingAvatar =
              !outgoing &&
              conversationType === "DIRECT" &&
              groupEnd &&
              counterpart;
            const showIncomingTail =
              !outgoing && conversationType === "DIRECT" && groupEnd;

            const messageBody = (
              <div className="min-w-0 max-w-[85%] sm:max-w-[min(36rem,70vw)]">
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm leading-5 shadow-sm ${
                    outgoing
                      ? "rounded-tr-md bg-message-outgoing text-message-outgoing-foreground"
                      : "border border-border/70 bg-message-incoming text-message-incoming-foreground"
                  } ${
                    showIncomingTail
                      ? "relative rounded-bl-md after:absolute after:-bottom-px after:-left-1 after:size-3 after:bg-message-incoming after:[clip-path:polygon(100%_0,100%_100%,0_100%)]"
                      : ""
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
                <div
                  className={`mt-1 flex items-center gap-1.5 px-1 text-[11px] text-foreground-muted ${
                    outgoing ? "justify-end" : "justify-start"
                  }`}
                >
                  <time dateTime={message.createdAt}>
                    {formatTimestamp(message.createdAt)}
                  </time>
                  {outgoing && deliveryState !== "failed" ? (
                    <DeliveryCheck state={deliveryState} />
                  ) : null}
                  {deliveryState === "failed" ? (
                    <span className="font-medium text-danger">Failed</span>
                  ) : null}
                </div>
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
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground-muted shadow-sm">
                      {dayLabel}
                    </span>
                  </div>
                ) : null}
                <article
                  className={`flex ${outgoing ? "justify-end" : "justify-start"} ${groupEnd ? "mb-3" : ""}`}
                >
                  {!outgoing && conversationType === "DIRECT" ? (
                    <div className="flex max-w-full items-end gap-2">
                      {showIncomingAvatar ? (
                        <span aria-hidden="true">
                          <ProfileAvatar
                            name={counterpart.name}
                            size="sm"
                            url={counterpart.avatar}
                          />
                        </span>
                      ) : (
                        <span aria-hidden="true" className="size-8 shrink-0" />
                      )}
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
