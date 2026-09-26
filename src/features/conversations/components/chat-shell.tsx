"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppWorkspace } from "@/components/layout/app-workspace";
import { ConnectionsPanel } from "@/features/connections/components/connections-panel";
import {
  getProfileDisplayName,
  ProfileAvatar,
} from "@/features/profile/components/profile-avatar";

import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationSidebar } from "./conversation-sidebar";
import { useConversations } from "../hooks/use-conversations";

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
  const selectedConversation = conversations.data?.pages
    .flatMap((page) => page.items)
    .find(
      (conversation) =>
        conversation.id === selectedConversationId &&
        (conversation.type === "DIRECT" || conversation.type === "SELF"),
    );

  const self = {
    avatar: currentProfile.avatar,
    displayName: currentProfile.displayName,
    username: currentAccount.username,
  };
  const showConversation = Boolean(selectedConversationId);

  return (
    <AppWorkspace className="grid md:grid-cols-[clamp(20rem,30vw,24rem)_minmax(0,1fr)]">
      <div
        className={`${
          showConversation ? "hidden md:flex" : "flex"
        } min-h-0 w-full flex-col overflow-hidden md:border-r md:border-border`}
      >
        <nav
          className="flex min-h-16 items-center gap-1 border-b border-border px-3"
          aria-label="Primary navigation"
        >
          <button
            aria-current={workspace === "chats" ? "page" : undefined}
            className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 motion-reduce:transition-none ${
              workspace === "chats"
                ? "bg-surface-muted text-primary"
                : "text-foreground-muted hover:bg-surface-muted"
            }`}
            onClick={() => setWorkspace("chats")}
            type="button"
          >
            Chats
          </button>
          <button
            aria-current={workspace === "connections" ? "page" : undefined}
            className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 motion-reduce:transition-none ${
              workspace === "connections"
                ? "bg-surface-muted text-primary"
                : "text-foreground-muted hover:bg-surface-muted"
            }`}
            onClick={() => setWorkspace("connections")}
            type="button"
          >
            Connections
          </button>
          <button
            aria-label={`Open profile for ${getProfileDisplayName(
              currentProfile.displayName,
              currentAccount.username,
            )}`}
            className="ml-auto flex min-w-0 items-center gap-2 rounded-lg p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
            onClick={() => router.push("/profile")}
            type="button"
          >
            <span className="hidden min-w-0 xl:block">
              <span className="block max-w-28 truncate text-sm font-medium text-foreground">
                {getProfileDisplayName(
                  currentProfile.displayName,
                  currentAccount.username,
                )}
              </span>
              {currentAccount.username ? (
                <span className="block max-w-28 truncate text-xs text-foreground-muted">
                  @{currentAccount.username}
                </span>
              ) : null}
            </span>
            <ProfileAvatar
              name={getProfileDisplayName(
                currentProfile.displayName,
                currentAccount.username,
              )}
              size="sm"
              url={currentProfile.avatar}
            />
          </button>
        </nav>
        {workspace === "chats" ? (
          <ConversationSidebar
            selectedConversationId={selectedConversationId}
            self={self}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ConnectionsPanel currentAccountId={currentAccount.id} />
          </div>
        )}
      </div>
      {workspace === "connections" && !showConversation ? (
        <section className="hidden min-w-0 place-items-center md:grid">
          <p className="text-sm text-foreground-muted">
            Manage your connections here.
          </p>
        </section>
      ) : null}
      {workspace === "chats" ? (
        <div
          className={`${
            showConversation ? "flex" : "hidden md:flex"
          } min-h-0 min-w-0 flex-col overflow-hidden`}
        >
          <ConversationEmptyState
            conversation={selectedConversation}
            currentAccountId={currentAccount.id}
            isLoading={conversations.isPending}
            selectedConversationId={selectedConversationId}
            self={self}
          />
        </div>
      ) : null}
    </AppWorkspace>
  );
}
