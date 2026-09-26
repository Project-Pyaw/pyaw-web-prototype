import { ChatPlaceholder } from "@/features/auth/components/chat-placeholder";

type ChatPageProps = Readonly<{
  searchParams: Promise<{
    workspace?: string | string[];
  }>;
}>;

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { workspace } = await searchParams;

  return (
    <ChatPlaceholder
      initialWorkspace={workspace === "connections" ? "connections" : "chats"}
    />
  );
}
