"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api/api-error";
import { ConnectionsPanel } from "@/features/connections/components/connections-panel";

import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationSidebar } from "./conversation-sidebar";
import {
  useConversations,
  useOpenDirectConversation,
} from "../hooks/use-conversations";

type ChatShellProps = Readonly<{
  currentAccount: Readonly<{
    id: string;
    username: string | null;
  }>;
  currentProfile: Readonly<{
    displayName: string | null;
    avatar: string | null;
  }>;
  selectedConversationId?: string;
}>;

type Workspace = "chats" | "connections";

export function ChatShell({
  currentAccount,
  currentProfile,
  selectedConversationId,
}: ChatShellProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace>("chats");
  const conversations = useConversations(true);
  const openDirect = useOpenDirectConversation();
  const selectedConversation = conversations.data?.pages
    .flatMap((page) => page.items)
    .find((conversation) => conversation.id === selectedConversationId);

  function handleMessage(accountId: string) {
    openDirect.mutate(accountId, {
      onSuccess: (conversation) => {
        setWorkspace("chats");
        router.push(`/chat/${conversation.id}`);
      },
    });
  }

  const self = {
    avatar: currentProfile.avatar,
    displayName: currentProfile.displayName,
    username: currentAccount.username,
  };
  const showConversation = Boolean(selectedConversationId);

  return (
    <main className="min-h-screen bg-background p-0 md:p-6">
      <section className="mx-auto flex min-h-screen max-w-6xl overflow-hidden bg-surface md:min-h-[calc(100vh-3rem)] md:rounded-xl md:border md:border-border md:shadow-sm">
        <div
          className={`${
            showConversation ? "hidden md:flex" : "flex"
          } w-full shrink-0 flex-col md:w-80 md:border-r md:border-border`}
        >
          <nav
            className="flex border-b border-border px-4 pt-4"
            aria-label="Workspace"
          >
            <button
              aria-current={workspace === "chats" ? "page" : undefined}
              className={`border-b-2 px-3 pb-3 text-sm font-medium ${
                workspace === "chats"
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground-muted"
              }`}
              onClick={() => setWorkspace("chats")}
              type="button"
            >
              Chats
            </button>
            <button
              aria-current={workspace === "connections" ? "page" : undefined}
              className={`border-b-2 px-3 pb-3 text-sm font-medium ${
                workspace === "connections"
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground-muted"
              }`}
              onClick={() => setWorkspace("connections")}
              type="button"
            >
              Connections
            </button>
          </nav>
          {workspace === "chats" ? (
            <ConversationSidebar
              selectedConversationId={selectedConversationId}
              self={self}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ConnectionsPanel
                currentAccountId={currentAccount.id}
                isOpeningConversation={openDirect.isPending}
                onMessage={handleMessage}
              />
              {openDirect.isError ? (
                <p className="mt-3 text-sm text-danger" role="alert">
                  {openDirect.error instanceof ApiError &&
                  openDirect.error.code === "DIRECT_INTERACTION_UNAVAILABLE"
                    ? "This conversation is unavailable."
                    : "Unable to open this conversation."}
                </p>
              ) : null}
            </div>
          )}
        </div>
        {workspace === "connections" && !showConversation ? (
          <section className="hidden flex-1 place-items-center md:grid">
            <p className="text-sm text-foreground-muted">
              Choose a connection to start a conversation.
            </p>
          </section>
        ) : null}
        {workspace === "chats" ? (
          <div
            className={`${
              showConversation ? "flex" : "hidden md:flex"
            } min-w-0 flex-1 flex-col`}
          >
            <ConversationEmptyState
              conversation={selectedConversation}
              isLoading={conversations.isPending}
              selectedConversationId={selectedConversationId}
              self={self}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
