"use client";

import { useLayoutEffect, useRef } from "react";

import { useMessageHistory } from "../hooks/use-message-history";

type MessageHistoryProps = Readonly<{
  conversationId: string;
  conversationType: "DIRECT" | "SELF";
  currentAccountId: string;
}>;

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MessageHistory({
  conversationId,
  conversationType,
  currentAccountId,
}: MessageHistoryProps) {
  const history = useMessageHistory(conversationId, true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousScrollRef = useRef<{
    height: number;
    top: number;
  } | null>(null);
  const loadedConversationIdRef = useRef<string | null>(null);
  const messages =
    history.data?.pages
      .toReversed()
      .flatMap((page) => page.items.toReversed())
      .filter((message) => message.type === "TEXT" && message.content) ?? [];

  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || loadedConversationIdRef.current === conversationId) {
      return;
    }

    if (history.data) {
      container.scrollTop = container.scrollHeight;
      loadedConversationIdRef.current = conversationId;
    }
  }, [conversationId, history.data]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const previousScroll = previousScrollRef.current;

    if (!container || !previousScroll || history.isFetchingNextPage) {
      return;
    }

    container.scrollTop =
      previousScroll.top + (container.scrollHeight - previousScroll.height);
    previousScrollRef.current = null;
  }, [history.data, history.isFetchingNextPage]);

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
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-2">
          {history.hasNextPage ? (
            <button
              className="mx-auto mb-3 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={history.isFetchingNextPage}
              onClick={loadOlderMessages}
              type="button"
            >
              {history.isFetchingNextPage
                ? "Loading older messages…"
                : "Load older messages"}
            </button>
          ) : null}
          {history.isPending ? (
            <p
              className="text-center text-sm text-foreground-muted"
              role="status"
            >
              Loading messages…
            </p>
          ) : null}
          {history.isError ? (
            <p className="text-center text-sm text-danger" role="alert">
              Messages are unavailable right now.
            </p>
          ) : null}
          {!history.isPending && !history.isError && messages.length === 0 ? (
            <p className="text-center text-sm text-foreground-muted">
              {conversationType === "SELF"
                ? "No notes yet."
                : "No messages yet."}
            </p>
          ) : null}
          {messages.map((message) => {
            const outgoing = message.sender.accountId === currentAccountId;

            return (
              <article
                key={message.id}
                className={`flex ${outgoing ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                    outgoing
                      ? "bg-message-outgoing text-message-outgoing-foreground"
                      : "bg-message-incoming text-message-incoming-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <time
                    className={`mt-1 block text-xs ${
                      outgoing
                        ? "text-message-outgoing-foreground/80"
                        : "text-foreground-muted"
                    }`}
                    dateTime={message.createdAt}
                  >
                    {formatTimestamp(message.createdAt)}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
