"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AppHeader,
  type AppNavigationSection,
} from "@/components/layout/app-header";
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
  initialWorkspace?: Workspace;
  selectedConversationId?: string;
}>;

type Workspace = "chats" | "connections";

export function ChatShell({
  currentAccount,
  currentProfile,
  initialWorkspace = "chats",
  selectedConversationId,
}: ChatShellProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
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
    <AppWorkspace className="flex flex-col">
      <AppHeader
        activeSection={workspace}
        endContent={
          <button
            aria-label={`Open profile for ${getProfileDisplayName(
              currentProfile.displayName,
              currentAccount.username,
            )}`}
            className="flex min-w-0 items-center gap-2 rounded-full p-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20"
            onClick={() => router.push("/profile")}
            type="button"
          >
            <span className="hidden min-w-0 xl:block">
              <span className="block max-w-28 truncate text-sm font-medium text-slate-600">
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
            <span className="relative">
              <ProfileAvatar
                name={getProfileDisplayName(
                  currentProfile.displayName,
                  currentAccount.username,
                )}
                size="sm"
                url={currentProfile.avatar}
              />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-emerald-500" />
            </span>
          </button>
        }
        onBrandClick={() => {
          setWorkspace("chats");
          router.push("/chat");
        }}
        onNavigate={(section: AppNavigationSection) => {
          if (section === "profile") {
            router.push("/profile");
            return;
          }

          setWorkspace(section);

          if (section === "chats") {
            router.push("/chat");
          }
        }}
      />
      {workspace === "connections" ? (
        <ConnectionsPanel currentAccountId={currentAccount.id} />
      ) : (
        <div className="grid min-h-0 flex-1 md:grid-cols-[clamp(18rem,28vw,22rem)_minmax(0,1fr)]">
          <div
            className={`${
              showConversation ? "hidden md:flex" : "flex"
            } min-h-0 w-full flex-col overflow-hidden border-r border-border bg-surface`}
          >
            <ConversationSidebar
              selectedConversationId={selectedConversationId}
              self={self}
            />
          </div>
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
        </div>
      )}
    </AppWorkspace>
  );
}
