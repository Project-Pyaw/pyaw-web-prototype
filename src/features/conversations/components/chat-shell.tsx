"use client";

import { useRouter } from "next/navigation";

import {
  AppHeader,
  type AppNavigationSection,
} from "@/components/layout/app-header";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { AccountNavigationButton } from "@/features/profile/components/account-navigation-button";

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

export function ChatShell({
  currentAccount,
  currentProfile,
  selectedConversationId,
}: ChatShellProps) {
  const router = useRouter();
  const conversations = useConversations(true);
  const selectedConversation = conversations.data?.pages
    .flatMap((page) => page.items)
    .find(
      (conversation) =>
        conversation.id === selectedConversationId &&
        (conversation.type === "DIRECT" ||
          conversation.type === "SELF" ||
          conversation.type === "GROUP"),
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
        activeSection="chats"
        endContent={
          <AccountNavigationButton
            avatar={currentProfile.avatar}
            displayName={currentProfile.displayName}
            onClick={() => router.push("/profile")}
            username={currentAccount.username}
          />
        }
        onBrandClick={() => {
          router.push("/chat");
        }}
        onNavigate={(section: AppNavigationSection) => {
          if (section === "people") {
            router.push("/people");
            return;
          }

          if (section === "chats") {
            router.push("/chat");
          }
        }}
      />
      <div className="grid min-h-0 flex-1 md:grid-cols-[clamp(19rem,28vw,25rem)_minmax(0,1fr)]">
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
    </AppWorkspace>
  );
}
