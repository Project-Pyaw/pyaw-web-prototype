import { redirect } from "next/navigation";

import { ChatPlaceholder } from "@/features/auth/components/chat-placeholder";

type ChatPageProps = Readonly<{
  searchParams: Promise<{
    workspace?: string | string[];
  }>;
}>;

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { workspace } = await searchParams;

  if (
    workspace === "connections" ||
    (Array.isArray(workspace) && workspace.includes("connections"))
  ) {
    redirect("/people");
  }

  return <ChatPlaceholder />;
}
